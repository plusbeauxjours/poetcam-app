import { Stack, router } from 'expo-router';
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Camera, CameraType, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<Camera>(null);
  const [loading, setLoading] = useState(false);

  const { width: screenW, height: screenH } = useWindowDimensions();
  const overlayWidth = useSharedValue(200);
  const overlayHeight = useSharedValue(200);
  const overlayX = useSharedValue((screenW - 200) / 2);
  const overlayY = useSharedValue((screenH - 200) / 2);
  const startWidth = useSharedValue(200);
  const startHeight = useSharedValue(200);

  const pan = Gesture.Pan().onUpdate((e) => {
    overlayX.value += e.changeX;
    overlayY.value += e.changeY;
  });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startWidth.value = overlayWidth.value;
      startHeight.value = overlayHeight.value;
    })
    .onUpdate((e) => {
      overlayWidth.value = Math.max(100, startWidth.value * e.scale);
      overlayHeight.value = Math.max(100, startHeight.value * e.scale);
    });

  const gesture = Gesture.Simultaneous(pan, pinch);

  const overlayStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: overlayX.value,
    top: overlayY.value,
    width: overlayWidth.value,
    height: overlayHeight.value,
    borderWidth: 2,
    borderColor: 'yellow',
    backgroundColor: 'transparent',
  }));

  const capture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync();
    const crop = {
      originX: (overlayX.value / screenW) * photo.width,
      originY: (overlayY.value / screenH) * photo.height,
      width: (overlayWidth.value / screenW) * photo.width,
      height: (overlayHeight.value / screenH) * photo.height,
    };
    const manipulated = await ImageManipulator.manipulateAsync(
      photo.uri,
      [{ crop }],
      { compress: 1, base64: true }
    );
    setLoading(true);
    try {
      const response = await fetch('https://example.com/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: manipulated.base64 }),
      });
      const data = await response.json();
      router.push({ pathname: '/result', params: { text: data.text } });
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return <View style={styles.container}><Button title="Request Permission" onPress={requestPermission} /></View>;
  }

  if (!permission.granted) {
    return <View style={styles.container}><Button title="Request Permission" onPress={requestPermission} /></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Camera' }} />
      <Camera style={{ flex: 1 }} type={CameraType.back} ref={cameraRef} />
      <GestureDetector gesture={gesture}>
        <Animated.View style={overlayStyle} />
      </GestureDetector>
      <TouchableOpacity style={styles.capture} onPress={capture} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          <Ionicons name="camera" size={64} color="white" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capture: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  },
});
