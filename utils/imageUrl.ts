import { supabase } from "../supabase";

export interface ImageUrlOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "jpg" | "jpeg" | "png" | "webp" | "auto";
  resize?: "cover" | "contain" | "fill" | "inside" | "outside";
  blur?: number;
  sharpen?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hue?: number;
}

export interface ImageUrlInfo {
  url: string;
  optimized: boolean;
  parameters: ImageUrlOptions;
  size?: {
    width: number;
    height: number;
  };
}

export interface ImageUrlValidationResult {
  isValid: boolean;
  isSupabase: boolean;
  isOptimized: boolean;
  bucket?: string;
  path?: string;
  error?: string;
}

/**
 * Supabase Storage 이미지 URL을 생성합니다.
 */
export function generateImageUrl(imagePath: string, options: ImageUrlOptions = {}): string {
  try {
    const { data } = supabase.storage.from("images").getPublicUrl(imagePath);

    if (!data.publicUrl) {
      throw new Error("Failed to generate public URL");
    }

    return optimizeImageUrl(data.publicUrl, options);
  } catch (error) {
    console.error("Error generating image URL:", error);
    throw error;
  }
}

/**
 * 이미지 URL에 최적화 매개변수를 추가합니다.
 */
export function optimizeImageUrl(baseUrl: string, options: ImageUrlOptions = {}): string {
  if (!options || Object.keys(options).length === 0) {
    return baseUrl;
  }

  const url = new URL(baseUrl);
  const params = new URLSearchParams();

  // Resize parameters
  if (options.width) {
    params.append("width", options.width.toString());
  }
  if (options.height) {
    params.append("height", options.height.toString());
  }
  if (options.resize) {
    params.append("resize", options.resize);
  }

  // Quality and format
  if (options.quality) {
    params.append("quality", Math.max(1, Math.min(100, options.quality)).toString());
  }
  if (options.format) {
    params.append("format", options.format);
  }

  // Effects
  if (options.blur !== undefined) {
    params.append("blur", Math.max(0, Math.min(100, options.blur)).toString());
  }
  if (options.sharpen !== undefined) {
    params.append("sharpen", Math.max(0, Math.min(100, options.sharpen)).toString());
  }
  if (options.brightness !== undefined) {
    params.append("brightness", Math.max(-100, Math.min(100, options.brightness)).toString());
  }
  if (options.contrast !== undefined) {
    params.append("contrast", Math.max(-100, Math.min(100, options.contrast)).toString());
  }
  if (options.saturation !== undefined) {
    params.append("saturation", Math.max(-100, Math.min(100, options.saturation)).toString());
  }
  if (options.hue !== undefined) {
    params.append("hue", Math.max(-360, Math.min(360, options.hue)).toString());
  }

  // Add parameters to URL
  const paramString = params.toString();
  if (paramString) {
    url.search = paramString;
  }

  return url.toString();
}

/**
 * 이미지 URL을 검증합니다.
 */
export function validateImageUrl(url: string): ImageUrlValidationResult {
  try {
    const urlObj = new URL(url);

    // Check if it's a valid URL
    if (!urlObj.protocol.startsWith("http")) {
      return {
        isValid: false,
        isSupabase: false,
        isOptimized: false,
        error: "Invalid protocol. Only HTTP/HTTPS URLs are supported.",
      };
    }

    // Check if it's a Supabase URL
    const isSupabase =
      urlObj.hostname.includes("supabase") || urlObj.hostname.includes("supabase.co");

    // Check if it has optimization parameters
    const isOptimized = urlObj.searchParams.size > 0;

    let bucket: string | undefined;
    let path: string | undefined;

    if (isSupabase) {
      // Extract bucket and path from Supabase URL
      const pathSegments = urlObj.pathname.split("/");
      const storageIndex = pathSegments.findIndex((segment) => segment === "storage");
      const objectIndex = pathSegments.findIndex((segment) => segment === "object");

      if (storageIndex !== -1 && objectIndex !== -1) {
        bucket = pathSegments[objectIndex + 1];
        path = pathSegments.slice(objectIndex + 2).join("/");
      }
    }

    return {
      isValid: true,
      isSupabase,
      isOptimized,
      bucket,
      path,
    };
  } catch (error) {
    return {
      isValid: false,
      isSupabase: false,
      isOptimized: false,
      error: error instanceof Error ? error.message : "Invalid URL format",
    };
  }
}

/**
 * 이미지 URL에서 경로를 추출합니다.
 */
export function extractImagePath(url: string): string | null {
  const validation = validateImageUrl(url);
  return validation.path || null;
}

/**
 * 이미지 URL을 다양한 크기로 생성합니다.
 */
export function generateResponsiveImageUrls(
  imagePath: string,
  sizes: { width: number; height?: number; suffix: string }[]
): Record<string, string> {
  const urls: Record<string, string> = {};

  sizes.forEach(({ width, height, suffix }) => {
    urls[suffix] = generateImageUrl(imagePath, {
      width,
      height,
      format: "auto",
      resize: "cover",
      quality: 85,
    });
  });

  return urls;
}

/**
 * 썸네일 URL을 생성합니다.
 */
export function generateThumbnailUrl(
  imagePath: string,
  size: number = 150,
  quality: number = 80
): string {
  return generateImageUrl(imagePath, {
    width: size,
    height: size,
    format: "webp",
    resize: "cover",
    quality,
  });
}

