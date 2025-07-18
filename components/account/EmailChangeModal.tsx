import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AccountService from "../../services/accountService";

interface EmailChangeModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EmailChangeModal({ visible, onClose, onSuccess }: EmailChangeModalProps) {
  const colorScheme = useColorScheme() ?? "light";
  const { session } = useAuthStore();
  const [newEmail, setNewEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [step, setStep] = useState<"input" | "confirmation">("input");
  const [pendingEmail, setPendingEmail] = useState("");

  const isDark = colorScheme === "dark";
  const backgroundColor = isDark ? Colors.dark.background : Colors.light.background;
  const textColor = isDark ? Colors.dark.text : Colors.light.text;
  const placeholderColor = isDark ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault;

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!newEmail.trim()) {
      newErrors.newEmail = "새 이메일 주소를 입력해주세요.";
    } else if (!validateEmail(newEmail)) {
      newErrors.newEmail = "올바른 이메일 형식을 입력해주세요.";
    } else if (newEmail.toLowerCase() === session?.user?.email?.toLowerCase()) {
      newErrors.newEmail = "현재 이메일과 동일합니다.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailChange = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await AccountService.changeEmail({
        newEmail: newEmail.toLowerCase().trim(),
      });

      if (result.success) {
        setPendingEmail(newEmail.toLowerCase().trim());
        setStep("confirmation");
        Alert.alert(
          "확인 이메일 전송",
          result.data?.message || "새 이메일 주소로 확인 링크가 전송되었습니다.",
          [{ text: "확인" }]
        );
      } else {
        Alert.alert("오류", result.error || "이메일 변경에 실패했습니다.");
      }
    } catch (error) {
      console.error("Email change error:", error);
      Alert.alert("오류", "이메일 변경 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!pendingEmail) return;

    setIsLoading(true);
    try {
      const result = await AccountService.resendEmailConfirmation(pendingEmail);

      if (result.success) {
        Alert.alert("재전송 완료", result.data?.message || "확인 이메일이 재전송되었습니다.", [
          { text: "확인" },
        ]);
      } else {
        Alert.alert("오류", result.error || "이메일 재전송에 실패했습니다.");
      }
    } catch (error) {
      console.error("Email resend error:", error);
      Alert.alert("오류", "이메일 재전송 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setNewEmail("");
    setErrors({});
    setStep("input");
    setPendingEmail("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const renderInputStep = () => (
    <>
      <Text style={[styles.description, { color: placeholderColor }]}>
        이메일 주소를 변경하려면 새 이메일로 전송되는 확인 링크를 클릭해야 합니다.
      </Text>

      <View style={styles.currentEmailContainer}>
        <Text style={[styles.label, { color: textColor }]}>현재 이메일</Text>
        <Text style={[styles.currentEmail, { color: placeholderColor }]}>
          {session?.user?.email}
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: textColor }]}>새 이메일 주소</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isDark ? "#374151" : "#f9fafb",
              color: textColor,
              borderColor: errors.newEmail ? "#ef4444" : isDark ? "#4b5563" : "#e5e7eb",
            },
          ]}
          value={newEmail}
          onChangeText={setNewEmail}
          placeholder="새 이메일 주소를 입력하세요"
          placeholderTextColor={placeholderColor}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {errors.newEmail && <Text style={styles.errorText}>{errors.newEmail}</Text>}
      </View>

      <View style={styles.warningContainer}>
        <Ionicons name="warning-outline" size={20} color="#f59e0b" />
        <Text style={[styles.warningText, { color: placeholderColor }]}>
          이메일 변경 후에는 새 이메일 주소로 로그인해야 합니다.
        </Text>
      </View>
    </>
  );

  const renderConfirmationStep = () => (
    <>
      <View style={styles.successContainer}>
        <Ionicons name="mail-outline" size={48} color="#22c55e" />
        <Text style={[styles.successTitle, { color: textColor }]}>확인 이메일 전송됨</Text>
        <Text style={[styles.successMessage, { color: placeholderColor }]}>
          {pendingEmail}로 확인 링크가 전송되었습니다.
        </Text>
      </View>

      <View style={styles.instructionContainer}>
        <Text style={[styles.instructionTitle, { color: textColor }]}>다음 단계:</Text>
        <Text style={[styles.instruction, { color: placeholderColor }]}>
          1. 새 이메일 주소({pendingEmail})로 이동
        </Text>
        <Text style={[styles.instruction, { color: placeholderColor }]}>
          2. "이메일 주소 변경 확인" 이메일 찾기
        </Text>
        <Text style={[styles.instruction, { color: placeholderColor }]}>
          3. 이메일 내 확인 링크 클릭
        </Text>
        <Text style={[styles.instruction, { color: placeholderColor }]}>
          4. 변경 완료 후 새 이메일로 로그인
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.resendButton, { borderColor: isDark ? "#4b5563" : "#e5e7eb" }]}
        onPress={handleResendConfirmation}
        disabled={isLoading}>
        <Text style={[styles.resendButtonText, { color: textColor }]}>
          {isLoading ? "재전송 중..." : "확인 이메일 재전송"}
        </Text>
      </TouchableOpacity>

      <View style={styles.noteContainer}>
        <Text style={[styles.note, { color: placeholderColor }]}>
          확인 이메일이 오지 않으면 스팸 폴더를 확인해주세요.
        </Text>
      </View>
    </>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>이메일 변경</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={textColor} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {step === "input" ? renderInputStep() : renderConfirmationStep()}
        </ScrollView>

        {step === "input" && (
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton, isLoading && styles.disabledButton]}
              onPress={handleEmailChange}
              disabled={isLoading}>
              <Text style={styles.confirmButtonText}>
                {isLoading ? "변경 중..." : "이메일 변경"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === "confirmation" && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.doneButton]}
              onPress={() => {
                handleClose();
                onSuccess?.();
              }}>
              <Text style={styles.doneButtonText}>완료</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
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
  currentEmailContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  currentEmail: {
    fontSize: 16,
    padding: 16,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    marginTop: 4,
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fefce8",
    padding: 16,
    borderRadius: 8,
    marginBottom: 32,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
    lineHeight: 20,
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  instructionContainer: {
    marginBottom: 32,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  instruction: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  resendButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  noteContainer: {
    marginBottom: 32,
  },
  note: {
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
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
  doneButton: {
    backgroundColor: "#22c55e",
  },
  doneButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
