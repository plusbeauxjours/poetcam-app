import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { Alert, Button, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [type, setType] = useState<"front" | "back">("back");
  const [flash, setFlash] = useState<"off" | "on" | "auto">("off");
  const cameraRef = useRef<any>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleTakePicture = async () => {
    if (!cameraRef.current) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync();
      setCapturedPhoto(photo);
      Alert.alert("촬영 성공", "사진이 임시로 저장되었습니다.");
    } catch (err) {
      Alert.alert("촬영 실패", "사진 촬영 중 오류가 발생했습니다.");
    } finally {
      setIsCapturing(false);
    }
  };

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
        <TouchableOpacity onPress={handleTakePicture} disabled={isCapturing}>
          <MaterialCommunityIcons name="camera" size={48} color={isCapturing ? "gray" : "white"} />
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
