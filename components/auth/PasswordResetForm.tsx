import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { supabase } from "@/supabase";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface PasswordResetFormProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onBackToLogin?: () => void;
}

export function PasswordResetForm({ onSuccess, onError, onBackToLogin }: PasswordResetFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const colorScheme = useColorScheme();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    setEmailError("");

    if (!email.trim()) {
      setEmailError("이메일을 입력해주세요");
      return false;
    } else if (!validateEmail(email)) {
      setEmailError("올바른 이메일 주소를 입력해주세요");
      return false;
    }

    return true;
  };

  const handlePasswordReset = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: "poetcamapp://auth/reset-password",
      });

      if (error) {
        onError?.(error);
      } else {
        Alert.alert(
          "비밀번호 재설정 메일 발송",
          "입력하신 이메일로 비밀번호 재설정 링크를 발송했습니다. 이메일을 확인해주세요.",
          [
            {
              text: "확인",
              onPress: () => onSuccess?.(),
            },
          ]
        );
      }
    } catch (error) {
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const isDark = colorScheme === "dark";
  const inputBgColor = isDark ? "#2C2C2E" : "#F2F2F7";
  const inputBorderColor = isDark ? "#3C3C3E" : "#E5E5EA";
  const textColor = isDark ? Colors.dark.text : Colors.light.text;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: textColor }]}>비밀번호 재설정</Text>
        <Text style={[styles.description, { color: textColor }]}>
          가입하신 이메일 주소를 입력해주세요.{"\n"}
          비밀번호 재설정 링크를 보내드립니다.
        </Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: inputBgColor, borderColor: inputBorderColor, color: textColor },
              emailError ? styles.inputError : null,
            ]}
            placeholder="이메일"
            placeholderTextColor={isDark ? "#8E8E93" : "#8E8E93"}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (emailError) setEmailError("");
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            autoCorrect={false}
          />
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        </View>

        <TouchableOpacity
          style={[styles.resetButton, isLoading && styles.buttonDisabled]}
          onPress={handlePasswordReset}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.resetButtonText}>재설정 링크 보내기</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onBackToLogin} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: Colors.primary }]}>
            로그인으로 돌아가기
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  headerContainer: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    opacity: 0.8,
  },
  formContainer: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  inputError: {
    borderColor: "#FF3B30",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  resetButton: {
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
