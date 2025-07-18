import { AppleLoginButton } from "@/components/auth/AppleLoginButton";
import { EmailLoginForm } from "@/components/auth/EmailLoginForm";
import { EmailSignupForm } from "@/components/auth/EmailSignupForm";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { KakaoLoginButton } from "@/components/auth/KakaoLoginButton";
import { PasswordResetForm } from "@/components/auth/PasswordResetForm";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useAuthStore } from "@/store/useAuthStore";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type AuthMode = "login" | "signup" | "reset";

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const user = useAuthStore((s) => s.user);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [showSocialLogin, setShowSocialLogin] = useState(true);

  const { width: screenWidth } = Dimensions.get("window");
  const isDark = colorScheme === "dark";

  // 이미 로그인되어 있다면 메인 화면으로 이동
  useEffect(() => {
    if (user) {
      router.replace("/(tabs)");
    }
  }, [user]);

  const handleLoginSuccess = () => {
    router.replace("/(tabs)");
  };

  const handleAuthError = (error: Error) => {
    console.error("Auth error:", error);
    Alert.alert("오류", error.message || "인증 중 오류가 발생했습니다. 다시 시도해주세요.", [
      { text: "확인" },
    ]);
  };

  const handleSwitchToSignup = () => {
    setAuthMode("signup");
  };

  const handleSwitchToLogin = () => {
    setAuthMode("login");
  };

  const handleForgotPassword = () => {
    setAuthMode("reset");
  };

  const handleBackToLogin = () => {
    setAuthMode("login");
  };

  const handlePasswordResetSuccess = () => {
    setAuthMode("login");
  };

  const renderAuthTabs = () => {
    if (authMode === "reset") return null;

    return (
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            authMode === "login" && styles.activeTab,
            { borderColor: isDark ? "#3C3C3E" : "#E5E5EA" },
          ]}
          onPress={() => setAuthMode("login")}>
          <Text
            style={[
              styles.tabText,
              authMode === "login" && styles.activeTabText,
              { color: authMode === "login" ? Colors.primary : isDark ? "#8E8E93" : "#8E8E93" },
            ]}>
            로그인
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            authMode === "signup" && styles.activeTab,
            { borderColor: isDark ? "#3C3C3E" : "#E5E5EA" },
          ]}
          onPress={() => setAuthMode("signup")}>
          <Text
            style={[
              styles.tabText,
              authMode === "signup" && styles.activeTabText,
              { color: authMode === "signup" ? Colors.primary : isDark ? "#8E8E93" : "#8E8E93" },
            ]}>
            회원가입
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderAuthForm = () => {
    switch (authMode) {
      case "login":
        return (
          <EmailLoginForm
            onSuccess={handleLoginSuccess}
            onError={handleAuthError}
            onSwitchToSignup={handleSwitchToSignup}
            onForgotPassword={handleForgotPassword}
          />
        );
      case "signup":
        return (
          <EmailSignupForm
            onSuccess={handleSwitchToLogin}
            onError={handleAuthError}
            onSwitchToLogin={handleSwitchToLogin}
          />
        );
      case "reset":
        return (
          <PasswordResetForm
            onSuccess={handlePasswordResetSuccess}
            onError={handleAuthError}
            onBackToLogin={handleBackToLogin}
          />
        );
      default:
        return null;
    }
  };

  const renderSocialButtons = () => {
    if (!showSocialLogin || authMode === "reset") return null;

    return (
      <View style={styles.socialContainer}>
        <View style={styles.dividerContainer}>
          <View style={[styles.divider, { borderColor: isDark ? "#3C3C3E" : "#E5E5EA" }]} />
          <Text style={[styles.dividerText, { color: isDark ? "#8E8E93" : "#8E8E93" }]}>또는</Text>
          <View style={[styles.divider, { borderColor: isDark ? "#3C3C3E" : "#E5E5EA" }]} />
        </View>

        <View style={styles.socialButtonsContainer}>
          <GoogleLoginButton onSuccess={handleLoginSuccess} onError={handleAuthError} />
          <AppleLoginButton onSuccess={handleLoginSuccess} onError={handleAuthError} />
          {Platform.OS === "android" && (
            <KakaoLoginButton onSuccess={handleLoginSuccess} onError={handleAuthError} />
          )}
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Logo Section */}
          <ThemedView style={styles.logoContainer}>
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <ThemedText style={styles.appName}>PoetCam</ThemedText>
            <ThemedText style={styles.tagline}>사진으로 시를 짓다</ThemedText>
          </ThemedView>

          {/* Auth Section */}
          <ThemedView style={styles.authContainer}>
            {authMode !== "reset" && (
              <ThemedText style={styles.welcomeText}>
                {authMode === "login" ? "환영합니다!" : "새로운 계정을 만들어보세요"}
              </ThemedText>
            )}

            {renderAuthTabs()}

            <View style={styles.formContainer}>{renderAuthForm()}</View>

            {renderSocialButtons()}
          </ThemedView>

          {/* Footer */}
          {authMode !== "reset" && (
            <ThemedView style={styles.footer}>
              <ThemedText style={styles.footerText}>
                계속 진행하면 서비스 이용약관 및{"\n"}
                개인정보 처리방침에 동의하는 것으로 간주됩니다.
              </ThemedText>
            </ThemedView>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    color: Colors.primary,
  },
  tagline: {
    fontSize: 14,
    opacity: 0.7,
    fontStyle: "italic",
  },
  authContainer: {
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 24,
    textAlign: "center",
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 24,
    backgroundColor: "transparent",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "rgba(0, 122, 255, 0.1)",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "500",
  },
  activeTabText: {
    fontWeight: "600",
  },
  formContainer: {
    marginBottom: 24,
  },
  socialContainer: {
    marginTop: 8,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    borderTopWidth: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  socialButtonsContainer: {
    gap: 12,
    alignItems: "center",
  },
  footer: {
    alignItems: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 12,
    textAlign: "center",
    opacity: 0.6,
    lineHeight: 16,
  },
});
