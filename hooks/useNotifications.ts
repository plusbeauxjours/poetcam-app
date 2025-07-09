import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface NotificationPermissionState {
  granted: boolean;
  canAskAgain: boolean;
  status: Notifications.PermissionStatus;
}

async function registerForPushNotificationsAsync(): Promise<{
  token?: string;
  error?: string;
  permissionState: NotificationPermissionState;
}> {
  if (!Constants.isDevice) {
    return {
      error: "물리적 디바이스에서만 푸시 알림을 사용할 수 있습니다",
      permissionState: {
        granted: false,
        canAskAgain: false,
        status: Notifications.PermissionStatus.DENIED,
      },
    };
  }

  try {
    const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    let finalCanAskAgain = canAskAgain;

    if (existingStatus !== "granted") {
      const { status, canAskAgain: newCanAskAgain } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      finalCanAskAgain = newCanAskAgain;
    }

    const permissionState: NotificationPermissionState = {
      granted: finalStatus === "granted",
      canAskAgain: finalCanAskAgain,
      status: finalStatus,
    };

    if (finalStatus !== "granted") {
      const errorMsg = finalCanAskAgain
        ? "알림 권한이 필요합니다. 다시 시도해주세요."
        : "알림 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.";

      return {
        error: errorMsg,
        permissionState,
      };
    }

    // Android에서 알림 채널 설정
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "기본 알림",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
        description: "PoetCam 앱의 기본 알림 채널입니다",
      });
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    return {
      token: tokenResponse.data,
      permissionState,
    };
  } catch (error) {
    return {
      error: "푸시 알림 토큰을 가져오는 중 오류가 발생했습니다",
      permissionState: {
        granted: false,
        canAskAgain: true,
        status: Notifications.PermissionStatus.UNDETERMINED,
      },
    };
  }
}

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState("");
  const [notification, setNotification] = useState<Notifications.Notification | false>(false);
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>({
    granted: false,
    canAskAgain: true,
    status: Notifications.PermissionStatus.UNDETERMINED,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  const requestNotificationPermission = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    const result = await registerForPushNotificationsAsync();

    setPermissionState(result.permissionState);

    if (result.error) {
      setErrorMsg(result.error);
    } else if (result.token) {
      setExpoPushToken(result.token);
    }

    setIsLoading(false);
    return result.permissionState.granted;
  };

  useEffect(() => {
    const initializeNotifications = async () => {
      const result = await registerForPushNotificationsAsync();

      setPermissionState(result.permissionState);

      if (result.error) {
        setErrorMsg(result.error);
      } else if (result.token) {
        setExpoPushToken(result.token);
      }

      setIsLoading(false);
    };

    initializeNotifications();

    // 알림 수신 리스너 설정
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("Notification response:", response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return {
    expoPushToken,
    notification,
    permissionState,
    isLoading,
    errorMsg,
    requestNotificationPermission,
  };
}

export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  if (!expoPushToken) {
    throw new Error("푸시 토큰이 없습니다");
  }

  const message = {
    to: expoPushToken,
    sound: "default",
    title,
    body,
    data: data || { source: "poetcam" },
  };

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`푸시 알림 전송 실패: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Push notification error:", error);
    throw error;
  }
}
