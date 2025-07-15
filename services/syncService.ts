// eslint-disable-next-line import/no-unresolved, @typescript-eslint/ban-ts-comment
import AsyncStorage from "@react-native-async-storage/async-storage";
// eslint-disable-next-line import/no-unresolved, @typescript-eslint/ban-ts-comment
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import type { ImageUploadOptions } from "../utils/storage";
import { uploadImage } from "../utils/storage";

// ---------- Types ----------
export type OfflineAction =
  | {
      type: "UPLOAD_IMAGE";
      payload: {
        localUri: string;
        options: Record<string, unknown>;
      };
    }
  | {
      type: "SAVE_POEM";
      payload: Record<string, unknown>;
    };

const QUEUE_KEY = "OFFLINE_ACTION_QUEUE";

// ---------- Queue Helpers ----------
async function getQueue(): Promise<OfflineAction[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as OfflineAction[]) : [];
}

async function setQueue(queue: OfflineAction[]): Promise<void> {
  if (queue.length) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } else {
    await AsyncStorage.removeItem(QUEUE_KEY);
  }
}

export async function queueOfflineAction(action: OfflineAction): Promise<void> {
  try {
    const queue = await getQueue();
    queue.push(action);
    await setQueue(queue);
  } catch (error) {
    console.error("[SyncService] Failed to queue action", error);
  }
}

// TODO: replace with real handlers once implemented in their respective modules
async function handleAction(action: OfflineAction): Promise<void> {
  switch (action.type) {
    case "UPLOAD_IMAGE":
      try {
        const result = await uploadImage(
          action.payload.localUri,
          action.payload.options as unknown as ImageUploadOptions
        );
        if (!result.success) {
          throw new Error(result.error || "Upload failed");
        }
        console.log("[SyncService] Image uploaded successfully:", result.url);
      } catch (error) {
        console.error("[SyncService] Image upload failed:", error);
        throw error; // Re-throw to keep in queue
      }
      return;
    case "SAVE_POEM":
      // eslint-disable-next-line no-console
      console.log("[SyncService] TODO – save poem when online", action.payload);
      return;
    default:
      return;
  }
}

export async function processOfflineQueue(): Promise<void> {
  const queue = await getQueue();
  if (!queue.length) return;

  const remaining: OfflineAction[] = [];

  for (const action of queue) {
    try {
      await handleAction(action);
    } catch (err) {
      console.warn("[SyncService] Action failed, keeping in queue", err);
      remaining.push(action);
    }
  }

  await setQueue(remaining);
}

export function initializeSyncService(): void {
  // Attempt to flush queue on app start
  processOfflineQueue().catch(console.error);

  // Re-attempt whenever connectivity changes to online
  NetInfo.addEventListener((state: NetInfoState) => {
    if (state.isConnected && state.isInternetReachable) {
      processOfflineQueue().catch(console.error);
    }
  });
}
