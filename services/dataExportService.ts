import * as FileSystem from "expo-file-system";
// TODO: Add expo-sharing when needed
// import * as Sharing from "expo-sharing";
import { supabase } from "../supabase";
import type { Database } from "../types/database";

export type ExportFormat = "json" | "zip";

export interface ExportOptions {
  format: ExportFormat;
  includeImages: boolean;
  includeMetadata: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
  stats?: {
    poemsCount: number;
    imagesCount: number;
    totalSize: number;
  };
}

export interface ExportProgress {
  stage: "preparing" | "fetching" | "processing" | "packaging" | "complete";
  progress: number; // 0-100
  message: string;
}

type Poem = Database["public"]["Tables"]["poems"]["Row"];
type Image = Database["public"]["Tables"]["images"]["Row"];

/**
 * Main data export function
 */
export async function exportUserData(
  userId: string,
  options: ExportOptions,
  onProgress?: (progress: ExportProgress) => void
): Promise<ExportResult> {
  try {
    onProgress?.({
      stage: "preparing",
      progress: 0,
      message: "내보내기 준비 중...",
    });

    // Fetch user data
    const { poems, images } = await fetchUserData(userId, options);

    onProgress?.({
      stage: "processing",
      progress: 50,
      message: "데이터 처리 중...",
    });

    // Generate export package
    const exportData = await generateDataPackage(poems, images, options);

    onProgress?.({
      stage: "packaging",
      progress: 80,
      message: "파일 생성 중...",
    });

    // Create file
    const filePath = await createExportFile(exportData, options);

    onProgress?.({
      stage: "complete",
      progress: 100,
      message: "내보내기 완료",
    });

    return {
      success: true,
      filePath,
      stats: {
        poemsCount: poems.length,
        imagesCount: images.length,
        totalSize: await getFileSize(filePath),
      },
    };
  } catch (error) {
    console.error("Data export failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "내보내기 실패",
    };
  }
}

/**
 * Fetch user data from Supabase
 */
async function fetchUserData(
  userId: string,
  options: ExportOptions
): Promise<{ poems: Poem[]; images: Image[] }> {
  const { data: poems, error: poemsError } = await supabase
    .from("poems")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (poemsError) {
    throw new Error(`시 데이터 조회 실패: ${poemsError.message}`);
  }

  const { data: images, error: imagesError } = await supabase
    .from("images")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (imagesError) {
    throw new Error(`이미지 데이터 조회 실패: ${imagesError.message}`);
  }

  return {
    poems: poems || [],
    images: images || [],
  };
}

/**
 * Generate structured export package
 */
async function generateDataPackage(
  poems: Poem[],
  images: Image[],
  options: ExportOptions
): Promise<any> {
  const exportData: any = {
    metadata: {
      exportDate: new Date().toISOString(),
      version: "1.0",
      format: options.format,
      includeImages: options.includeImages,
      includeMetadata: options.includeMetadata,
    },
    poems: poems.map((poem) => ({
      id: poem.id,
      originalText: poem.original_text,
      formattedText: poem.formatted_text,
      style: poem.style,
      language: poem.language,
      location: poem.location_address,
      coordinates: poem.location_point,
      createdAt: poem.created_at,
      updatedAt: poem.updated_at,
      imageId: poem.image_id,
      ...(options.includeMetadata && {
        metadata: poem.metadata,
      }),
    })),
    images: images.map((image) => ({
      id: image.id,
      originalUrl: image.original_url,
      compressedUrl: image.compressed_url,
      thumbnailUrl: image.thumbnail_url,
      fileSize: image.file_size,
      width: image.width,
      height: image.height,
      format: image.format,
      createdAt: image.created_at,
      ...(options.includeMetadata && {
        metadata: image.metadata,
      }),
    })),
  };

  return exportData;
}

/**
 * Create export file based on format
 */
async function createExportFile(exportData: any, options: ExportOptions): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `poetcam-export-${timestamp}`;

  if (options.format === "json") {
    return await createJsonFile(exportData, filename);
  } else {
    return await createZipFile(exportData, filename);
  }
}

/**
 * Create JSON export file
 */
async function createJsonFile(exportData: any, filename: string): Promise<string> {
  const filePath = `${FileSystem.documentDirectory}${filename}.json`;
  const jsonString = JSON.stringify(exportData, null, 2);

  await FileSystem.writeAsStringAsync(filePath, jsonString);
  return filePath;
}

/**
 * Create ZIP export file (placeholder - would need zip library)
 */
async function createZipFile(exportData: any, filename: string): Promise<string> {
  // For now, just create JSON file
  // TODO: Implement actual ZIP creation with images
  const filePath = `${FileSystem.documentDirectory}${filename}.json`;
  const jsonString = JSON.stringify(exportData, null, 2);

  await FileSystem.writeAsStringAsync(filePath, jsonString);
  return filePath;
}

/**
 * Get file size
 */
async function getFileSize(filePath: string): Promise<number> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    return fileInfo.exists ? fileInfo.size || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * Share exported file (placeholder)
 */
export async function shareExportedFile(filePath: string): Promise<boolean> {
  try {
    // TODO: Implement sharing when expo-sharing is available
    console.log("Would share file:", filePath);
    return true;
  } catch (error) {
    console.error("Failed to share file:", error);
    return false;
  }
}

/**
 * Delete exported file
 */
export async function deleteExportedFile(filePath: string): Promise<boolean> {
  try {
    await FileSystem.deleteAsync(filePath, { idempotent: true });
    return true;
  } catch (error) {
    console.error("Failed to delete file:", error);
    return false;
  }
}

/**
 * Get export history (placeholder - would need database table)
 */
export async function getExportHistory(userId: string): Promise<any[]> {
  // TODO: Implement export history tracking
  return [];
}
