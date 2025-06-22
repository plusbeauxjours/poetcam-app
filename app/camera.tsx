import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Stack, router } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

type GestureAction =
  | "move"
  | "resize-tl"
  | "resize-t"
  | "resize-tr"
  | "resize-l"
  | "resize-r"
  | "resize-bl"
  | "resize-b"
  | "resize-br"
  | "none";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [loading, setLoading] = useState(false);

  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const MIN_SIZE = screenWidth * 0.3;
  const HANDLE_AREA_SIZE = 40;

  const rectX = useSharedValue((screenWidth - MIN_SIZE) / 2);
  const rectY = useSharedValue((screenHeight - MIN_SIZE) / 2);
  const rectWidth = useSharedValue(MIN_SIZE);
  const rectHeight = useSharedValue(MIN_SIZE);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startW = useSharedValue(0);
  const startH = useSharedValue(0);
  const currentAction = useSharedValue<GestureAction>("none");

  const springConfig = {
    damping: 15,
    stiffness: 200,
    mass: 1,
  };

  const clamp = (value: number, lower: number, upper: number) => {
    "worklet";
    return Math.min(Math.max(value, lower), upper);
  };

  const panGesture = Gesture.Pan()
    .onStart((e) => {
      "worklet";
      const halfHandle = HANDLE_AREA_SIZE / 2;

      const onTopEdge = e.y >= rectY.value - halfHandle && e.y <= rectY.value + halfHandle;
      const onBottomEdge =
        e.y >= rectY.value + rectHeight.value - halfHandle &&
        e.y <= rectY.value + rectHeight.value + halfHandle;
      const onLeftEdge = e.x >= rectX.value - halfHandle && e.x <= rectX.value + halfHandle;
      const onRightEdge =
        e.x >= rectX.value + rectWidth.value - halfHandle &&
        e.x <= rectX.value + rectWidth.value + halfHandle;

      const inVerticalRange =
        e.y >= rectY.value + halfHandle && e.y <= rectY.value + rectHeight.value - halfHandle;
      const inHorizontalRange =
        e.x >= rectX.value + halfHandle && e.x <= rectX.value + rectWidth.value - halfHandle;

      let action: GestureAction = "none";
      if (onTopEdge && onLeftEdge) action = "resize-tl";
      else if (onTopEdge && onRightEdge) action = "resize-tr";
      else if (onBottomEdge && onLeftEdge) action = "resize-bl";
      else if (onBottomEdge && onRightEdge) action = "resize-br";
      else if (onTopEdge) action = "resize-t";
      else if (onBottomEdge) action = "resize-b";
      else if (onLeftEdge) action = "resize-l";
      else if (onRightEdge) action = "resize-r";
      else if (inHorizontalRange && inVerticalRange) action = "move";

      currentAction.value = action;

      if (action !== "none") {
        startX.value = rectX.value;
        startY.value = rectY.value;
        startW.value = rectWidth.value;
        startH.value = rectHeight.value;
      }
    })
    .onUpdate((e) => {
      "worklet";
      const { translationX, translationY } = e;
      const action = currentAction.value;

      if (action === "none") return;

      if (action === "move") {
        const newX = startX.value + translationX;
        const newY = startY.value + translationY;
        rectX.value = withSpring(clamp(newX, 0, screenWidth - rectWidth.value), springConfig);
        rectY.value = withSpring(clamp(newY, 0, screenHeight - rectHeight.value), springConfig);
        return;
      }

      // Resize vertically
      if (action.includes("t")) {
        const newY = startY.value + translationY;
        const clampedY = clamp(newY, 0, startY.value + startH.value - MIN_SIZE);
        rectY.value = withSpring(clampedY, springConfig);
        rectHeight.value = withSpring(startH.value + (startY.value - clampedY), springConfig);
      } else if (action.includes("b")) {
        const newHeight = startH.value + translationY;
        rectHeight.value = withSpring(
          clamp(newHeight, MIN_SIZE, screenHeight - startY.value),
          springConfig
        );
      }

      // Resize horizontally
      if (action.includes("l")) {
        const newX = startX.value + translationX;
        const clampedX = clamp(newX, 0, startX.value + startW.value - MIN_SIZE);
        rectX.value = withSpring(clampedX, springConfig);
        rectWidth.value = withSpring(startW.value + (startX.value - clampedX), springConfig);
      } else if (action.includes("r")) {
        const newWidth = startW.value + translationX;
        rectWidth.value = withSpring(
          clamp(newWidth, MIN_SIZE, screenWidth - startX.value),
          springConfig
        );
      }
    })
    .onEnd(() => {
      "worklet";
      currentAction.value = "none";
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

      const cropped = await ImageManipulator.manipulateAsync(photo.uri, [{ crop }], {
        compress: 1,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      });

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
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission required", "You need to allow access to your photos to continue.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ base64: true });
    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

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

      const cropped = await ImageManipulator.manipulateAsync(asset.uri, [{ crop }], {
        compress: 1,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      });

      const response = await fetch("https://example.com/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: cropped.base64 }),
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
      <GestureDetector gesture={panGesture}>
        <Animated.View style={StyleSheet.absoluteFill}>
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
