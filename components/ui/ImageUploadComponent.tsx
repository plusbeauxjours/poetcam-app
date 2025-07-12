import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useImageUpload } from "@/hooks/useImageUpload";
import { type ImageUploadOptions } from "@/utils/storage";
import * as ImagePicker from "expo-image-picker";
import {
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
  RefreshCw,
  Upload,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Dimensions, Image, Pressable, StyleSheet, TouchableOpacity } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

export interface ImageUploadComponentProps {
  userId: string;
  onUploadComplete?: (result: { url: string; path: string }) => void;
  onUploadError?: (error: string) => void;
  onCancel?: () => void;
  style?: any;
  disabled?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  allowCamera?: boolean;
  allowGallery?: boolean;
  showPreview?: boolean;
  autoUpload?: boolean;
  placeholder?: string;
}

export function ImageUploadComponent({
  userId,
  onUploadComplete,
  onUploadError,
  onCancel,
  style,
  disabled = false,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.8,
  allowCamera = true,
  allowGallery = true,
  showPreview = true,
  autoUpload = true,
  placeholder = "이미지를 선택하세요",
}: ImageUploadComponentProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [imageMetadata, setImageMetadata] = useState<{
    width: number;
    height: number;
    size: number;
  } | null>(null);

  const upload = useImageUpload();
  const animatedScale = useSharedValue(1);
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    if (upload.progress) {
      animatedProgress.value = withTiming(upload.progress.progress / 100, { duration: 300 });
    }
  }, [upload.progress]);

  useEffect(() => {
    if (upload.result && onUploadComplete) {
      onUploadComplete({
        url: upload.result.url!,
        path: upload.result.path!,
      });
    }
  }, [upload.result, onUploadComplete]);

  useEffect(() => {
    if (upload.error && onUploadError) {
      onUploadError(upload.error.message);
    }
  }, [upload.error, onUploadError]);

  const requestPermissions = useCallback(async () => {
    if (allowCamera) {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== "granted") {
        Alert.alert("카메라 권한 필요", "카메라를 사용하려면 권한을 허용해주세요.", [
          { text: "확인" },
        ]);
        return false;
      }
    }

    if (allowGallery) {
      const galleryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (galleryPermission.status !== "granted") {
        Alert.alert("갤러리 권한 필요", "갤러리에 접근하려면 권한을 허용해주세요.", [
          { text: "확인" },
        ]);
        return false;
      }
    }

    return true;
  }, [allowCamera, allowGallery]);

  const handleImagePick = useCallback(async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const options = [
      ...(allowCamera ? [{ text: "카메라로 촬영", onPress: () => pickImage("camera") }] : []),
      ...(allowGallery ? [{ text: "갤러리에서 선택", onPress: () => pickImage("gallery") }] : []),
      { text: "취소", style: "cancel" as const },
    ];

    Alert.alert("이미지 선택", "이미지를 선택하는 방법을 선택하세요.", options);
  }, [allowCamera, allowGallery, requestPermissions]);

  const pickImage = useCallback(
    async (source: "camera" | "gallery") => {
      try {
        const result = await (source === "camera"
          ? ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1,
            })
          : ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1,
            }));

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          setSelectedImageUri(asset.uri);
          setImageMetadata({
            width: asset.width || 0,
            height: asset.height || 0,
            size: asset.fileSize || 0,
          });

          if (autoUpload) {
            handleUpload(asset.uri);
          }
        }
      } catch (error) {
        console.error("Image picker error:", error);
        Alert.alert("오류", "이미지를 선택하는 중 오류가 발생했습니다.");
      }
    },
    [autoUpload]
  );

  const handleUpload = useCallback(
    async (imageUri?: string) => {
      const uri = imageUri || selectedImageUri;
      if (!uri) return;

      const uploadOptions: ImageUploadOptions & { processingOptions?: any } = {
        userId,
        quality,
        contentType: "image/jpeg",
        processingOptions: {
          maxWidth,
          maxHeight,
          quality,
        },
      };

      await upload.upload(uri, uploadOptions);
    },
    [selectedImageUri, userId, quality, maxWidth, maxHeight, upload]
  );

  const handleCancel = useCallback(() => {
    upload.cancel();
    setSelectedImageUri(null);
    setImageMetadata(null);
    upload.reset();
    if (onCancel) {
      onCancel();
    }
  }, [upload, onCancel]);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: animatedScale.value }],
  }));

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${interpolate(animatedProgress.value, [0, 1], [0, 100])}%`,
  }));

  const handlePressIn = useCallback(() => {
    animatedScale.value = withSpring(0.95);
  }, []);

  const handlePressOut = useCallback(() => {
    animatedScale.value = withSpring(1);
  }, []);

  const renderProgress = () => {
    if (!upload.progress) return null;

    return (
      <ThemedView style={[styles.progressContainer, { backgroundColor: colors.surface }]}>
        <ThemedView style={[styles.progressBar, { backgroundColor: colors.grey[200] }]}>
          <Animated.View
            style={[
              styles.progressFill,
              { backgroundColor: colors.primary },
              animatedProgressStyle,
            ]}
          />
        </ThemedView>
        <ThemedText style={[styles.progressText, { color: colors.text }]}>
          {upload.progress.message}
        </ThemedText>
        {upload.progress.details && (
          <ThemedText style={[styles.progressDetails, { color: colors.secondaryText }]}>
            {upload.progress.details}
          </ThemedText>
        )}
      </ThemedView>
    );
  };

  const renderError = () => {
    if (!upload.error) return null;

    return (
      <ThemedView style={[styles.errorContainer, { backgroundColor: colors.surface }]}>
        <AlertCircle color={colors.error} size={24} />
        <ThemedText style={[styles.errorText, { color: colors.error }]}>
          {upload.error.message}
        </ThemedText>
        {upload.error.details && (
          <ThemedText style={[styles.errorDetails, { color: colors.secondaryText }]}>
            {upload.error.details}
          </ThemedText>
        )}
        {upload.canRetry && (
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={upload.retry}>
            <RefreshCw color="white" size={16} />
            <ThemedText style={styles.retryButtonText}>재시도</ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>
    );
  };

  const renderSuccess = () => {
    if (upload.state !== "success" || !upload.result) return null;

    return (
      <ThemedView style={[styles.successContainer, { backgroundColor: colors.surface }]}>
        <CheckCircle color={colors.success} size={24} />
        <ThemedText style={[styles.successText, { color: colors.success }]}>
          업로드 완료!
        </ThemedText>
        <ThemedText style={[styles.successDetails, { color: colors.secondaryText }]}>
          {upload.result.url}
        </ThemedText>
      </ThemedView>
    );
  };

  const renderImagePreview = () => {
    if (!showPreview || !selectedImageUri) return null;

    return (
      <ThemedView style={styles.previewContainer}>
        <Image source={{ uri: selectedImageUri }} style={styles.previewImage} />
        <TouchableOpacity
          style={[styles.removeButton, { backgroundColor: colors.error }]}
          onPress={() => setSelectedImageUri(null)}>
          <X color="white" size={16} />
        </TouchableOpacity>
        {imageMetadata && (
          <ThemedView style={[styles.imageMetadata, { backgroundColor: colors.overlay }]}>
            <ThemedText style={[styles.metadataText, { color: colors.text }]}>
              {imageMetadata.width}x{imageMetadata.height}
            </ThemedText>
            <ThemedText style={[styles.metadataText, { color: colors.text }]}>
              {Math.round(imageMetadata.size / 1024)}KB
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>
    );
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    uploadButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    uploadButtonDisabled: {
      backgroundColor: colors.grey[300],
      opacity: 0.6,
    },
    selectButton: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: "dashed",
      paddingVertical: 32,
      paddingHorizontal: 24,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
  });

  return (
    <ThemedView style={[dynamicStyles.container, style]}>
      {/* Image Selection */}
      {!selectedImageUri && (
        <Animated.View style={animatedButtonStyle}>
          <Pressable
            style={dynamicStyles.selectButton}
            onPress={handleImagePick}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || upload.isUploading}>
            <ImageIcon color={colors.secondaryText} size={32} />
            <ThemedText style={[styles.placeholderText, { color: colors.secondaryText }]}>
              {placeholder}
            </ThemedText>
          </Pressable>
        </Animated.View>
      )}

      {/* Image Preview */}
      {renderImagePreview()}

      {/* Upload Button */}
      {selectedImageUri && !autoUpload && upload.state === "idle" && (
        <TouchableOpacity
          style={[dynamicStyles.uploadButton, disabled && dynamicStyles.uploadButtonDisabled]}
          onPress={() => handleUpload()}
          disabled={disabled || upload.isUploading}>
          <Upload color="white" size={20} />
          <ThemedText style={styles.uploadButtonText}>업로드</ThemedText>
        </TouchableOpacity>
      )}

      {/* Progress */}
      {renderProgress()}

      {/* Error */}
      {renderError()}

      {/* Success */}
      {renderSuccess()}

      {/* Cancel Button */}
      {upload.isUploading && (
        <TouchableOpacity
          style={[styles.cancelButton, { backgroundColor: colors.error }]}
          onPress={handleCancel}>
          <X color="white" size={16} />
          <ThemedText style={styles.cancelButtonText}>취소</ThemedText>
        </TouchableOpacity>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  placeholderText: {
    fontSize: 16,
    textAlign: "center",
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  previewContainer: {
    position: "relative",
    marginBottom: 16,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    resizeMode: "cover",
  },
  removeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  imageMetadata: {
    position: "absolute",
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: "row",
    gap: 8,
  },
  metadataText: {
    fontSize: 12,
    fontWeight: "500",
  },
  progressContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  progressDetails: {
    fontSize: 12,
  },
  errorContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  errorDetails: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 4,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  successContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  successText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  successDetails: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    gap: 4,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
});
