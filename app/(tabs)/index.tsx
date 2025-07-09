import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { sendPushNotification, useNotifications } from "@/hooks/useNotifications";
import { useLocationStore } from "@/store/useLocationStore";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Camera, Images, Settings } from "lucide-react-native";
import { useRef } from "react";
import { Alert, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";

// TODO(minjaelee): 1:1의 비율로 (카메라와 앨범 모두)

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const { expoPushToken, permissionState } = useNotifications();
  const location = useLocationStore((s) => s.location);

  // 권한 로딩 중
  if (!permission) {
    return (
      <ThemedView style={styles.permissionContainer}>
        <Camera size={64} color={Colors.grey[400]} />
        <ThemedText style={styles.permissionText}>카메라 권한을 확인 중입니다...</ThemedText>
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
          사진을 찍어 시를 작성하기 위해 카메라 접근 권한이 필요합니다.
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
      Alert.alert("Permission Denied", "Sorry, we need camera roll permissions to make this work!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      router.push({
        pathname: "/result",
        params: { imageUri: result.assets[0].uri },
      });
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });

        if (photo) {
          router.push({
            pathname: "/result",
            params: { imageUri: photo.uri },
          });
        }
      } catch (error) {
        console.error("사진 촬영 실패:", error);
        Alert.alert("오류", "사진을 촬영하는 중 오류가 발생했습니다.");
      }
    }
  };

  const handleSettingsLongPress = async () => {
    // 알림 테스트 기능
    if (!permissionState.granted) {
      Alert.alert("알림 테스트", "알림 권한이 없습니다. 설정에서 알림을 활성화하시겠습니까?", [
        { text: "취소", style: "cancel" },
        { text: "설정으로 이동", onPress: () => router.push("/settings/notification") },
      ]);
      return;
    }

    if (!expoPushToken) {
      Alert.alert("알림 테스트", "푸시 토큰을 가져올 수 없습니다.");
      return;
    }

    try {
      const locationText = location
        ? `위치: ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`
        : "위치 정보 없음";

      await sendPushNotification(
        expoPushToken,
        "📸 카메라에서 테스트",
        `카메라 화면에서 알림 테스트\n${locationText}`,
        {
          type: "camera_test",
          timestamp: new Date().toISOString(),
        }
      );

      Alert.alert("✅ 알림 전송됨", "테스트 알림이 전송되었습니다!");
    } catch (error) {
      Alert.alert("❌ 알림 실패", "알림 전송에 실패했습니다.");
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.galleryButton} onPress={openAlbum}>
            <Images size={24} color="white" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>

          <Pressable
            style={styles.settingsButton}
            onPress={() => router.push("/(tabs)/settings")}
            onLongPress={handleSettingsLongPress}
            delayLongPress={800}>
            <Settings size={24} color="white" />
          </Pressable>
        </View>
      </CameraView>
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
  permissionText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 16,
    textAlign: "center",
  },
  galleryButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.grey[700],
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  captureButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.grey[700],
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  captureButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.grey[600],
  },
  settingsButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.grey[700],
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
});
