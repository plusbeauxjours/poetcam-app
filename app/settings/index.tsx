import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors as AppColors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { FlatList, Pressable, StyleSheet } from "react-native";

const settingsItems = [
  { id: "profile", name: "Profile", href: "/settings/profile", icon: "person-circle-outline" },
  {
    id: "notification",
    name: "Notifications",
    href: "/settings/notification",
    icon: "notifications-outline",
  },
  { id: "plans", name: "Plans", href: "/settings/plans", icon: "rocket-outline" },
  { id: "language", name: "Language", href: "/settings/language", icon: "language-outline" },
  { id: "dark-mode", name: "Appearance", href: "/settings/dark-mode", icon: "contrast-outline" },
  { id: "account", name: "Account", href: "/settings/account", icon: "key-outline" },
  { id: "about", name: "About", href: "/settings/about", icon: "information-circle-outline" },
  { id: "donation", name: "Support us", href: "/settings/donation", icon: "heart-outline" },
  { id: "agent", name: "AI Agent", href: "/settings/agent", icon: "options-outline" },
  { id: "log", name: "Logs", href: "/settings/log", icon: "bug-outline" },
];

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? "light";

  const iconColor = colorScheme === "dark" ? AppColors.grey[200] : AppColors.grey[800];
  const separatorColor = colorScheme === "dark" ? AppColors.grey[800] : AppColors.grey[200];

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={settingsItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Link href={item.href as any} asChild>
            <Pressable>
              <ThemedView style={styles.item}>
                <Ionicons name={item.icon as any} size={24} color={iconColor} style={styles.icon} />
                <ThemedText style={styles.itemText}>{item.name}</ThemedText>
                <Ionicons name="chevron-forward" size={24} color={iconColor} />
              </ThemedView>
            </Pressable>
          </Link>
        )}
        ItemSeparatorComponent={() => (
          <ThemedView style={[styles.separator, { backgroundColor: separatorColor }]} />
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 16,
  },
  itemText: {
    flex: 1,
    fontSize: 16,
  },
  separator: {
    height: 1,
    marginLeft: 56, // Icon size (24) + margin (16) * 2
  },
});
