import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Alert, Linking } from "react-native";

export function useCurrentLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let subscriber: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        Alert.alert(
          "Permission Denied",
          "Location permission is required",
          [
            { text: "Open Settings", onPress: () => Linking.openSettings() },
            { text: "OK" },
          ]
        );
        return;
      }

      subscriber = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 25,
          timeInterval: 10000,
        },
        (loc) => setLocation(loc)
      );
    })();

    return () => {
      if (subscriber) {
        subscriber.remove();
      }
    };
  }, []);

  return { location, errorMsg };
}
