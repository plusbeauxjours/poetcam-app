/**
 * Metadata Management Hook
 * React hook for managing metadata operations with caching and synchronization
 */

import { useCallback, useEffect, useState } from "react";
import { metadataService } from "../services/metadataService";
import type {
  FileMetadata,
  ImageMetadata,
  MetadataEntityType,
  MetadataQuery,
  MetadataSearchResult,
  MetadataType,
  PoemMetadata,
  SessionMetadata,
} from "../types/metadata";
import { metadataCache } from "../utils/metadataCache";

export type MetadataState = "idle" | "loading" | "success" | "error";

export interface UseMetadataResult<T extends MetadataType> {
  // State
  data: T | null;
  state: MetadataState;
  error: string | null;
  isLoading: boolean;
  isCached: boolean;

  // Actions
  fetch: () => Promise<void>;
  update: (metadata: Partial<T>) => Promise<boolean>;
  refresh: () => Promise<void>;
  clear: () => void;
}

export interface UseMetadataSearchResult<T extends MetadataType> {
  // State
  results: MetadataSearchResult<T> | null;
  state: MetadataState;
  error: string | null;
  isLoading: boolean;

  // Actions
  search: (query: MetadataQuery) => Promise<void>;
  loadMore: () => Promise<void>;
  clear: () => void;
}

export interface MetadataUpdateOptions {
  merge?: boolean;
  validate?: boolean;
  updateCache?: boolean;
  syncToServer?: boolean;
}

/**
 * Hook for managing metadata for a specific entity
 */
export function useMetadata<T extends MetadataType>(
  entityType: MetadataEntityType,
  entityId: string,
  options: {
    autoFetch?: boolean;
    cacheFirst?: boolean;
    ttl?: number;
  } = {}
): UseMetadataResult<T> {
  const { autoFetch = true, cacheFirst = true, ttl } = options;

  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<MetadataState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  const fetch = useCallback(async () => {
    if (!entityId) return;

    setState("loading");
    setError(null);

    try {
      // Try cache first if enabled
      if (cacheFirst) {
        const cachedData = await metadataCache.get<T>(entityType, entityId);
        if (cachedData) {
          setData(cachedData);
          setIsCached(true);
          setState("success");
          return;
        }
      }

      // Fetch from server
      const result = await metadataService.getMetadata<T>(entityType, entityId);

      if (result.success && result.data) {
        setData(result.data);
        setIsCached(false);
        setState("success");

        // Cache the result
        await metadataCache.set(entityType, entityId, result.data, ttl);
      } else if (result.success && result.data === null) {
        setData(null);
        setState("success");
      } else {
        setError(
          "error" in result
            ? result.error?.message || "Failed to fetch metadata"
            : "Failed to fetch metadata"
        );
        setState("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setState("error");
    }
  }, [entityType, entityId, cacheFirst, ttl]);

  const update = useCallback(
    async (metadata: Partial<T>, updateOptions: MetadataUpdateOptions = {}): Promise<boolean> => {
      if (!entityId || !data) return false;

      const {
        merge = true,
        validate = true,
        updateCache = true,
        syncToServer = true,
      } = updateOptions;

      setState("loading");
      setError(null);

      try {
        // Merge with existing data if requested
        const updatedMetadata = merge ? { ...data, ...metadata } : (metadata as T);

        if (syncToServer) {
          // Update on server
          const result = await metadataService.storeMetadata<T>(
            entityType,
            entityId,
            updatedMetadata as Partial<T>,
            { merge, validate }
          );

          if (!result.success) {
            setError(result.error?.message || "Failed to update metadata");
            setState("error");
            return false;
          }
        }

        // Update local state
        setData(updatedMetadata);
        setState("success");

        // Update cache if requested
        if (updateCache) {
          await metadataCache.set(entityType, entityId, updatedMetadata, ttl);
        }

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setState("error");
        return false;
      }
    },
    [entityType, entityId, data, ttl]
  );

  const refresh = useCallback(async () => {
    // Clear cache and fetch fresh data
    await metadataCache.remove(entityType, entityId);
    setIsCached(false);
    await fetch();
  }, [entityType, entityId, fetch]);

  const clear = useCallback(() => {
    setData(null);
    setState("idle");
    setError(null);
    setIsCached(false);
  }, []);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch && entityId) {
      fetch();
    }
  }, [autoFetch, entityId, fetch]);

  return {
    data,
    state,
    error,
    isLoading: state === "loading",
    isCached,
    fetch,
    update,
    refresh,
    clear,
  };
}

/**
 * Hook for searching metadata
 */
