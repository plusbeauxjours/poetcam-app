import { Stack, router } from 'expo-router';
import { ActivityIndicator, Button, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Camera, CameraType, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<Camera>(null);
  const [loading, setLoading] = useState(false);

  const capture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ base64: true });
    setLoading(true);
    try {
      const response = await fetch('https://example.com/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: photo.base64 }),
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
