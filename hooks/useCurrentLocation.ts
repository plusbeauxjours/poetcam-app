import * as Location from "expo-location";
import { useEffect, useState } from "react";

export function useCurrentLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let subscriber: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      subscriber = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 1,
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
