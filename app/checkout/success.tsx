import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Un solo valor de query (expo-router puede devolver string | string[]). */
function firstParam(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  if (s === '' || s === 'null' || s === 'undefined') return undefined;
  return s;
}

/** Parámetros estándar del retorno success de Mercado Pago (checkout redirect). */
export type MercadoPagoSuccessParams = {
  collection_id?: string;
  collection_status?: string;
  payment_id?: string;
  status?: string;
  external_reference?: string;
  payment_type?: string;
  merchant_order_id?: string;
  preference_id?: string;
  site_id?: string;
  processing_mode?: string;
  merchant_account_id?: string;
  /** Compatibilidad con navegación interna desde checkout */
  orderId?: string;
  total?: string;
};

function DetailRow({
  label,
  value,
  mono,
  C,
}: {
  label: string;
  value: string;
  mono?: boolean;
  C: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={s.detailRow}>
      <Text style={[s.detailLabel, { color: C.textMuted }]}>{label}</Text>
      <Text
        style={[
          mono ? s.detailMono : s.detailValue,
          { color: C.textPrimary },
        ]}
        numberOfLines={2}
        selectable>
        {value}
      </Text>
    </View>
  );
}

export default function CheckoutSuccessScreen() {
  const C = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const raw = useLocalSearchParams<MercadoPagoSuccessParams>();

  const mp = useMemo(
    () => ({
      collection_id: firstParam(raw.collection_id),
      collection_status: firstParam(raw.collection_status),
      payment_id: firstParam(raw.payment_id),
      status: firstParam(raw.status),
      external_reference: firstParam(raw.external_reference),
      payment_type: firstParam(raw.payment_type),
      merchant_order_id: firstParam(raw.merchant_order_id),
      preference_id: firstParam(raw.preference_id),
      site_id: firstParam(raw.site_id),
      processing_mode: firstParam(raw.processing_mode),
      merchant_account_id: firstParam(raw.merchant_account_id),
      orderId: firstParam(raw.orderId),
      total: firstParam(raw.total),
    }),
    [raw],
  );

  const fromMercadoPago = Boolean(
    mp.status ||
      mp.collection_status ||
      mp.payment_id ||
      mp.collection_id ||
      mp.preference_id,
  );

  const orderLabel =
    mp.external_reference ??
    mp.orderId ??
    (mp.merchant_order_id ? `MP-${mp.merchant_order_id}` : undefined) ??
    'ORD-XXXX';

  const totalNum = mp.total !== undefined ? Number(mp.total) : NaN;
  const showTotal = Number.isFinite(totalNum) && totalNum > 0;

  const paymentStatusLabel = (mp.collection_status ?? mp.status ?? 'approved').toLowerCase();
  const isApproved =
    paymentStatusLabel === 'approved' || paymentStatusLabel === 'accredited';

  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(ringScale, {
          toValue: 1.4,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    Animated.spring(checkScale, {
      toValue: 1,
      damping: 12,
      stiffness: 180,
      useNativeDriver: true,
    }).start();

    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 400,
      delay: 200,
      useNativeDriver: true,
    }).start();
  }, [ringScale, ringOpacity, checkScale, contentOpacity]);

  return (
    <View style={[s.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 120 }]}
        showsVerticalScrollIndicator={false}>
        <View style={s.content}>
          <View style={s.iconWrap}>
            <Animated.View
              style={[
                s.ring,
                {
                  borderColor: C.accent,
                  transform: [{ scale: ringScale }],
                  opacity: ringOpacity,
                },
              ]}
            />
            <Animated.View
              style={[
                s.iconCircle,
                {
                  backgroundColor: C.accentGlow,
                  borderColor: C.accent,
                  shadowColor: C.accent,
                  transform: [{ scale: checkScale }],
                },
              ]}>
              <MaterialIcons name="check" size={56} color={C.accent} />
            </Animated.View>
          </View>

          <Animated.View style={{ opacity: contentOpacity, alignItems: 'center', gap: 8 }}>
            <Text style={[s.title, { color: C.textPrimary }]}>
              {isApproved ? '¡Pago confirmado!' : 'Estado del pago'}
            </Text>
            <Text style={[s.subtitle, { color: C.textSecondary }]}>
              {fromMercadoPago
                ? 'Mercado Pago devolvió el resultado de tu pago. Conservá estos datos por si necesitás un reclamo.'
                : 'Tu orden fue procesada correctamente. Te avisaremos cuando el vendedor la prepare.'}
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              s.summaryCard,
              {
                backgroundColor: C.glass,
                borderColor: C.glassBorder,
                shadowColor: C.shadowDark,
                opacity: contentOpacity,
              },
            ]}>
            <View style={s.summaryRow}>
              <Text style={[s.summaryLabel, { color: C.textMuted }]}>Referencia</Text>
              <Text style={[s.summaryMono, { color: C.textPrimary }]} numberOfLines={2} selectable>
                {orderLabel}
              </Text>
            </View>
            {showTotal && (
              <>
                <View style={[s.divider, { backgroundColor: C.glassBorder }]} />
                <View style={s.summaryRow}>
                  <Text style={[s.summaryLabel, { color: C.textMuted }]}>Total pagado</Text>
                  <Text style={[s.summaryTotal, { color: C.accent }]}>{formatPrice(totalNum)}</Text>
                </View>
              </>
            )}
            <View style={[s.divider, { backgroundColor: C.glassBorder }]} />
            <View style={s.summaryRow}>
              <Text style={[s.summaryLabel, { color: C.textMuted }]}>Estado</Text>
              <View
                style={[
                  s.statusPill,
                  {
                    backgroundColor: isApproved ? C.accentGlow : C.glass,
                    borderColor: isApproved ? C.accent : C.glassBorder,
                  },
                ]}>
                <View
                  style={[
                    s.statusDot,
                    { backgroundColor: isApproved ? C.accent : C.textMuted },
                  ]}
                />
                <Text
                  style={[
                    s.statusText,
                    { color: isApproved ? C.accent : C.textSecondary },
                  ]}>
                  {isApproved ? 'Aprobado' : (mp.collection_status ?? mp.status ?? '—')}
                </Text>
              </View>
            </View>

            {fromMercadoPago && (
              <>
                <View style={[s.divider, { backgroundColor: C.glassBorder }]} />
                <Text style={[s.mpSectionTitle, { color: C.textSecondary }]}>
                  Detalle Mercado Pago
                </Text>
                {mp.payment_id ? (
                  <DetailRow label="ID de pago" value={mp.payment_id} mono C={C} />
                ) : null}
                {mp.collection_id ? (
                  <DetailRow label="ID de cobro" value={mp.collection_id} mono C={C} />
                ) : null}
                {mp.preference_id ? (
                  <DetailRow label="Preferencia" value={mp.preference_id} mono C={C} />
                ) : null}
                {mp.payment_type ? (
                  <DetailRow
                    label="Medio"
                    value={mp.payment_type.replace(/_/g, ' ')}
                    C={C}
                  />
                ) : null}
                {mp.merchant_order_id ? (
                  <DetailRow label="Orden comercio" value={mp.merchant_order_id} mono C={C} />
                ) : null}
                {mp.site_id ? <DetailRow label="Sitio" value={mp.site_id} C={C} /> : null}
                {mp.processing_mode ? (
                  <DetailRow label="Procesamiento" value={mp.processing_mode} C={C} />
                ) : null}
                {mp.merchant_account_id ? (
                  <DetailRow label="Cuenta comercio" value={mp.merchant_account_id} mono C={C} />
                ) : null}
              </>
            )}
          </Animated.View>
        </View>
      </ScrollView>

      <View style={[s.bottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.92}
          style={[s.primaryBtn, { backgroundColor: C.accent, shadowColor: C.accent }]}>
          <Text style={s.primaryBtnText}>Volver al inicio</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/profile')}
          activeOpacity={0.85}
          style={[s.secondaryBtn, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
          <MaterialIcons name="receipt-long" size={18} color={C.textPrimary} />
          <Text style={[s.secondaryBtnText, { color: C.textPrimary }]}>Ver mis órdenes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 12,
    gap: 20,
  },

  iconWrap: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },

  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginTop: 8 },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', paddingHorizontal: 12 },

  summaryCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginTop: 12,
    gap: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  summaryLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2, flexShrink: 0 },
  summaryMono: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  summaryTotal: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  divider: { height: 1 },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, textTransform: 'capitalize' },

  mpSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  detailRow: { gap: 4 },
  detailLabel: { fontSize: 11, fontWeight: '600' },
  detailValue: { fontSize: 13, fontWeight: '600' },
  detailMono: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },

  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    gap: 10,
    paddingTop: 12,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryBtnText: { color: '#050508', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700' },
});
