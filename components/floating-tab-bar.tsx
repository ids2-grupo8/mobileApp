import { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const ICONS: Record<string, IconName> = {
  index:   'home',
  explore: 'search',
  profile: 'person',
};

const GAP        = 3;
const BAR_RADIUS = 26;
const SEL_RADIUS = BAR_RADIUS - GAP;
const SEL_HEIGHT = 48;

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets      = useSafeAreaInsets();
  const numTabs     = state.routes.length;
  const [tabW, setTabW] = useState(0);

  // Valor animado que sigue el índice activo
  const anim = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: state.index,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
      mass: 0.8,
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
      })
    : new Animated.Value(0);

  return (
    <View style={[s.wrapper, { bottom: insets.bottom + 4 }]} pointerEvents="box-none">
      <View style={s.bar} onLayout={onBarLayout}>

        {/* Selector verde deslizante */}
        {tabW > 0 && (
          <Animated.View
            style={[
              s.selector,
              { width: tabW, transform: [{ translateX }] },
            ]}
          />
        )}

        {/* Tabs encima del selector */}
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
                color={focused ? '#0B0B0F' : '#555870'}
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
  bar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: BAR_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: GAP,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 14,
  },
  // Selector absoluto que se desliza entre tabs
  selector: {
    position: 'absolute',
    top: GAP,
    left: GAP,
    height: SEL_HEIGHT,
    borderRadius: SEL_RADIUS,
    backgroundColor: '#C5F135',
  },
  tab: {
    flex: 1,
    height: SEL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1, // encima del selector
  },
});
