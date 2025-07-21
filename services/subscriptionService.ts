import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as Notifications from "expo-notifications";
import { supabase } from "../supabase";
import type { SubscriptionStatus } from "../types/subscription";

const STORAGE_KEY = "@subscription_status";
const NOTI_KEY = "@subscription_renewal_noti";

class SubscriptionService {
  private async fetchRemoteStatus(): Promise<SubscriptionStatus | null> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return null;
      }
      const { data, error } = await supabase
        .from("users")
        .select("subscription_type, subscription_expires_at")
        .eq("id", user.id)
        .single();
      if (error || !data) {
        return null;
      }
      const isActive = data.subscription_type === "premium" &&
        (!data.subscription_expires_at || new Date(data.subscription_expires_at) > new Date());
      const status: SubscriptionStatus = {
        isActive,
        expirationDate: data.subscription_expires_at || undefined,
        productIdentifier: data.subscription_type,
        willRenew: Boolean(data.subscription_expires_at),
        periodType: data.subscription_type,
      };
      return status;
    } catch (e) {
      console.warn("[SubscriptionService] remote fetch failed", e);
      return null;
    }
  }

  private async getStoredStatus(): Promise<SubscriptionStatus | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SubscriptionStatus) : null;
    } catch (e) {
      console.warn("[SubscriptionService] load stored status failed", e);
      return null;
    }
  }

  private async storeStatus(status: SubscriptionStatus): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(status));
    } catch (e) {
      console.warn("[SubscriptionService] store status failed", e);
    }
  }

  async getStatus(forceRefresh = false): Promise<SubscriptionStatus> {
    const net = await NetInfo.fetch();
    if (!net.isConnected || !net.isInternetReachable) {
      const cached = await this.getStoredStatus();
      return cached || { isActive: false };
    }

    if (!forceRefresh) {
      const cached = await this.getStoredStatus();
      if (cached) {
        return cached;
      }
    }

    const remote = await this.fetchRemoteStatus();
    if (remote) {
      await this.storeStatus(remote);
      return remote;
    }
    const fallback = await this.getStoredStatus();
    return fallback || { isActive: false };
  }

  async scheduleRenewalNotification(expirationDate: string): Promise<void> {
    try {
      const triggerDate = new Date(expirationDate);
      triggerDate.setDate(triggerDate.getDate() - 1);
      if (triggerDate <= new Date()) return;
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "구독 갱신 알림",
          body: "구독이 곧 만료됩니다. 갱신을 진행해주세요.",
        },
        trigger: triggerDate,
      });
      await AsyncStorage.setItem(NOTI_KEY, id);
    } catch (e) {
      console.warn("[SubscriptionService] schedule notification failed", e);
    }
  }

  async cancelRenewalNotification(): Promise<void> {
    try {
      const id = await AsyncStorage.getItem(NOTI_KEY);
      if (id) {
        await Notifications.cancelScheduledNotificationAsync(id);
        await AsyncStorage.removeItem(NOTI_KEY);
      }
    } catch (e) {
      console.warn("[SubscriptionService] cancel notification failed", e);
    }
  }
}

export default new SubscriptionService();
