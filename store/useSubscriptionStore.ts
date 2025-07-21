import RevenueCatService from "@/services/revenueCatService";
import SubscriptionService from "@/services/subscriptionService";
import { SubscriptionFeatures, SubscriptionPlan, SubscriptionStatus } from "@/types/subscription";
import { CustomerInfo, PurchasesOffering, PurchasesPackage } from "react-native-purchases";
import { create } from "zustand";

interface SubscriptionStore {
  // State
  isInitialized: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering | null;
  subscriptionStatus: SubscriptionStatus;
  availablePlans: SubscriptionPlan[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setInitialized: (initialized: boolean) => void;
  setCustomerInfo: (customerInfo: CustomerInfo | null) => void;
  setOfferings: (offerings: PurchasesOffering | null) => void;
  setSubscriptionStatus: (status: SubscriptionStatus) => void;
  setAvailablePlans: (plans: SubscriptionPlan[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Methods
  initializeRevenueCat: () => Promise<boolean>;
  refreshSubscriptionData: () => Promise<void>;
  purchasePackage: (packageToPurchase: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  checkSubscriptionStatus: () => Promise<void>;
  getSubscriptionFeatures: () => SubscriptionFeatures;
  hasFeature: (feature: keyof SubscriptionFeatures) => boolean;
  reset: () => void;
}

const initialState = {
  isInitialized: false,
  customerInfo: null,
  offerings: null,
  subscriptionStatus: { isActive: false },
  availablePlans: [],
  isLoading: false,
  error: null,
};

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  ...initialState,

  // Setters
  setInitialized: (initialized) => set({ isInitialized: initialized }),
  setCustomerInfo: (customerInfo) => set({ customerInfo }),
  setOfferings: (offerings) => set({ offerings }),
  setSubscriptionStatus: (subscriptionStatus) => set({ subscriptionStatus }),
  setAvailablePlans: (availablePlans) => set({ availablePlans }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Initialize RevenueCat
  initializeRevenueCat: async () => {
    try {
      set({ isLoading: true, error: null });

      const success = await RevenueCatService.initialize();
      set({ isInitialized: success });

      if (success) {
        await get().refreshSubscriptionData();
      }

      return success;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to initialize RevenueCat";
      set({ error: errorMessage });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // Refresh subscription data
  refreshSubscriptionData: async () => {
    const { isInitialized } = get();
    if (!isInitialized) return;

    try {
      set({ isLoading: true, error: null });

      // Get customer info
      const customerInfo = await RevenueCatService.getCustomerInfo();
      set({ customerInfo });

      // Get subscription status
      const subscriptionStatus = await RevenueCatService.getSubscriptionStatus();
      set({ subscriptionStatus });

      // Get offerings
      const offerings = await RevenueCatService.getOfferings();
      set({ offerings });

      // Process offerings into available plans
      if (offerings?.availablePackages) {
        const plans: SubscriptionPlan[] = offerings.availablePackages.map((pkg) => ({
          id: pkg.identifier,
          title: pkg.storeProduct.title || pkg.identifier,
          description: pkg.storeProduct.description || `${pkg.packageType} plan`,
          price: pkg.storeProduct.priceString,
          duration: pkg.packageType,
          features: getFeaturesByPackageType(pkg.packageType),
          isPopular: pkg.packageType === "MONTHLY",
        }));
        set({ availablePlans: plans });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to refresh subscription data";
      set({ error: errorMessage });
    } finally {
      set({ isLoading: false });
    }
  },

  // Purchase package
  purchasePackage: async (packageToPurchase: PurchasesPackage) => {
    try {
      set({ isLoading: true, error: null });

      const result = await RevenueCatService.purchasePackage(packageToPurchase);

      if (result.error) {
        set({ error: result.error });
        return false;
      }

      if (result.customerInfo) {
        set({ customerInfo: result.customerInfo });
        await get().refreshSubscriptionData();
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Purchase failed";
      set({ error: errorMessage });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // Restore purchases
  restorePurchases: async () => {
    try {
      set({ isLoading: true, error: null });

      const customerInfo = await RevenueCatService.restorePurchases();

      if (customerInfo) {
        set({ customerInfo });
        await get().refreshSubscriptionData();
        return true;
      }

      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to restore purchases";
      set({ error: errorMessage });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // Check subscription status from backend and schedule renewal notification
  checkSubscriptionStatus: async () => {
    try {
      set({ isLoading: true, error: null });
      const status = await SubscriptionService.getStatus();
      set({ subscriptionStatus: status });

      if (status.expirationDate) {
        await SubscriptionService.scheduleRenewalNotification(status.expirationDate);
      } else {
        await SubscriptionService.cancelRenewalNotification();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to check subscription";
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Get subscription features based on current status
  getSubscriptionFeatures: () => {
    const { subscriptionStatus } = get();

    if (subscriptionStatus.isActive) {
      return {
        unlimitedPoems: true,
        premiumStyles: true,
        cloudSync: true,
        exportOptions: true,
        prioritySupport: true,
        adFree: true,
      };
    }

    // Free tier features
    return {
      unlimitedPoems: false,
      premiumStyles: false,
      cloudSync: false,
      exportOptions: false,
      prioritySupport: false,
      adFree: false,
    };
  },

  // Check if user has a specific feature
  hasFeature: (feature: keyof SubscriptionFeatures) => {
    const features = get().getSubscriptionFeatures();
    return features[feature];
  },

  // Reset store
  reset: () => set(initialState),
}));

// Helper function to get features by package type
function getFeaturesByPackageType(packageType: string): string[] {
  const baseFeatures = [
    "무제한 시 생성",
    "프리미엄 스타일",
    "클라우드 동기화",
    "내보내기 옵션",
    "우선 지원",
    "광고 없음",
  ];

  switch (packageType) {
    case "MONTHLY":
      return [...baseFeatures, "월간 구독"];
    case "ANNUAL":
      return [...baseFeatures, "연간 구독", "2개월 무료"];
    case "LIFETIME":
      return [...baseFeatures, "평생 이용", "일회성 결제"];
    default:
      return baseFeatures;
  }
}
