import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Camera, Images, Settings } from "lucide-react-native";
import { useRef } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";

// TODO(minjaelee): 1:1의 비율로 (카메라와 앨범 모두)

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // 권한 로딩 중
  if (!permission) {
    return (
      <ThemedView style={styles.permissionContainer}>
        <Camera size={64} color={Colors.grey[400]} />
        <ThemedText style={styles.permissionTitle}>카메라 준비 중...</ThemedText>
      </ThemedView>
    );
  }

  // 권한이 거부된 경우
  if (!permission.granted) {
    return (
      <ThemedView style={styles.permissionContainer}>
        <Camera size={64} color={Colors.grey[400]} />
        <ThemedText style={styles.permissionTitle}>카메라 권한이 필요합니다</ThemedText>
        <ThemedText style={styles.permissionDescription}>
          사진을 촬영하여 시를 작성하려면{"\n"}
          카메라 접근 권한을 허용해주세요
        </ThemedText>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <ThemedText style={styles.permissionButtonText}>권한 허용하기</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const openAlbum = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("갤러리 접근 권한 필요", "사진을 선택하려면 갤러리 접근 권한이 필요합니다.", [
        { text: "취소", style: "cancel" },
        { text: "설정으로 이동", onPress: () => {} },
      ]);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
      aspect: [1, 1], // 1:1 비율 권장
    });

    if (!result.canceled) {
      router.push({ pathname: "/result", params: { imageUri: result.assets[0].uri } });
    }
  };

  const takePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          base64: false,
          exif: true,
        });
        if (photo) {
          router.push({ pathname: "/result", params: { imageUri: photo.uri } });
        }
      } catch (error) {
        Alert.alert("촬영 실패", "사진 촬영 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        ref={cameraRef}
        ratio="1:1" // 1:1 비율 설정
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={{ ...styles.sideButton, marginLeft: 10 }}
          activeOpacity={0.7}
          onPress={openAlbum}>
          <Images color={Colors.grey[300]} size={20} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} activeOpacity={0.7} onPress={takePhoto}>
          <View style={styles.innerButton} />
        </TouchableOpacity>
        <TouchableOpacity
          style={{ ...styles.sideButton, marginRight: 10 }}
          activeOpacity={0.7}
          onPress={() => router.push("/settings")}>
          <Settings color={Colors.grey[300]} />
        </TouchableOpacity>
      </View>
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
  buttonContainer: {
    position: "absolute",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: 320,
    height: 110,
    bottom: 60,
    left: "50%",
    right: "50%",
    transform: [{ translateX: -160 }],
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 100,
    shadowColor: Colors.grey[900],
    shadowOffset: { width: 0.5, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  button: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    width: 90,
    height: 90,
    backgroundColor: Colors.grey[600],
    borderRadius: 100,
    shadowColor: Colors.grey[900],
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  sideButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    width: 60,
    height: 60,
    backgroundColor: Colors.grey[600],
    borderRadius: 100,
  },
  innerButton: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.grey[400],
    borderRadius: 100,
    opacity: 0.8,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 16,
    textAlign: "center",
  },
  permissionDescription: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    opacity: 0.7,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
