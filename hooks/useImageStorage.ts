import { useCallback, useState } from "react";
import type { StorageListResult, StorageUsage } from "../types/storage";
import {
  deleteImage,
  getStorageUsage,
  listUserImages,
  testStorageConnection,
  uploadImage,
  type ImageUploadOptions,
  type ImageUploadResult,
} from "../utils/storage";

interface UseImageStorageResult {
  // State
  isUploading: boolean;
  isLoading: boolean;
  error: string | null;

  // Upload functions
  upload: (imageUri: string, options: ImageUploadOptions) => Promise<ImageUploadResult>;

  // Delete functions
  remove: (imagePath: string) => Promise<boolean>;

  // List functions
  getUserImages: (userId: string) => Promise<StorageListResult>;

  // Usage functions
  getUsage: (userId: string) => Promise<StorageUsage>;

  // Test functions
  testConnection: () => Promise<boolean>;

  // Utility functions
  clearError: () => void;
}

export function useImageStorage(): UseImageStorageResult {
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const upload = useCallback(
    async (imageUri: string, options: ImageUploadOptions): Promise<ImageUploadResult> => {
      setIsUploading(true);
      setError(null);

      try {
        const result = await uploadImage(imageUri, options);

        if (!result.success && result.error) {
          setError(result.error);
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown upload error";
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  const remove = useCallback(async (imagePath: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await deleteImage(imagePath);

      if (!success) {
        setError("Failed to delete image");
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown delete error";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getUserImages = useCallback(async (userId: string): Promise<StorageListResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await listUserImages(userId);

      if (!result.success && result.error) {
        setError(result.error);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown list error";
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getUsage = useCallback(async (userId: string): Promise<StorageUsage> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getStorageUsage(userId);

      if (!result.success && result.error) {
        setError(result.error);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown usage error";
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const testConnection = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await testStorageConnection();

      if (!success) {
        setError("Storage connection test failed");
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Connection test error";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // State
    isUploading,
    isLoading,
    error,

    // Functions
    upload,
    remove,
    getUserImages,
    getUsage,
    testConnection,
    clearError,
  };
}
