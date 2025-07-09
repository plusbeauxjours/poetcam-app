import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useAuthStore } from "@/store/useAuthStore";
import { router } from "expo-router";
import { useEffect } from "react";
import { Alert, Image, StatusBar, StyleSheet } from "react-native";

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const user = useAuthStore((s) => s.user);

  // 이미 로그인되어 있다면 메인 화면으로 이동
  useEffect(() => {
    if (user) {
      router.replace("/(tabs)");
    }
  }, [user]);

  const handleLoginSuccess = () => {
    router.replace("/(tabs)");
  };

  const handleLoginError = (error: Error) => {
    console.error("Login error:", error);
    Alert.alert("로그인 실패", "로그인 중 오류가 발생했습니다. 다시 시도해주세요.", [
      { text: "확인" },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle={colorScheme === "dark" ? "light-content" : "dark-content"} />

      <ThemedView style={styles.logoContainer}>
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <ThemedText style={styles.appName}>PoetCam</ThemedText>
        <ThemedText style={styles.tagline}>사진으로 시를 짓다</ThemedText>
      </ThemedView>

      <ThemedView style={styles.loginContainer}>
        <ThemedText style={styles.welcomeText}>환영합니다!</ThemedText>
        <ThemedText style={styles.descriptionText}>
          카메라로 찍은 사진을 바탕으로{"\n"}
          아름다운 시를 만들어보세요
        </ThemedText>

        <GoogleLoginButton onSuccess={handleLoginSuccess} onError={handleLoginError} />
      </ThemedView>

      <ThemedView style={styles.footer}>
        <ThemedText style={styles.footerText}>
          계속 진행하면 서비스 이용약관 및{"\n"}
          개인정보 처리방침에 동의하는 것으로 간주됩니다.
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 48,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    color: Colors.primary,
  },
  tagline: {
    fontSize: 16,
    opacity: 0.7,
    fontStyle: "italic",
  },
  loginContainer: {
    alignItems: "center",
    marginBottom: 48,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    opacity: 0.8,
    marginBottom: 32,
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    textAlign: "center",
    opacity: 0.6,
    lineHeight: 16,
  },
});
