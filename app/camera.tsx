import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Stack, router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Button, StyleSheet, TouchableOpacity, View } from "react-native";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [loading, setLoading] = useState(false);

  const capture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ base64: true });
    if (!photo) return;
    setLoading(true);
    try {
      const response = await fetch("https://example.com/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: photo.base64 }),
      });
      const data = await response.json();
      router.push({ pathname: "/result", params: { text: data?.text ?? "No result" } });
    } catch (e) {
      console.warn("Upload error:", e);
      Alert.alert("Error", "There was an error processing the image.");
    } finally {
      setLoading(false);
    }
  };

  const openAlbum = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission required", "You need to allow access to your photos to continue.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    setLoading(true);
    try {
      const response = await fetch("https://example.com/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: asset.base64 }),
      });
      const data = await response.json();
      router.push({ pathname: "/result", params: { text: data?.text ?? "No result" } });
    } catch (e) {
      console.warn("Upload error:", e);
      Alert.alert("Error", "There was an error processing the image.");
    } finally {
      setLoading(false);
    }
  };

  if (!permission || permission.status !== "granted") {
    return (
      <View style={styles.container}>
        <Button title="Request Permission" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: "Camera" }} />
      <CameraView style={{ flex: 1 }} facing="back" ref={cameraRef} />
      <TouchableOpacity style={styles.close} onPress={() => router.back()}>
        <Ionicons name="close" size={32} color="white" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.album} onPress={openAlbum} disabled={loading}>
        <Ionicons name="images" size={32} color="white" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.capture} onPress={capture} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          <Ionicons name="camera" size={48} color="white" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  capture: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "red",
    alignItems: "center",
    justifyContent: "center",
  },
  close: {
    position: "absolute",
    top: 40,
    left: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  album: {
    position: "absolute",
    bottom: 40,
    left: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
