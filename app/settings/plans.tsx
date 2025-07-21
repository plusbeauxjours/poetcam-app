import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

export default function PlansScreen() {
  const {
    availablePlans,
    offerings,
    purchasePackage,
    subscriptionStatus,
    refreshSubscriptionData,
    isLoading,
    error,
  } = useSubscriptionStore();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { width } = Dimensions.get("window");

  useEffect(() => {
    refreshSubscriptionData().catch(console.error);
  }, []);

  return (
    <ThemedView style={styles.container}>
      {subscriptionStatus.isActive ? (
        <ThemedText style={styles.statusText}>
          활성 구독: {subscriptionStatus.productIdentifier || ""}
        </ThemedText>
      ) : (
        <ThemedText style={styles.statusText}>활성화된 구독이 없습니다</ThemedText>
      )}
      <FlatList
        data={availablePlans}
        keyExtractor={(item) => item.id}
        refreshing={isLoading}
        onRefresh={() => refreshSubscriptionData()}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => {
          const pkg = offerings?.availablePackages.find((p) => p.identifier === item.id);
          const handlePurchase = async () => {
            if (!pkg) return;
            const success = await purchasePackage(pkg);
            if (!success) {
              Alert.alert("결제 오류", error || "구매를 진행할 수 없습니다.");
            }
          };

          return (
            <ThemedView
              style={[
                styles.card,
                {
                  borderColor: colors.border,
                  width: Math.min(width - 32, 420),
                },
              ]}>
              <ThemedText type="subtitle" style={styles.cardTitle}>
                {item.title}
              </ThemedText>
              <ThemedText style={styles.cardPrice}>{item.price}</ThemedText>
              <View style={styles.featuresList}>
                {item.features.map((feature) => (
                  <View key={feature} style={styles.featureItem}>
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={colors.success}
                      style={styles.featureIcon}
                    />
                    <ThemedText style={styles.featureText}>{feature}</ThemedText>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.subscribeButton, { backgroundColor: colors.tint }]}
                onPress={handlePurchase}
                disabled={isLoading}
                activeOpacity={0.8}>
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.subscribeButtonText}>구독하기</ThemedText>
                )}
              </TouchableOpacity>
            </ThemedView>
          );
        }}
        ListEmptyComponent={<ThemedText>구독 상품을 불러올 수 없습니다</ThemedText>}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 16,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignSelf: "center",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  featuresList: {
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  featureIcon: {
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
  },
  subscribeButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  subscribeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
