import * as FileSystem from "expo-file-system";
import { ImageProcessingOptions, processImageForAPI } from "./image";

export interface CacheEntry {
  key: string;
  uri: string;
  url?: string;
  timestamp: number;
  size: number;
  metadata?: {
    width: number;
    height: number;
    format: string;
    originalUri?: string;
  };
}

export interface CacheOptions {
  maxMemoryCacheSize?: number; // MB
  maxDiskCacheSize?: number; // MB
  ttl?: number; // milliseconds
  enableDiskCache?: boolean;
  enableMemoryCache?: boolean;
}

class ImageCacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private diskCacheDir: string;
  private options: Required<CacheOptions>;

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxMemoryCacheSize: options.maxMemoryCacheSize ?? 50, // 50MB
      maxDiskCacheSize: options.maxDiskCacheSize ?? 200, // 200MB
      ttl: options.ttl ?? 24 * 60 * 60 * 1000, // 24 hours
      enableDiskCache: options.enableDiskCache ?? true,
      enableMemoryCache: options.enableMemoryCache ?? true,
    };

    this.diskCacheDir = `${FileSystem.cacheDirectory}imageCache/`;
    this.initializeDiskCache();
  }

  private async initializeDiskCache(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.diskCacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.diskCacheDir, { intermediates: true });
      }
    } catch (error) {
      console.error("Failed to initialize disk cache:", error);
    }
  }

  private generateCacheKey(imageUri: string, options?: ImageProcessingOptions): string {
    const optionsHash = options ? JSON.stringify(options) : "";
    return `${imageUri}_${optionsHash}`.replace(/[^a-zA-Z0-9]/g, "_");
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > this.options.ttl;
  }

  private async evictMemoryCache(): Promise<void> {
    if (!this.options.enableMemoryCache) return;

    const entries = Array.from(this.memoryCache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const maxSizeBytes = this.options.maxMemoryCacheSize * 1024 * 1024;

    if (totalSize > maxSizeBytes) {
      // Sort by timestamp, remove oldest entries
      const sortedEntries = entries.sort((a, b) => a.timestamp - b.timestamp);
      let currentSize = totalSize;

      for (const entry of sortedEntries) {
        if (currentSize <= maxSizeBytes * 0.8) break; // Keep 80% of max size
        this.memoryCache.delete(entry.key);
        currentSize -= entry.size;
      }
    }
  }

  private async evictDiskCache(): Promise<void> {
    if (!this.options.enableDiskCache) return;

    try {
      const cacheEntries = await this.getDiskCacheEntries();
      const totalSize = cacheEntries.reduce((sum, entry) => sum + entry.size, 0);
      const maxSizeBytes = this.options.maxDiskCacheSize * 1024 * 1024;

      if (totalSize > maxSizeBytes) {
        // Sort by timestamp, remove oldest entries
        const sortedEntries = cacheEntries.sort((a, b) => a.timestamp - b.timestamp);
        let currentSize = totalSize;

        for (const entry of sortedEntries) {
          if (currentSize <= maxSizeBytes * 0.8) break; // Keep 80% of max size
          await this.removeDiskCacheEntry(entry.key);
          currentSize -= entry.size;
        }
      }
    } catch (error) {
      console.error("Failed to evict disk cache:", error);
    }
  }

  private async getDiskCacheEntries(): Promise<CacheEntry[]> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.diskCacheDir);
      const entries: CacheEntry[] = [];

      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = `${this.diskCacheDir}${file}`;
          const content = await FileSystem.readAsStringAsync(filePath);
          const entry: CacheEntry = JSON.parse(content);
          entries.push(entry);
        }
      }

      return entries;
    } catch (error) {
      console.error("Failed to get disk cache entries:", error);
      return [];
    }
  }

  private async removeDiskCacheEntry(key: string): Promise<void> {
    try {
      const metadataPath = `${this.diskCacheDir}${key}.json`;
      const imagePath = `${this.diskCacheDir}${key}`;

      await FileSystem.deleteAsync(metadataPath, { idempotent: true });
      await FileSystem.deleteAsync(imagePath, { idempotent: true });
    } catch (error) {
      console.error("Failed to remove disk cache entry:", error);
    }
  }

  async getCachedImage(
    imageUri: string,
    options?: ImageProcessingOptions
  ): Promise<CacheEntry | null> {
    const key = this.generateCacheKey(imageUri, options);

    // Check memory cache first
    if (this.options.enableMemoryCache && this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key)!;
      if (!this.isExpired(entry)) {
        return entry;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // Check disk cache
    if (this.options.enableDiskCache) {
      try {
        const metadataPath = `${this.diskCacheDir}${key}.json`;
        const imagePath = `${this.diskCacheDir}${key}`;

        const metadataInfo = await FileSystem.getInfoAsync(metadataPath);
        const imageInfo = await FileSystem.getInfoAsync(imagePath);

        if (metadataInfo.exists && imageInfo.exists) {
          const metadata = await FileSystem.readAsStringAsync(metadataPath);
          const entry: CacheEntry = JSON.parse(metadata);

          if (!this.isExpired(entry)) {
            // Add to memory cache
            if (this.options.enableMemoryCache) {
              this.memoryCache.set(key, entry);
              await this.evictMemoryCache();
            }
            return entry;
          } else {
            // Remove expired entry
            await this.removeDiskCacheEntry(key);
          }
        }
      } catch (error) {
        console.error("Failed to read from disk cache:", error);
      }
    }

    return null;
  }

  async cacheImage(
    imageUri: string,
    processedResult: {
      uri: string;
      base64: string;
      width: number;
      height: number;
      size: number;
      format: string;
    },
    options?: ImageProcessingOptions,
    url?: string
  ): Promise<void> {
    const key = this.generateCacheKey(imageUri, options);
    const entry: CacheEntry = {
      key,
      uri: processedResult.uri,
      url,
      timestamp: Date.now(),
      size: processedResult.size,
      metadata: {
        width: processedResult.width,
        height: processedResult.height,
        format: processedResult.format,
        originalUri: imageUri,
      },
    };

    // Add to memory cache
    if (this.options.enableMemoryCache) {
      this.memoryCache.set(key, entry);
      await this.evictMemoryCache();
    }

    // Add to disk cache
    if (this.options.enableDiskCache) {
      try {
        const metadataPath = `${this.diskCacheDir}${key}.json`;
        const imagePath = `${this.diskCacheDir}${key}`;

        // Save metadata
        await FileSystem.writeAsStringAsync(metadataPath, JSON.stringify(entry));

        // Copy processed image to cache directory
        await FileSystem.copyAsync({
          from: processedResult.uri,
          to: imagePath,
        });

        await this.evictDiskCache();
      } catch (error) {
        console.error("Failed to save to disk cache:", error);
      }
    }
  }

  async getOrProcessImage(
    imageUri: string,
    options?: ImageProcessingOptions
  ): Promise<{ uri: string; base64: string; cached: boolean }> {
    // Check cache first
    const cachedEntry = await this.getCachedImage(imageUri, options);
    if (cachedEntry) {
      try {
        // Read base64 from cached image
        const base64 = await FileSystem.readAsStringAsync(cachedEntry.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return {
          uri: cachedEntry.uri,
          base64,
          cached: true,
        };
      } catch (error) {
        console.error("Failed to read cached image:", error);
        // Fall through to process image
      }
    }

    // Process image if not cached
    const result = await processImageForAPI(imageUri, options);

    // Cache the result
    await this.cacheImage(imageUri, result.metadata, options);

    return {
      uri: result.metadata.uri,
      base64: result.base64,
      cached: false,
    };
  }

  async clearMemoryCache(): Promise<void> {
    this.memoryCache.clear();
  }

  async clearDiskCache(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.diskCacheDir);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.diskCacheDir, { idempotent: true });
        await this.initializeDiskCache();
      }
    } catch (error) {
      console.error("Failed to clear disk cache:", error);
    }
  }

  async clearAllCache(): Promise<void> {
    await this.clearMemoryCache();
    await this.clearDiskCache();
  }

  async getCacheSize(): Promise<{ memory: number; disk: number; total: number }> {
    const memorySize = Array.from(this.memoryCache.values()).reduce(
      (sum, entry) => sum + entry.size,
      0
    );

    let diskSize = 0;
    try {
      const entries = await this.getDiskCacheEntries();
      diskSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    } catch (error) {
      console.error("Failed to calculate disk cache size:", error);
    }

    return {
      memory: memorySize,
      disk: diskSize,
      total: memorySize + diskSize,
    };
  }
}

// Export singleton instance
export const imageCache = new ImageCacheManager();

// Export utility functions
export const clearImageCache = () => imageCache.clearAllCache();
export const getCacheSize = () => imageCache.getCacheSize();
export const getOrProcessImage = (imageUri: string, options?: ImageProcessingOptions) =>
  imageCache.getOrProcessImage(imageUri, options);
