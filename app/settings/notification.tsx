import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { sendPushNotification, useNotifications } from "@/hooks/useNotifications";
import { useState } from "react";
import { Button, StyleSheet, View } from "react-native";

export default function NotificationScreen() {
  const { expoPushToken } = useNotifications();
  const [isSending, setIsSending] = useState(false);

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
