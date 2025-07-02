import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { sendPushNotification, useNotifications } from "@/hooks/useNotifications";
import { useLocationStore } from "@/store/useLocationStore";
import { usePoetReminder } from "@/hooks/usePoetReminder";
import { useState } from "react";
import { Button, StyleSheet, View } from "react-native";

// TODO(minjaelee): 히스토리의 시를 만든 장소에 다시 가면 알림을 받기

export default function NotificationScreen() {
  const { expoPushToken } = useNotifications();
  const location = useLocationStore((s) => s.location);
  const [isSending, setIsSending] = useState(false);

  // Start location tracking and proximity notifications
  usePoetReminder();

  const handleSendNotification = async () => {
    if (!expoPushToken) {
      alert("Push token is not available yet.");
      return;
    }
    setIsSending(true);
    try {
      await sendPushNotification(
        expoPushToken,
        "Test Notification",
        "This is a test notification from PoetCam!"
      );
      alert("Notification sent!");
    } catch (error) {
      console.error("Failed to send notification", error);
      alert("Failed to send notification.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Notifications</ThemedText>
      <ThemedText style={styles.tokenText} selectable>
        Token: {expoPushToken || "Requesting token..."}
      </ThemedText>
      {location && (
        <ThemedText style={styles.tokenText}>
          Lat: {location.coords.latitude.toFixed(5)}, Lng: {location.coords.longitude.toFixed(5)}
        </ThemedText>
      )}
      <View style={styles.buttonContainer}>
        <Button
          title={isSending ? "Sending..." : "Send Test Notification"}
          onPress={handleSendNotification}
          disabled={!expoPushToken || isSending}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    alignItems: "center",
  },
  tokenText: {
    marginTop: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    textAlign: "center",
  },
  buttonContainer: {
    marginTop: 24,
  },
});
