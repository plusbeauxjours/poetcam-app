import { REVENUECAT_API_KEY_ANDROID, REVENUECAT_API_KEY_IOS } from "@env";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesError,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";

const OFFERINGS_CACHE_KEY = "@offerings_cache";
const OFFERINGS_CACHE_TTL = 3600; // 1 hour

export class RevenueCatService {
  private static instance: RevenueCatService;
  private initialized = false;

  private async loadCachedOfferings(): Promise<PurchasesOffering | null> {
    try {
      const raw = await AsyncStorage.getItem(OFFERINGS_CACHE_KEY);
      if (!raw) return null;
      const cached = JSON.parse(raw) as { timestamp: number; data: PurchasesOffering | null };
      if (Date.now() - cached.timestamp > OFFERINGS_CACHE_TTL * 1000) {
        await AsyncStorage.removeItem(OFFERINGS_CACHE_KEY);
        return null;
      }
      return cached.data;
    } catch (error) {
      console.warn('Failed to load offerings cache', error);
      return null;
    }
  }

  private async saveCachedOfferings(offerings: PurchasesOffering | null): Promise<void> {
    try {
      const data = { timestamp: Date.now(), data: offerings };
      await AsyncStorage.setItem(OFFERINGS_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save offerings cache', error);
    }
  }

  static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  /**
   * Initialize RevenueCat SDK with platform-specific API keys
   */
  async initialize(): Promise<boolean> {
    try {
      if (this.initialized) {
        console.log("RevenueCat already initialized");
        return true;
      }

      const apiKey = Platform.OS === "ios" ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

      if (!apiKey) {
        throw new Error(`RevenueCat API key not found for platform: ${Platform.OS}`);
      }

      await Purchases.configure({ apiKey });

      // Enable debug logs in development
      if (__DEV__) {
        await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      this.initialized = true;
      console.log("RevenueCat initialized successfully");
      return true;
    } catch (error) {
      console.error("Failed to initialize RevenueCat:", error);
      return false;
    }
  }

  /**
   * Set user ID for RevenueCat
   */
  async setUserID(userID: string): Promise<boolean> {
    try {
      if (!this.initialized) {
        console.warn("RevenueCat not initialized. Call initialize() first.");
        return false;
      }

      await Purchases.logIn(userID);
      console.log("User ID set for RevenueCat:", userID);
      return true;
    } catch (error) {
      console.error("Failed to set user ID:", error);
      return false;
    }
  }

  /**
   * Get current customer info
   */
  async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      if (!this.initialized) {
        console.warn("RevenueCat not initialized. Call initialize() first.");
        return null;
      }

      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (error) {
      console.error("Failed to get customer info:", error);
      return null;
    }
  }

  /**
   * Get available offerings (subscription plans)
   */
  async getOfferings(forceRefresh = false): Promise<PurchasesOffering | null> {
    try {
      if (!this.initialized) {
        console.warn("RevenueCat not initialized. Call initialize() first.");
        return null;
      }

      if (!forceRefresh) {
        const cached = await this.loadCachedOfferings();
        if (cached) return cached;
      }

      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      await this.saveCachedOfferings(current);
      return current;
    } catch (error) {
      console.error("Failed to get offerings:", error);
      return null;
    }
  }

  /**
   * Get single product information from cached offerings
   */
  async getProductInfo(identifier: string): Promise<PurchasesPackage | null> {
    const offerings = await this.getOfferings();
    if (!offerings) return null;
    const pkg = offerings.availablePackages.find((p) => p.identifier === identifier);
    return pkg || null;
  }

  /**
   * Purchase a package
   */
  async purchasePackage(
    packageToPurchase: PurchasesPackage
  ): Promise<{ customerInfo: CustomerInfo | null; error: string | null }> {
    try {
      if (!this.initialized) {
        return { customerInfo: null, error: "RevenueCat not initialized" };
      }

      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      return { customerInfo, error: null };
    } catch (error) {
      console.error("Purchase failed:", error);
      const purchaseError = error as PurchasesError;
      return { customerInfo: null, error: purchaseError.message };
    }
  }

  /**
   * Restore purchases
   */
  async restorePurchases(): Promise<CustomerInfo | null> {
    try {
      if (!this.initialized) {
        console.warn("RevenueCat not initialized. Call initialize() first.");
        return null;
      }

      const customerInfo = await Purchases.restorePurchases();
      return customerInfo;
    } catch (error) {
      console.error("Failed to restore purchases:", error);
      return null;
    }
  }

  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo();
      if (!customerInfo) return false;

      // Check if user has any active entitlements
      const activeEntitlements = Object.keys(customerInfo.entitlements.active);
      return activeEntitlements.length > 0;
    } catch (error) {
      console.error("Failed to check subscription status:", error);
      return false;
    }
  }

  /**
   * Get subscription status details
   */
  async getSubscriptionStatus(): Promise<{
    isActive: boolean;
    expirationDate?: string;
    productIdentifier?: string;
  }> {
    try {
      const customerInfo = await this.getCustomerInfo();
      if (!customerInfo) {
        return { isActive: false };
      }

      const activeEntitlements = Object.values(customerInfo.entitlements.active);

      if (activeEntitlements.length > 0) {
        const entitlement = activeEntitlements[0];
        return {
          isActive: true,
          expirationDate: entitlement.expirationDate || undefined,
          productIdentifier: entitlement.productIdentifier,
        };
      }

      return { isActive: false };
    } catch (error) {
      console.error("Failed to get subscription status:", error);
      return { isActive: false };
    }
  }

  /**
   * Log out user
   */
  async logOut(): Promise<boolean> {
    try {
      if (!this.initialized) {
        console.warn("RevenueCat not initialized. Call initialize() first.");
        return false;
      }

      await Purchases.logOut();
      console.log("User logged out from RevenueCat");
      return true;
    } catch (error) {
      console.error("Failed to log out user:", error);
      return false;
    }
  }
}

export default RevenueCatService.getInstance();
