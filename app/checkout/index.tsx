import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { openBrowserAsync } from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/colors';
import { useTheme } from '@/hooks/use-theme';
import { pollOrdersUntilResolved } from '@/services/orders';
import { validateCoupon } from '@/services/checkout';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useCheckoutStore } from '@/store/checkout';

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function translateCouponError(raw: string): string {
  switch (raw) {
    case 'Coupon not found':               return 'El código no existe. Verificá que esté bien escrito.';
    case 'Coupon is not active':           return 'Este cupón ya no está activo.';
    case 'Coupon is expired or not yet active': return 'El cupón está vencido o todavía no está vigente.';
    case 'Coupon usage limit exceeded':    return 'El cupón alcanzó su límite de usos.';
    case 'You have already used this coupon': return 'Ya usaste este cupón anteriormente.';
    default: return raw;
  }
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

type PaymentMethod = 'mercadopago';
type CouponStatus = 'idle' | 'loading' | 'valid' | 'invalid';

type Address = {
  fullName: string;
  street: string;
  city: string;
  zip: string;
  phone: string;
};

type Errors = Partial<Record<keyof Address, string>>;

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  headerSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 2 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 4 },

  // ── Sections ──
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: { fontSize: 12, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },

  // ── Card ──
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },

  // ── Fields ──
  field: { gap: 6 },
  fieldRow: { flexDirection: 'row', gap: 10 },
  fieldLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
  },
  inputText: { fontSize: 15, fontWeight: '500' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  errorText: { fontSize: 11, fontWeight: '600' },

  // ── Payment ──
  payList: { gap: 10 },
  payOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  payIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payTitle: { fontSize: 14, fontWeight: '700' },
  paySubtitle: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  noticeText: { fontSize: 11, lineHeight: 16, flex: 1 },

  // ── Coupon ──
  couponRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  couponInputWrap: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
  },
  couponInputText: { fontSize: 15, fontWeight: '600', letterSpacing: 1 },
  couponApplyBtn: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponApplyText: { fontSize: 14, fontWeight: '800', color: '#050508' },
  couponBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  couponBadgeText: { flex: 1, fontSize: 13, fontWeight: '600' },
  couponRemoveBtn: { padding: 4 },
  couponErrorText: { fontSize: 12, fontWeight: '600', marginTop: 4 },

  // ── Summary ──
  summaryList: { gap: 8 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  summaryItemTitle: { flex: 1, fontSize: 13, fontWeight: '500' },
  summaryItemPrice: { fontSize: 13, fontWeight: '600' },
  summaryDivider: { height: 1, marginVertical: 4 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalsLabel: { fontSize: 13, fontWeight: '500' },
  totalsValue: { fontSize: 14, fontWeight: '700' },
  totalsLabelLg: { fontSize: 15, fontWeight: '700' },
  totalsValueLg: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },

  // ── Sticky panel ──
  stickyPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 12,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
  },
  stickyTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stickyLabel: { fontSize: 13, fontWeight: '500' },
  stickyTotal: { fontSize: 18, fontWeight: '800' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    gap: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaText: { color: '#050508', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },

  countdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  countdownText: { fontSize: 12, fontWeight: '700', flex: 1 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '500' },
});

