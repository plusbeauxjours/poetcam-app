import { CustomerInfo, PurchasesOffering } from "react-native-purchases";

export interface SubscriptionStatus {
  isActive: boolean;
  expirationDate?: string;
  productIdentifier?: string;
  willRenew?: boolean;
  periodType?: string;
}

export interface SubscriptionPlan {
  id: string;
  title: string;
  description: string;
  price: string;
  duration: string;
  features: string[];
  isPopular?: boolean;
}

export interface PurchaseResult {
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}

export interface RevenueCatState {
  isInitialized: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering | null;
  subscriptionStatus: SubscriptionStatus;
  availablePlans: SubscriptionPlan[];
  isLoading: boolean;
  error: string | null;
}

export interface SubscriptionFeatures {
  unlimitedPoems: boolean;
  premiumStyles: boolean;
  cloudSync: boolean;
  exportOptions: boolean;
  prioritySupport: boolean;
  adFree: boolean;
}
