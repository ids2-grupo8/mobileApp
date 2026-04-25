import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CheckoutSuccessScreen() {
  const C = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ orderId?: string; total?: string }>();

  const orderId = params.orderId ?? 'ORD-XXXX';
  const total = Number(params.total ?? 0);

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
          <Text style={[s.title, { color: C.textPrimary }]}>¡Pago confirmado!</Text>
          <Text style={[s.subtitle, { color: C.textSecondary }]}>
            Tu orden fue procesada correctamente. Te avisaremos cuando el vendedor la prepare.
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
            <Text style={[s.summaryLabel, { color: C.textMuted }]}>Número de orden</Text>
            <Text style={[s.summaryMono, { color: C.textPrimary }]}>{orderId}</Text>
          </View>
          <View style={[s.divider, { backgroundColor: C.glassBorder }]} />
          <View style={s.summaryRow}>
            <Text style={[s.summaryLabel, { color: C.textMuted }]}>Total pagado</Text>
            <Text style={[s.summaryTotal, { color: C.accent }]}>{formatPrice(total)}</Text>
          </View>
          <View style={[s.divider, { backgroundColor: C.glassBorder }]} />
          <View style={s.summaryRow}>
            <Text style={[s.summaryLabel, { color: C.textMuted }]}>Estado</Text>
            <View
              style={[
                s.statusPill,
                { backgroundColor: C.accentGlow, borderColor: C.accent },
              ]}>
              <View style={[s.statusDot, { backgroundColor: C.accent }]} />
              <Text style={[s.statusText, { color: C.accent }]}>Confirmada</Text>
            </View>
          </View>
        </Animated.View>
      </View>

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
  root: { flex: 1, justifyContent: 'space-between' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 20 },

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
    gap: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  summaryMono: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
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
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  bottom: { paddingHorizontal: 20, gap: 10, paddingTop: 12 },
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
