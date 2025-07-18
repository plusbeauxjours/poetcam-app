import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface KakaoLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function KakaoLoginButton({ onSuccess, onError }: KakaoLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleKakaoLogin() {
    setIsLoading(true);
    try {
      // Note: Kakao OAuth requires additional setup in Supabase
      // This is a placeholder implementation
      onError?.(new Error("카카오 로그인 기능은 준비 중입니다."));

      // Future implementation would look like:
      // const { data, error } = await supabase.auth.signInWithOAuth({
      //   provider: "kakao",
      //   options: {
      //     redirectTo: "poetcamapp://auth/callback",
      //   },
      // });

      // if (error) {
      //   onError?.(error);
      // } else {
      //   onSuccess?.();
      // }
    } catch (error) {
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <TouchableOpacity
      style={[styles.button, isLoading && styles.buttonDisabled]}
      onPress={handleKakaoLogin}
      disabled={isLoading}
      activeOpacity={0.8}>
      <View style={styles.contentRow}>
        {isLoading ? (
          <ActivityIndicator color="#3C1E1E" style={styles.icon} />
        ) : (
          <MaterialIcons name="chat-bubble" size={20} color="#3C1E1E" style={styles.icon} />
        )}
        <Text style={styles.buttonText}>{isLoading ? "로그인 중..." : "카카오로 로그인"}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#FEE500",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: 12,
  },
  buttonText: {
    color: "#3C1E1E",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
