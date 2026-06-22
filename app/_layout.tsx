import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Linking, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useThemeStore } from '@/store/theme';

export const unstable_settings = {
  anchor: "(auth)",
};

export default function RootLayout() {
  const system = useColorScheme();
  const { mode } = useThemeStore();
  const { isLoggedIn } = useAuthStore();
  const hydrateCart = useCartStore((s) => s.hydrate);
  const clearLocalCart = useCartStore((s) => s.clearLocal);
  const segments    = useSegments();
  const router      = useRouter();

  usePushNotifications();

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
    // El carrito persiste localmente, pero solo debe restaurarse si hay
    // sesión activa. Si la app se mató sin logout explícito, la sesión se
    // pierde pero los items quedaron en SecureStore — limpiarlos acá evita
    // que el badge muestre productos sin usuario.
    (async () => {
      if (!isLoggedIn) {
        await clearLocalCart();
        return;
      }
      await hydrateCart();
      try {
        const email = useAuthStore.getState().user?.email;
        if (email) await useCartStore.getState().syncWithBackend();
      } catch (e) {
        // ignore sync errors on startup
      }
    })();
  }, [hydrateCart, clearLocalCart, isLoggedIn]);

  // Redirect guard: push unauthenticated users to landing, authenticated to tabs
  useEffect(() => {
    if (!isReady) return;
    const inAuth = segments[0] === "(auth)";
    // CA5: (tabs) es ruta pública — los usuarios no autenticados pueden
    // ver la Home y navegar el catálogo. Las acciones protegidas (carrito,
    // publicar, agregar al carrito) piden login individualmente.
    const inPublicRoute =
      segments[0] === "(tabs)" ||
      segments[0] === "product" ||
      segments[0] === "seller";
    // Deep link post-pago (Mercado Pago): puede llegar sin sesión activa
    const isCheckoutSuccessDeepLink =
      segments[0] === "checkout" && segments[1] === "success";

    if (!isLoggedIn && !inAuth && !inPublicRoute && !isCheckoutSuccessDeepLink) {
      router.replace("/(auth)/landing");
    } else if (isLoggedIn && inAuth) {
      router.replace("/(tabs)");
    }
  }, [isReady, isLoggedIn, segments, router]);

  // Deep link handler: intercepts Supabase password-recovery redirect
  useEffect(() => {
    if (!isReady) return;

    const handleURL = ({ url }: { url: string }) => {
      try {
        const hashIndex = url.indexOf("#");
        if (hashIndex === -1) return;

        // Parse hash fragment
        const fragment = url.slice(hashIndex + 1);
        const hashParams = new URLSearchParams(fragment);

        // Parse email from query string
        const beforeHash = url.slice(0, hashIndex);
        const qIndex = beforeHash.indexOf("?");
        const email =
          qIndex !== -1
            ? (new URLSearchParams(beforeHash.slice(qIndex + 1)).get("email") ??
              "")
            : "";

        const type = hashParams.get("type");
        const error = hashParams.get("error"); // presente si el token expiró
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        // Case 1: valid password-recovery link
        if (type === "recovery" && accessToken && refreshToken) {
          router.replace({
            pathname: "/(auth)/reset-password",
            params: {
              access_token: accessToken,
              refresh_token: refreshToken,
              email,
            },
          });
          return;
        }

        // Case 2: expired or invalid recovery link
        if (type === "recovery" || error === "access_denied") {
          router.replace({
            pathname: "/(auth)/reset-password",
            params: { access_token: "", refresh_token: "", email },
          });
        }
      } catch (e) {
        console.warn("[DeepLink] Failed to parse recovery URL:", e);
      }
    };

    // Handle URL that launched the app (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleURL({ url });
    });

    // Handle URLs while the app is already open (warm start)
    const subscription = Linking.addEventListener("url", handleURL);
    return () => subscription.remove();
  }, [isReady, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeProvider value={navTheme}>
      <Stack>
        <Stack.Screen name="(auth)"      options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)"      options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="product/reviews" options={{ headerShown: false }} />
        <Stack.Screen name="seller/publish" options={{ headerShown: false }} />
        <Stack.Screen name="seller/[email]" options={{ headerShown: false }} />
        <Stack.Screen name="seller/reviews" options={{ headerShown: false }} />
        <Stack.Screen name="profile/publications" options={{ headerShown: false }} />
        <Stack.Screen name="orders/purchases" options={{ headerShown: false }} />
        <Stack.Screen name="orders/sales" options={{ headerShown: false }} />
        <Stack.Screen name="orders/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="checkout/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="checkout/success" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="checkout/failure" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="checkout/pending" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="profile/pin" options={{ headerShown: false }} />
        <Stack.Screen name="modal"       options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={effective === "dark" ? "light" : "dark"} />
    </ThemeProvider>
    </GestureHandlerRootView>
  );
}
