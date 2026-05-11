import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/colors';
import { useTheme } from '@/hooks/use-theme';
import { type CartItem, useCartStore } from '@/store/cart';

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function CartRow({
  item,
  C,
  onInc,
  onDec,
  onRemove,
}: {
  item: CartItem;
  C: ThemeColors;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
}) {
  const atMax = item.quantity >= item.stock;
  const lowStock = item.stock <= 3 && item.stock > 0;
  const notAvailable = item.available === false;

  return (
    <View
      style={[
        s.row,
        notAvailable && s.rowDisabled,
        { backgroundColor: C.glass, borderColor: C.glassBorder, shadowColor: C.shadowDark, opacity: notAvailable ? 0.6 : 1 },
      ]}>
      <Image source={{ uri: item.imageUrl }} style={s.thumb} contentFit="cover" />

      <View style={s.rowBody}>
        <Text numberOfLines={2} style={[s.rowTitle, { color: notAvailable ? C.textMuted : C.textPrimary }]}>
          {item.title}
        </Text>
        <Text style={[s.rowSeller, { color: C.textMuted }]} numberOfLines={1}>
          {item.seller}
        </Text>

        {notAvailable ? (
          <View style={[s.stockPill, { backgroundColor: C.redBg, borderColor: C.red }]}>
            <Text style={[s.stockPillText, { color: C.red }]}>
              No disponible
            </Text>
          </View>
        ) : lowStock ? (
          <View style={[s.stockPill, { backgroundColor: C.redBg, borderColor: C.red }]}>
            <Text style={[s.stockPillText, { color: C.red }]}>
              Sólo {item.stock} en stock
            </Text>
          </View>
        ) : null}

        <View style={s.rowFooter}>
          <Text style={[s.rowPrice, { color: notAvailable ? C.textMuted : C.accent }]}>
            {formatPrice(item.price * item.quantity)}
          </Text>

          <View
            style={[
              s.qtyWrap,
              { backgroundColor: notAvailable ? C.glass : C.elevated, borderColor: C.glassBorder, opacity: notAvailable ? 0.5 : 1 },
            ]}>
            <TouchableOpacity
              onPress={onDec}
              disabled={notAvailable}
              hitSlop={8}
              style={s.qtyBtn}
              accessibilityLabel="Disminuir cantidad">
              <MaterialIcons
                name={item.quantity <= 1 ? 'delete-outline' : 'remove'}
                size={16}
                color={notAvailable ? C.textMuted : (item.quantity <= 1 ? C.red : C.textSecondary)}
              />
            </TouchableOpacity>
            <Text style={[s.qtyValue, { color: notAvailable ? C.textMuted : C.textPrimary }]}>{item.quantity}</Text>
            <TouchableOpacity
              onPress={onInc}
              disabled={notAvailable || atMax}
              hitSlop={8}
              style={s.qtyBtn}
              accessibilityLabel="Aumentar cantidad">
              <MaterialIcons
                name="add"
                size={16}
                color={notAvailable || atMax ? C.textMuted : C.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={onRemove}
        hitSlop={8}
        style={s.removeBtn}
        accessibilityLabel="Eliminar del carrito">
        <MaterialIcons name="close" size={16} color={C.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

export default function CartScreen() {
  const C = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);
  const cartError = useCartStore((s) => s.error);
  const syncWithBackend = useCartStore((s) => s.syncWithBackend);

  const unavailableItems = items.filter((item) => item.available === false);
  const hasUnavailableItems = unavailableItems.length > 0;
  const canCheckout = items.length > 0 && !hasUnavailableItems;

  const total = subtotal;

  // Sincronizar carrito con backend al entrar a la pantalla
  useEffect(() => {
    syncWithBackend();
  }, [syncWithBackend]);

  const handleInc = (item: CartItem) => {
    Haptics.selectionAsync();
    updateQuantity(item.productId, item.quantity + 1);
  };

  const handleDec = (item: CartItem) => {
    Haptics.selectionAsync();
    updateQuantity(item.productId, item.quantity - 1);
  };

  useEffect(() => {
    if (cartError) {
      Alert.alert('Error', cartError);
    }
  }, [cartError]);

  const handleRemove = (item: CartItem) => {
    Alert.alert('Eliminar producto', `¿Quitar "${item.title}" del carrito?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          removeItem(item.productId);
        },
      },
    ]);
  };

  const handleClear = () => {
    if (items.length === 0) return;
    Alert.alert('Vaciar carrito', '¿Estás seguro de que querés eliminar todos los productos?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Vaciar', style: 'destructive', onPress: () => clear() },
    ]);
  };

  const handleCheckout = () => {
    if (!canCheckout) {
      if (hasUnavailableItems) {
        Alert.alert(
          'Productos no disponibles',
          `${unavailableItems.length} producto(s) en tu carrito no están disponibles. Elimínalos para continuar.`,
          [{ text: 'OK' }]
        );
        return;
      }
      if (items.length === 0) return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/checkout');
  };

  const isEmpty = items.length === 0;

  return (
    <View style={[s.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <View style={s.header}>
        <View style={s.iconBtn} />

        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: C.textPrimary }]}>Tu carrito</Text>
          {!isEmpty && (
            <Text style={[s.headerSubtitle, { color: C.textMuted }]}>
              {items.length} {items.length === 1 ? 'producto' : 'productos'}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={handleClear}
          disabled={isEmpty}
          hitSlop={10}
          style={[
            s.iconBtn,
            {
              backgroundColor: isEmpty ? 'transparent' : C.redBg,
              borderColor: isEmpty ? 'transparent' : C.red,
              opacity: isEmpty ? 0 : 1,
            },
          ]}>
          <MaterialIcons name="delete-outline" size={18} color={C.red} />
        </TouchableOpacity>
      </View>

      {isEmpty ? (
        <View style={s.emptyWrap}>
          <View style={[s.emptyIconWrap, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
            <MaterialIcons name="shopping-bag" size={56} color={C.textMuted} />
          </View>
          <Text style={[s.emptyTitle, { color: C.textPrimary }]}>Tu carrito está vacío</Text>
          <Text style={[s.emptyText, { color: C.textSecondary }]}>
            Explorá el catálogo y agregá productos que te gusten.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={[s.emptyBtn, { backgroundColor: C.accent, shadowColor: C.accent }]}>
            <Text style={s.emptyBtnText}>Explorar productos</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[s.scrollContent, { paddingBottom: 280 + insets.bottom }]}
            showsVerticalScrollIndicator={false}>
            <View style={s.list}>
              {items.map((item) => (
                <CartRow
                  key={item.productId}
                  item={item}
                  C={C}
                  onInc={() => handleInc(item)}
                  onDec={() => handleDec(item)}
                  onRemove={() => handleRemove(item)}
                />
              ))}
            </View>
          </ScrollView>

          {/* Sticky checkout panel */}
          <View
            style={[
              s.stickyPanel,
              {
                backgroundColor: C.elevated,
                borderColor: C.glassBorder,
                paddingBottom: Math.max(insets.bottom, 16) + 8 + 56 + 16,
                shadowColor: C.shadowDark,
              },
            ]}>
            <View style={s.totalsBlock}>
              <View style={s.totalsRow}>
                <Text style={[s.totalsLabel, { color: C.textSecondary }]}>Subtotal</Text>
                <Text style={[s.totalsValue, { color: C.textPrimary }]}>
                  {formatPrice(subtotal)}
                </Text>
              </View>
              <View style={[s.totalsDivider, { backgroundColor: C.glassBorder }]} />
              <View style={s.totalsRow}>
                <Text style={[s.totalsLabelLg, { color: C.textPrimary }]}>Total</Text>
                <Text style={[s.totalsValueLg, { color: C.accent }]}>
                  {formatPrice(total)}
                </Text>
              </View>
            </View>

            {hasUnavailableItems && (
              <View style={[s.errorBox, { backgroundColor: C.redBg, borderColor: C.red }]}>
                <MaterialIcons name="error-outline" size={16} color={C.red} />
                <Text style={[s.errorText, { color: C.red }]}>
                  {unavailableItems.length} producto(s) no disponible(s). Elimínalos para continuar.
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleCheckout}
              disabled={!canCheckout}
              activeOpacity={canCheckout ? 0.92 : 1}
              style={[
                s.cta,
                {
                  backgroundColor: canCheckout ? C.accent : C.textMuted,
                  shadowColor: canCheckout ? C.accent : 'transparent',
                  opacity: canCheckout ? 1 : 0.5,
                },
              ]}>
              <Text style={s.ctaText}>Continuar al pago</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#050508" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  // ── Empty ──
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  emptyIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  emptyBtn: {
    marginTop: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyBtnText: { color: '#050508', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },

  // ── List ──
  scrollContent: { paddingHorizontal: 20 },
  list: { gap: 12, marginTop: 16 },

  // ── Row ──
  row: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  thumb: { width: 84, height: 84, borderRadius: 12 },
  rowBody: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 14, fontWeight: '700', lineHeight: 18, letterSpacing: -0.1 },
  rowSeller: { fontSize: 11, fontWeight: '500' },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  rowPrice: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  qtyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 4,
    height: 32,
  },
  qtyBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  qtyValue: { minWidth: 22, textAlign: 'center', fontSize: 13, fontWeight: '700' },
  removeBtn: { padding: 4, alignSelf: 'flex-start' },
  stockPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  stockPillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

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
    paddingTop: 16,
    gap: 14,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
  },
  totalsBlock: { gap: 8 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalsLabel: { fontSize: 13, fontWeight: '500' },
  totalsValue: { fontSize: 14, fontWeight: '700' },
  totalsDivider: { height: 1, marginVertical: 4 },
  totalsLabelLg: { fontSize: 15, fontWeight: '700' },
  totalsValueLg: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },

  // ── Error box ──
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  errorText: { fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 18 },

  // ── CTA Button ──
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

  // ── Row disabled ──
  rowDisabled: {},
});
