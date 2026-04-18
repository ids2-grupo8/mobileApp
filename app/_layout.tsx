import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';

import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useThemeStore } from '@/store/theme';

export const unstable_settings = {
  anchor: '(auth)',
};

export default function RootLayout() {
  const system      = useColorScheme();
  const { mode }    = useThemeStore();
  const { isLoggedIn } = useAuthStore();
  const hydrateCart = useCartStore((s) => s.hydrate);
  const segments    = useSegments();
  const router      = useRouter();

  // Resolve effective scheme from our store
  const effective = mode === 'system' ? (system ?? 'dark') : mode;

  // Custom navigation themes with Liquid Glass backgrounds
  const navTheme = useMemo(() => {
    if (effective === 'dark') {
      return {
        ...DarkTheme,
        colors: { ...DarkTheme.colors, background: '#050508', card: '#0C0C12', primary: '#00E5A0', text: '#F0F2F5', border: 'rgba(255,255,255,0.10)' },
      };
    }
    return {
      ...DefaultTheme,
      colors: { ...DefaultTheme.colors, background: '#F2F3F7', card: '#E8E9EF', primary: '#00C78A', text: '#0A0A14', border: 'rgba(0,0,0,0.08)' },
    };
  }, [effective]);

  const [isReady, setIsReady] = useState(false);
  useEffect(() => { setIsReady(true); }, []);
  useEffect(() => {
    hydrateCart();
  }, [hydrateCart]);

  useEffect(() => {
    if (!isReady) return;
    const inAuth = segments[0] === '(auth)';
    if (!isLoggedIn && !inAuth) {
      router.replace('/(auth)/landing');
    } else if (isLoggedIn && inAuth) {
      router.replace('/(tabs)');
    }
  }, [isReady, isLoggedIn, segments, router]);

  return (
    <ThemeProvider value={navTheme}>
      <Stack>
        <Stack.Screen name="(auth)"      options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)"      options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="seller/publish" options={{ headerShown: false }} />
        <Stack.Screen name="modal"       options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={effective === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
