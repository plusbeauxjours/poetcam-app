import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";
import { supabase } from "../supabase";
import type { ImageContentType, StorageListResult, StorageUsage } from "../types/storage";

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface ImageUploadOptions {
  userId: string;
  quality?: number;
  contentType?: ImageContentType;
}

/**
 * 이미지를 Supabase Storage에 업로드합니다.
 * @param imageUri - 로컬 이미지 URI (file://, content://, 등)
 * @param options - 업로드 옵션
 * @returns 업로드 결과
 */
export async function uploadImage(
  imageUri: string,
  options: ImageUploadOptions
): Promise<ImageUploadResult> {
  try {
    const { userId, quality = 0.8, contentType = "image/jpeg" } = options;

    // 고유한 파일명 생성
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = getFileExtension(contentType);
    const fileName = `${timestamp}_${randomString}.${fileExtension}`;
    const filePath = `${userId}/${fileName}`;

    // 이미지를 base64로 변환
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // base64를 ArrayBuffer로 디코드
    const arrayBuffer = decode(base64);

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage.from("images").upload(filePath, arrayBuffer, {
      contentType,
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      console.error("Storage upload error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    // 공용 URL 생성
    const { data: urlData } = supabase.storage.from("images").getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath,
    };
  } catch (error) {
    console.error("Image upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Supabase Storage에서 이미지를 삭제합니다.
 * @param imagePath - 삭제할 이미지 경로
 * @returns 삭제 성공 여부
 */
export async function deleteImage(imagePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from("images").remove([imagePath]);

    if (error) {
      console.error("Storage delete error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Image delete error:", error);
    return false;
  }
}

/**
 * 이미지 URL에서 Storage 경로를 추출합니다.
 * @param imageUrl - 이미지 공용 URL
 * @returns Storage 경로
 */
export function extractImagePath(imageUrl: string): string | null {
  try {
    const url = new URL(imageUrl);
    const pathSegments = url.pathname.split("/");
    const imagesIndex = pathSegments.findIndex((segment) => segment === "images");

    if (imagesIndex === -1 || imagesIndex === pathSegments.length - 1) {
      return null;
    }

    return pathSegments.slice(imagesIndex + 1).join("/");
  } catch (error) {
    console.error("Error extracting image path:", error);
    return null;
  }
}

/**
 * 이미지 공용 URL을 생성합니다.
 * @param imagePath - Storage 이미지 경로
 * @returns 공용 URL
 */
export function getImageUrl(imagePath: string): string {
  const { data } = supabase.storage.from("images").getPublicUrl(imagePath);

  return data.publicUrl;
}

/**
 * 사용자의 모든 이미지를 나열합니다.
 * @param userId - 사용자 ID
 * @returns 이미지 목록
 */
export async function listUserImages(userId: string): Promise<StorageListResult> {
  try {
    const { data, error } = await supabase.storage.from("images").list(userId, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error) {
      console.error("Storage list error:", error);
      return { success: false, error: error.message };
    }

    const images =
      data?.map((file) => ({
        name: file.name,
        path: `${userId}/${file.name}`,
        url: getImageUrl(`${userId}/${file.name}`),
        size: file.metadata?.size,
        lastModified: file.updated_at,
      })) || [];

    return { success: true, images };
  } catch (error) {
    console.error("List images error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Storage 사용량을 확인합니다.
 * @param userId - 사용자 ID
 * @returns 사용량 정보
 */
export async function getStorageUsage(userId: string): Promise<StorageUsage> {
  try {
    const { data, error } = await supabase.storage.from("images").list(userId);

    if (error) {
      console.error("Storage usage error:", error);
      return { success: false, error: error.message };
    }

    const totalSize =
      data?.reduce((sum, file) => {
        return sum + (file.metadata?.size || 0);
      }, 0) || 0;

    const fileCount = data?.length || 0;

    return {
      success: true,
      totalSize,
      fileCount,
      totalSizeMB: Number((totalSize / (1024 * 1024)).toFixed(2)),
    };
  } catch (error) {
    console.error("Storage usage error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 콘텐츠 타입에서 파일 확장자를 추출합니다.
 * @param contentType - MIME 타입
 * @returns 파일 확장자
 */
function getFileExtension(contentType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
  };

  return mimeToExt[contentType.toLowerCase()] || "jpg";
}

/**
 * Storage 연결을 테스트합니다.
 * @returns 테스트 결과
 */
export async function testStorageConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage.from("images").list("", { limit: 1 });

    if (error) {
      console.error("Storage connection test failed:", error);
      return false;
    }

    console.log("Storage connection test successful");
    return true;
  } catch (error) {
    console.error("Storage connection test error:", error);
    return false;
  }
}
