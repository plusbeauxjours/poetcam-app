import { Colors } from "@/constants/Colors";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Images, Settings } from "lucide-react-native";
import { useRef } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View />;
  }

  const openAlbum = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Sorry, we need camera roll permissions to make this work!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      router.push({ pathname: "/result", params: { imageUri: result.assets[0].uri } });
    }
  };

  const takePhoto = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      if (photo) {
        router.push({ pathname: "/result", params: { imageUri: photo.uri } });
      }
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back" ref={cameraRef} />
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={{ ...styles.sideButton, marginLeft: 10 }}
          activeOpacity={1}
          onPress={openAlbum}>
          <Images color={Colors.grey[300]} size={20} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} activeOpacity={1} onPress={takePhoto}>
          <View style={styles.innerButton} />
        </TouchableOpacity>
        <TouchableOpacity
          style={{ ...styles.sideButton, marginRight: 10 }}
          activeOpacity={1}
          onPress={() => {
            console.log("Settings button pressed");
          }}>
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
});
