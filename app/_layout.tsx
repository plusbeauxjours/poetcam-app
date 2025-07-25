import { initializeSyncService } from "@/services/syncService";
import { queryClient } from "@/utils/queryClient";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/useColorScheme";
import { usePoetReminder } from "@/hooks/usePoetReminder";
import { useSharedContentLink } from "@/hooks/useDeepLinking";
import { useAuthStore } from "../store/useAuthStore";
import { useSubscriptionStore } from "../store/useSubscriptionStore";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session, isInitialized, isLoading, initializeAuth } = useAuthStore();
  const { initializeRevenueCat } = useSubscriptionStore();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { shortCode, isReady: deepLinkReady, clearSharedContent } = useSharedContentLink();
  usePoetReminder();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Start background sync once on mount
  useEffect(() => {
    initializeSyncService();
  }, []);

  // Initialize auth on app start
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Initialize RevenueCat when auth is ready
  useEffect(() => {
    if (isInitialized) {
      initializeRevenueCat().catch((error) => {
        console.error("Failed to initialize RevenueCat:", error);
      });
    }
  }, [isInitialized, initializeRevenueCat]);

  // Handle deep linking to shared content
  useEffect(() => {
    if (loaded && isInitialized && !isLoading && deepLinkReady && shortCode && session) {
      SplashScreen.hideAsync().then(() => {
        router.push(`/shared/${shortCode}`);
        clearSharedContent();
      });
    }
  }, [loaded, isInitialized, isLoading, deepLinkReady, shortCode, session, router, clearSharedContent]);

  // Handle navigation when auth state and fonts are ready
  useEffect(() => {
    if (loaded && isInitialized && !isLoading && (!deepLinkReady || !shortCode)) {
      SplashScreen.hideAsync().then(() => {
        if (!session) {
          router.replace("/login");
        } else {
          router.replace("/(tabs)");
        }
      });
    }
  }, [loaded, isInitialized, isLoading, deepLinkReady, shortCode, session, router]);

  // Show splash screen while loading
  if (!isInitialized || !loaded || isLoading) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="splash" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="camera" options={{ presentation: "modal", headerShown: false }} />
            <Stack.Screen name="result" options={{ presentation: "modal" }} />
            <Stack.Screen name="settings" options={{ headerShown: true, title: "설정" }} />
            <Stack.Screen name="shared/[shortCode]" options={{ presentation: "modal", headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </ThemeProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
