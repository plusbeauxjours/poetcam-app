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

interface EmailSignupFormProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onSwitchToLogin?: () => void;
}

export function EmailSignupForm({ onSuccess, onError, onSwitchToLogin }: EmailSignupFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const colorScheme = useColorScheme();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    let isValid = true;
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");

    if (!email.trim()) {
      setEmailError("이메일을 입력해주세요");
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError("올바른 이메일 주소를 입력해주세요");
      isValid = false;
    }

    if (!password.trim()) {
      setPasswordError("비밀번호를 입력해주세요");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("비밀번호는 6자 이상이어야 합니다");
      isValid = false;
    } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      setPasswordError("비밀번호는 영문과 숫자를 포함해야 합니다");
      isValid = false;
    }

    if (!confirmPassword.trim()) {
      setConfirmPasswordError("비밀번호 확인을 입력해주세요");
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError("비밀번호가 일치하지 않습니다");
      isValid = false;
    }

    return isValid;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: "poetcamapp://auth/callback",
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          Alert.alert("회원가입 실패", "이미 가입된 이메일 주소입니다.");
        } else {
          onError?.(error);
        }
      } else {
        Alert.alert("회원가입 완료", "이메일로 인증 링크를 발송했습니다. 이메일을 확인해주세요.", [
          {
            text: "확인",
            onPress: () => onSuccess?.(),
          },
        ]);
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

        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: inputBgColor, borderColor: inputBorderColor, color: textColor },
              passwordError ? styles.inputError : null,
            ]}
            placeholder="비밀번호 (영문, 숫자 포함 6자 이상)"
            placeholderTextColor={isDark ? "#8E8E93" : "#8E8E93"}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) setPasswordError("");
            }}
            secureTextEntry
            autoComplete="new-password"
            autoCorrect={false}
          />
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: inputBgColor, borderColor: inputBorderColor, color: textColor },
              confirmPasswordError ? styles.inputError : null,
            ]}
            placeholder="비밀번호 확인"
            placeholderTextColor={isDark ? "#8E8E93" : "#8E8E93"}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (confirmPasswordError) setConfirmPasswordError("");
            }}
            secureTextEntry
            autoComplete="new-password"
            autoCorrect={false}
          />
          {confirmPasswordError ? (
            <Text style={styles.errorText}>{confirmPasswordError}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.signupButton, isLoading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signupButtonText}>회원가입</Text>
          )}
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={[styles.loginText, { color: textColor }]}>이미 계정이 있으신가요? </Text>
          <TouchableOpacity onPress={onSwitchToLogin}>
            <Text style={[styles.loginLink, { color: Colors.primary }]}>로그인</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  formContainer: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 16,
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
  signupButton: {
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: "600",
  },
});
