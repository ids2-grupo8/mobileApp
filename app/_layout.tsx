import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth';

export const unstable_settings = {
  anchor: '(auth)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isLoggedIn } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Wait one render cycle so the Stack is mounted before any navigation
  const [isReady, setIsReady] = useState(false);
  useEffect(() => { setIsReady(true); }, []);

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
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
