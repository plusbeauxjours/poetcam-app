import { Alert, Button, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import * as Camera from 'expo-camera';

async function providerLogin(provider: string) {
  // TODO: integrate with real authentication providers
  console.log(`Login with ${provider}`);
}

export default function LoginScreen() {
  const handleLogin = async (provider: string) => {
    await providerLogin(provider);
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status === 'granted') {
      router.replace('/camera');
    } else {
      Alert.alert('Permission required', 'Camera permission is required to continue.');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Login' }} />
      <View style={styles.container}>
        <Button title="Login with Kakao" onPress={() => handleLogin('kakao')} />
        <Button title="Login with Naver" onPress={() => handleLogin('naver')} />
        <Button title="Login with Google" onPress={() => handleLogin('google')} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
});
