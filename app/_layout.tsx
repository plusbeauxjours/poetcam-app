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
import { useAuthStore } from "../store/useAuthStore";
import { useSubscriptionStore } from "../store/useSubscriptionStore";
import { supabase } from "../supabase";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session, setSession, isInitialized, setInitialized } = useAuthStore();
  const { initializeRevenueCat } = useSubscriptionStore();
  const router = useRouter();
  const colorScheme = useColorScheme();
  usePoetReminder();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Start background sync once on mount
  useEffect(() => {
    initializeSyncService();
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      // 1. Set up auth listener
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        // Mark as initialized once we have auth state
        if (!isInitialized) {
          setInitialized(true);
        }
      });

      // 2. Initial session check
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        setInitialized(true);
      }

      return () => {
        subscription.unsubscribe();
      };
    };

    bootstrap();
  }, []);

  // Initialize RevenueCat when auth is ready
  useEffect(() => {
    if (isInitialized) {
      initializeRevenueCat().catch((error) => {
        console.error("Failed to initialize RevenueCat:", error);
      });
    }
  }, [isInitialized, initializeRevenueCat]);

  useEffect(() => {
    if (loaded && isInitialized) {
      SplashScreen.hideAsync().then(() => {
        if (!session) {
          router.replace("/login");
        } else {
          router.replace("/(tabs)");
        }
      });
    }
  }, [loaded, isInitialized, session, router]);

  if (!isInitialized || !loaded) return null;

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
            <Stack.Screen name="+not-found" />
          </Stack>
        </ThemeProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
