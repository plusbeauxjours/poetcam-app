import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { sendPushNotification, useNotifications } from "@/hooks/useNotifications";
import { useLocationStore } from "@/store/useLocationStore";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Switch, TouchableOpacity, View } from "react-native";

// TODO(minjaelee): 히스토리의 시를 만든 장소에 다시 가면 알림을 받기

export default function NotificationScreen() {
  const { expoPushToken, permissionState, isLoading, errorMsg, requestNotificationPermission } =
    useNotifications();
  const location = useLocationStore((s) => s.location);
  const [isSending, setIsSending] = useState(false);
  const [locationNotificationsEnabled, setLocationNotificationsEnabled] = useState(false);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      Alert.alert("성공", "알림 권한이 허용되었습니다!");
    }
  };

  const handleSendTestNotification = async () => {
    if (!expoPushToken) {
      Alert.alert("오류", "푸시 토큰을 사용할 수 없습니다.");
      return;
    }

    setIsSending(true);
    try {
      await sendPushNotification(
        expoPushToken,
        "테스트 알림",
        "PoetCam에서 보내는 테스트 알림입니다!",
        { type: "test", timestamp: new Date().toISOString() }
      );
      Alert.alert("성공", "테스트 알림이 전송되었습니다!");
    } catch (error) {
      console.error("Failed to send notification", error);
      Alert.alert("실패", "알림 전송에 실패했습니다.");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <ThemedText style={styles.loadingText}>알림 설정을 불러오는 중...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        알림 설정
      </ThemedText>

      {/* 권한 상태 섹션 */}
      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          권한 상태
        </ThemedText>

        <View style={styles.permissionCard}>
          <View style={styles.permissionHeader}>
            <Ionicons
              name={permissionState.granted ? "checkmark-circle" : "alert-circle"}
              size={24}
              color={permissionState.granted ? Colors.success : Colors.warning}
            />
            <ThemedText style={styles.permissionTitle}>
              {permissionState.granted ? "알림 권한 허용됨" : "알림 권한 필요"}
            </ThemedText>
          </View>

          {errorMsg && <ThemedText style={styles.errorText}>{errorMsg}</ThemedText>}

          {!permissionState.granted && (
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={handleRequestPermission}
              disabled={!permissionState.canAskAgain}>
              <ThemedText style={styles.permissionButtonText}>
                {permissionState.canAskAgain ? "권한 요청하기" : "설정에서 허용하기"}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 알림 설정 섹션 */}
      {permissionState.granted && (
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            알림 설정
          </ThemedText>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <ThemedText style={styles.settingLabel}>위치 기반 알림</ThemedText>
              <ThemedText style={styles.settingDescription}>
                이전에 시를 작성한 장소에 다시 방문하면 알림을 받습니다
              </ThemedText>
            </View>
            <Switch
              value={locationNotificationsEnabled}
              onValueChange={setLocationNotificationsEnabled}
              trackColor={{ false: Colors.grey[300], true: Colors.primary }}
              thumbColor={locationNotificationsEnabled ? Colors.grey[100] : Colors.grey[400]}
            />
          </View>
        </View>
      )}

      {/* 디버그 정보 섹션 */}
      {permissionState.granted && (
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            디버그 정보
          </ThemedText>

          <View style={styles.debugCard}>
            <ThemedText style={styles.debugLabel}>푸시 토큰:</ThemedText>
            <ThemedText style={styles.debugValue} selectable numberOfLines={3}>
              {expoPushToken || "토큰을 가져오는 중..."}
            </ThemedText>

            {location && (
              <>
                <ThemedText style={styles.debugLabel}>현재 위치:</ThemedText>
                <ThemedText style={styles.debugValue}>
                  위도: {location.coords.latitude.toFixed(6)}
                  {"\n"}
                  경도: {location.coords.longitude.toFixed(6)}
                </ThemedText>
              </>
            )}
          </View>

          <TouchableOpacity
            style={[styles.testButton, (!expoPushToken || isSending) && styles.disabledButton]}
            onPress={handleSendTestNotification}
            disabled={!expoPushToken || isSending}>
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={styles.testButtonText}>테스트 알림 전송</ThemedText>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  title: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 18,
    fontWeight: "600",
  },
  permissionCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.grey[100],
  },
  permissionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  permissionTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginBottom: 12,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  debugCard: {
    padding: 16,
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    marginBottom: 16,
  },
  debugLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 4,
  },
  debugValue: {
    fontSize: 12,
    opacity: 0.8,
    fontFamily: "monospace",
  },
  testButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: Colors.grey[400],
  },
  testButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