export function useMetadataSearch<T extends MetadataType>(
  initialQuery?: MetadataQuery
): UseMetadataSearchResult<T> {
  const [results, setResults] = useState<MetadataSearchResult<T> | null>(null);
  const [state, setState] = useState<MetadataState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [currentQuery, setCurrentQuery] = useState<MetadataQuery | null>(initialQuery || null);

  const search = useCallback(async (query: MetadataQuery) => {
    setState("loading");
    setError(null);
    setCurrentQuery(query);

    try {
      const result = await metadataService.searchMetadata<T>(query);

      if (result.success) {
        setResults(result.data);
        setState("success");
      } else {
        setError(result.error?.message || "Search failed");
        setState("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setState("error");
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!currentQuery || !results || !results.hasMore) return;

    setState("loading");

    try {
      const currentOffset = currentQuery.pagination?.offset || 0;
      const currentLimit = currentQuery.pagination?.limit || 10;

      const nextQuery: MetadataQuery = {
        ...currentQuery,
        pagination: {
          ...currentQuery.pagination,
          offset: currentOffset + currentLimit,
          limit: currentLimit,
        },
      };

      const result = await metadataService.searchMetadata<T>(nextQuery);

      if (result.success) {
        setResults((prevResults) => ({
          items: [...(prevResults?.items || []), ...result.data.items],
          totalCount: result.data.totalCount,
          hasMore: result.data.hasMore,
          aggregations: result.data.aggregations,
        }));
        setCurrentQuery(nextQuery);
        setState("success");
      } else {
        setError(result.error?.message || "Load more failed");
        setState("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setState("error");
    }
  }, [currentQuery, results]);

  const clear = useCallback(() => {
    setResults(null);
    setState("idle");
    setError(null);
    setCurrentQuery(null);
  }, []);

  return {
    results,
    state,
    error,
    isLoading: state === "loading",
    search,
    loadMore,
    clear,
  };
}

/**
 * Hook for managing multiple metadata entities
 */
export function useMetadataBatch<T extends MetadataType>(
  entityType: MetadataEntityType,
  entityIds: string[],
  options: {
    autoFetch?: boolean;
    cacheFirst?: boolean;
    ttl?: number;
  } = {}
) {
  const { autoFetch = true, cacheFirst = true, ttl } = options;

  const [data, setData] = useState<Map<string, T>>(new Map());
  const [state, setState] = useState<MetadataState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const fetchBatch = useCallback(
    async (ids: string[] = entityIds) => {
      if (ids.length === 0) return;

      setState("loading");
      setError(null);
      setLoadingIds(new Set(ids));

      try {
        const results = new Map<string, T>();

        // Process each ID
        await Promise.allSettled(
          ids.map(async (id) => {
            try {
              // Try cache first if enabled
              if (cacheFirst) {
                const cachedData = await metadataCache.get<T>(entityType, id);
                if (cachedData) {
                  results.set(id, cachedData);
                  return;
                }
              }

              // Fetch from server
              const result = await metadataService.getMetadata<T>(entityType, id);
              if (result.success && result.data) {
                results.set(id, result.data);
                // Cache the result
                await metadataCache.set(entityType, id, result.data, ttl);
              }
            } catch (err) {
              console.warn(`Failed to fetch metadata for ${id}:`, err);
            }
          })
        );

        setData(results);
        setState("success");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setState("error");
      } finally {
        setLoadingIds(new Set());
      }
    },
    [entityType, entityIds, cacheFirst, ttl]
  );

  const updateBatch = useCallback(
    async (
      updates: Array<{ id: string; metadata: Partial<T> }>,
      updateOptions: MetadataUpdateOptions = {}
    ): Promise<boolean> => {
      setState("loading");
      setError(null);

      try {
        const promises = updates.map(async ({ id, metadata }) => {
          const existingData = data.get(id);
          const updatedMetadata =
            updateOptions.merge && existingData
              ? { ...existingData, ...metadata }
              : (metadata as T);

          if (updateOptions.syncToServer !== false) {
            await metadataService.storeMetadata(entityType, id, updatedMetadata, {
              merge: updateOptions.merge,
              validate: updateOptions.validate,
            });
          }

          // Update cache
          if (updateOptions.updateCache !== false) {
            await metadataCache.set(entityType, id, updatedMetadata, ttl);
          }

          return { id, data: updatedMetadata };
        });

        const results = await Promise.allSettled(promises);
        const newData = new Map(data);

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            newData.set(result.value.id, result.value.data);
          }
        });

        setData(newData);
        setState("success");
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setState("error");
        return false;
      }
    },
    [data, entityType, ttl]
  );

  const clear = useCallback(() => {
    setData(new Map());
    setState("idle");
    setError(null);
    setLoadingIds(new Set());
  }, []);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch && entityIds.length > 0) {
      fetchBatch();
    }
  }, [autoFetch, entityIds, fetchBatch]);

  return {
    data,
    state,
    error,
    isLoading: state === "loading",
    loadingIds,
    fetchBatch,
    updateBatch,
    clear,
  };
}

/**
 * Specialized hooks for specific metadata types
 */

export function useImageMetadata(imageId: string, options?: Parameters<typeof useMetadata>[2]) {
  return useMetadata<ImageMetadata>("image", imageId, options);
}

export function usePoemMetadata(poemId: string, options?: Parameters<typeof useMetadata>[2]) {
  return useMetadata<PoemMetadata>("poem", poemId, options);
}

export function useSessionMetadata(sessionId: string, options?: Parameters<typeof useMetadata>[2]) {
  return useMetadata<SessionMetadata>("session", sessionId, options);
}

export function useFileMetadata(fileId: string, options?: Parameters<typeof useMetadata>[2]) {
  return useMetadata<FileMetadata>("file", fileId, options);
}

/**
 * Hook for metadata synchronization across multiple components
 */
export function useMetadataSync<T extends MetadataType>(
  entityType: MetadataEntityType,
  entityId: string
) {
  const [syncTimestamp, setSyncTimestamp] = useState<string | null>(null);
  const [subscribers, setSubscribers] = useState<Set<string>>(new Set());

  const subscribe = useCallback((subscriberId: string) => {
    setSubscribers((prev) => new Set(prev).add(subscriberId));

    return () => {
      setSubscribers((prev) => {
        const next = new Set(prev);
        next.delete(subscriberId);
        return next;
      });
    };
  }, []);

  const sync = useCallback(
    async (metadata: T) => {
      // Update cache for all subscribers
      await metadataCache.set(entityType, entityId, metadata);
      setSyncTimestamp(new Date().toISOString());
    },
    [entityType, entityId]
  );

  return {
    syncTimestamp,
    subscriberCount: subscribers.size,
    subscribe,
    sync,
  };
}
