import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Stack, router } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [loading, setLoading] = useState(false);

  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const MIN_SIZE = screenWidth * 0.3;
  const HANDLE_SIZE = 30;

  const rectX = useSharedValue((screenWidth - MIN_SIZE) / 2);
  const rectY = useSharedValue((screenHeight - MIN_SIZE) / 2);
  const rectWidth = useSharedValue(MIN_SIZE);
  const rectHeight = useSharedValue(MIN_SIZE);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startW = useSharedValue(0);
  const startH = useSharedValue(0);

  const clamp = (value: number, lower: number, upper: number) =>
    Math.min(Math.max(value, lower), upper);

  // Move the entire rectangle
  const moveGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = rectX.value;
      startY.value = rectY.value;
    })
    .onUpdate((e) => {
      rectX.value = clamp(
        startX.value + e.translationX,
        0,
        screenWidth - rectWidth.value
      );
      rectY.value = clamp(
        startY.value + e.translationY,
        0,
        screenHeight - rectHeight.value
      );
    });

  // Resize from the top edge
  const resizeTopGesture = Gesture.Pan()
    .onStart(() => {
      startY.value = rectY.value;
      startH.value = rectHeight.value;
    })
    .onUpdate((e) => {
      let newY = startY.value + e.translationY;
      newY = clamp(newY, 0, startY.value + startH.value - MIN_SIZE);
      let newHeight = startH.value + (startY.value - newY);
      newHeight = clamp(newHeight, MIN_SIZE, screenHeight - newY);
      rectY.value = newY;
      rectHeight.value = newHeight;
    });

  // Resize from the left edge
  const resizeLeftGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = rectX.value;
      startW.value = rectWidth.value;
    })
    .onUpdate((e) => {
      let newX = startX.value + e.translationX;
      newX = clamp(newX, 0, startX.value + startW.value - MIN_SIZE);
      let newWidth = startW.value + (startX.value - newX);
      newWidth = clamp(newWidth, MIN_SIZE, screenWidth - newX);
      rectX.value = newX;
      rectWidth.value = newWidth;
    });

  const rectStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: rectX.value,
    top: rectY.value,
    width: rectWidth.value,
    height: rectHeight.value,
    borderWidth: 2,
    borderColor: "white",
  }));

  const overlayTop = useAnimatedStyle(() => ({
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: rectY.value,
    backgroundColor: "rgba(0,0,0,0.5)",
  }));

  const overlayBottom = useAnimatedStyle(() => ({
    position: "absolute",
    top: rectY.value + rectHeight.value,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  }));

  const overlayLeft = useAnimatedStyle(() => ({
    position: "absolute",
    top: rectY.value,
    left: 0,
    width: rectX.value,
    height: rectHeight.value,
    backgroundColor: "rgba(0,0,0,0.5)",
  }));

  const overlayRight = useAnimatedStyle(() => ({
    position: "absolute",
    top: rectY.value,
    left: rectX.value + rectWidth.value,
    right: 0,
    height: rectHeight.value,
    backgroundColor: "rgba(0,0,0,0.5)",
  }));

  const topHandleStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: rectX.value,
    top: rectY.value - HANDLE_SIZE / 2,
    width: rectWidth.value,
    height: HANDLE_SIZE,
  }));

  const leftHandleStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: rectX.value - HANDLE_SIZE / 2,
    top: rectY.value,
    width: HANDLE_SIZE,
    height: rectHeight.value,
  }));

  const capture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ base64: true });
    setLoading(true);
    try {
      const ratioX = photo.width / screenWidth;
      const ratioY = photo.height / screenHeight;
      const crop = {
        originX: rectX.value * ratioX,
        originY: rectY.value * ratioY,
        width: rectWidth.value * ratioX,
        height: rectHeight.value * ratioY,
      };

      const cropped = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ crop }],
        {
          compress: 1,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      const response = await fetch("https://example.com/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: cropped.base64 }),
      });
      const data = await response.json();
      router.push({ pathname: "/result", params: { text: data?.text ?? "No result" } });
    } catch (e) {
      console.warn("Upload error:", e);
    } finally {
      setLoading(false);
    }
  };

  const openAlbum = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    setLoading(true);
    try {
      const ratioX = asset.width / screenWidth;
      const ratioY = asset.height / screenHeight;
      const crop = {
        originX: rectX.value * ratioX,
        originY: rectY.value * ratioY,
        width: rectWidth.value * ratioX,
        height: rectHeight.value * ratioY,
      };

      const cropped = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ crop }],
        {
          compress: 1,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      const response = await fetch("https://example.com/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: cropped.base64 }),
      });
      const data = await response.json();
      router.push({ pathname: "/result", params: { text: data?.text ?? "No result" } });
    } catch (e) {
      console.warn("Upload error:", e);
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
      <Animated.View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View style={overlayTop} pointerEvents="none" />
        <Animated.View style={overlayBottom} pointerEvents="none" />
        <Animated.View style={overlayLeft} pointerEvents="none" />
        <Animated.View style={overlayRight} pointerEvents="none" />
        <GestureDetector gesture={moveGesture}>
          <Animated.View style={rectStyle} />
        </GestureDetector>
        <GestureDetector gesture={resizeTopGesture}>
          <Animated.View style={topHandleStyle} />
        </GestureDetector>
        <GestureDetector gesture={resizeLeftGesture}>
          <Animated.View style={leftHandleStyle} />
        </GestureDetector>
      </Animated.View>
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
