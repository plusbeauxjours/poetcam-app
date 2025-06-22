import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

export default function SplashScreen() {
  useEffect(() => {
    // Bypass login for now. Navigate directly to the camera screen.
    // TODO: change back to '/login' once authentication is implemented.
    const timer = setTimeout(() => {
      router.replace('/camera');
    }, 1500);
    return () => clearTimeout(timer);
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
