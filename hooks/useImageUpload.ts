import { useCallback, useRef, useState } from "react";
import { ImageProcessingOptions } from "../utils/image";
import { getOrProcessImage } from "../utils/imageCache";
import { uploadImage, type ImageUploadOptions, type ImageUploadResult } from "../utils/storage";

export type UploadState = "idle" | "processing" | "uploading" | "success" | "error";

export interface UploadProgress {
  stage: "processing" | "uploading" | "finalizing";
  progress: number; // 0-100
  message: string;
  details?: string;
}

export interface UploadError {
  code: string;
  message: string;
  details?: string;
  recoverable: boolean;
}

export interface UseImageUploadResult {
  // State
  state: UploadState;
  progress: UploadProgress | null;
  error: UploadError | null;
  result: ImageUploadResult | null;

  // Functions
  upload: (
    imageUri: string,
    options: ImageUploadOptions & { processingOptions?: ImageProcessingOptions }
  ) => Promise<ImageUploadResult>;
  retry: () => Promise<ImageUploadResult | null>;
  cancel: () => void;
  reset: () => void;

  // Computed properties
  isUploading: boolean;
  canRetry: boolean;
}

export function useImageUpload(): UseImageUploadResult {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<UploadError | null>(null);
  const [result, setResult] = useState<ImageUploadResult | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUploadParamsRef = useRef<{
    imageUri: string;
    options: ImageUploadOptions & { processingOptions?: ImageProcessingOptions };
  } | null>(null);

  const reset = useCallback(() => {
    setState("idle");
    setProgress(null);
    setError(null);
    setResult(null);
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    lastUploadParamsRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState("idle");
      setProgress(null);
      setError({
        code: "USER_CANCELLED",
        message: "업로드가 취소되었습니다.",
        recoverable: true,
      });
    }
  }, []);

  const createProgressUpdate = useCallback(
    (stage: UploadProgress["stage"], progress: number, message: string, details?: string) => {
      const progressUpdate: UploadProgress = {
        stage,
        progress: Math.round(progress),
        message,
        details,
      };
      setProgress(progressUpdate);
      return progressUpdate;
    },
    []
  );

  const upload = useCallback(
    async (
      imageUri: string,
      options: ImageUploadOptions & { processingOptions?: ImageProcessingOptions }
    ): Promise<ImageUploadResult> => {
      // Store parameters for retry
      lastUploadParamsRef.current = { imageUri, options };

      // Reset state
      setState("processing");
      setError(null);
      setResult(null);

      // Create abort controller
      abortControllerRef.current = new AbortController();

      try {
        // Stage 1: Image processing
        createProgressUpdate(
          "processing",
          0,
          "이미지를 처리하고 있습니다...",
          "이미지 압축 및 최적화 중"
        );

        let processedImage;
        try {
          processedImage = await getOrProcessImage(imageUri, options.processingOptions);

          if (abortControllerRef.current.signal.aborted) {
            throw new Error("Upload cancelled");
          }

          createProgressUpdate(
            "processing",
            30,
            "이미지 처리 완료",
            `${processedImage.cached ? "캐시에서 로드됨" : "새로 처리됨"}`
          );
        } catch (processingError) {
          throw {
            code: "PROCESSING_ERROR",
            message: "이미지 처리 중 오류가 발생했습니다.",
            details: processingError instanceof Error ? processingError.message : "알 수 없는 오류",
            recoverable: true,
          };
        }

        // Stage 2: Upload to storage
        setState("uploading");
        createProgressUpdate(
          "uploading",
          40,
          "이미지를 업로드하고 있습니다...",
          "Supabase Storage에 업로드 중"
        );

        let uploadResult;
        try {
          uploadResult = await uploadImage(processedImage.uri, options);

          if (abortControllerRef.current.signal.aborted) {
            throw new Error("Upload cancelled");
          }

          if (!uploadResult.success) {
            throw {
              code: "UPLOAD_ERROR",
              message: uploadResult.error || "업로드 중 오류가 발생했습니다.",
              details: uploadResult.error,
              recoverable: true,
            };
          }

          createProgressUpdate("uploading", 80, "업로드 완료", "URL 생성 중");
        } catch (uploadError) {
          if (uploadError && typeof uploadError === "object" && "code" in uploadError) {
            throw uploadError;
          }
          throw {
            code: "UPLOAD_ERROR",
            message: "업로드 중 오류가 발생했습니다.",
            details: uploadError instanceof Error ? uploadError.message : "알 수 없는 오류",
            recoverable: true,
          };
        }

        // Stage 3: Finalization
        createProgressUpdate("finalizing", 90, "마무리 중...", "업로드 결과 확인");

        // Validate result
        if (!uploadResult.url) {
          throw {
            code: "INVALID_RESULT",
            message: "업로드는 완료되었지만 URL을 가져올 수 없습니다.",
            details: "결과에 URL이 포함되지 않음",
            recoverable: true,
          };
        }

        // Success
        createProgressUpdate("finalizing", 100, "업로드 완료!", `URL: ${uploadResult.url}`);
        setState("success");
        setResult(uploadResult);

        return uploadResult;
      } catch (error) {
        console.error("Upload error:", error);

        const uploadError =
          error && typeof error === "object" && "code" in error
            ? (error as UploadError)
            : {
                code: "UNKNOWN_ERROR",
                message: "알 수 없는 오류가 발생했습니다.",
                details: error instanceof Error ? error.message : "Unknown error",
                recoverable: true,
              };

        setState("error");
        setError(uploadError);

        return {
          success: false,
          error: uploadError.message,
        };
      } finally {
        abortControllerRef.current = null;
      }
    },
    [createProgressUpdate]
  );

  const retry = useCallback(async (): Promise<ImageUploadResult | null> => {
    if (!lastUploadParamsRef.current) {
      setError({
        code: "NO_RETRY_DATA",
        message: "재시도할 데이터가 없습니다.",
        recoverable: false,
      });
      return null;
    }

    const { imageUri, options } = lastUploadParamsRef.current;
    return upload(imageUri, options);
  }, [upload]);

  const isUploading = state === "processing" || state === "uploading";
  const canRetry = state === "error" && error?.recoverable === true;

  return {
    // State
    state,
    progress,
    error,
    result,

    // Functions
    upload,
    retry,
    cancel,
    reset,

    // Computed properties
    isUploading,
    canRetry,
  };
}

