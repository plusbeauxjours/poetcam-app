import * as Location from "expo-location";
import { useEffect, useState } from "react";

export interface LocationPermissionState {
  granted: boolean;
  canAskAgain: boolean;
  status: Location.LocationPermissionResponse["status"];
}

export function useCurrentLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<LocationPermissionState>({
    granted: false,
    canAskAgain: true,
    status: Location.PermissionStatus.UNDETERMINED,
  });
  const [isLoading, setIsLoading] = useState(true);

  const requestLocationPermission = async () => {
    try {
      setIsLoading(true);
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

      const newPermissionState = {
        granted: status === "granted",
        canAskAgain,
        status,
      };

      setPermissionState(newPermissionState);

      if (status !== "granted") {
        if (canAskAgain) {
          setErrorMsg("위치 접근 권한이 필요합니다. 다시 시도해주세요.");
        } else {
          setErrorMsg("위치 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.");
        }
        setIsLoading(false);
        return false;
      }

      setErrorMsg(null);
      return true;
    } catch (error) {
      setErrorMsg("위치 권한 요청 중 오류가 발생했습니다.");
      setIsLoading(false);
      return false;
    }
  };

  const startLocationTracking = async () => {
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(currentLocation);

      const subscriber = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 25,
          timeInterval: 10000,
        },
        (loc) => setLocation(loc),
        () => setErrorMsg("위치 추적 중 오류가 발생했습니다")
      );

      setIsLoading(false);
      return subscriber;
    } catch (error) {
      setErrorMsg("현재 위치를 가져올 수 없습니다.");
      setIsLoading(false);
      return null;
    }
  };

  useEffect(() => {
    let subscriber: Location.LocationSubscription | null = null;

    const initializeLocation = async () => {
      // 먼저 현재 권한 상태 확인
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();

      setPermissionState({
        granted: status === "granted",
        canAskAgain,
        status,
      });

      if (status === "granted") {
        subscriber = await startLocationTracking();
      } else {
        setIsLoading(false);
        if (status === "denied" && !canAskAgain) {
          setErrorMsg("위치 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.");
        } else {
          setErrorMsg("위치 접근 권한이 필요합니다.");
        }
      }
    };

    initializeLocation();

    return () => {
      if (subscriber) {
        subscriber.remove();
      }
    };
  }, []);

  return {
    location,
    errorMsg,
    permissionState,
    isLoading,
    requestLocationPermission,
  };
}
