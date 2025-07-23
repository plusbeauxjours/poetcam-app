import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { Button, Linking, Platform, View } from "react-native";

export function SubscriptionManageSection() {
  const { subscriptionStatus } = useSubscriptionStore();

  const handleManageSubscription = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("https://apps.apple.com/account/subscriptions");
    } else if (Platform.OS === "android") {
      Linking.openURL("https://play.google.com/store/account/subscriptions");
    }
  };

  const handleRefundInfo = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("https://reportaproblem.apple.com/");
    } else if (Platform.OS === "android") {
      Linking.openURL("https://support.google.com/googleplay/answer/2479637?hl=ko");
    }
  };

  if (!subscriptionStatus.isActive) return null;

  return (
    <View style={{ gap: 12 }}>
      <Button title="구독 관리(취소)" onPress={handleManageSubscription} />
      <Button title="환불 안내" onPress={handleRefundInfo} />
    </View>
  );
}
