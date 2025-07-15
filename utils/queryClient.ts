import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient, onlineManager } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";

// ---------- Network → React-Query Online Manager ----------
// Attach NetInfo listener so React Query knows when we are online / offline.
onlineManager.setEventListener((setOnline) => {
  // NetInfo works on native & web (Expo bundles it).  It reports connectivity & reachability.
  const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const isOnline = Boolean(state.isConnected && state.isInternetReachable);
    setOnline(isOnline);
  });
  return unsubscribe;
});

// ---------- QueryClient Singleton ----------
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5 minutes stale-time to keep things fast while offline
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
    mutations: {
      retry: 2,
    },
  },
});

// ---------- Cache Persistence (Offline Support) ----------
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "react-query-cache",
  throttleTime: 1000, // throttle writes to AsyncStorage
});

persistQueryClient({
  queryClient,
  persister: asyncStoragePersister,
  maxAge: 1000 * 60 * 60 * 6, // Persist for 6 hours
});
