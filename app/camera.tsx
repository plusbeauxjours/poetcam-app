import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { PinchGestureHandler } from "react-native-gesture-handler";

const window = Dimensions.get("window");

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [type, setType] = useState<"front" | "back">("back");
  const [flash, setFlash] = useState<"off" | "on" | "auto">("off");
  const cameraRef = useRef<any>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [exifData, setExifData] = useState<any>(null);

  const handleTakePicture = async () => {
    if (!cameraRef.current) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ exif: true });
      setCapturedPhoto(photo);
      setPreviewImage(photo.uri);
      setPreviewVisible(true);
      setExifData(photo.exif || null);
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
      setSelectedPhoto(assets.assets[0]);
      setPreviewImage(assets.assets[0].uri);
      setPreviewVisible(true);
      // EXIF 데이터 추출 (MediaLibrary는 직접 제공하지 않으므로 FileSystem 활용)
      try {
        const info = await FileSystem.getInfoAsync(assets.assets[0].uri, { size: true });
        setExifData({ size: info.size, uri: info.uri });
      } catch {}
      Alert.alert("사진 선택", "가장 최근 사진이 선택되었습니다.");
    } catch (err) {
      Alert.alert("갤러리 오류", "사진을 불러오는 중 오류가 발생했습니다.");
    }
  };

  // 미리보기 확대/축소(핀치줌)
  const onPinchEvent = (event: any) => {
    setScale(Math.max(1, Math.min(event.nativeEvent.scale, 4)));
  };

  // 미리보기 회전
  const handleRotate = () => {
    setRotation((prev) => prev + 90);
  };

  // 미리보기 크롭(좌우 10% 잘라서 보여주기)
  const handleCrop = () => {
    Alert.alert("크롭", "UI만 예시로, 실제 크롭은 별도 라이브러리 필요");
  };

  // 사진 압축 및 저장
  const handleSave = async () => {
    if (!previewImage) return;
    setIsSaving(true);
    try {
      // 압축 및 최적화 (품질 0.7, 회전 적용)
      const manipResult = await ImageManipulator.manipulateAsync(
        previewImage,
        [rotation ? { rotate: rotation } : {}],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      // MediaLibrary에 저장
      const asset = await MediaLibrary.createAssetAsync(manipResult.uri);
      setIsSaving(false);
      Alert.alert("저장 성공", "사진이 갤러리에 저장되었습니다.");
    } catch (err) {
      setIsSaving(false);
      Alert.alert("저장 실패", "사진 저장 중 오류가 발생했습니다.");
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
      {/* 전체 화면 미리보기 모달 */}
      <Modal visible={previewVisible} transparent animationType="fade">
        <View style={styles.previewModal}>
          <PinchGestureHandler onGestureEvent={onPinchEvent}>
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              {previewImage && (
                <Image
                  source={{ uri: previewImage }}
                  style={{
                    width: window.width,
                    height: window.width,
                    transform: [{ scale }, { rotate: `${rotation}deg` }],
                    resizeMode: "contain",
                  }}
                />
              )}
              {isSaving && (
                <ActivityIndicator
                  size="large"
                  color="#fff"
                  style={{ position: "absolute", top: 40 }}
                />
              )}
            </View>
          </PinchGestureHandler>
          <View style={styles.previewControls}>
            <TouchableOpacity onPress={handleRotate}>
              <MaterialCommunityIcons name="rotate-right" size={32} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCrop}>
              <MaterialCommunityIcons name="crop" size={32} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              <MaterialCommunityIcons
                name="content-save"
                size={32}
                color={isSaving ? "gray" : "white"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setPreviewVisible(false);
                setScale(1);
                setRotation(0);
              }}>
              <MaterialCommunityIcons name="close" size={32} color="white" />
            </TouchableOpacity>
          </View>
          {/* EXIF/메타데이터 간단 표시 */}
          {exifData && (
            <View
              style={{
                position: "absolute",
                top: 40,
                left: 20,
                backgroundColor: "rgba(0,0,0,0.6)",
                padding: 8,
                borderRadius: 8,
              }}>
              <Text style={{ color: "white", fontSize: 12 }}>메타데이터:</Text>
              {Object.entries(exifData).map(([k, v]) => (
                <Text key={k} style={{ color: "white", fontSize: 10 }}>
                  {k}: {String(v)}
                </Text>
              ))}
            </View>
          )}
        </View>
      </Modal>
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
  previewModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewControls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
});
