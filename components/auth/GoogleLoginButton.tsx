import { supabase } from "@/supabase";
import { AntDesign } from "@expo/vector-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function GoogleLoginButton({ onSuccess, onError }: GoogleLoginButtonProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleGoogleLogin() {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    setIsLoading(false);
    if (error) {
      onError?.(error);
    } else {
      onSuccess?.();
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
          <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
        ) : (
          <AntDesign name="google" size={20} color="#fff" style={{ marginRight: 8 }} />
        )}
        <Text style={styles.buttonText}>{t("auth:loginWithGoogle", "구글로 로그인")}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4285F4",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginVertical: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
