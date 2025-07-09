import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors as AppColors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { sendPushNotification, useNotifications } from "@/hooks/useNotifications";
import { useAuthStore } from "@/store/useAuthStore";
import { useLocationStore } from "@/store/useLocationStore";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

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
  const { expoPushToken, permissionState } = useNotifications();
  const location = useLocationStore((s) => s.location);
  const [isSending, setIsSending] = useState(false);

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

  const handleTestNotification = async () => {
    if (!permissionState.granted) {
      Alert.alert(
        "알림 권한 필요",
        "알림을 테스트하려면 먼저 알림 권한을 허용해주세요.\n\n설정 > 알림에서 권한을 활성화할 수 있습니다.",
        [
          { text: "취소", style: "cancel" },
          {
            text: "설정으로 이동",
            onPress: () => router.push("/settings/notification"),
          },
        ]
      );
      return;
    }

    if (!expoPushToken) {
      Alert.alert("오류", "푸시 토큰을 가져올 수 없습니다. 알림 설정을 확인해주세요.");
      return;
    }

    try {
      setIsSending(true);

      const locationText = location
        ? `현재 위치: ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(
            6
          )}`
        : "위치 정보 없음";

      await sendPushNotification(
        expoPushToken,
        "📱 포엣캠 테스트 알림",
        `알림이 정상적으로 작동합니다!\n${locationText}`,
        {
          type: "test",
          timestamp: new Date().toISOString(),
          location: location?.coords,
        }
      );

      Alert.alert("알림 전송 완료", "테스트 알림이 전송되었습니다.\n잠시 후 알림이 표시됩니다.", [
        { text: "확인" },
      ]);
    } catch (error) {
      console.error("알림 전송 실패:", error);
      Alert.alert(
        "알림 전송 실패",
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setIsSending(false);
    }
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
            {/* 알림 테스트 버튼 */}
            <TouchableOpacity
              style={[
                styles.testButton,
                {
                  backgroundColor: permissionState.granted
                    ? colorScheme === "dark"
                      ? AppColors.primary
                      : AppColors.primary
                    : colorScheme === "dark"
                    ? AppColors.grey[700]
                    : AppColors.grey[300],
                },
              ]}
              onPress={handleTestNotification}
              disabled={isSending}>
              <View style={styles.testButtonContent}>
                {isSending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="notifications" size={20} color="white" />
                )}
                <ThemedText style={styles.testButtonText}>
                  {isSending ? "전송 중..." : "알림 테스트"}
                </ThemedText>
              </View>
            </TouchableOpacity>

            {/* 권한 상태 표시 */}
            <View style={styles.statusContainer}>
              <Ionicons
                name={permissionState.granted ? "checkmark-circle" : "close-circle"}
                size={16}
                color={permissionState.granted ? "#10b981" : "#ef4444"}
              />
              <ThemedText
                style={[
                  styles.statusText,
                  { color: permissionState.granted ? "#10b981" : "#ef4444" },
                ]}>
                {permissionState.granted ? "알림 권한이 허용되었습니다" : "알림 권한이 필요합니다"}
              </ThemedText>
            </View>

            {/* 로그아웃 버튼 */}
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
  testButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  testButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  testButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    paddingVertical: 8,
  },
  statusText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "500",
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
