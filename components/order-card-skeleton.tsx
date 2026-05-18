import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import type { ThemeColors } from '@/constants/colors';

export default function OrderCardSkeleton({ C }: { C: ThemeColors }) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const bar = (width: number | `${number}%`, height = 12) => (
    <Animated.View
      style={[
        s.bar,
        { width, height, backgroundColor: C.glassBorder, opacity },
      ]}
    />
  );

  return (
    <View
      style={[
        s.card,
        { backgroundColor: C.glass, borderColor: C.glassBorder, shadowColor: C.shadowDark },
      ]}>
      <View style={s.headerRow}>
        {bar('40%', 14)}
        {bar(90, 22)}
      </View>
      <View style={[s.divider, { backgroundColor: C.glassBorder }]} />
      <View style={{ gap: 8 }}>
        {bar('70%')}
        {bar('55%')}
      </View>
      <View style={[s.divider, { backgroundColor: C.glassBorder }]} />
      <View style={s.footerRow}>
        {bar('35%', 14)}
        {bar('25%', 18)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: { height: 1 },
  bar: { borderRadius: 6 },
});
