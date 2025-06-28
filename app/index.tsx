import { Colors } from "@/constants/Colors";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();

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
      <CameraView style={styles.camera} facing="back" />
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          activeOpacity={1}
          onPress={() => {
            console.log("take photo");
          }}>
          <View style={styles.innerButton}>Take Photo</View>
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
    alignItems: "center",
    justifyContent: "center",
    width: 320,
    height: 110,
    bottom: 60,
    left: "50%",
    right: "50%",
    transform: [{ translateX: -160 }],
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 100,
    shadowColor: Colors.grey[800],
    shadowOffset: { width: 0.5, height: 2 },
    shadowOpacity: 0.5,
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
    shadowColor: Colors.grey[800],
    shadowOffset: { width: 0.5, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
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
