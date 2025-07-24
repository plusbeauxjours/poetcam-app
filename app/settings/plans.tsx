import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Pressable,
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
    restorePurchases,
  } = useSubscriptionStore();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { width } = Dimensions.get("window");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    refreshSubscriptionData().catch(console.error);
  }, []);

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const success = await restorePurchases();
      if (success) {
        Alert.alert("복원 완료", "이전 구매 내역이 복원되었습니다.");
      } else {
        Alert.alert("복원 실패", "복원할 구매 내역이 없습니다.");
      }
    } catch (error) {
      Alert.alert("오류", "복원 중 문제가 발생했습니다.");
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePurchase = async (packageId: string) => {
    const pkg = offerings?.availablePackages.find((p) => p.identifier === packageId);
    if (!pkg) return;

    setSelectedPlanId(packageId);
    const success = await purchasePackage(pkg);
    
    if (success) {
      Alert.alert("구독 완료", "구독이 성공적으로 활성화되었습니다!");
    } else {
      Alert.alert("결제 오류", error || "구매를 진행할 수 없습니다.");
    }
    setSelectedPlanId(null);
  };

  // Empty state component
  const EmptyState = () => (
    <ThemedView style={styles.emptyState}>
      <Ionicons name="cart-outline" size={64} color={colors.icon} />
      <ThemedText style={styles.emptyStateText}>구독 상품을 불러올 수 없습니다</ThemedText>
      <TouchableOpacity
        style={[styles.retryButton, { borderColor: colors.tint }]}
        onPress={() => refreshSubscriptionData()}
        activeOpacity={0.8}>
        <ThemedText style={[styles.retryButtonText, { color: colors.tint }]}>
          다시 시도
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );

  // Loading state component
  const LoadingState = () => (
    <ThemedView style={styles.loadingState}>
      <ActivityIndicator size="large" color={colors.tint} />
      <ThemedText style={styles.loadingText}>구독 상품을 불러오는 중...</ThemedText>
    </ThemedView>
  );

  // Error state component
  const ErrorState = () => (
    <ThemedView style={styles.errorState}>
      <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
      <ThemedText style={styles.errorStateText}>오류가 발생했습니다</ThemedText>
      <ThemedText style={styles.errorMessage}>{error}</ThemedText>
      <TouchableOpacity
        style={[styles.retryButton, { borderColor: colors.tint }]}
        onPress={() => refreshSubscriptionData()}
        activeOpacity={0.8}>
        <ThemedText style={[styles.retryButtonText, { color: colors.tint }]}>
          다시 시도
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );

  // Subscription status banner
  const StatusBanner = () => {
    if (!subscriptionStatus.isActive) return null;

    return (
      <ThemedView style={[styles.statusBanner, { backgroundColor: colors.successBackground }]}>
        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        <View style={styles.statusInfo}>
          <ThemedText style={[styles.statusTitle, { color: colors.success }]}>
            프리미엄 구독 활성
          </ThemedText>
          <ThemedText style={[styles.statusDetail, { color: colors.success }]}>
            {subscriptionStatus.productIdentifier || "프리미엄 플랜"}
          </ThemedText>
        </View>
      </ThemedView>
    );
  };

  if (isLoading && availablePlans.length === 0) {
    return <LoadingState />;
  }

  if (error && availablePlans.length === 0) {
    return <ErrorState />;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshSubscriptionData} />
        }>
        
        <StatusBanner />
        
        {/* Header Section */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle}>
            프리미엄 구독
          </ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            무제한 시 생성과 프리미엄 기능을 이용하세요
          </ThemedText>
        </View>

        {/* Plans List */}
        {availablePlans.length === 0 ? (
          <EmptyState />
        ) : (
          <View style={styles.plansContainer}>
            {availablePlans.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              const isCurrentPlan = subscriptionStatus.isActive && 
                subscriptionStatus.productIdentifier === plan.id;
              
              return (
                <Pressable
                  key={plan.id}
                  style={({ pressed }) => [
                    styles.planCard,
                    {
                      borderColor: plan.isPopular ? colors.tint : colors.border,
                      borderWidth: plan.isPopular ? 2 : 1,
                      opacity: pressed ? 0.95 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                  disabled={isLoading || isCurrentPlan}
                  onPress={() => handlePurchase(plan.id)}>
                  
                  {/* Popular Badge */}
                  {plan.isPopular && (
                    <View style={[styles.popularBadge, { backgroundColor: colors.tint }]}>
                      <ThemedText style={styles.popularBadgeText}>인기</ThemedText>
                    </View>
                  )}

                  {/* Current Plan Badge */}
                  {isCurrentPlan && (
                    <View style={[styles.currentBadge, { backgroundColor: colors.successBackground }]}>
                      <ThemedText style={[styles.currentBadgeText, { color: colors.success }]}>
                        현재 플랜
                      </ThemedText>
                    </View>
                  )}

                  {/* Plan Content */}
                  <ThemedText type="subtitle" style={styles.planTitle}>
                    {plan.title}
                  </ThemedText>
                  <ThemedText style={styles.planPrice}>{plan.price}</ThemedText>
                  
                  {plan.duration === "ANNUAL" && (
                    <ThemedText style={[styles.savingsText, { color: colors.tint }]}>
                      2개월 무료 혜택!
                    </ThemedText>
                  )}

                  {/* Features List */}
                  <View style={styles.featuresContainer}>
                    {plan.features.map((feature, index) => (
                      <View key={`${plan.id}-${index}`} style={styles.featureRow}>
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={colors.tint}
                          style={styles.featureIcon}
                        />
                        <ThemedText style={styles.featureText}>{feature}</ThemedText>
                      </View>
                    ))}
                  </View>

                  {/* Action Button */}
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: isCurrentPlan ? colors.background : colors.tint,
                        borderWidth: isCurrentPlan ? 1 : 0,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => handlePurchase(plan.id)}
                    disabled={isLoading || isCurrentPlan}
                    activeOpacity={0.8}>
                    {isSelected && isLoading ? (
                      <ActivityIndicator color={isCurrentPlan ? colors.text : "#fff"} />
                    ) : (
                      <ThemedText 
                        style={[
                          styles.actionButtonText,
                          { color: isCurrentPlan ? colors.text : "#fff" }
                        ]}>
                        {isCurrentPlan ? "현재 구독 중" : "구독하기"}
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Restore Purchase Section */}
        <View style={styles.restoreSection}>
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={isRestoring}
            activeOpacity={0.7}>
            {isRestoring ? (
              <ActivityIndicator size="small" color={colors.tabIconDefault} />
            ) : (
              <ThemedText style={[styles.restoreText, { color: colors.tabIconDefault }]}>
                이전 구매 복원
              </ThemedText>
            )}
          </TouchableOpacity>
          
          <ThemedText style={[styles.legalText, { color: colors.tabIconDefault }]}>
            구독은 현재 기간이 끝나기 최소 24시간 전에 취소하지 않으면 자동으로 갱신됩니다.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Header styles
  header: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
  },
  
  // Status banner styles
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  statusInfo: {
    marginLeft: 12,
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  statusDetail: {
    fontSize: 14,
    marginTop: 2,
  },
  
  // Plans container
  plansContainer: {
    paddingHorizontal: 16,
  },
  
  // Plan card styles
  planCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    position: "relative",
    overflow: "hidden",
  },
  
  // Badge styles
  popularBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  currentBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  
  // Plan content styles
  planTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  savingsText: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 16,
  },
  
  // Features styles
  featuresContainer: {
    marginTop: 16,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  featureIcon: {
    marginRight: 10,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
  
  // Action button styles
  actionButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  
  // Empty state styles
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
    opacity: 0.7,
  },
  
  // Loading state styles
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    opacity: 0.7,
  },
  
  // Error state styles
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  errorStateText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.7,
    marginBottom: 24,
  },
  
  // Retry button styles
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  
  // Restore section styles
  restoreSection: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 32,
  },
  restoreButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: "500",
  },
  legalText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    opacity: 0.6,
  },
});
