import RevenueCatService from "@/services/revenueCatService";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect, useState } from "react";
import { CustomerInfo, PurchasesOffering, PurchasesPackage } from "react-native-purchases";

interface SubscriptionStatus {
  isActive: boolean;
  expirationDate?: string;
  productIdentifier?: string;
}

interface UseRevenueCatReturn {
  isInitialized: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering | null;
  subscriptionStatus: SubscriptionStatus;
  isLoading: boolean;
  error: string | null;
  // Methods
  initializeRevenueCat: () => Promise<boolean>;
  purchasePackage: (packageToPurchase: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshCustomerInfo: () => Promise<void>;
}

export function useRevenueCat(): UseRevenueCatReturn {
  const { session } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isActive: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize RevenueCat
   */
  const initializeRevenueCat = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const success = await RevenueCatService.initialize();
      setIsInitialized(success);

      if (success && session?.user?.id) {
        await RevenueCatService.setUserID(session.user.id);
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to initialize RevenueCat";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh customer info and subscription status
   */
  const refreshCustomerInfo = async (): Promise<void> => {
    if (!isInitialized) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get customer info
      const customerInfo = await RevenueCatService.getCustomerInfo();
      setCustomerInfo(customerInfo);

      // Get subscription status
      const status = await RevenueCatService.getSubscriptionStatus();
      setSubscriptionStatus(status);

      // Get offerings
      const offerings = await RevenueCatService.getOfferings();
      setOfferings(offerings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to refresh customer info";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Purchase a package
   */
  const purchasePackage = async (packageToPurchase: PurchasesPackage): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await RevenueCatService.purchasePackage(packageToPurchase);

      if (result.error) {
        setError(result.error);
        return false;
      }

      if (result.customerInfo) {
        setCustomerInfo(result.customerInfo);
        // Refresh subscription status after successful purchase
        await refreshCustomerInfo();
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Purchase failed";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Restore purchases
   */
  const restorePurchases = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const customerInfo = await RevenueCatService.restorePurchases();

      if (customerInfo) {
        setCustomerInfo(customerInfo);
        await refreshCustomerInfo();
        return true;
      }

      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to restore purchases";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize RevenueCat when hook mounts
  useEffect(() => {
    initializeRevenueCat();
  }, []);

  // Set user ID when session changes
  useEffect(() => {
    if (isInitialized && session?.user?.id) {
      RevenueCatService.setUserID(session.user.id);
      refreshCustomerInfo();
    }
  }, [isInitialized, session?.user?.id]);

  // Log out from RevenueCat when user logs out
  useEffect(() => {
    if (isInitialized && !session?.user?.id) {
      RevenueCatService.logOut();
      setCustomerInfo(null);
      setSubscriptionStatus({ isActive: false });
    }
  }, [isInitialized, session?.user?.id]);

  return {
    isInitialized,
    customerInfo,
    offerings,
    subscriptionStatus,
    isLoading,
    error,
    initializeRevenueCat,
    purchasePackage,
    restorePurchases,
    refreshCustomerInfo,
  };
}
