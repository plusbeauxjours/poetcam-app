import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { AccountDeleteModal } from "@/components/account/AccountDeleteModal";
import { EmailChangeModal } from "@/components/account/EmailChangeModal";
import { PasswordChangeModal } from "@/components/account/PasswordChangeModal";
import { DataExportModal } from "@/components/data/DataExportModal";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  getSoftDeletedStats,
  hasSoftDeletedData,
  restoreUserData,
  softDeleteUserData,
} from "@/services/dataDeletionService";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function AccountScreen() {
  const { session, signOut, isLoading } = useAuthStore();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";

  // Modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Data states
  const [hasDeletedData, setHasDeletedData] = useState(false);
  const [deletedStats, setDeletedStats] = useState<{
    poemsCount: number;
    imagesCount: number;
    deletedAt?: string;
  }>({ poemsCount: 0, imagesCount: 0 });

  const isDark = colorScheme === "dark";
  const iconColor = isDark ? Colors.dark.text : Colors.light.text;

  React.useEffect(() => {
    checkDeletedData();
  }, [session?.user?.id]);

  const checkDeletedData = async () => {
    if (!session?.user?.id) return;

    const hasDeleted = await hasSoftDeletedData(session.user.id);
    setHasDeletedData(hasDeleted);

    if (hasDeleted) {
      const stats = await getSoftDeletedStats(session.user.id);
      setDeletedStats(stats);
    }
  };

  const handleDataExport = () => {
    setShowExportModal(true);
  };

  const handleDataDeletion = () => {
    Alert.alert(
      "데이터 삭제",
      "정말로 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 있습니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: confirmDataDeletion,
        },
      ]
    );
  };

  const confirmDataDeletion = async () => {
    if (!session?.user?.id) return;

    try {
      const result = await softDeleteUserData(session.user.id, {
        deleteImages: true,
        deleteMetadata: true,
        retentionDays: 30,
      });

      if (result.success) {
        Alert.alert(
          "삭제 완료",
          `${result.stats?.poemsDeleted || 0}개의 시와 ${
            result.stats?.imagesDeleted || 0
          }개의 이미지가 삭제되었습니다. 30일 내에 복원할 수 있습니다.`
        );
        checkDeletedData();
      } else {
        Alert.alert("삭제 실패", result.error || "알 수 없는 오류가 발생했습니다.");
      }
    } catch (error) {
      Alert.alert("삭제 실패", "데이터 삭제 중 오류가 발생했습니다.");
      console.error("Delete error:", error);
    }
  };

  const handleDataRestore = () => {
    Alert.alert("데이터 복원", "삭제된 데이터를 복원하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "복원", onPress: confirmDataRestore },
    ]);
  };

  const confirmDataRestore = async () => {
    if (!session?.user?.id) return;

    try {
      const result = await restoreUserData(session.user.id);

      if (result.success) {
        Alert.alert(
          "복원 완료",
          `${result.stats?.poemsDeleted || 0}개의 시와 ${
            result.stats?.imagesDeleted || 0
          }개의 이미지가 복원되었습니다.`
        );
        checkDeletedData();
      } else {
        Alert.alert("복원 실패", result.error || "알 수 없는 오류가 발생했습니다.");
      }
    } catch (error) {
      Alert.alert("복원 실패", "데이터 복원 중 오류가 발생했습니다.");
      console.error("Restore error:", error);
    }
  };

  const handleSignOut = () => {
    Alert.alert("로그아웃", "정말로 로그아웃하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "로그아웃", style: "destructive", onPress: confirmSignOut },
    ]);
  };

  const confirmSignOut = async () => {
    try {
      await signOut();
      router.replace("/login");
    } catch (error) {
      console.error("Sign out error:", error);
      Alert.alert("로그아웃 실패", "로그아웃 중 오류가 발생했습니다.");
    }
  };

  const handlePasswordChangeSuccess = () => {
    Alert.alert("성공", "비밀번호가 성공적으로 변경되었습니다.");
  };

  const handleEmailChangeSuccess = () => {
    Alert.alert("이메일 변경", "이메일 변경 확인 링크를 확인해주세요.");
  };

  const handleAccountDeleteSuccess = () => {
    router.replace("/login");
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>
          계정 관리
        </ThemedText>

        {/* Account Info Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: iconColor }]}>계정 정보</Text>
          {session?.user?.email && (
            <Text style={[styles.accountInfo, { color: iconColor }]}>
              이메일: {session.user.email}
            </Text>
          )}
          <Text style={[styles.accountInfo, { color: iconColor }]}>
            가입일:{" "}
            {session?.user?.created_at
              ? new Date(session.user.created_at).toLocaleDateString()
              : "알 수 없음"}
          </Text>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: iconColor }]}>보안 설정</Text>
          <Text style={[styles.sectionDescription, { color: iconColor }]}>
            계정 보안을 위한 설정을 관리할 수 있습니다.
          </Text>

          <TouchableOpacity style={styles.actionButton} onPress={() => setShowPasswordModal(true)}>
            <View style={styles.actionButtonContent}>
              <Ionicons name="lock-closed-outline" size={20} color="#2563eb" />
              <View style={styles.actionButtonTextContainer}>
                <Text style={[styles.actionButtonText, { color: iconColor }]}>비밀번호 변경</Text>
                <Text style={[styles.actionButtonSubtext, { color: iconColor }]}>
                  계정 보안을 위해 비밀번호를 변경하세요
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={iconColor} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => setShowEmailModal(true)}>
            <View style={styles.actionButtonContent}>
              <Ionicons name="mail-outline" size={20} color="#2563eb" />
              <View style={styles.actionButtonTextContainer}>
                <Text style={[styles.actionButtonText, { color: iconColor }]}>이메일 변경</Text>
                <Text style={[styles.actionButtonSubtext, { color: iconColor }]}>
                  로그인에 사용할 이메일 주소를 변경하세요
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={iconColor} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: iconColor }]}>데이터 관리</Text>
          <Text style={[styles.sectionDescription, { color: iconColor }]}>
            내 데이터를 내보내거나 삭제할 수 있습니다.
          </Text>

          <TouchableOpacity style={styles.actionButton} onPress={handleDataExport}>
            <View style={styles.actionButtonContent}>
              <Ionicons name="download-outline" size={20} color="#10b981" />
              <View style={styles.actionButtonTextContainer}>
                <Text style={[styles.actionButtonText, { color: iconColor }]}>데이터 내보내기</Text>
                <Text style={[styles.actionButtonSubtext, { color: iconColor }]}>
                  내 시와 이미지를 파일로 내보내기
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={iconColor} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleDataDeletion}>
            <View style={styles.actionButtonContent}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <View style={styles.actionButtonTextContainer}>
                <Text style={[styles.actionButtonText, styles.dangerButtonText]}>데이터 삭제</Text>
                <Text style={[styles.actionButtonSubtext, styles.dangerButtonSubtext]}>
                  모든 시와 이미지 삭제 (30일 내 복원 가능)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ef4444" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Deleted Data Section */}
        {hasDeletedData && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: iconColor }]}>삭제된 데이터</Text>
            <Text style={[styles.deletedDataText, { color: iconColor }]}>
              시 {deletedStats.poemsCount}개, 이미지 {deletedStats.imagesCount}개가 삭제되었습니다.
            </Text>
            {deletedStats.deletedAt && (
              <Text style={[styles.deletedDateText, { color: iconColor }]}>
                삭제일: {new Date(deletedStats.deletedAt).toLocaleDateString()}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.restoreButton]}
              onPress={handleDataRestore}>
              <View style={styles.actionButtonContent}>
                <Ionicons name="refresh-outline" size={20} color="#10b981" />
                <View style={styles.actionButtonTextContainer}>
                  <Text style={[styles.actionButtonText, styles.restoreButtonText]}>
                    데이터 복원
                  </Text>
                  <Text style={[styles.actionButtonSubtext, styles.restoreButtonSubtext]}>
                    삭제된 데이터를 다시 복원
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#10b981" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Account Actions Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: iconColor }]}>계정 설정</Text>

          <TouchableOpacity
            style={[styles.actionButton, styles.signOutButton]}
            onPress={handleSignOut}
            disabled={isLoading}>
            <View style={styles.actionButtonContent}>
              <Ionicons name="log-out-outline" size={20} color="#ea580c" />
              <View style={styles.actionButtonTextContainer}>
                <Text style={[styles.actionButtonText, styles.signOutButtonText]}>
                  {isLoading ? "로그아웃 중..." : "로그아웃"}
                </Text>
                <Text style={[styles.actionButtonSubtext, styles.signOutButtonSubtext]}>
                  계정에서 안전하게 로그아웃
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ea580c" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteAccountButton]}
            onPress={() => setShowDeleteModal(true)}>
            <View style={styles.actionButtonContent}>
              <Ionicons name="person-remove-outline" size={20} color="#dc2626" />
              <View style={styles.actionButtonTextContainer}>
                <Text style={[styles.actionButtonText, styles.deleteAccountButtonText]}>
                  계정 삭제
                </Text>
                <Text style={[styles.actionButtonSubtext, styles.deleteAccountButtonSubtext]}>
                  계정과 모든 데이터를 영구 삭제
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#dc2626" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals */}
      <DataExportModal visible={showExportModal} onClose={() => setShowExportModal(false)} />

      <PasswordChangeModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={handlePasswordChangeSuccess}
      />

      <EmailChangeModal
        visible={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSuccess={handleEmailChangeSuccess}
      />

      <AccountDeleteModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onSuccess={handleAccountDeleteSuccess}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    marginBottom: 24,
    textAlign: "center",
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    opacity: 0.7,
  },
  actionButton: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  actionButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  actionButtonTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  actionButtonSubtext: {
    fontSize: 14,
    opacity: 0.7,
  },
  dangerButton: {
    backgroundColor: "#fff5f5",
    borderColor: "#fed7d7",
  },
  dangerButtonText: {
    color: "#e53e3e",
  },
  dangerButtonSubtext: {
    color: "#c53030",
  },
  restoreButton: {
    backgroundColor: "#f0fff4",
    borderColor: "#c6f6d5",
  },
  restoreButtonText: {
    color: "#38a169",
  },
  restoreButtonSubtext: {
    color: "#2f855a",
  },
  signOutButton: {
    backgroundColor: "#fff8f1",
    borderColor: "#fed7aa",
  },
  signOutButtonText: {
    color: "#ea580c",
  },
  signOutButtonSubtext: {
    color: "#dc2626",
  },
  deleteAccountButton: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  deleteAccountButtonText: {
    color: "#dc2626",
  },
  deleteAccountButtonSubtext: {
    color: "#b91c1c",
  },
  deletedDataText: {
    fontSize: 14,
    marginBottom: 4,
    opacity: 0.7,
  },
  deletedDateText: {
    fontSize: 12,
    marginBottom: 16,
    opacity: 0.5,
  },
  accountInfo: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.7,
  },
});
