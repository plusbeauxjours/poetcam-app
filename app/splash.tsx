import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function CustomSplashScreen() {
  useEffect(() => {
    async function prepareAndNavigate() {
      // Keep the native splash screen visible until we are ready to navigate
      await SplashScreen.preventAutoHideAsync();

      // Perform any setup here, e.g., loading fonts, data, etc.
      // We'll just wait 1 second as requested.
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Hide the native splash screen
      await SplashScreen.hideAsync();

      // Navigate to the new tab layout
      router.replace("/camera");
    }

    prepareAndNavigate();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
