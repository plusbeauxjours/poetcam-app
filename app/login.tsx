import { supabase } from "@/supabase";
import { FontAwesome } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import { useCameraPermissions } from "expo-camera";
import { Stack, router } from "expo-router";
import { useEffect } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";

export default function LoginScreen() {
  const [, requestPermission] = useCameraPermissions();
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: "GOOGLE_EXPO_CLIENT_ID",
    iosClientId: "GOOGLE_IOS_CLIENT_ID",
    androidClientId: "GOOGLE_ANDROID_CLIENT_ID",
    webClientId: "GOOGLE_WEB_CLIENT_ID",
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      supabase.auth
        .signInWithIdToken({ provider: "google", token: id_token })
        .then(async () => {
          const { status } = await requestPermission();
          if (status === "granted") {
            router.replace("/camera");
          } else {
            Alert.alert("Permission required", "Camera permission is required to continue.");
          }
        })
        .catch((err) => console.warn(err));
    }
  }, [response, requestPermission]);

  return (
    <>
      <Stack.Screen options={{ title: "Login" }} />
      <View style={styles.container}>
        <TouchableOpacity disabled={!request} onPress={() => promptAsync()}>
          <FontAwesome name="google" size={64} color="#DB4437" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
});
