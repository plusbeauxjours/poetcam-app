import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

export default function SplashScreen() {
  const [, requestCameraPermission] = useCameraPermissions();
  const [, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();

  useEffect(() => {
    (async () => {
      await requestCameraPermission();
      await requestMediaPermission();
      setTimeout(() => {
        router.replace('/camera');
      }, 500);
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Image source={require('@/assets/images/splash-icon.png')} style={styles.logo} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logo: { width: 200, height: 200, resizeMode: 'contain' },
});
