import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Stack, router } from 'expo-router';
import * as Camera from 'expo-camera';
import * as Google from 'expo-auth-session/providers/google';
import { useEffect } from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/firebase';

export default function LoginScreen() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: 'GOOGLE_EXPO_CLIENT_ID',
    iosClientId: 'GOOGLE_IOS_CLIENT_ID',
    androidClientId: 'GOOGLE_ANDROID_CLIENT_ID',
    webClientId: 'GOOGLE_WEB_CLIENT_ID',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .then(async () => {
          const { status } = await Camera.requestCameraPermissionsAsync();
          if (status === 'granted') {
            router.replace('/camera');
          } else {
            Alert.alert('Permission required', 'Camera permission is required to continue.');
          }
        })
        .catch((err) => console.warn(err));
    }
  }, [response]);

  return (
    <>
      <Stack.Screen options={{ title: 'Login' }} />
      <View style={styles.container}>
        <TouchableOpacity disabled={!request} onPress={() => promptAsync()}>
          <FontAwesome name="google" size={64} color="#DB4437" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
});
