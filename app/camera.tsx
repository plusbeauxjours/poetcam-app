import { CameraView, useCameraPermissions } from "expo-camera";
import { Alert, Button, Linking, StyleSheet, Text, View } from "react-native";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center" }}>We need your permission to show the camera</Text>
        <Button
          onPress={async () => {
            const result = await requestPermission();
            if (!result.granted) {
              Alert.alert(
                "Permission Required",
                "Camera access is needed to take photos",
                [
                  { text: "Open Settings", onPress: () => Linking.openSettings() },
                  { text: "Cancel", style: "cancel" },
                ]
              );
            }
          }}
          title="grant permission"
        />
      </View>
    );
  }
  console.log("permission", permission);
  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  camera: {
    flex: 1,
  },
});
