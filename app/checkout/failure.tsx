import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

export default function CheckoutFailureScreen() {
  const C = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const ringScale = useRef(new Animated.Value(0.85)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.25,
            duration: 1100,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 1100,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 0.85,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    pulse.start();

    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 400,
      delay: 150,
      useNativeDriver: true,
    }).start();

    return () => pulse.stop();
  }, [ringScale, ringOpacity, contentOpacity]);

  return (
    <View style={[s.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 140 }]}
        showsVerticalScrollIndicator={false}>
        <View style={s.content}>
          <View style={s.iconWrap}>
            <Animated.View
              style={[
                s.ring,
                {
                  borderColor: C.red,
                  transform: [{ scale: ringScale }],
                  opacity: ringOpacity,
                },
              ]}
            />
            <View
              style={[
                s.iconCircle,
                {
                  backgroundColor: C.redBg,
                  borderColor: C.red,
                  shadowColor: C.red,
                },
              ]}>
              <MaterialIcons name="error-outline" size={56} color={C.red} />
            </View>
          </View>

          <Animated.View style={{ opacity: contentOpacity, alignItems: 'center', gap: 8 }}>
            <Text style={[s.title, { color: C.textPrimary }]}>Pago rechazado</Text>
            <Text style={[s.subtitle, { color: C.textSecondary }]}>
              Tu pago no se pudo procesar. Volvé a intentar o probá con otro método.
              No se realizó ningún cobro.
            </Text>
          </Animated.View>
        </View>
      </ScrollView>

      <View style={[s.bottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          onPress={() => router.replace('/checkout')}
          activeOpacity={0.92}
          style={[s.primaryBtn, { backgroundColor: C.accent, shadowColor: C.accent }]}>
          <MaterialIcons name="refresh" size={18} color="#050508" />
          <Text style={s.primaryBtnText}>Reintentar pago</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.85}
          style={[s.secondaryBtn, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
          <Text style={[s.secondaryBtnText, { color: C.textPrimary }]}>Volver al inicio</Text>
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
    paddingTop: 48,
    gap: 24,
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

  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', paddingHorizontal: 12 },

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 16,
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
