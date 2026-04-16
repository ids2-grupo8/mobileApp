import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as Linking from "expo-linking";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import "react-native-reanimated";

import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";

export const unstable_settings = {
  anchor: "(auth)",
};

export default function RootLayout() {
  const system = useColorScheme();
  const { mode } = useThemeStore();
  const { isLoggedIn } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Resolve effective scheme from our store
  const effective = mode === "system" ? (system ?? "dark") : mode;
  const navTheme = effective === "dark" ? DarkTheme : DefaultTheme;

  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    setIsReady(true);
  }, []);

  // Redirect guard: push unauthenticated users to landing, authenticated to tabs
  useEffect(() => {
    if (!isReady) return;
    const inAuth = segments[0] === "(auth)";
    if (!isLoggedIn && !inAuth) {
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
    <ThemeProvider value={navTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
        <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={effective === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}
