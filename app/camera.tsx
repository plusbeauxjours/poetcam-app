import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
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

  const panGesture = Gesture.Pan()
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

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startX.value = rectX.value;
      startY.value = rectY.value;
      startW.value = rectWidth.value;
      startH.value = rectHeight.value;
    })
    .onUpdate((e) => {
      let newWidth = startW.value * e.scale;
      let newHeight = startH.value * e.scale;
      newWidth = clamp(newWidth, MIN_SIZE, screenWidth);
      newHeight = clamp(newHeight, MIN_SIZE, screenHeight);

      const dx = (newWidth - startW.value) / 2;
      const dy = (newHeight - startH.value) / 2;

      let newX = clamp(startX.value - dx, 0, screenWidth - newWidth);
      let newY = clamp(startY.value - dy, 0, screenHeight - newHeight);

      rectWidth.value = newWidth;
      rectHeight.value = newHeight;
      rectX.value = newX;
      rectY.value = newY;
    });

  const gesture = Gesture.Simultaneous(panGesture, pinchGesture);

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
      <GestureDetector gesture={gesture}>
        <Animated.View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View style={overlayTop} pointerEvents="none" />
          <Animated.View style={overlayBottom} pointerEvents="none" />
          <Animated.View style={overlayLeft} pointerEvents="none" />
          <Animated.View style={overlayRight} pointerEvents="none" />
          <Animated.View style={rectStyle} pointerEvents="none" />
        </Animated.View>
      </GestureDetector>
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
});
