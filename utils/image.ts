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
