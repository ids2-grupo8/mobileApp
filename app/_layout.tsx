import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
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
  const navTheme  = effective === 'dark' ? DarkTheme : DefaultTheme;

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
