import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  deleteExportedFile,
  exportUserData,
  shareExportedFile,
  type ExportOptions,
  type ExportProgress,
  type ExportResult,
} from "../../services/dataExportService";
import { useAuthStore } from "../../store/useAuthStore";

interface DataExportModalProps {
  visible: boolean;
  onClose: () => void;
}

export function DataExportModal({ visible, onClose }: DataExportModalProps) {
  const { session } = useAuthStore();
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [options, setOptions] = useState<ExportOptions>({
    format: "json",
    includeImages: true,
    includeMetadata: true,
  });

  const handleExport = async () => {
    if (!session?.user?.id) {
      Alert.alert("오류", "로그인이 필요합니다.");
      return;
    }

    setIsExporting(true);
    setProgress(null);
    setExportResult(null);

    try {
      const result = await exportUserData(session.user.id, options, setProgress);
      setExportResult(result);

      if (result.success) {
        Alert.alert(
          "내보내기 완료",
          `${result.stats?.poemsCount || 0}개의 시와 ${
            result.stats?.imagesCount || 0
          }개의 이미지가 내보내기되었습니다.`,
          [
            { text: "공유", onPress: () => handleShare(result.filePath!) },
            { text: "확인", style: "default" },
          ]
        );
      } else {
        Alert.alert("내보내기 실패", result.error || "알 수 없는 오류가 발생했습니다.");
      }
    } catch (error) {
      Alert.alert("내보내기 실패", "내보내기 중 오류가 발생했습니다.");
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async (filePath: string) => {
    const success = await shareExportedFile(filePath);
    if (!success) {
      Alert.alert("공유 실패", "파일을 공유할 수 없습니다.");
    }
  };

  const handleClose = () => {
    if (exportResult?.filePath) {
      deleteExportedFile(exportResult.filePath);
    }
    setExportResult(null);
    setProgress(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>데이터 내보내기</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>닫기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>
            내 시와 이미지를 파일로 내보내어 백업하거나 다른 곳에서 사용할 수 있습니다.
          </Text>

          {/* Export Options */}
          <View style={styles.optionsContainer}>
            <Text style={styles.sectionTitle}>내보내기 옵션</Text>

            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>형식</Text>
              <View style={styles.formatButtons}>
                <TouchableOpacity
                  style={[
                    styles.formatButton,
                    options.format === "json" && styles.formatButtonActive,
                  ]}
                  onPress={() => setOptions({ ...options, format: "json" })}>
                  <Text
                    style={[
                      styles.formatButtonText,
                      options.format === "json" && styles.formatButtonTextActive,
                    ]}>
                    JSON
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.formatButton,
                    options.format === "zip" && styles.formatButtonActive,
                  ]}
                  onPress={() => setOptions({ ...options, format: "zip" })}>
                  <Text
                    style={[
                      styles.formatButtonText,
                      options.format === "zip" && styles.formatButtonTextActive,
                    ]}>
                    ZIP
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setOptions({ ...options, includeImages: !options.includeImages })}>
              <View style={styles.checkbox}>
                {options.includeImages && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>이미지 포함</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setOptions({ ...options, includeMetadata: !options.includeMetadata })}>
              <View style={styles.checkbox}>
                {options.includeMetadata && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>메타데이터 포함</Text>
            </TouchableOpacity>
          </View>

          {/* Progress */}
          {progress && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>{progress.message}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress.progress}%` }]} />
              </View>
              <Text style={styles.progressPercent}>{progress.progress}%</Text>
            </View>
          )}

          {/* Export Result */}
          {exportResult && exportResult.success && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultTitle}>내보내기 완료</Text>
              <Text style={styles.resultText}>시: {exportResult.stats?.poemsCount || 0}개</Text>
              <Text style={styles.resultText}>
                이미지: {exportResult.stats?.imagesCount || 0}개
              </Text>
              <Text style={styles.resultText}>
                파일 크기: {((exportResult.stats?.totalSize || 0) / 1024).toFixed(1)} KB
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
            onPress={handleExport}
            disabled={isExporting}>
            {isExporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.exportButtonText}>내보내기</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: "#007AFF",
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
    lineHeight: 20,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  optionLabel: {
    fontSize: 14,
    color: "#333",
  },
  formatButtons: {
    flexDirection: "row",
    gap: 8,
  },
  formatButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
  },
  formatButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  formatButtonText: {
    fontSize: 14,
    color: "#333",
  },
  formatButtonTextActive: {
    color: "#fff",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#007AFF",
    borderRadius: 4,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#333",
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#007AFF",
  },
  progressPercent: {
    fontSize: 12,
    color: "#666",
    textAlign: "right",
  },
  resultContainer: {
    padding: 16,
    backgroundColor: "#f0f8ff",
    borderRadius: 8,
    marginBottom: 24,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  exportButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  exportButtonDisabled: {
    backgroundColor: "#ccc",
  },
  exportButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
