import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const ICONS: Record<string, IconName> = {
  index:   'home',
  explore: 'search',
  profile: 'person',
};

const GAP        = 4;
const BAR_RADIUS = 28;
const SEL_RADIUS = BAR_RADIUS - GAP;
const SEL_HEIGHT = 48;

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets  = useSafeAreaInsets();
  const C       = useTheme();
  const numTabs = state.routes.length;
  const [tabW, setTabW] = useState(0);

  const anim = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: state.index,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
      mass: 0.7,
      overshootClamping: false,
    }).start();
  }, [state.index, anim]);

  const onBarLayout = (e: LayoutChangeEvent) => {
    const innerW = e.nativeEvent.layout.width - GAP * 2;
    setTabW(innerW / numTabs);
  };

  const translateX = tabW
    ? anim.interpolate({
        inputRange:  state.routes.map((_, i) => i),
        outputRange: state.routes.map((_, i) => i * tabW),
        extrapolate: 'clamp',
      })
    : new Animated.Value(0);

  // Avoid sticking to the bottom edge on devices with no bottom insets (e.g. Android)
  const safeBottom = Math.max(insets.bottom, 16);

  return (
    <View style={[s.wrapper, { bottom: safeBottom + 8 }]} pointerEvents="box-none">
      {/* Outer glow layer */}
      <View style={[s.glowLayer, { shadowColor: C.accent }]} />

      <View
        style={[s.bar, { backgroundColor: C.tabBg, shadowColor: C.shadowDark }]}
        onLayout={onBarLayout}>

        {/* Glass highlight border — top edge light reflection */}
        <LinearGradient
          colors={[C.glassHighlight, 'transparent', 'transparent', C.glassBorder]}
          locations={[0, 0.25, 0.85, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={s.glassEdge}
          pointerEvents="none"
        />

        {/* Accent pill selector — slides behind active tab */}
        {tabW > 0 && (
          <Animated.View
            style={[
              s.selector,
              {
                width: tabW,
                backgroundColor: C.accent,
                transform: [{ translateX }],
                shadowColor: C.accent,
              },
            ]}
          />
        )}

        {/* Tab icons */}
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const icon    = ICONS[route.name] ?? 'circle';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={s.tab}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}>
              <MaterialIcons
                name={icon}
                size={22}
                color={focused ? '#050508' : C.textMuted}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BAR_RADIUS,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 0,
  },
  bar: {
    flexDirection: 'row',
    borderRadius: BAR_RADIUS,
    padding: GAP,
    overflow: 'hidden',
    // Spatial shadow — dark base + accent tint
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  glassEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BAR_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  selector: {
    position: 'absolute',
    top: GAP,
    left: GAP,
    height: SEL_HEIGHT,
    borderRadius: SEL_RADIUS,
    // Accent glow on the selector pill
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  tab: {
    flex: 1,
    height: SEL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
