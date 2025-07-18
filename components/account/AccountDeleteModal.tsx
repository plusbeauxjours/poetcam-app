import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AccountService from "../../services/accountService";

interface AccountDeleteModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DELETE_REASONS = [
  "더 이상 앱을 사용하지 않음",
  "개인정보 보호 우려",
  "다른 앱으로 이동",
  "기능이 부족함",
  "기술적 문제",
  "기타",
];

export function AccountDeleteModal({ visible, onClose, onSuccess }: AccountDeleteModalProps) {
  const colorScheme = useColorScheme() ?? "light";
  const { session } = useAuthStore();
  const [confirmText, setConfirmText] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"warning" | "confirm" | "reason">("warning");

  const isDark = colorScheme === "dark";
  const backgroundColor = isDark ? Colors.dark.background : Colors.light.background;
  const textColor = isDark ? Colors.dark.text : Colors.light.text;
  const placeholderColor = isDark ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault;

  const REQUIRED_TEXT = "계정을 삭제합니다";

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      const reason = selectedReason === "기타" ? customReason : selectedReason;
      const result = await AccountService.deleteAccount({
        reason,
      });

      if (result.success) {
        Alert.alert("계정 삭제 요청됨", result.data?.message || "계정 삭제가 요청되었습니다.", [
          {
            text: "확인",
            onPress: () => {
              onClose();
              onSuccess?.();
            },
          },
        ]);
      } else {
        Alert.alert("오류", result.error || "계정 삭제 요청에 실패했습니다.");
      }
    } catch (error) {
      console.error("Account deletion error:", error);
      Alert.alert("오류", "계정 삭제 요청 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setConfirmText("");
    setSelectedReason("");
    setCustomReason("");
    setStep("warning");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isConfirmValid = confirmText.trim() === REQUIRED_TEXT;
  const isReasonValid = selectedReason && (selectedReason !== "기타" || customReason.trim());

  const renderWarningStep = () => (
    <>
      <View style={styles.warningContainer}>
        <Ionicons name="warning" size={48} color="#ef4444" />
        <Text style={[styles.warningTitle, { color: textColor }]}>계정 삭제</Text>
        <Text style={[styles.warningMessage, { color: placeholderColor }]}>
          계정을 삭제하면 다음 데이터가 영구적으로 삭제됩니다:
        </Text>
      </View>

      <View style={styles.dataListContainer}>
        <View style={styles.dataItem}>
          <Ionicons name="document-text-outline" size={20} color="#ef4444" />
          <Text style={[styles.dataItemText, { color: textColor }]}>
            작성한 모든 시와 메타데이터
          </Text>
        </View>
        <View style={styles.dataItem}>
          <Ionicons name="image-outline" size={20} color="#ef4444" />
          <Text style={[styles.dataItemText, { color: textColor }]}>업로드한 모든 이미지</Text>
        </View>
        <View style={styles.dataItem}>
          <Ionicons name="person-outline" size={20} color="#ef4444" />
          <Text style={[styles.dataItemText, { color: textColor }]}>프로필 정보 및 설정</Text>
        </View>
        <View style={styles.dataItem}>
          <Ionicons name="card-outline" size={20} color="#ef4444" />
          <Text style={[styles.dataItemText, { color: textColor }]}>구독 및 결제 정보</Text>
        </View>
      </View>

      <View style={styles.noteContainer}>
        <Text style={[styles.noteTitle, { color: textColor }]}>중요 사항:</Text>
        <Text style={[styles.note, { color: placeholderColor }]}>
          • 계정 삭제는 되돌릴 수 없습니다
        </Text>
        <Text style={[styles.note, { color: placeholderColor }]}>
          • 삭제 요청 후 24-48시간 내에 처리됩니다
        </Text>
        <Text style={[styles.note, { color: placeholderColor }]}>
          • 데이터 백업이 필요한 경우 미리 내보내기를 해주세요
        </Text>
      </View>
    </>
  );

  const renderReasonStep = () => (
    <>
      <Text style={[styles.stepTitle, { color: textColor }]}>삭제 사유</Text>
      <Text style={[styles.stepDescription, { color: placeholderColor }]}>
        서비스 개선을 위해 계정 삭제 사유를 알려주세요 (선택사항).
      </Text>

      <View style={styles.reasonContainer}>
        {DELETE_REASONS.map((reason) => (
          <TouchableOpacity
            key={reason}
            style={[
              styles.reasonOption,
              {
                borderColor: selectedReason === reason ? "#2563eb" : isDark ? "#4b5563" : "#e5e7eb",
                backgroundColor:
                  selectedReason === reason
                    ? isDark
                      ? "#1e40af"
                      : "#dbeafe"
                    : isDark
                    ? "#374151"
                    : "#ffffff",
              },
            ]}
            onPress={() => setSelectedReason(reason)}>
            <View style={styles.radioContainer}>
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: selectedReason === reason ? "#2563eb" : placeholderColor,
                  },
                ]}>
                {selectedReason === reason && <View style={styles.radioSelected} />}
              </View>
              <Text style={[styles.reasonText, { color: textColor }]}>{reason}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {selectedReason === "기타" && (
        <View style={styles.customReasonContainer}>
          <TextInput
            style={[
              styles.customReasonInput,
              {
                backgroundColor: isDark ? "#374151" : "#f9fafb",
                color: textColor,
                borderColor: isDark ? "#4b5563" : "#e5e7eb",
              },
            ]}
            value={customReason}
            onChangeText={setCustomReason}
            placeholder="삭제 사유를 입력해주세요"
            placeholderTextColor={placeholderColor}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      )}
    </>
  );

  const renderConfirmStep = () => (
    <>
      <Text style={[styles.stepTitle, { color: textColor }]}>최종 확인</Text>
      <Text style={[styles.stepDescription, { color: placeholderColor }]}>
        계정 삭제를 확인하려면 아래 텍스트를 정확히 입력해주세요:
      </Text>

      <View style={styles.confirmTextContainer}>
        <Text style={[styles.confirmTextLabel, { color: textColor }]}>"{REQUIRED_TEXT}"</Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.confirmInput,
            {
              backgroundColor: isDark ? "#374151" : "#f9fafb",
              color: textColor,
              borderColor: isConfirmValid
                ? "#22c55e"
                : confirmText.trim()
                ? "#ef4444"
                : isDark
                ? "#4b5563"
                : "#e5e7eb",
            },
          ]}
          value={confirmText}
          onChangeText={setConfirmText}
          placeholder={REQUIRED_TEXT}
          placeholderTextColor={placeholderColor}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {confirmText.trim() && (
          <View style={styles.validationContainer}>
            <Ionicons
              name={isConfirmValid ? "checkmark-circle" : "close-circle"}
              size={20}
              color={isConfirmValid ? "#22c55e" : "#ef4444"}
            />
            <Text
              style={[styles.validationText, { color: isConfirmValid ? "#22c55e" : "#ef4444" }]}>
              {isConfirmValid ? "텍스트가 일치합니다" : "텍스트가 일치하지 않습니다"}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.accountInfoContainer}>
        <Text style={[styles.accountInfoTitle, { color: textColor }]}>삭제될 계정:</Text>
        <Text style={[styles.accountInfoText, { color: placeholderColor }]}>
          {session?.user?.email}
        </Text>
      </View>
    </>
  );

  const renderStepContent = () => {
    switch (step) {
      case "warning":
        return renderWarningStep();
      case "reason":
        return renderReasonStep();
      case "confirm":
        return renderConfirmStep();
      default:
        return renderWarningStep();
    }
  };

  const renderFooter = () => {
    switch (step) {
      case "warning":
        return (
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.continueButton]}
              onPress={() => setStep("reason")}>
              <Text style={styles.continueButtonText}>계속</Text>
            </TouchableOpacity>
          </View>
        );
      case "reason":
        return (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.backButton]}
              onPress={() => setStep("warning")}>
              <Text style={styles.backButtonText}>이전</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.continueButton,
                !isReasonValid && styles.disabledButton,
              ]}
              onPress={() => setStep("confirm")}
              disabled={!isReasonValid}>
              <Text style={styles.continueButtonText}>다음</Text>
            </TouchableOpacity>
          </View>
        );
      case "confirm":
        return (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.backButton]}
              onPress={() => setStep("reason")}>
              <Text style={styles.backButtonText}>이전</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.deleteButton,
                (!isConfirmValid || isLoading) && styles.disabledButton,
              ]}
              onPress={handleDeleteAccount}
              disabled={!isConfirmValid || isLoading}>
              <Text style={styles.deleteButtonText}>{isLoading ? "삭제 중..." : "계정 삭제"}</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>계정 삭제</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={textColor} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderStepContent()}
        </ScrollView>

        {renderFooter()}
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
  warningContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  warningTitle: {
    fontSize: 24,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  warningMessage: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  dataListContainer: {
    marginBottom: 32,
  },
  dataItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  dataItemText: {
    fontSize: 16,
    marginLeft: 12,
  },
  noteContainer: {
    marginBottom: 32,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  note: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  reasonContainer: {
    marginBottom: 24,
  },
  reasonOption: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  radioContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563eb",
  },
  reasonText: {
    fontSize: 16,
    flex: 1,
  },
  customReasonContainer: {
    marginBottom: 24,
  },
  customReasonInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
  },
  confirmTextContainer: {
    backgroundColor: "#fef3c7",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  confirmTextLabel: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 24,
  },
  confirmInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  validationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  validationText: {
    fontSize: 14,
    marginLeft: 8,
  },
  accountInfoContainer: {
    marginBottom: 32,
  },
  accountInfoTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  accountInfoText: {
    fontSize: 16,
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
  backButton: {
    backgroundColor: "#f3f4f6",
  },
  backButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "500",
  },
  continueButton: {
    backgroundColor: "#2563eb",
  },
  continueButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
  },
  deleteButton: {
    backgroundColor: "#dc2626",
  },
  deleteButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
