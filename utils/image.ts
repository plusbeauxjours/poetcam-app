import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

/**
 * Image preprocessing configuration
 */
export const IMAGE_CONFIG = {
  // Maximum dimensions for optimal API performance and cost
  MAX_WIDTH: 1024,
  MAX_HEIGHT: 1024,
  // Quality settings for different scenarios
  QUALITY: {
    HIGH: 0.9,
    MEDIUM: 0.8,
    LOW: 0.7,
  },
  // Maximum file size in bytes (approximate, before base64 encoding)
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  // Minimum dimensions to ensure meaningful content
  MIN_WIDTH: 100,
  MIN_HEIGHT: 100,
} as const;

/**
 * Image processing options
 */
export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: SaveFormat;
  stripMetadata?: boolean;
  maintainAspectRatio?: boolean;
}

/**
 * Image processing result
 */
export interface ProcessedImageResult {
  uri: string;
  base64: string;
  width: number;
  height: number;
  size: number;
  format: string;
  originalSize?: number;
  compressionRatio?: number;
}

/**
 * Extract base64 data from data URL
 */
export function extractBase64FromDataUrl(dataUrl: string): string {
  const matches = dataUrl.match(/^data:image\/[a-z]+;base64,(.+)$/);
  return matches ? matches[1] : dataUrl;
}

/**
 * Detect image format from data URL or file URI
 */
export function detectImageFormat(imageData: string): string {
  if (
    imageData.includes("data:image/jpeg") ||
    imageData.includes(".jpg") ||
    imageData.includes(".jpeg")
  ) {
    return "jpeg";
  }
  if (imageData.includes("data:image/png") || imageData.includes(".png")) {
    return "png";
  }
  if (imageData.includes("data:image/webp") || imageData.includes(".webp")) {
    return "webp";
  }
  if (imageData.includes("data:image/gif") || imageData.includes(".gif")) {
    return "gif";
  }
  // Default to jpeg if can't detect
  return "jpeg";
}

/**
 * Get media type for Claude API
 */
export function getMediaType(imageFormat: string): string {
  switch (imageFormat) {
    case "jpeg":
    case "jpg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

/**
 * Validate base64 string
 */
export function isValidBase64(base64: string): boolean {
  try {
    // Check if string is valid base64
    const decoded = atob(base64);
    return decoded.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Check if base64 data has minimum size (at least 1KB)
 */
export function hasMinimumSize(base64: string): boolean {
  return base64.length > 1024; // Roughly 1KB minimum
}

/**
 * Calculate optimal dimensions while maintaining aspect ratio
 */
export function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number = IMAGE_CONFIG.MAX_WIDTH,
  maxHeight: number = IMAGE_CONFIG.MAX_HEIGHT
): { width: number; height: number } {
  // If image is already within limits, return original dimensions
  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return { width: originalWidth, height: originalHeight };
  }

  // Calculate scaling factor to fit within max dimensions
  const scaleX = maxWidth / originalWidth;
  const scaleY = maxHeight / originalHeight;
  const scale = Math.min(scaleX, scaleY);

  return {
    width: Math.round(originalWidth * scale),
    height: Math.round(originalHeight * scale),
  };
}

/**
 * Get image dimensions from URI
 */
export async function getImageDimensions(
  imageUri: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      reject(new Error("Failed to load image for dimension calculation"));
    };
    img.src = imageUri;
  });
}

/**
 * Preprocess image with optimization and resizing
 */
