import { supabase } from "../supabase";

export interface DeletionOptions {
  deleteImages: boolean;
  deleteMetadata: boolean;
  retentionDays?: number; // For soft delete
}

export interface DeletionResult {
  success: boolean;
  error?: string;
  stats?: {
    poemsDeleted: number;
    imagesDeleted: number;
    totalSize: number;
  };
}

export interface DeletionProgress {
  stage: "preparing" | "poems" | "images" | "cleanup" | "complete";
  progress: number; // 0-100
  message: string;
}

/**
 * Soft delete user data (marks as deleted but keeps in database)
 */
export async function softDeleteUserData(
  userId: string,
  options: DeletionOptions,
  onProgress?: (progress: DeletionProgress) => void
): Promise<DeletionResult> {
  try {
    onProgress?.({
      stage: "preparing",
      progress: 0,
      message: "삭제 준비 중...",
    });

    let poemsDeleted = 0;
    let imagesDeleted = 0;

    // Soft delete poems
    onProgress?.({
      stage: "poems",
      progress: 25,
      message: "시 데이터 삭제 중...",
    });

    const { data: poems, error: poemsError } = await supabase
      .from("poems")
      .update({ deleted_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select("id");

    if (poemsError) {
      throw new Error(`시 데이터 삭제 실패: ${poemsError.message}`);
    }

    poemsDeleted = poems?.length || 0;

    // Soft delete images if requested
    if (options.deleteImages) {
      onProgress?.({
        stage: "images",
        progress: 50,
        message: "이미지 데이터 삭제 중...",
      });

      const { data: images, error: imagesError } = await supabase
        .from("images")
        .update({ deleted_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("deleted_at", null)
        .select("id");

      if (imagesError) {
        throw new Error(`이미지 데이터 삭제 실패: ${imagesError.message}`);
      }

      imagesDeleted = images?.length || 0;
    }

    // Schedule cleanup if retention period is set
    if (options.retentionDays) {
      await scheduleCleanup(userId, options.retentionDays);
    }

    onProgress?.({
      stage: "complete",
      progress: 100,
      message: "삭제 완료",
    });

    return {
      success: true,
      stats: {
        poemsDeleted,
        imagesDeleted,
        totalSize: 0, // TODO: Calculate actual size
      },
    };
  } catch (error) {
    console.error("Soft delete failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "삭제 실패",
    };
  }
}

/**
 * Hard delete user data (permanently removes from database)
 */
export async function hardDeleteUserData(
  userId: string,
  options: DeletionOptions,
  onProgress?: (progress: DeletionProgress) => void
): Promise<DeletionResult> {
  try {
    onProgress?.({
      stage: "preparing",
      progress: 0,
      message: "영구 삭제 준비 중...",
    });

    let poemsDeleted = 0;
    let imagesDeleted = 0;

    // Delete poem generations first (foreign key constraint)
    await supabase.from("poem_generations").delete().eq("user_id", userId);

    // Delete poems
    onProgress?.({
      stage: "poems",
      progress: 25,
      message: "시 데이터 영구 삭제 중...",
    });

    const { data: poems, error: poemsError } = await supabase
      .from("poems")
      .delete()
      .eq("user_id", userId)
      .select("id");

    if (poemsError) {
      throw new Error(`시 데이터 영구 삭제 실패: ${poemsError.message}`);
    }

    poemsDeleted = poems?.length || 0;

    // Delete images if requested
    if (options.deleteImages) {
      onProgress?.({
        stage: "images",
        progress: 50,
        message: "이미지 데이터 영구 삭제 중...",
      });

      const { data: images, error: imagesError } = await supabase
        .from("images")
        .delete()
        .eq("user_id", userId)
        .select("id");

      if (imagesError) {
        throw new Error(`이미지 데이터 영구 삭제 실패: ${imagesError.message}`);
      }

      imagesDeleted = images?.length || 0;
    }

    // Delete user sessions
    await supabase.from("user_sessions").delete().eq("user_id", userId);

    // Delete user reminders
    await supabase.from("user_reminders").delete().eq("user_id", userId);

    onProgress?.({
      stage: "complete",
      progress: 100,
      message: "영구 삭제 완료",
    });

    return {
      success: true,
      stats: {
        poemsDeleted,
        imagesDeleted,
        totalSize: 0, // TODO: Calculate actual size
      },
    };
  } catch (error) {
    console.error("Hard delete failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "영구 삭제 실패",
    };
  }
}

/**
 * Restore soft-deleted user data
 */
export async function restoreUserData(
  userId: string,
  onProgress?: (progress: DeletionProgress) => void
): Promise<DeletionResult> {
  try {
    onProgress?.({
      stage: "preparing",
      progress: 0,
      message: "복원 준비 중...",
    });

    let poemsRestored = 0;
    let imagesRestored = 0;

    // Restore poems
    onProgress?.({
      stage: "poems",
      progress: 25,
      message: "시 데이터 복원 중...",
    });

    const { data: poems, error: poemsError } = await supabase
      .from("poems")
      .update({ deleted_at: null })
      .eq("user_id", userId)
      .not("deleted_at", "is", null)
      .select("id");

    if (poemsError) {
      throw new Error(`시 데이터 복원 실패: ${poemsError.message}`);
    }

    poemsRestored = poems?.length || 0;

    // Restore images
    onProgress?.({
      stage: "images",
      progress: 50,
      message: "이미지 데이터 복원 중...",
    });

    const { data: images, error: imagesError } = await supabase
      .from("images")
      .update({ deleted_at: null })
      .eq("user_id", userId)
      .not("deleted_at", "is", null)
      .select("id");

    if (imagesError) {
      throw new Error(`이미지 데이터 복원 실패: ${imagesError.message}`);
    }

    imagesRestored = images?.length || 0;

    onProgress?.({
      stage: "complete",
      progress: 100,
      message: "복원 완료",
    });

    return {
      success: true,
      stats: {
        poemsDeleted: poemsRestored,
        imagesDeleted: imagesRestored,
        totalSize: 0,
      },
    };
  } catch (error) {
    console.error("Restore failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "복원 실패",
    };
  }
}

/**
 * Schedule cleanup for soft-deleted data
 */
async function scheduleCleanup(userId: string, retentionDays: number): Promise<void> {
  // TODO: Implement actual cleanup scheduling
  // This would typically involve:
  // 1. Creating a cleanup job in a queue
  // 2. Or storing cleanup date in database
  // 3. Having a background process that runs periodically

  console.log(`Scheduled cleanup for user ${userId} in ${retentionDays} days`);
}

/**
 * Get deletion history for a user
 */
export async function getDeletionHistory(userId: string): Promise<any[]> {
  // TODO: Implement deletion history tracking
  // This would require a deletion_history table
  return [];
}

/**
 * Check if user has soft-deleted data
 */
export async function hasSoftDeletedData(userId: string): Promise<boolean> {
  try {
    const { data: poems } = await supabase
      .from("poems")
      .select("id")
      .eq("user_id", userId)
      .not("deleted_at", "is", null)
      .limit(1);

    const { data: images } = await supabase
      .from("images")
      .select("id")
      .eq("user_id", userId)
      .not("deleted_at", "is", null)
      .limit(1);

    return (poems && poems.length > 0) || (images && images.length > 0);
  } catch (error) {
    console.error("Error checking soft-deleted data:", error);
    return false;
  }
}

/**
 * Get soft-deleted data stats
 */
export async function getSoftDeletedStats(userId: string): Promise<{
  poemsCount: number;
  imagesCount: number;
  deletedAt?: string;
}> {
  try {
    const { data: poems } = await supabase
      .from("poems")
      .select("id, deleted_at")
      .eq("user_id", userId)
      .not("deleted_at", "is", null);

    const { data: images } = await supabase
      .from("images")
      .select("id, deleted_at")
      .eq("user_id", userId)
      .not("deleted_at", "is", null);

    // Find most recent deletion date
    const allDeletions = [
      ...(poems || []).map((p) => p.deleted_at),
      ...(images || []).map((i) => i.deleted_at),
    ].filter((date): date is string => date !== null && date !== undefined);

    const mostRecentDeletion =
      allDeletions.length > 0 ? allDeletions.sort().reverse()[0] : undefined;

    return {
      poemsCount: poems?.length || 0,
      imagesCount: images?.length || 0,
      deletedAt: mostRecentDeletion || undefined,
    };
  } catch (error) {
    console.error("Error getting soft-deleted stats:", error);
    return {
      poemsCount: 0,
      imagesCount: 0,
    };
  }
}
