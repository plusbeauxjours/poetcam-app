/**
 * Metadata Cache System
 * Intelligent caching for metadata with performance optimization
 */

import type {
  MetadataCacheConfig,
  MetadataCacheEntry,
  MetadataEntityType,
  MetadataType,
} from "../types/metadata";

// Dynamic import for AsyncStorage to handle environments where it's not available
let AsyncStorage: any = null;
try {
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch (error) {
  console.warn("AsyncStorage not available, disk caching will be disabled");
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

interface CacheKey {
  entityType: MetadataEntityType;
  entityId: string;
  version?: string;
}

class MetadataCache {
  private memoryCache: Map<string, MetadataCacheEntry> = new Map<string, MetadataCacheEntry>();
  private config: MetadataCacheConfig;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    hitRate: 0,
  };

  constructor(config: Partial<MetadataCacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize ?? 50, // 50MB default
      defaultTtl: config.defaultTtl ?? 3600, // 1 hour default
      strategy: config.strategy ?? "lru",
      compression: config.compression ?? false,
      persistToDisk: config.persistToDisk ?? true,
    };
  }

  /**
   * Generate cache key for metadata
   */
  private generateCacheKey(key: CacheKey): string {
    return `metadata:${key.entityType}:${key.entityId}${key.version ? `:${key.version}` : ""}`;
  }

  /**
   * Calculate cache entry size in bytes
   */
  private calculateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // Fallback for environments without Blob
      return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
    }
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: MetadataCacheEntry): boolean {
    const now = Date.now();
    const entryTime = new Date(entry.metadata.timestamp).getTime();
    return now - entryTime > entry.metadata.ttl * 1000;
  }

  /**
   * Evict entries based on strategy
   */
  private async evictEntries(): Promise<void> {
    const maxSizeBytes = this.config.maxSize * 1024 * 1024;
    let currentSize = 0;

    // Calculate current cache size
    for (const entry of this.memoryCache.values()) {
      currentSize += entry.metadata.size;
    }

    if (currentSize <= maxSizeBytes) {
      return; // No eviction needed
    }

    const entries = Array.from(this.memoryCache.entries());
    let entriesToRemove: string[] = [];

    switch (this.config.strategy) {
      case "lru":
        // Sort by timestamp (oldest first)
        entries.sort(
          (a, b) =>
            new Date(a[1].metadata.timestamp).getTime() -
            new Date(b[1].metadata.timestamp).getTime()
        );
        break;

      case "lfu":
        // Sort by hit count (least frequently used first)
        entries.sort((a, b) => a[1].metadata.hitCount - b[1].metadata.hitCount);
        break;

      case "fifo":
        // Already in insertion order for Map
        break;
    }

    // Remove entries until we're under the size limit
    for (const [key, entry] of entries) {
      if (currentSize <= maxSizeBytes * 0.8) break; // Keep at 80% of max size

      entriesToRemove.push(key);
      currentSize -= entry.metadata.size;
      this.stats.evictions++;
    }

    // Remove entries from cache
    for (const key of entriesToRemove) {
      this.memoryCache.delete(key);

      // Also remove from disk cache if enabled
      if (this.config.persistToDisk) {
        try {
          await AsyncStorage.removeItem(`metadataCache:${key}`);
        } catch (error) {
          console.warn("Failed to remove cache entry from disk:", error);
        }
      }
    }

    this.updateStats();
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.size = this.memoryCache.size;
    this.stats.hitRate =
      this.stats.hits + this.stats.misses > 0
        ? this.stats.hits / (this.stats.hits + this.stats.misses)
        : 0;
  }

  /**
   * Get metadata from cache
   */
  async get<T extends MetadataType>(
    entityType: MetadataEntityType,
    entityId: string,
    version?: string
  ): Promise<T | null> {
    const cacheKey = this.generateCacheKey({ entityType, entityId, version });

    // Check memory cache first
    let entry = this.memoryCache.get(cacheKey);

    // If not in memory, try disk cache
    if (!entry && this.config.persistToDisk) {
      try {
        const diskData = await AsyncStorage.getItem(`metadataCache:${cacheKey}`);
        if (diskData) {
          entry = JSON.parse(diskData) as MetadataCacheEntry<T>;

          // Add back to memory cache if not expired
          if (!this.isExpired(entry)) {
            this.memoryCache.set(cacheKey, entry);
          } else {
            // Remove expired entry from disk
            await AsyncStorage.removeItem(`metadataCache:${cacheKey}`);
            entry = undefined;
          }
        }
      } catch (error) {
        console.warn("Failed to read from disk cache:", error);
      }
    }

    // Check if entry exists and is not expired
    if (!entry || this.isExpired(entry)) {
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    // Update hit count and last access time
    entry.metadata.hitCount++;
    entry.metadata.timestamp = new Date().toISOString();

    // Update entry in memory cache
    this.memoryCache.set(cacheKey, entry);

    this.stats.hits++;
    this.updateStats();

    return entry.data as T;
  }

  /**
   * Store metadata in cache
   */
  async set<T extends MetadataType>(
    entityType: MetadataEntityType,
    entityId: string,
    data: T,
    ttl?: number,
    version?: string
  ): Promise<void> {
    const cacheKey = this.generateCacheKey({ entityType, entityId, version });
    const size = this.calculateSize(data);

    const entry: MetadataCacheEntry<T> = {
      data,
      metadata: {
        cacheKey,
        timestamp: new Date().toISOString(),
        ttl: ttl ?? this.config.defaultTtl,
        hitCount: 0,
        size,
      },
    };

    // Store in memory cache
    this.memoryCache.set(cacheKey, entry);

    // Store in disk cache if enabled
    if (this.config.persistToDisk) {
      try {
        await AsyncStorage.setItem(`metadataCache:${cacheKey}`, JSON.stringify(entry));
      } catch (error) {
        console.warn("Failed to write to disk cache:", error);
      }
    }

    // Check if eviction is needed
    await this.evictEntries();
    this.updateStats();
  }

  /**
   * Remove specific entry from cache
   */
  async remove(entityType: MetadataEntityType, entityId: string, version?: string): Promise<void> {
    const cacheKey = this.generateCacheKey({ entityType, entityId, version });

    // Remove from memory cache
    this.memoryCache.delete(cacheKey);

    // Remove from disk cache if enabled
    if (this.config.persistToDisk) {
      try {
        await AsyncStorage.removeItem(`metadataCache:${cacheKey}`);
      } catch (error) {
        console.warn("Failed to remove from disk cache:", error);
      }
    }

    this.updateStats();
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear disk cache if enabled
    if (this.config.persistToDisk) {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter((key) => key.startsWith("metadataCache:"));
        await AsyncStorage.multiRemove(cacheKeys);
      } catch (error) {
        console.warn("Failed to clear disk cache:", error);
      }
    }

    // Reset stats
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      hitRate: 0,
    };
  }

  /**
   * Clear expired entries
   */
  async clearExpired(): Promise<number> {
    let removedCount = 0;
    const expiredKeys: string[] = [];

    // Find expired entries in memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key as string);
      }
    }

    // Remove expired entries
    for (const key of expiredKeys) {
      this.memoryCache.delete(key);
      removedCount++;

      // Also remove from disk cache
      if (this.config.persistToDisk) {
        try {
          await AsyncStorage.removeItem(`metadataCache:${key}`);
        } catch (error) {
          console.warn("Failed to remove expired entry from disk:", error);
        }
      }
    }

    this.updateStats();
    return removedCount;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache configuration
   */
  getConfig(): MetadataCacheConfig {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<MetadataCacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Warm up cache with frequently accessed metadata
   */
  async warmUp(
    entries: Array<{
      entityType: MetadataEntityType;
      entityId: string;
      data: MetadataType;
      version?: string;
    }>
  ): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.entityType, entry.entityId, entry.data, undefined, entry.version);
    }
  }

  /**
   * Get cache size in bytes
   */
  getCacheSize(): { memory: number; total: number } {
    let memorySize = 0;

    for (const entry of this.memoryCache.values()) {
      memorySize += entry.metadata.size;
    }

    return {
      memory: memorySize,
      total: memorySize, // For now, we don't calculate disk size separately
    };
  }

  /**
   * Preload metadata for entities
   */
  async preload(
    keys: Array<{
      entityType: MetadataEntityType;
      entityId: string;
      version?: string;
    }>,
    fetchFunction: (
      entityType: MetadataEntityType,
      entityId: string
    ) => Promise<MetadataType | null>
  ): Promise<void> {
    const promises = keys.map(async (key) => {
      const cached = await this.get(key.entityType, key.entityId, key.version);
      if (!cached) {
        const data = await fetchFunction(key.entityType, key.entityId);
        if (data) {
          await this.set(key.entityType, key.entityId, data, undefined, key.version);
        }
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Invalidate cache entries for specific entity type
   */
  async invalidateByType(entityType: MetadataEntityType): Promise<number> {
    let removedCount = 0;
    const keysToRemove: string[] = [];

    // Find entries for the specified entity type
    for (const [key, entry] of this.memoryCache.entries()) {
      if ((key as string).startsWith(`metadata:${entityType}:`)) {
        keysToRemove.push(key);
      }
    }

    // Remove entries
    for (const key of keysToRemove) {
      this.memoryCache.delete(key);
      removedCount++;

      if (this.config.persistToDisk) {
        try {
          await AsyncStorage.removeItem(`metadataCache:${key}`);
        } catch (error) {
          console.warn("Failed to remove invalidated entry from disk:", error);
        }
      }
    }

    this.updateStats();
    return removedCount;
  }

  /**
   * Export cache data for backup/migration
   */
  async exportCache(): Promise<{
    entries: MetadataCacheEntry[];
    stats: CacheStats;
    config: MetadataCacheConfig;
  }> {
    const entries = Array.from(this.memoryCache.values());

    return {
      entries,
      stats: this.getStats(),
      config: this.getConfig(),
    };
  }

  /**
   * Import cache data from backup/migration
   */
  async importCache(data: {
    entries: MetadataCacheEntry[];
    config?: Partial<MetadataCacheConfig>;
  }): Promise<void> {
    // Clear existing cache
    await this.clear();

    // Update config if provided
    if (data.config) {
      this.updateConfig(data.config);
    }

    // Import entries
    for (const entry of data.entries) {
      if (!this.isExpired(entry)) {
        this.memoryCache.set(entry.metadata.cacheKey, entry);

        // Also save to disk if enabled
        if (this.config.persistToDisk) {
          try {
            await AsyncStorage.setItem(
              `metadataCache:${entry.metadata.cacheKey}`,
              JSON.stringify(entry)
            );
          } catch (error) {
            console.warn("Failed to save imported entry to disk:", error);
          }
        }
      }
    }

    this.updateStats();
  }
}

// Export singleton instance
export const metadataCache = new MetadataCache();

// Export convenience functions
export const getCachedMetadata = metadataCache.get.bind(metadataCache);
export const setCachedMetadata = metadataCache.set.bind(metadataCache);
export const removeCachedMetadata = metadataCache.remove.bind(metadataCache);
export const clearMetadataCache = metadataCache.clear.bind(metadataCache);
export const getMetadataCacheStats = metadataCache.getStats.bind(metadataCache);
export const warmUpMetadataCache = metadataCache.warmUp.bind(metadataCache);
export const preloadMetadata = metadataCache.preload.bind(metadataCache);
