import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import { useRef, useState } from "react";
import { Alert, Button, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [type, setType] = useState<"front" | "back">("back");
  const [flash, setFlash] = useState<"off" | "on" | "auto">("off");
  const cameraRef = useRef<any>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);

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

  const handleOpenGallery = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("권한 필요", "갤러리 접근 권한이 필요합니다.");
      return;
    }
    try {
      const assets = await MediaLibrary.getAssetsAsync({
        mediaType: "photo",
        first: 50,
        sortBy: [["creationTime", false]],
      });
      if (assets.assets.length === 0) {
        Alert.alert("사진 없음", "갤러리에 사진이 없습니다.");
        return;
      }
      // 가장 최근 사진 1장만 선택(실제 앱에서는 선택 UI 필요)
      setSelectedPhoto(assets.assets[0]);
      Alert.alert("사진 선택", "가장 최근 사진이 선택되었습니다.");
    } catch (err) {
      Alert.alert("갤러리 오류", "사진을 불러오는 중 오류가 발생했습니다.");
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
        <TouchableOpacity onPress={handleOpenGallery}>
          <MaterialCommunityIcons name="image-multiple" size={32} color="white" />
        </TouchableOpacity>
      </View>
      {/* 선택된 사진 미리보기 (옵션) */}
      {selectedPhoto && (
        <View style={{ position: "absolute", top: 40, right: 20 }}>
          <Image
            source={{ uri: selectedPhoto.uri }}
            style={{ width: 80, height: 80, borderRadius: 8, borderWidth: 2, borderColor: "white" }}
          />
        </View>
      )}
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