// Utility hook for multiple uploads
export function useMultipleImageUpload() {
  const [uploads, setUploads] = useState<Map<string, UseImageUploadResult>>(new Map());

  const createUpload = useCallback((id: string) => {
    const upload = useImageUpload();
    setUploads((prev) => new Map(prev).set(id, upload));
    return upload;
  }, []);

  const removeUpload = useCallback((id: string) => {
    setUploads((prev) => {
      const newUploads = new Map(prev);
      newUploads.delete(id);
      return newUploads;
    });
  }, []);

  const getUpload = useCallback(
    (id: string) => {
      return uploads.get(id);
    },
    [uploads]
  );

  const getAllUploads = useCallback(() => {
    return Array.from(uploads.values());
  }, [uploads]);

  const getActiveUploads = useCallback(() => {
    return Array.from(uploads.values()).filter((upload) => upload.isUploading);
  }, [uploads]);

  const getCompletedUploads = useCallback(() => {
    return Array.from(uploads.values()).filter((upload) => upload.state === "success");
  }, [uploads]);

  const getFailedUploads = useCallback(() => {
    return Array.from(uploads.values()).filter((upload) => upload.state === "error");
  }, [uploads]);

  const retryAll = useCallback(async () => {
    const failed = getFailedUploads();
    const results = await Promise.allSettled(failed.map((upload) => upload.retry()));
    return results;
  }, [getFailedUploads]);

  const cancelAll = useCallback(() => {
    uploads.forEach((upload) => upload.cancel());
  }, [uploads]);

  return {
    uploads,
    createUpload,
    removeUpload,
    getUpload,
    getAllUploads,
    getActiveUploads,
    getCompletedUploads,
    getFailedUploads,
    retryAll,
    cancelAll,
  };
}