function Section({
  title,
  step,
  C,
  children,
}: {
  title: string;
  step: number;
  C: ThemeColors;
  children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={[s.stepBadge, { backgroundColor: C.accentGlow, borderColor: C.accent }]}>
          <Text style={[s.stepBadgeText, { color: C.accent }]}>{step}</Text>
        </View>
        <Text style={[s.sectionTitle, { color: C.textPrimary }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  C,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  error?: string;
  C: ThemeColors;
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences';
}) {
  return (
    <View style={s.field}>
      <Text style={[s.fieldLabel, { color: C.textSecondary }]}>{label}</Text>
      <View
        style={[
          s.input,
          {
            backgroundColor: C.inputBg,
            borderColor: error ? C.inputBorderError : C.inputBorder,
          },
        ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          style={[s.inputText, { color: C.textPrimary }]}
          selectionColor={C.accent}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={autoCapitalize ?? 'sentences'}
        />
      </View>
      {error && (
        <View style={s.errorRow}>
          <MaterialIcons name="error-outline" size={13} color={C.red} />
          <Text style={[s.errorText, { color: C.red }]}>{error}</Text>
        </View>
      )}
    </View>
  );
}

function PaymentOption({
  selected,
  icon,
  title,
  subtitle,
  onPress,
  C,
}: {
  selected: boolean;
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  C: ThemeColors;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        s.payOption,
        {
          backgroundColor: selected ? C.accentGlow : C.glass,
          borderColor: selected ? C.accent : C.glassBorder,
        },
      ]}>
      <View
        style={[
          s.payIconWrap,
          {
            backgroundColor: selected ? C.accent : C.elevated,
            borderColor: selected ? C.accent : C.glassBorder,
          },
        ]}>
        <MaterialIcons
          name={icon}
          size={22}
          color={selected ? '#050508' : C.textSecondary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.payTitle, { color: selected ? C.accent : C.textPrimary }]}>{title}</Text>
        <Text style={[s.paySubtitle, { color: C.textMuted }]}>{subtitle}</Text>
      </View>
      <View
        style={[
          s.radio,
          { borderColor: selected ? C.accent : C.glassBorder },
        ]}>
        {selected && <View style={[s.radioDot, { backgroundColor: C.accent }]} />}
      </View>
    </TouchableOpacity>
  );
}

export default function CheckoutScreen() {
  const C = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url?.includes('mobileapp://')) {
        if (Platform.OS === 'ios') WebBrowser.dismissBrowser();
      }
    });
    return () => subscription.remove();
  }, []);

  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const clearLocal = useCartStore((s) => s.clearLocal);
  const syncWithBackend = useCartStore((s) => s.syncWithBackend);
  const user = useAuthStore((s) => s.user);
  const { isSubmitting: checkoutSubmitting, submitMercadoPago } = useCheckoutStore();

  // Sincronizar carrito con backend al entrar a checkout
  useEffect(() => {
    syncWithBackend();
  }, [syncWithBackend]);

  const [address, setAddress] = useState<Address>({
    fullName: user?.name ?? '',
    street: '',
    city: '',
    zip: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [payment, setPayment] = useState<PaymentMethod>('mercadopago');
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [idempotencyKey] = useState(
    () => `order-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  );

  // Countdown de 5 minutos mientras esperamos confirmación de pago
  useEffect(() => {
    if (!verifyingPayment) {
      setSecondsLeft(null);
      return;
    }
    setSecondsLeft(5 * 60);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [verifyingPayment]);


  const [couponInput, setCouponInput] = useState('');
  const [couponStatus, setCouponStatus] = useState<CouponStatus>('idle');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');

  const discountAmount = couponStatus === 'valid'
    ? Math.min(subtotal, Math.round(subtotal * couponDiscount / 100))
    : 0;
  const total = Math.max(0, subtotal - discountAmount);

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    if (!user?.email) {
      Alert.alert('Iniciar sesión requerido', 'Debés iniciar sesión para usar cupones.');
      return;
    }
    setCouponStatus('loading');
    setCouponError('');
    try {
      const result = await validateCoupon(code, user.email);
      console.log('[Coupon] validate response:', JSON.stringify(result));
      if (result.valid) {
        setCouponCode(code);
        setCouponDiscount(result.discount_percentage ?? 0);
        setCouponStatus('valid');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setCouponStatus('invalid');
        setCouponCode('');
        setCouponDiscount(0);
        setCouponError(translateCouponError(result.error ?? 'Cupón inválido'));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Error al validar el cupón';
      console.log('[Coupon] validate error:', raw);
      setCouponStatus('invalid');
      setCouponCode('');
      setCouponDiscount(0);
      setCouponError(translateCouponError(raw));
    }
  };

  const handleRemoveCoupon = () => {
    setCouponInput('');
    setCouponCode('');
    setCouponDiscount(0);
    setCouponError('');
    setCouponStatus('idle');
  };
  const itemCount = useMemo(() => items.reduce((acc, i) => acc + i.quantity, 0), [items]);

  const setField = <K extends keyof Address>(key: K, value: string) => {
    setAddress((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Errors = {};
    if (!address.fullName.trim()) next.fullName = 'Ingresá un nombre';
    if (!address.street.trim()) next.street = 'Ingresá una dirección';
    if (!address.city.trim()) next.city = 'Ingresá la ciudad';
    if (!/^\d{4,8}$/.test(address.zip.trim())) next.zip = 'Código postal inválido';
    if (!/^[\d\s+()-]{8,}$/.test(address.phone.trim())) next.phone = 'Teléfono inválido';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Require authentication before performing checkout — backend expects X-User-Email
    if (!user || !user.email) {
      Alert.alert(
        'Iniciar sesión requerido',
        'Debes iniciar sesión para completar la compra. ¿Deseas iniciar sesión ahora?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Iniciar sesión', onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (payment === 'mercadopago') {
        const { checkoutUrl, orderIds } = await submitMercadoPago(
          idempotencyKey,
          address,
          couponCode || undefined,
        );
        await openBrowserAsync(checkoutUrl);

        // MP no respeta back_urls con deep links, así que polleamos el estado
        // de las órdenes hasta que el webhook las resuelva (o timeout).
        setVerifyingPayment(true);
        try {
          const resolution = await pollOrdersUntilResolved(orderIds);
          await syncWithBackend();

          if (resolution === 'confirmed') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/checkout/success');
          } else if (resolution === 'rejected') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            router.replace('/checkout/failure');
          } else {
            // Timeout sin resolución: probablemente el usuario cerró el browser
            // sin pagar. Lo dejamos en /checkout para que pueda reintentar:
            // como conserva el mismo idempotencyKey, el backend reusa las
            // órdenes pendientes en vez de crear nuevas.
            Alert.alert(
              'Pago no completado',
              'No detectamos confirmación del pago. Si querés reintentar, tocá "Pagar" de nuevo.',
            );
          }
        } finally {
          setVerifyingPayment(false);
        }
      } else {
        // Stripe — gateway call goes here
        await new Promise((r) => setTimeout(r, 1500));

        const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
        await clearLocal();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace({ pathname: '/checkout/success', params: { orderId, total: String(total) } });
      }
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('[Checkout]', e);
      Alert.alert(
        'No pudimos procesar la compra',
        e instanceof Error && e.message ? e.message : 'Ocurrió un problema procesando tu pago. Intentá de nuevo en unos minutos.',
      );
    }
  };

  if (items.length === 0) {
    return (
      <View style={[s.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={10}
            style={[s.iconBtn, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
            <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: C.textPrimary, flex: 1, textAlign: 'center' }]}>
            Checkout
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.emptyWrap}>
          <MaterialIcons name="shopping-cart" size={48} color={C.textMuted} />
          <Text style={[s.emptyText, { color: C.textSecondary }]}>
            Tu carrito está vacío.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={10}
          style={[s.iconBtn, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
          <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: C.textPrimary }]}>Checkout</Text>
          <Text style={[s.headerSubtitle, { color: C.textMuted }]}>
            {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={20}>
        <ScrollView
          contentContainerStyle={[s.scrollContent, { paddingBottom: 220 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <Section title="Dirección de envío" step={1} C={C}>
            <View
              style={[
                s.card,
                { backgroundColor: C.glass, borderColor: C.glassBorder, shadowColor: C.shadowDark },
              ]}>
              <Field
                label="Nombre y apellido"
                value={address.fullName}
                onChangeText={(v) => setField('fullName', v)}
                placeholder="Ej: Lucía Pérez"
                error={errors.fullName}
                autoCapitalize="words"
                C={C}
              />
              <Field
                label="Calle y número"
                value={address.street}
                onChangeText={(v) => setField('street', v)}
                placeholder="Av. Corrientes 1234, Piso 4 A"
                error={errors.street}
                C={C}
              />
              <View style={s.fieldRow}>
                <View style={{ flex: 2 }}>
                  <Field
                    label="Ciudad"
                    value={address.city}
                    onChangeText={(v) => setField('city', v)}
                    placeholder="CABA"
                    error={errors.city}
                    autoCapitalize="words"
                    C={C}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="CP"
                    value={address.zip}
                    onChangeText={(v) => setField('zip', v.replace(/\D/g, ''))}
                    placeholder="1043"
                    error={errors.zip}
                    keyboardType="numeric"
                    autoCapitalize="none"
                    C={C}
                  />
                </View>
              </View>
              <Field
                label="Teléfono de contacto"
                value={address.phone}
                onChangeText={(v) => setField('phone', v)}
                placeholder="+54 11 1234-5678"
                error={errors.phone}
                keyboardType="phone-pad"
                autoCapitalize="none"
                C={C}
              />
            </View>
          </Section>

          <Section title="Cupón de descuento" step={2} C={C}>
            <View
              style={[
                s.card,
                { backgroundColor: C.glass, borderColor: C.glassBorder, shadowColor: C.shadowDark },
              ]}>
              {couponStatus === 'valid' ? (
                <View style={[s.couponBadge, { backgroundColor: C.accentGlow, borderColor: C.accent }]}>
                  <MaterialIcons name="local-offer" size={18} color={C.accent} />
                  <Text style={[s.couponBadgeText, { color: C.accent }]}>
                    {couponCode} — {couponDiscount}% de descuento
                  </Text>
                  <TouchableOpacity
                    onPress={handleRemoveCoupon}
                    hitSlop={8}
                    style={s.couponRemoveBtn}
                    accessibilityLabel="Quitar cupón">
                    <MaterialIcons name="close" size={16} color={C.accent} />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={s.couponRow}>
                    <View
                      style={[
                        s.couponInputWrap,
                        {
                          backgroundColor: C.inputBg,
                          borderColor: couponStatus === 'invalid' ? C.inputBorderError : C.inputBorder,
                        },
                      ]}>
                      <TextInput
                        value={couponInput}
                        onChangeText={(v) => {
                          setCouponInput(v.toUpperCase());
                          if (couponStatus === 'invalid') {
                            setCouponStatus('idle');
                            setCouponError('');
                          }
                        }}
                        placeholder="Código de cupón"
                        placeholderTextColor={C.textMuted}
                        style={[s.couponInputText, { color: C.textPrimary }]}
                        selectionColor={C.accent}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={handleApplyCoupon}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={handleApplyCoupon}
                      disabled={!couponInput.trim() || couponStatus === 'loading'}
                      style={[
                        s.couponApplyBtn,
                        {
                          backgroundColor:
                            !couponInput.trim() || couponStatus === 'loading'
                              ? C.textMuted
                              : C.accent,
                          opacity: !couponInput.trim() || couponStatus === 'loading' ? 0.5 : 1,
                        },
                      ]}>
                      {couponStatus === 'loading' ? (
                        <ActivityIndicator color="#050508" size="small" />
                      ) : (
                        <Text style={s.couponApplyText}>Aplicar</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  {couponStatus === 'invalid' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MaterialIcons name="error-outline" size={13} color={C.red} />
                      <Text style={[s.couponErrorText, { color: C.red }]}>{couponError}</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </Section>

          <Section title="Método de pago" step={3} C={C}>
            <View style={s.payList}>
              <PaymentOption
                selected={true}
                icon="account-balance-wallet"
                title="MercadoPago"
                subtitle="Dinero en cuenta, tarjeta o transferencia"
                onPress={() => {}}
                C={C}
              />
            </View>

            <View style={[s.notice, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
              <MaterialIcons name="lock" size={14} color={C.accent} />
              <Text style={[s.noticeText, { color: C.textMuted }]}>
                Pago procesado de forma segura. Tu información no se almacena en este dispositivo.
              </Text>
            </View>

            <View style={[s.notice, { backgroundColor: C.amberBg, borderColor: C.amber, marginTop: 0 }]}>
              <MaterialIcons name="schedule" size={14} color={C.amber} />
              <Text style={[s.noticeText, { color: C.amber }]}>
                Una vez que iniciés el pago, tenés <Text style={{ fontWeight: '800' }}>5 minutos</Text> para completarlo. Si no pagás en ese tiempo, la orden se cancelará y el stock se liberará.
              </Text>
            </View>
          </Section>

          <Section title="Resumen" step={4} C={C}>
            <View
              style={[
                s.card,
                { backgroundColor: C.glass, borderColor: C.glassBorder, shadowColor: C.shadowDark },
              ]}>
              <View style={s.summaryList}>
                {items.map((item) => (
                  <View key={item.productId} style={s.summaryRow}>
                    <Text
                      style={[s.summaryItemTitle, { color: C.textPrimary }]}
                      numberOfLines={1}>
                      <Text style={{ color: C.textMuted, fontWeight: '600' }}>
                        {item.quantity}× {' '}
                      </Text>
                      {item.title}
                    </Text>
                    <Text style={[s.summaryItemPrice, { color: C.textSecondary }]}>
                      {formatPrice(item.price * item.quantity)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={[s.summaryDivider, { backgroundColor: C.glassBorder }]} />

              <View style={s.totalsRow}>
                <Text style={[s.totalsLabel, { color: C.textSecondary }]}>Subtotal</Text>
                <Text style={[s.totalsValue, { color: C.textPrimary }]}>
                  {formatPrice(subtotal)}
                </Text>
              </View>

              {couponStatus === 'valid' && (
                <View style={s.totalsRow}>
                  <Text style={[s.totalsLabel, { color: C.accent }]}>
                    Cupón {couponCode} ({couponDiscount}%)
                  </Text>
                  <Text style={[s.totalsValue, { color: C.accent }]}>
                    -{formatPrice(discountAmount)}
                  </Text>
                </View>
              )}

              <View style={[s.summaryDivider, { backgroundColor: C.glassBorder }]} />
              <View style={s.totalsRow}>
                <Text style={[s.totalsLabelLg, { color: C.textPrimary }]}>Total a pagar</Text>
                <Text style={[s.totalsValueLg, { color: C.accent }]}>{formatPrice(total)}</Text>
              </View>
            </View>
          </Section>
        </ScrollView>

        <View
          style={[
            s.stickyPanel,
            {
              backgroundColor: C.elevated,
              borderColor: C.glassBorder,
              paddingBottom: Math.max(insets.bottom, 16) + 12,
              shadowColor: C.shadowDark,
            },
          ]}>
          <View style={s.stickyTotalRow}>
            <Text style={[s.stickyLabel, { color: C.textSecondary }]}>Total</Text>
            <Text style={[s.stickyTotal, { color: C.textPrimary }]}>{formatPrice(total)}</Text>
          </View>

          {verifyingPayment && secondsLeft !== null && (
            <View style={[s.countdownBanner, {
              backgroundColor: secondsLeft <= 60 ? C.redBg : C.amberBg,
              borderColor: secondsLeft <= 60 ? C.red : C.amber,
            }]}>
              <MaterialIcons
                name="schedule"
                size={14}
                color={secondsLeft <= 60 ? C.red : C.amber}
              />
              <Text style={[s.countdownText, { color: secondsLeft <= 60 ? C.red : C.amber }]}>
                {secondsLeft > 0
                  ? `Tiempo para pagar: ${formatCountdown(secondsLeft)}`
                  : 'Tiempo agotado — la orden fue cancelada'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={checkoutSubmitting || verifyingPayment}
            activeOpacity={0.92}
            style={[
              s.cta,
              {
                backgroundColor: checkoutSubmitting || verifyingPayment ? C.accentDim : C.accent,
                shadowColor: C.accent,
                opacity: checkoutSubmitting || verifyingPayment ? 0.85 : 1,
              },
            ]}>
            {checkoutSubmitting || verifyingPayment ? (
              <>
                <ActivityIndicator color="#050508" size="small" />
                <Text style={s.ctaText}>
                  {verifyingPayment ? 'Verificando pago...' : 'Procesando pago...'}
                </Text>
              </>
            ) : (
              <>
                <MaterialIcons name="lock" size={18} color="#050508" />
                <Text style={s.ctaText}>Pagar {formatPrice(total)}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
