import { supabase } from "@/supabase";
import { AntDesign } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Configure web browser for auth session
WebBrowser.maybeCompleteAuthSession();

export interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function GoogleLoginButton({ onSuccess, onError }: GoogleLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleGoogleLogin() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "poetcamapp://auth/callback",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Open the OAuth URL in a web browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          "poetcamapp://auth/callback"
        );

        if (result.type === "success") {
          // Wait a moment for the session to be established
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Check if we have a session
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            onSuccess?.();
          } else {
            throw new Error("로그인이 완료되지 않았습니다. 다시 시도해주세요.");
          }
        } else if (result.type === "cancel") {
          // User canceled, don't show error
          return;
        } else {
          throw new Error("로그인이 취소되었거나 실패했습니다.");
        }
      } else {
        throw new Error("구글 로그인 URL을 가져올 수 없습니다.");
      }
    } catch (error) {
      console.error("Google login error:", error);
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <TouchableOpacity
      style={[styles.button, isLoading && styles.buttonDisabled]}
      onPress={handleGoogleLogin}
      disabled={isLoading}
      activeOpacity={0.8}>
      <View style={styles.contentRow}>
        {isLoading ? (
          <ActivityIndicator color="#fff" style={styles.icon} />
        ) : (
          <AntDesign name="google" size={20} color="#fff" style={styles.icon} />
        )}
        <Text style={styles.buttonText}>{isLoading ? "로그인 중..." : "구글로 로그인"}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#4285f4",
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
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
