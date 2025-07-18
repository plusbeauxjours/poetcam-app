import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import ProfileService from "@/services/profileService";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "../ThemedText";
import { ThemedView } from "../ThemedView";

interface AvatarSelectorProps {
  currentAvatarUrl?: string;
  onAvatarUpdate: (newAvatarUrl: string) => void;
  onError?: (error: string) => void;
  userId: string;
  size?: number;
}

export function AvatarSelector({
  currentAvatarUrl,
  onAvatarUpdate,
  onError,
  userId,
  size = 120,
}: AvatarSelectorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const backgroundColor = colors.background;
  const textColor = colors.text;
  const tintColor = colors.tint;
  const borderColor = colors.border;

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("권한 필요", "갤러리에서 이미지를 선택하려면 권한이 필요합니다.", [
        { text: "확인" },
      ]);
      return false;
    }
    return true;
  };

  const showImageOptions = () => {
    Alert.alert("프로필 사진 변경", "프로필 사진을 어떻게 설정하시겠습니까?", [
      {
        text: "갤러리에서 선택",
        onPress: handlePickFromGallery,
      },
      {
        text: "카메라로 촬영",
        onPress: handleTakePhoto,
      },
      ...(currentAvatarUrl
        ? [
            {
              text: "현재 사진 삭제",
              onPress: handleDeleteAvatar,
              style: "destructive" as const,
            },
          ]
        : []),
      {
        text: "취소",
        style: "cancel" as const,
      },
    ]);
  };

  const handlePickFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        await handleImageUpload(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Gallery selection error:", error);
      onError?.("갤러리에서 이미지를 선택하는 중 오류가 발생했습니다.");
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("권한 필요", "카메라를 사용하려면 권한이 필요합니다.", [{ text: "확인" }]);
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        await handleImageUpload(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Camera capture error:", error);
      onError?.("카메라로 사진을 촬영하는 중 오류가 발생했습니다.");
    }
  };

  const handleImageUpload = async (imageUri: string) => {
    setIsUploading(true);
    try {
      // 기존 아바타가 있다면 삭제
      if (currentAvatarUrl) {
        await ProfileService.deleteAvatar(currentAvatarUrl);
      }

      // 새 아바타 업로드
      const uploadResult = await ProfileService.uploadAvatar(imageUri, userId);

      if (uploadResult.success && uploadResult.data) {
        onAvatarUpdate(uploadResult.data);
        Alert.alert("성공", "프로필 사진이 성공적으로 업데이트되었습니다.");
      } else {
        throw new Error(uploadResult.error || "업로드 실패");
      }
    } catch (error) {
      console.error("Avatar upload error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "아바타 업로드 중 오류가 발생했습니다.";
      onError?.(errorMessage);
      Alert.alert("오류", errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!currentAvatarUrl) return;

    Alert.alert("프로필 사진 삭제", "정말로 프로필 사진을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          setIsUploading(true);
          try {
            const deleteResult = await ProfileService.deleteAvatar(currentAvatarUrl);
            if (deleteResult.success) {
              onAvatarUpdate("");
              Alert.alert("성공", "프로필 사진이 삭제되었습니다.");
            } else {
              throw new Error(deleteResult.error || "삭제 실패");
            }
          } catch (error) {
            console.error("Avatar delete error:", error);
            const errorMessage =
              error instanceof Error ? error.message : "아바타 삭제 중 오류가 발생했습니다.";
            onError?.(errorMessage);
            Alert.alert("오류", errorMessage);
          } finally {
            setIsUploading(false);
          }
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity
        style={[
          styles.avatarContainer,
          {
            width: size,
            height: size,
            borderColor,
            backgroundColor: backgroundColor,
          },
        ]}
        onPress={showImageOptions}
        disabled={isUploading}>
        {isUploading ? (
          <ActivityIndicator size="large" color={tintColor} />
        ) : currentAvatarUrl ? (
          <Image
            source={{ uri: currentAvatarUrl }}
            style={[styles.avatarImage, { width: size - 4, height: size - 4 }]}
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="person" size={size * 0.4} color={textColor} style={{ opacity: 0.5 }} />
          </View>
        )}

        <View style={[styles.editButton, { backgroundColor: tintColor }]}>
          <Ionicons name="camera" size={16} color="white" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.changeButton}
        onPress={showImageOptions}
        disabled={isUploading}>
        <ThemedText style={[styles.changeButtonText, { color: tintColor }]}>
          {isUploading ? "업로드 중..." : "프로필 사진 변경"}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 20,
  },
  avatarContainer: {
    borderRadius: 60,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  avatarImage: {
    borderRadius: 58,
  },
  placeholderContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
  editButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  changeButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
});
