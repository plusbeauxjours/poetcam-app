import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DataExportModal } from "@/components/data/DataExportModal";
import {
  getSoftDeletedStats,
  hasSoftDeletedData,
  restoreUserData,
  softDeleteUserData,
} from "@/services/dataDeletionService";
import { useAuthStore } from "@/store/useAuthStore";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function AccountScreen() {
  const { session } = useAuthStore();
  const [showExportModal, setShowExportModal] = useState(false);
  const [hasDeletedData, setHasDeletedData] = useState(false);
  const [deletedStats, setDeletedStats] = useState<{
    poemsCount: number;
    imagesCount: number;
    deletedAt?: string;
  }>({ poemsCount: 0, imagesCount: 0 });

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

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>
          계정 관리
        </ThemedText>

        {/* Data Export Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>데이터 관리</Text>
          <Text style={styles.sectionDescription}>내 데이터를 내보내거나 삭제할 수 있습니다.</Text>

          <TouchableOpacity style={styles.actionButton} onPress={handleDataExport}>
            <Text style={styles.actionButtonText}>데이터 내보내기</Text>
            <Text style={styles.actionButtonSubtext}>내 시와 이미지를 파일로 내보내기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleDataDeletion}>
            <Text style={[styles.actionButtonText, styles.dangerButtonText]}>데이터 삭제</Text>
            <Text style={[styles.actionButtonSubtext, styles.dangerButtonSubtext]}>
              모든 시와 이미지 삭제 (30일 내 복원 가능)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Deleted Data Section */}
        {hasDeletedData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>삭제된 데이터</Text>
            <Text style={styles.deletedDataText}>
              시 {deletedStats.poemsCount}개, 이미지 {deletedStats.imagesCount}개가 삭제되었습니다.
            </Text>
            {deletedStats.deletedAt && (
              <Text style={styles.deletedDateText}>
                삭제일: {new Date(deletedStats.deletedAt).toLocaleDateString()}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.restoreButton]}
              onPress={handleDataRestore}>
              <Text style={[styles.actionButtonText, styles.restoreButtonText]}>데이터 복원</Text>
              <Text style={[styles.actionButtonSubtext, styles.restoreButtonSubtext]}>
                삭제된 데이터를 다시 복원
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Account Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정 정보</Text>
          {session?.user?.email && (
            <Text style={styles.accountInfo}>이메일: {session.user.email}</Text>
          )}
          <Text style={styles.accountInfo}>
            가입일:{" "}
            {session?.user?.created_at
              ? new Date(session.user.created_at).toLocaleDateString()
              : "알 수 없음"}
          </Text>
        </View>
      </ScrollView>

      <DataExportModal visible={showExportModal} onClose={() => setShowExportModal(false)} />
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
    color: "#333",
  },
  sectionDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  actionButtonSubtext: {
    fontSize: 14,
    color: "#666",
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
  deletedDataText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  deletedDateText: {
    fontSize: 12,
    color: "#999",
    marginBottom: 16,
  },
  accountInfo: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
});
