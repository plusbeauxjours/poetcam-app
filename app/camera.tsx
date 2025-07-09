import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { Button, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [type, setType] = useState<"front" | "back">("back");
  const [flash, setFlash] = useState<"off" | "on" | "auto">("off");
  const cameraRef = useRef(null);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center" }}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={type} flash={flash} />
      <View style={styles.controls}>
        <TouchableOpacity onPress={() => setType(type === "back" ? "front" : "back")}>
          <MaterialCommunityIcons name="camera-switch" size={32} color="white" />
        </TouchableOpacity>
        <TouchableOpacity /* onPress={handleTakePicture} */>
          <MaterialCommunityIcons name="camera" size={48} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFlash(flash === "off" ? "on" : flash === "on" ? "auto" : "off")}>
          <MaterialCommunityIcons
            name={flash === "off" ? "flash-off" : flash === "on" ? "flash" : "flash-auto"}
            size={32}
            color="white"
          />
        </TouchableOpacity>
        {/* <TouchableOpacity onPress={handleOpenGallery}>
          <MaterialCommunityIcons name="image-multiple" size={32} color="white" />
        </TouchableOpacity> */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "black",
  },
  camera: {
    flex: 1,
  },
  controls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
});
