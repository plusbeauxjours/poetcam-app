import { supabase } from "@/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface AppleLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function AppleLoginButton({ onSuccess, onError }: AppleLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleAppleLogin() {
    // Apple Sign-In is only available on iOS
    if (Platform.OS !== "ios") {
      onError?.(new Error("Apple Sign-In is only available on iOS devices"));
      return;
    }

    setIsLoading(true);
    try {
      // Check if Apple Authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error("Apple Sign-In is not available on this device");
      }

      // Authenticate with Apple
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Use the credential to sign in with Supabase
      if (credential.identityToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "apple",
          token: credential.identityToken,
        });

        if (error) {
          throw error;
        }

        // Successfully signed in
        onSuccess?.();
      } else {
        throw new Error("No identity token received from Apple");
      }
    } catch (error: any) {
      console.error("Apple login error:", error);

      // Handle user cancellation gracefully
      if (error.code === "ERR_REQUEST_CANCELED") {
        // User canceled the Apple Sign-In flow, don't show error
        return;
      }

      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }

  // Only render on iOS and when Apple Authentication is available
  if (Platform.OS !== "ios") {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.button, isLoading && styles.buttonDisabled]}
      onPress={handleAppleLogin}
      disabled={isLoading}
      activeOpacity={0.8}>
      <View style={styles.contentRow}>
        {isLoading ? (
          <ActivityIndicator color="#fff" style={styles.icon} />
        ) : (
          <Ionicons name="logo-apple" size={20} color="#fff" style={styles.icon} />
        )}
        <Text style={styles.buttonText}>{isLoading ? "로그인 중..." : "Apple로 로그인"}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#000",
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
