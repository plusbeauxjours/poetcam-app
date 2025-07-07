import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { Alert, Linking } from "react-native";
import { useLocationStore } from "@/store/useLocationStore";
import { usePoetHistoryStore } from "@/store/usePoetHistoryStore";

const DISTANCE_THRESHOLD = 50; // meters

function getDistanceFromLatLonInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function usePoetReminder() {
  const { history } = usePoetHistoryStore();
  const setLocation = useLocationStore((s) => s.setLocation);
  const notifiedRef = useRef<Set<string>>(new Set());
  // keep latest history without re-subscribing to location updates
  const historyRef = useRef(history);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    let subscriber: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required for reminders",
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
        },
        (loc) => {
          setLocation(loc);
          historyRef.current.forEach((poet) => {
            if (notifiedRef.current.has(poet.id)) return;
            const d = getDistanceFromLatLonInMeters(
              loc.coords.latitude,
              loc.coords.longitude,
              poet.lat,
              poet.lng
            );
            if (d <= DISTANCE_THRESHOLD) {
              Notifications.scheduleNotificationAsync({
                content: {
                  title: "Poem Nearby",
                  body: poet.text,
                },
                trigger: null,
              });
              notifiedRef.current.add(poet.id);
            }
          });
        }
      );
    })();

    return () => {
      if (subscriber) {
        subscriber.remove();
      }
    };
  }, [setLocation]);
}
