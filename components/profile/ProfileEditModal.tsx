import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import ProfileService, { ProfileData } from "@/services/profileService";
import { DbUser } from "@/types/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "../ThemedText";
import { AvatarSelector } from "./AvatarSelector";

interface ProfileEditModalProps {
  visible: boolean;
  onClose: () => void;
  currentProfile: DbUser;
  onProfileUpdate: (updatedProfile: DbUser) => void;
}

export function ProfileEditModal({
  visible,
  onClose,
  currentProfile,
  onProfileUpdate,
}: ProfileEditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    name: currentProfile.name || "",
    avatar_url: currentProfile.avatar_url || "",
    preferences: {
      ...currentProfile.preferences,
    },
  });

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  // 모달이 열릴 때마다 폼 데이터 초기화
  useEffect(() => {
    if (visible) {
      setFormData({
        name: currentProfile.name || "",
        avatar_url: currentProfile.avatar_url || "",
        preferences: {
          ...currentProfile.preferences,
        },
      });
    }
  }, [visible, currentProfile]);

  const handleSave = async () => {
    // 유효성 검사
    const validation = ProfileService.validateProfile(formData);
    if (!validation.isValid) {
      Alert.alert("입력 오류", validation.errors.join("\n"));
      return;
    }

    setIsLoading(true);
    try {
      const result = await ProfileService.updateProfile(formData);

      if (result.success && result.data) {
        onProfileUpdate(result.data);
        Alert.alert("성공", "프로필이 성공적으로 업데이트되었습니다.", [
          { text: "확인", onPress: onClose },
        ]);
      } else {
        throw new Error(result.error || "프로필 업데이트 실패");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "프로필 업데이트 중 오류가 발생했습니다.";
      Alert.alert("오류", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert("변경사항 취소", "변경한 내용이 저장되지 않습니다. 정말 닫으시겠습니까?", [
      { text: "계속 편집", style: "cancel" },
      { text: "닫기", onPress: onClose },
    ]);
  };

  const updateFormData = (field: keyof ProfileData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updatePreferences = (category: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [category]: {
          ...(prev.preferences as any)?.[category],
          [field]: value,
        },
      },
    }));
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/* 헤더 */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <ThemedText style={[styles.headerButtonText, { color: colors.text }]}>취소</ThemedText>
          </TouchableOpacity>

          <ThemedText style={styles.headerTitle}>프로필 편집</ThemedText>

          <TouchableOpacity
            onPress={handleSave}
            style={[styles.headerButton, { opacity: isLoading ? 0.6 : 1 }]}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <ThemedText style={[styles.headerButtonText, { color: colors.tint }]}>
                저장
              </ThemedText>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 아바타 섹션 */}
          <AvatarSelector
            currentAvatarUrl={formData.avatar_url}
            onAvatarUpdate={(newUrl) => updateFormData("avatar_url", newUrl)}
            userId={currentProfile.id}
            onError={(error) => Alert.alert("오류", error)}
          />

          {/* 기본 정보 섹션 */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <ThemedText style={styles.sectionTitle}>기본 정보</ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: colors.text }]}>이름</ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={formData.name}
                onChangeText={(text) => updateFormData("name", text)}
                placeholder="이름을 입력하세요"
                placeholderTextColor={colors.secondaryText}
                maxLength={50}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: colors.text }]}>이메일</ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.grey[100],
                    color: colors.secondaryText,
                    borderColor: colors.border,
                  },
                ]}
                value={currentProfile.email}
                editable={false}
                placeholder="이메일"
              />
              <ThemedText style={[styles.helpText, { color: colors.secondaryText }]}>
                이메일은 계정 설정에서 변경할 수 있습니다.
              </ThemedText>
            </View>
          </View>

          {/* 알림 설정 섹션 */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <ThemedText style={styles.sectionTitle}>알림 설정</ThemedText>

            <View style={styles.switchGroup}>
              <View style={styles.switchItem}>
                <View style={styles.switchLabelContainer}>
                  <ThemedText style={[styles.switchLabel, { color: colors.text }]}>
                    이메일 알림
                  </ThemedText>
                  <ThemedText style={[styles.switchDescription, { color: colors.secondaryText }]}>
                    중요한 업데이트를 이메일로 받습니다
                  </ThemedText>
                </View>
                <Switch
                  value={formData.preferences?.notifications?.email ?? true}
                  onValueChange={(value) => updatePreferences("notifications", "email", value)}
                  trackColor={{ false: colors.grey[300], true: colors.tint }}
                  thumbColor={colors.background}
                />
              </View>

              <View style={styles.switchItem}>
                <View style={styles.switchLabelContainer}>
                  <ThemedText style={[styles.switchLabel, { color: colors.text }]}>
                    푸시 알림
                  </ThemedText>
                  <ThemedText style={[styles.switchDescription, { color: colors.secondaryText }]}>
                    앱 푸시 알림을 받습니다
                  </ThemedText>
                </View>
                <Switch
                  value={formData.preferences?.notifications?.push ?? true}
                  onValueChange={(value) => updatePreferences("notifications", "push", value)}
                  trackColor={{ false: colors.grey[300], true: colors.tint }}
                  thumbColor={colors.background}
                />
              </View>

              <View style={styles.switchItem}>
                <View style={styles.switchLabelContainer}>
                  <ThemedText style={[styles.switchLabel, { color: colors.text }]}>
                    위치 기반 알림
                  </ThemedText>
                  <ThemedText style={[styles.switchDescription, { color: colors.secondaryText }]}>
                    특정 장소에서 시 알림을 받습니다
                  </ThemedText>
                </View>
                <Switch
                  value={formData.preferences?.notifications?.locationReminders ?? true}
                  onValueChange={(value) =>
                    updatePreferences("notifications", "locationReminders", value)
                  }
                  trackColor={{ false: colors.grey[300], true: colors.tint }}
                  thumbColor={colors.background}
                />
              </View>
            </View>
          </View>

          {/* 프라이버시 설정 섹션 */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <ThemedText style={styles.sectionTitle}>프라이버시 설정</ThemedText>

            <View style={styles.switchGroup}>
              <View style={styles.switchItem}>
                <View style={styles.switchLabelContainer}>
                  <ThemedText style={[styles.switchLabel, { color: colors.text }]}>
                    프로필 공개
                  </ThemedText>
                  <ThemedText style={[styles.switchDescription, { color: colors.secondaryText }]}>
                    다른 사용자가 프로필을 볼 수 있습니다
                  </ThemedText>
                </View>
                <Switch
                  value={formData.preferences?.privacy?.profileVisible ?? true}
                  onValueChange={(value) => updatePreferences("privacy", "profileVisible", value)}
                  trackColor={{ false: colors.grey[300], true: colors.tint }}
                  thumbColor={colors.background}
                />
              </View>

              <View style={styles.switchItem}>
                <View style={styles.switchLabelContainer}>
                  <ThemedText style={[styles.switchLabel, { color: colors.text }]}>
                    시 공개 설정
                  </ThemedText>
                  <ThemedText style={[styles.switchDescription, { color: colors.secondaryText }]}>
                    기본적으로 시를 공개합니다
                  </ThemedText>
                </View>
                <Switch
                  value={formData.preferences?.privacy?.poemsPublic ?? false}
                  onValueChange={(value) => updatePreferences("privacy", "poemsPublic", value)}
                  trackColor={{ false: colors.grey[300], true: colors.tint }}
                  thumbColor={colors.background}
                />
              </View>

              <View style={styles.switchItem}>
                <View style={styles.switchLabelContainer}>
                  <ThemedText style={[styles.switchLabel, { color: colors.text }]}>
                    위치 정보 표시
                  </ThemedText>
                  <ThemedText style={[styles.switchDescription, { color: colors.secondaryText }]}>
                    시에 위치 정보를 포함합니다
                  </ThemedText>
                </View>
                <Switch
                  value={formData.preferences?.privacy?.showLocation ?? true}
                  onValueChange={(value) => updatePreferences("privacy", "showLocation", value)}
                  trackColor={{ false: colors.grey[300], true: colors.tint }}
                  thumbColor={colors.background}
                />
              </View>
            </View>
          </View>

          {/* 하단 여백 */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  section: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  helpText: {
    fontSize: 12,
    marginTop: 4,
  },
  switchGroup: {
    gap: 16,
  },
  switchItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 14,
  },
  bottomSpacer: {
    height: 40,
  },
});
