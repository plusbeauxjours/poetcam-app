import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function SettingsLayout() {
  const colorScheme = useColorScheme() ?? "light";

  return (
    <ThemedView style={{ flex: 1 }}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colorScheme === "dark" ? Colors.black : Colors.grey[100],
          },
          headerTintColor: colorScheme === "dark" ? Colors.grey[100] : Colors.black,
          headerTitleStyle: {
            fontWeight: "bold",
          },
          headerTitleAlign: "center",
          headerBackTitle: "",
        }}>
        <Stack.Screen name="index" options={{ title: "Settings" }} />
        <Stack.Screen name="profile" options={{ title: "Profile" }} />
        <Stack.Screen name="notification" options={{ title: "Notifications" }} />
        <Stack.Screen name="plans" options={{ title: "Plans" }} />
        <Stack.Screen name="language" options={{ title: "Language" }} />
        <Stack.Screen name="dark-mode" options={{ title: "Appearance" }} />
        <Stack.Screen name="account" options={{ title: "Account" }} />
        <Stack.Screen name="about" options={{ title: "About" }} />
        <Stack.Screen name="donation" options={{ title: "Support us" }} />
        <Stack.Screen name="agent" options={{ title: "AI Agent" }} />
        <Stack.Screen name="history" options={{ title: "History" }} />
      </Stack>
    </ThemedView>
  );
}
