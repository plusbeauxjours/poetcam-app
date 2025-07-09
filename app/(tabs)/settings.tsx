import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors as AppColors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { Alert, FlatList, Pressable, StyleSheet, TouchableOpacity } from "react-native";

const settingsItems = [
  { id: "profile", name: "프로필", href: "/settings/profile", icon: "person-circle-outline" },
  {
    id: "notification",
    name: "알림",
    href: "/settings/notification",
    icon: "notifications-outline",
  },
  { id: "plans", name: "요금제", href: "/settings/plans", icon: "rocket-outline" },
  { id: "language", name: "언어", href: "/settings/language", icon: "language-outline" },
  { id: "dark-mode", name: "테마", href: "/settings/dark-mode", icon: "contrast-outline" },
  { id: "account", name: "계정", href: "/settings/account", icon: "key-outline" },
  { id: "about", name: "정보", href: "/settings/about", icon: "information-circle-outline" },
  { id: "donation", name: "후원", href: "/settings/donation", icon: "heart-outline" },
  { id: "agent", name: "AI 에이전트", href: "/settings/agent", icon: "options-outline" },
  { id: "history", name: "기록", href: "/settings/history", icon: "bug-outline" },
];

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const { signOut } = useAuthStore();

  const iconColor = colorScheme === "dark" ? AppColors.grey[200] : AppColors.grey[800];
  const separatorColor = colorScheme === "dark" ? AppColors.grey[800] : AppColors.grey[200];

  const handleSignOut = () => {
    Alert.alert("로그아웃", "정말 로그아웃하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  };

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
        ListFooterComponent={() => (
          <ThemedView style={styles.footer}>
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
              <ThemedText style={styles.signOutText}>로그아웃</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 4,
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
    marginHorizontal: 4,
  },
  footer: {
    marginTop: 32,
    paddingTop: 16,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  signOutText: {
    marginLeft: 16,
    fontSize: 16,
    color: "#e74c3c",
  },
});