export async function preprocessImage(
  imageUri: string,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImageResult> {
  try {
    const {
      maxWidth = IMAGE_CONFIG.MAX_WIDTH,
      maxHeight = IMAGE_CONFIG.MAX_HEIGHT,
      quality = IMAGE_CONFIG.QUALITY.MEDIUM,
      format = SaveFormat.JPEG,
      stripMetadata = true,
      maintainAspectRatio = true,
    } = options;

    // Get original image info
    const originalInfo = await getImageInfo(imageUri);

    // Calculate optimal dimensions
    const { width, height } = maintainAspectRatio
      ? calculateOptimalDimensions(originalInfo.width, originalInfo.height, maxWidth, maxHeight)
      : { width: maxWidth, height: maxHeight };

    // Validate minimum dimensions
    if (width < IMAGE_CONFIG.MIN_WIDTH || height < IMAGE_CONFIG.MIN_HEIGHT) {
      throw new Error(
        `Image is too small. Minimum size: ${IMAGE_CONFIG.MIN_WIDTH}x${IMAGE_CONFIG.MIN_HEIGHT}`
      );
    }

    // Prepare manipulation actions
    const actions = [];

    // Resize if necessary
    if (width !== originalInfo.width || height !== originalInfo.height) {
      actions.push({
        resize: {
          width,
          height,
        },
      });
    }

    // Apply optimizations
    const result = await manipulateAsync(imageUri, actions, {
      compress: quality,
      format,
      base64: true,
    });

    if (!result.base64) {
      throw new Error("Failed to generate base64 data during image processing");
    }

    // Calculate compression metrics
    const originalSize = estimateFileSize(originalInfo.width, originalInfo.height);
    const newSize = estimateFileSize(result.width || width, result.height || height, quality);
    const compressionRatio = originalSize > 0 ? newSize / originalSize : 1;

    return {
      uri: result.uri,
      base64: result.base64,
      width: result.width || width,
      height: result.height || height,
      size: newSize,
      format: format.toLowerCase(),
      originalSize,
      compressionRatio,
    };
  } catch (error) {
    throw new Error(
      `Image preprocessing failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get basic image information
 */
async function getImageInfo(
  imageUri: string
): Promise<{ width: number; height: number; size?: number }> {
  try {
    // For React Native, we can use the manipulateAsync just to get info
    const result = await manipulateAsync(imageUri, [], { compress: 1, format: SaveFormat.JPEG });

    // Get dimensions through Image component (web compatibility)
    const dimensions = await getImageDimensions(imageUri);

    return {
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch (error) {
    throw new Error(
      `Failed to get image info: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Estimate file size based on dimensions and quality
 */
function estimateFileSize(width: number, height: number, quality: number = 0.8): number {
  // Rough estimation: JPEG typically uses 2-4 bytes per pixel depending on quality
  const pixelCount = width * height;
  const bytesPerPixel = 2 + quality * 2; // 2-4 bytes per pixel
  return Math.round(pixelCount * bytesPerPixel);
}

/**
 * Convert file URI to base64 data URL for React Native
 */
export async function fileUriToBase64DataUrl(fileUri: string): Promise<string> {
  try {
    const response = await fetch(fileUri);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert to base64"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    throw new Error(`Failed to convert file URI to base64: ${error}`);
  }
}

/**
 * Convert file URI to base64 data only (without data URL prefix)
 */
export async function fileUriToBase64(fileUri: string): Promise<string> {
  const dataUrl = await fileUriToBase64DataUrl(fileUri);
  return extractBase64FromDataUrl(dataUrl);
}

/**
 * Convert and preprocess image for Claude API with optimization
 */
export async function processImageForAPI(
  imageUri: string,
  options: ImageProcessingOptions = {}
): Promise<{ base64: string; metadata: ProcessedImageResult }> {
  try {
    // Preprocess the image with optimizations
    const processed = await preprocessImage(imageUri, {
      quality: IMAGE_CONFIG.QUALITY.MEDIUM,
      format: SaveFormat.JPEG, // Claude works best with JPEG
      stripMetadata: true,
      ...options,
    });

    // Validate the result
    if (!isValidBase64(processed.base64)) {
      throw new Error("Generated base64 data is invalid");
    }

    if (!hasMinimumSize(processed.base64)) {
      throw new Error("Processed image is too small");
    }

    // Check if file size is reasonable (base64 is ~33% larger than binary)
    const estimatedBinarySize = (processed.base64.length * 3) / 4;
    if (estimatedBinarySize > IMAGE_CONFIG.MAX_FILE_SIZE) {
      throw new Error(
        `Image is too large: ${(estimatedBinarySize / 1024 / 1024).toFixed(2)}MB (max: ${
          IMAGE_CONFIG.MAX_FILE_SIZE / 1024 / 1024
        }MB)`
      );
    }

    return {
      base64: processed.base64,
      metadata: processed,
    };
  } catch (error) {
    throw new Error(
      `Failed to process image for API: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