/**
 * 다양한 해상도의 이미지 URL을 생성합니다.
 */
export function generateImageSrcSet(
  imagePath: string,
  widths: number[] = [320, 640, 1280, 1920]
): string {
  const urls = widths.map((width) => {
    const url = generateImageUrl(imagePath, {
      width,
      format: "auto",
      resize: "cover",
      quality: 85,
    });
    return `${url} ${width}w`;
  });

  return urls.join(", ");
}

/**
 * 이미지 URL을 최적화된 형태로 변환합니다.
 */
export function optimizeForDevice(
  url: string,
  devicePixelRatio: number = 1,
  maxWidth: number = 1920
): string {
  const validation = validateImageUrl(url);

  if (!validation.isValid || !validation.path) {
    return url;
  }

  const optimalWidth = Math.min(maxWidth * devicePixelRatio, maxWidth);

  return generateImageUrl(validation.path!, {
    width: optimalWidth,
    format: "auto",
    resize: "cover",
    quality: 85,
  });
}

/**
 * 이미지 URL에서 메타데이터를 추출합니다.
 */
export function extractImageMetadata(url: string): {
  originalUrl: string;
  parameters: ImageUrlOptions;
  isOptimized: boolean;
} {
  const urlObj = new URL(url);
  const params = urlObj.searchParams;

  const parameters: ImageUrlOptions = {};

  // Extract optimization parameters
  if (params.has("width")) {
    parameters.width = parseInt(params.get("width")!);
  }
  if (params.has("height")) {
    parameters.height = parseInt(params.get("height")!);
  }
  if (params.has("quality")) {
    parameters.quality = parseInt(params.get("quality")!);
  }
  if (params.has("format")) {
    parameters.format = params.get("format") as ImageUrlOptions["format"];
  }
  if (params.has("resize")) {
    parameters.resize = params.get("resize") as ImageUrlOptions["resize"];
  }
  if (params.has("blur")) {
    parameters.blur = parseInt(params.get("blur")!);
  }
  if (params.has("sharpen")) {
    parameters.sharpen = parseInt(params.get("sharpen")!);
  }
  if (params.has("brightness")) {
    parameters.brightness = parseInt(params.get("brightness")!);
  }
  if (params.has("contrast")) {
    parameters.contrast = parseInt(params.get("contrast")!);
  }
  if (params.has("saturation")) {
    parameters.saturation = parseInt(params.get("saturation")!);
  }
  if (params.has("hue")) {
    parameters.hue = parseInt(params.get("hue")!);
  }

  // Get original URL without parameters
  const originalUrl = `${urlObj.origin}${urlObj.pathname}`;

  return {
    originalUrl,
    parameters,
    isOptimized: Object.keys(parameters).length > 0,
  };
}

/**
 * 이미지 URL을 미리 로드합니다.
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof Image !== "undefined") {
      // Web environment
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = (error) => reject(error);
      img.src = url;
    } else {
      // React Native environment - just resolve immediately
      // In React Native, image preloading is handled by the Image component itself
      resolve();
    }
  });
}

/**
 * 여러 이미지 URL을 미리 로드합니다.
 */
export async function preloadImages(urls: string[]): Promise<void> {
  try {
    await Promise.all(urls.map((url: string) => preloadImage(url)));
  } catch (error) {
    console.error("Failed to preload images:", error);
    throw error;
  }
}

/**
 * 이미지 URL의 크기를 계산합니다.
 */
export function calculateImageSize(
  originalWidth: number,
  originalHeight: number,
  targetWidth?: number,
  targetHeight?: number,
  resize: ImageUrlOptions["resize"] = "cover"
): { width: number; height: number } {
  if (!targetWidth && !targetHeight) {
    return { width: originalWidth, height: originalHeight };
  }

  const aspectRatio = originalWidth / originalHeight;

  if (targetWidth && targetHeight) {
    switch (resize) {
      case "cover":
        const scaleX = targetWidth / originalWidth;
        const scaleY = targetHeight / originalHeight;
        const scale = Math.max(scaleX, scaleY);
        return {
          width: Math.round(originalWidth * scale),
          height: Math.round(originalHeight * scale),
        };

      case "contain":
        const containScaleX = targetWidth / originalWidth;
        const containScaleY = targetHeight / originalHeight;
        const containScale = Math.min(containScaleX, containScaleY);
        return {
          width: Math.round(originalWidth * containScale),
          height: Math.round(originalHeight * containScale),
        };

      case "fill":
        return { width: targetWidth, height: targetHeight };

      default:
        return { width: targetWidth, height: targetHeight };
    }
  }

  if (targetWidth) {
    return {
      width: targetWidth,
      height: Math.round(targetWidth / aspectRatio),
    };
  }

  if (targetHeight) {
    return {
      width: Math.round(targetHeight * aspectRatio),
      height: targetHeight,
    };
  }

  return { width: originalWidth, height: originalHeight };
}

/**
 * 이미지 URL 캐시를 관리합니다.
 */
class ImageUrlCache {
  private cache = new Map<string, string>();
  private maxSize = 100;

  set(key: string, url: string): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, url);
  }

  get(key: string): string | undefined {
    return this.cache.get(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const imageUrlCache = new ImageUrlCache();
