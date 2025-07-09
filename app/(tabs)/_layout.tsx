import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colorScheme === "dark" ? Colors.grey[200] : Colors.primary,
        tabBarInactiveTintColor: colorScheme === "dark" ? Colors.grey[500] : Colors.grey[600],
        tabBarStyle: {
          backgroundColor: colorScheme === "dark" ? Colors.black : Colors.grey[100],
          borderTopColor: colorScheme === "dark" ? Colors.grey[800] : Colors.grey[200],
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "카메라",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "camera" : "camera-outline"} size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "기록",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "time" : "time-outline"} size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "설정",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
