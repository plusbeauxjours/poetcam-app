import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  if (mediaPermission && !mediaPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center" }}>
          We need your permission to access the media library
        </Text>
        <Button
          onPress={() => MediaLibrary.requestPermissionsAsync().then(setMediaPermission)}
          title="grant media permission"
        />
      </View>
    );
  }

  if (permission && !permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center" }}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
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
