import { useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function SplashScreen() {
  const [, requestCameraPermission] = useCameraPermissions();
  const [, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();

  useEffect(() => {
    (async () => {
      await requestCameraPermission();
      await requestMediaPermission();
      setTimeout(() => {
        router.replace("/camera");
      }, 500);
    })();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
