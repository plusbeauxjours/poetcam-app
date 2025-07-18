import { supabase } from "@/supabase";
import { MaterialIcons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Configure web browser for auth session
WebBrowser.maybeCompleteAuthSession();

export interface KakaoLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function KakaoLoginButton({ onSuccess, onError }: KakaoLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleKakaoLogin() {
    setIsLoading(true);
    try {
      // For now, we'll use Supabase's OAuth flow
      // Note: This requires Kakao to be configured in Supabase dashboard
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "kakao" as any, // Type assertion since Kakao might not be in types yet
        options: {
          redirectTo: "poetcamapp://auth/callback",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        // Check if it's a configuration issue
        if (error.message.includes("Provider not found") || error.message.includes("kakao")) {
          throw new Error(
            "카카오 로그인이 아직 설정되지 않았습니다.\n구글 또는 Apple 로그인을 이용해주세요."
          );
        }
        throw error;
      }

      if (data?.url) {
        // Open the OAuth URL in a web browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          "poetcamapp://auth/callback"
        );

        if (result.type === "success") {
          onSuccess?.();
        } else if (result.type === "cancel") {
          // User canceled, don't show error
          return;
        } else {
          throw new Error("로그인이 취소되었거나 실패했습니다.");
        }
      } else {
        throw new Error("카카오 로그인 URL을 가져올 수 없습니다.");
      }
    } catch (error) {
      console.error("Kakao login error:", error);
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  }

  // Alternative implementation using direct OAuth flow
  const handleDirectKakaoOAuth = async () => {
    try {
      // This would require a Kakao app key and proper OAuth setup
      Alert.alert(
        "카카오 로그인",
        "카카오 로그인 기능은 현재 개발 중입니다.\n다른 로그인 방법을 이용해주세요.",
        [{ text: "확인" }]
      );
    } catch (error) {
      onError?.(error as Error);
    }
  };

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
