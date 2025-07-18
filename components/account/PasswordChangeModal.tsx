import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AccountService from "../../services/accountService";

interface PasswordChangeModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const { width } = Dimensions.get("window");

export function PasswordChangeModal({ visible, onClose, onSuccess }: PasswordChangeModalProps) {
  const colorScheme = useColorScheme() ?? "light";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const isDark = colorScheme === "dark";
  const backgroundColor = isDark ? Colors.dark.background : Colors.light.background;
  const textColor = isDark ? Colors.dark.text : Colors.light.text;
  const placeholderColor = isDark ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault;

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!newPassword.trim()) {
      newErrors.newPassword = "새 비밀번호를 입력해주세요.";
    } else {
      const validation = AccountService.validatePasswordStrength(newPassword);
      if (!validation.isValid) {
        newErrors.newPassword = validation.errors[0];
      }
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "비밀번호 확인을 입력해주세요.";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "비밀번호가 일치하지 않습니다.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await AccountService.changePassword({
        currentPassword,
        newPassword,
      });

      if (result.success) {
        Alert.alert("성공", result.data?.message || "비밀번호가 변경되었습니다.", [
          {
            text: "확인",
            onPress: () => {
              resetForm();
              onClose();
              onSuccess?.();
            },
          },
        ]);
      } else {
        Alert.alert("오류", result.error || "비밀번호 변경에 실패했습니다.");
      }
    } catch (error) {
      console.error("Password change error:", error);
      Alert.alert("오류", "비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getPasswordStrength = () => {
    if (!newPassword) return null;
    const validation = AccountService.validatePasswordStrength(newPassword);
    return validation;
  };

  const passwordStrength = getPasswordStrength();

  const getStrengthColor = (score: number) => {
    if (score <= 1) return "#ef4444";
    if (score <= 2) return "#f97316";
    if (score <= 3) return "#eab308";
    return "#22c55e";
  };

  const getStrengthText = (score: number) => {
    if (score <= 1) return "매우 약함";
    if (score <= 2) return "약함";
    if (score <= 3) return "보통";
    return "강함";
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>비밀번호 변경</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={textColor} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.description, { color: placeholderColor }]}>
            보안을 위해 정기적으로 비밀번호를 변경하는 것이 좋습니다.
          </Text>

          {/* Current Password */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: textColor }]}>현재 비밀번호</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? "#374151" : "#f9fafb",
                    color: textColor,
                    borderColor: errors.currentPassword
                      ? "#ef4444"
                      : isDark
                      ? "#4b5563"
                      : "#e5e7eb",
                  },
                ]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="현재 비밀번호를 입력하세요"
                placeholderTextColor={placeholderColor}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                <Ionicons
                  name={showCurrentPassword ? "eye-off" : "eye"}
                  size={20}
                  color={placeholderColor}
                />
              </TouchableOpacity>
            </View>
            {errors.currentPassword && (
              <Text style={styles.errorText}>{errors.currentPassword}</Text>
            )}
          </View>

          {/* New Password */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: textColor }]}>새 비밀번호</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? "#374151" : "#f9fafb",
                    color: textColor,
                    borderColor: errors.newPassword ? "#ef4444" : isDark ? "#4b5563" : "#e5e7eb",
                  },
                ]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="새 비밀번호를 입력하세요"
                placeholderTextColor={placeholderColor}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowNewPassword(!showNewPassword)}>
                <Ionicons
                  name={showNewPassword ? "eye-off" : "eye"}
                  size={20}
                  color={placeholderColor}
                />
              </TouchableOpacity>
            </View>
            {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}

            {/* Password Strength Indicator */}
            {passwordStrength && newPassword && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthHeader}>
                  <Text style={[styles.strengthLabel, { color: placeholderColor }]}>
                    비밀번호 강도
                  </Text>
                  <Text
                    style={[
                      styles.strengthText,
                      { color: getStrengthColor(passwordStrength.score) },
                    ]}>
                    {getStrengthText(passwordStrength.score)}
                  </Text>
                </View>
                <View style={styles.strengthBar}>
                  {[1, 2, 3, 4].map((level) => (
                    <View
                      key={level}
                      style={[
                        styles.strengthSegment,
                        {
                          backgroundColor:
                            level <= passwordStrength.score
                              ? getStrengthColor(passwordStrength.score)
                              : isDark
                              ? "#374151"
                              : "#e5e7eb",
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: textColor }]}>비밀번호 확인</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? "#374151" : "#f9fafb",
                    color: textColor,
                    borderColor: errors.confirmPassword
                      ? "#ef4444"
                      : isDark
                      ? "#4b5563"
                      : "#e5e7eb",
                  },
                ]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="새 비밀번호를 다시 입력하세요"
                placeholderTextColor={placeholderColor}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color={placeholderColor}
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            )}
          </View>

          {/* Password Requirements */}
          <View style={styles.requirementsContainer}>
            <Text style={[styles.requirementsTitle, { color: textColor }]}>비밀번호 요구사항:</Text>
            <Text style={[styles.requirement, { color: placeholderColor }]}>• 최소 8자 이상</Text>
            <Text style={[styles.requirement, { color: placeholderColor }]}>
              • 대문자와 소문자 포함
            </Text>
            <Text style={[styles.requirement, { color: placeholderColor }]}>• 숫자 포함</Text>
            <Text style={[styles.requirement, { color: placeholderColor }]}>
              • 특수문자 포함 (권장)
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.confirmButton, isLoading && styles.disabledButton]}
            onPress={handlePasswordChange}
            disabled={isLoading}>
            <Text style={styles.confirmButtonText}>
              {isLoading ? "변경 중..." : "비밀번호 변경"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  passwordInputContainer: {
    position: "relative",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    paddingRight: 48,
  },
  eyeButton: {
    position: "absolute",
    right: 16,
    top: 12,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    marginTop: 4,
  },
  strengthContainer: {
    marginTop: 12,
  },
  strengthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  strengthLabel: {
    fontSize: 14,
  },
  strengthText: {
    fontSize: 14,
    fontWeight: "500",
  },
  strengthBar: {
    flexDirection: "row",
    gap: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  requirementsContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  requirement: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 8,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "500",
  },
  confirmButton: {
    backgroundColor: "#2563eb",
  },
  confirmButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
