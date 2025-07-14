/**
 * Metadata Service
 * Comprehensive metadata management for PoetCam app
 */

import { supabase } from "../supabase";
import type {
  BaseMetadata,
  FileMetadata,
  ImageMetadata,
  MetadataEntityType,
  MetadataOperationResult,
  MetadataQuery,
  MetadataSearchResult,
  MetadataType,
  MetadataValidationResult,
  PoemMetadata,
  SessionMetadata,
} from "../types/metadata";

// ================================================
// METADATA STORAGE SERVICE
// ================================================

class MetadataService {
  private version = "1.0.0";

  /**
   * Store metadata for an entity
   */
  async storeMetadata<T extends MetadataType>(
    entityType: MetadataEntityType,
    entityId: string,
    metadata: Partial<T>,
    options: {
      merge?: boolean;
      validate?: boolean;
      updateEntity?: boolean;
    } = {}
  ): Promise<MetadataOperationResult<T>> {
    try {
      const { merge = true, validate = true, updateEntity = true } = options;

      // Add base metadata
      const baseMetadata: Partial<BaseMetadata> = {
        version: this.version,
        updatedAt: new Date().toISOString(),
        source: "app",
      };

      // If this is a new metadata entry, add creation timestamp
      if (!merge) {
        baseMetadata.createdAt = new Date().toISOString();
      }

      const fullMetadata = { ...baseMetadata, ...metadata } as T;

      // Validate metadata if requested
      if (validate) {
        const validation = await this.validateMetadata(entityType, fullMetadata);
        if (!validation.isValid) {
          return {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Metadata validation failed",
              details: validation.errors,
            },
          };
        }
      }

      // Store metadata based on entity type
      let result;
      switch (entityType) {
        case "image":
          result = await this.storeImageMetadata(entityId, fullMetadata as ImageMetadata, merge);
          break;
        case "poem":
          result = await this.storePoemMetadata(entityId, fullMetadata as PoemMetadata, merge);
          break;
        case "session":
          result = await this.storeSessionMetadata(
            entityId,
            fullMetadata as SessionMetadata,
            merge
          );
          break;
        case "file":
          result = await this.storeFileMetadata(entityId, fullMetadata as FileMetadata, merge);
          break;
        default:
          return {
            success: false,
            error: {
              code: "UNSUPPORTED_ENTITY_TYPE",
              message: `Entity type ${entityType} is not supported`,
            },
          };
      }

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        data: fullMetadata,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "STORAGE_ERROR",
          message: error instanceof Error ? error.message : "Unknown storage error",
          details: error,
        },
      };
    }
  }

  /**
   * Retrieve metadata for an entity
   */
  async getMetadata<T extends MetadataType>(
    entityType: MetadataEntityType,
    entityId: string
  ): Promise<MetadataOperationResult<T | null>> {
    try {
      let result;
      switch (entityType) {
        case "image":
          result = await this.getImageMetadata(entityId);
          break;
        case "poem":
          result = await this.getPoemMetadata(entityId);
          break;
        case "session":
          result = await this.getSessionMetadata(entityId);
          break;
        case "file":
          result = await this.getFileMetadata(entityId);
          break;
        default:
          return {
            success: false,
            error: {
              code: "UNSUPPORTED_ENTITY_TYPE",
              message: `Entity type ${entityType} is not supported`,
            },
          };
      }

      return result as MetadataOperationResult<T | null>;
    } catch (error) {
      return {
        success: false,
        error: {
          code: "RETRIEVAL_ERROR",
          message: error instanceof Error ? error.message : "Unknown retrieval error",
          details: error,
        },
      };
    }
  }

  /**
   * Search metadata with complex filters
   */
  async searchMetadata<T extends MetadataType>(
    query: MetadataQuery
  ): Promise<MetadataOperationResult<MetadataSearchResult<T>>> {
    try {
      const { entityType, filters, sort, pagination } = query;

      switch (entityType) {
        case "image":
          return this.searchImageMetadata(filters, sort, pagination) as any;
        case "poem":
          return this.searchPoemMetadata(filters, sort, pagination) as any;
        case "session":
          return this.searchSessionMetadata(filters, sort, pagination) as any;
        case "file":
          return this.searchFileMetadata(filters, sort, pagination) as any;
        default:
          return {
            success: false,
            error: {
              code: "UNSUPPORTED_ENTITY_TYPE",
              message: `Entity type ${entityType} is not supported`,
            },
          };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: "SEARCH_ERROR",
          message: error instanceof Error ? error.message : "Unknown search error",
          details: error,
        },
      };
    }
  }

  /**
   * Delete metadata for an entity
   */
  async deleteMetadata(
    entityType: MetadataEntityType,
    entityId: string
  ): Promise<MetadataOperationResult<boolean>> {
    try {
      // In our current schema, metadata is stored as JSONB fields in entity tables
      // So we'll set the metadata field to an empty object instead of deleting the row
      const table = this.getTableName(entityType);
      const { error } = await supabase.from(table).update({ metadata: {} }).eq("id", entityId);

      if (error) {
        return {
          success: false,
          error: {
            code: "DELETE_ERROR",
            message: error.message,
            details: error,
          },
        };
      }

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "DELETE_ERROR",
          message: error instanceof Error ? error.message : "Unknown delete error",
          details: error,
        },
      };
    }
  }

  // ================================================
  // ENTITY-SPECIFIC STORAGE METHODS
  // ================================================

  private async storeImageMetadata(
    imageId: string,
    metadata: ImageMetadata,
    merge: boolean
  ): Promise<MetadataOperationResult<ImageMetadata>> {
    const updateData = merge ? { metadata } : { metadata };

    const { error } = await supabase.from("images").update(updateData).eq("id", imageId);

    if (error) {
      return {
        success: false,
        error: {
          code: "IMAGE_METADATA_STORAGE_ERROR",
          message: error.message,
          details: error,
        },
      };
    }

    return { success: true, data: metadata };
  }

  private async storePoemMetadata(
    poemId: string,
    metadata: PoemMetadata,
    merge: boolean
  ): Promise<MetadataOperationResult<PoemMetadata>> {
    const updateData = merge ? { metadata } : { metadata };

    const { error } = await supabase.from("poems").update(updateData).eq("id", poemId);

    if (error) {
      return {
        success: false,
        error: {
          code: "POEM_METADATA_STORAGE_ERROR",
          message: error.message,
          details: error,
        },
      };
    }

    return { success: true, data: metadata };
  }

  private async storeSessionMetadata(
    sessionId: string,
    metadata: SessionMetadata,
    merge: boolean
  ): Promise<MetadataOperationResult<SessionMetadata>> {
    // For sessions, we store device_info in the existing field
    const updateData = {
      device_info: metadata.device,
      // We could extend the schema to store full metadata
    };

    const { error } = await supabase.from("user_sessions").update(updateData).eq("id", sessionId);

    if (error) {
      return {
        success: false,
        error: {
          code: "SESSION_METADATA_STORAGE_ERROR",
          message: error.message,
          details: error,
        },
      };
    }

    return { success: true, data: metadata };
  }

  private async storeFileMetadata(
    fileId: string,
    metadata: FileMetadata,
    merge: boolean
  ): Promise<MetadataOperationResult<FileMetadata>> {
    // For files, we might need a separate metadata table or use the images table
    // For now, we'll use the images table since files are primarily images in this app
    const updateData = merge ? { metadata } : { metadata };

    const { error } = await supabase.from("images").update(updateData).eq("id", fileId);

    if (error) {
      return {
        success: false,
        error: {
          code: "FILE_METADATA_STORAGE_ERROR",
          message: error.message,
          details: error,
        },
      };
    }

    return { success: true, data: metadata };
  }

  // ================================================
  // ENTITY-SPECIFIC RETRIEVAL METHODS
  // ================================================

  private async getImageMetadata(
    imageId: string
  ): Promise<MetadataOperationResult<ImageMetadata | null>> {
    const { data, error } = await supabase
      .from("images")
      .select("metadata")
      .eq("id", imageId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: true, data: null };
      }
      return {
        success: false,
        error: {
          code: "IMAGE_METADATA_RETRIEVAL_ERROR",
          message: error.message,
          details: error,
        },
      };
    }

    return { success: true, data: data.metadata as ImageMetadata };
  }

  private async getPoemMetadata(
    poemId: string
  ): Promise<MetadataOperationResult<PoemMetadata | null>> {
    const { data, error } = await supabase
      .from("poems")
      .select("metadata")
      .eq("id", poemId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: true, data: null };
      }
      return {
        success: false,
        error: {
          code: "POEM_METADATA_RETRIEVAL_ERROR",
          message: error.message,
          details: error,
        },
      };
    }

    return { success: true, data: data.metadata as PoemMetadata };
  }

  private async getSessionMetadata(
    sessionId: string
  ): Promise<MetadataOperationResult<SessionMetadata | null>> {
    const { data, error } = await supabase
      .from("user_sessions")
      .select("device_info")
      .eq("id", sessionId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: true, data: null };
      }
      return {
        success: false,
        error: {
          code: "SESSION_METADATA_RETRIEVAL_ERROR",
          message: error.message,
          details: error,
        },
      };
    }

    // Convert device_info to SessionMetadata format
    const sessionMetadata: SessionMetadata = {
      version: this.version,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "app",
      device: data.device_info || {},
      performance: {
        errorCount: 0,
        crashCount: 0,
      },
      behavior: {
        pagesVisited: [],
        featuresUsed: [],
        interactions: {
          taps: 0,
          swipes: 0,
          scrolls: 0,
        },
      },
    };

    return { success: true, data: sessionMetadata };
  }

  private async getFileMetadata(
    fileId: string
  ): Promise<MetadataOperationResult<FileMetadata | null>> {
    // Similar to image metadata for now
    return this.getImageMetadata(fileId) as Promise<MetadataOperationResult<FileMetadata | null>>;
  }

  // ================================================
  // SEARCH METHODS
  // ================================================

  private async searchImageMetadata(
    filters: any,
    sort: any,
    pagination: any
  ): Promise<MetadataOperationResult<MetadataSearchResult<ImageMetadata>>> {
    let query = supabase.from("images").select("id, metadata, created_at", { count: "exact" });

    // Apply filters
    if (filters?.imageFilters?.format) {
      query = query.in("format", filters.imageFilters.format);
    }

    if (filters?.dateRange) {
      query = query
        .gte("created_at", filters.dateRange.start)
        .lte("created_at", filters.dateRange.end);
    }

    // Apply sorting
    if (sort?.field && sort?.direction) {
      query = query.order(sort.field, { ascending: sort.direction === "asc" });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    // Apply pagination
    if (pagination?.limit) {
      query = query.limit(pagination.limit);
    }
    if (pagination?.offset) {
      query = query.range(pagination.offset, pagination.offset + (pagination.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      return {
        success: false,
        error: {
          code: "IMAGE_SEARCH_ERROR",
          message: error.message,
          details: error,
        },
      };
    }

    return {
      success: true,
      data: {
        items: data?.map((item) => item.metadata as ImageMetadata) || [],
        totalCount: count || 0,
        hasMore: count ? count > (pagination?.offset || 0) + (pagination?.limit || 10) : false,
      },
    };
  }

  private async searchPoemMetadata(
    filters: any,
    sort: any,
    pagination: any
  ): Promise<MetadataOperationResult<MetadataSearchResult<PoemMetadata>>> {
    let query = supabase.from("poems").select("id, metadata, created_at", { count: "exact" });

    // Apply filters
    if (filters?.poemFilters?.language) {
      query = query.in("language", filters.poemFilters.language);
    }

    if (filters?.poemFilters?.style) {
      query = query.in("style", filters.poemFilters.style);
    }

    if (filters?.dateRange) {
      query = query
        .gte("created_at", filters.dateRange.start)
        .lte("created_at", filters.dateRange.end);
    }

    // Apply sorting
    if (sort?.field && sort?.direction) {
      query = query.order(sort.field, { ascending: sort.direction === "asc" });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    // Apply pagination
    if (pagination?.limit) {
      query = query.limit(pagination.limit);
    }
    if (pagination?.offset) {
      query = query.range(pagination.offset, pagination.offset + (pagination.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      return {
        success: false,
        error: {
          code: "POEM_SEARCH_ERROR",
          message: error.message,
          details: error,
        },
      };
    }

    return {
      success: true,
      data: {
        items: data?.map((item) => item.metadata as PoemMetadata) || [],
        totalCount: count || 0,
        hasMore: count ? count > (pagination?.offset || 0) + (pagination?.limit || 10) : false,
      },
    };
  }

  private async searchSessionMetadata(
    filters: any,
    sort: any,
    pagination: any
  ): Promise<MetadataOperationResult<MetadataSearchResult<SessionMetadata>>> {
    let query = supabase
      .from("user_sessions")
      .select("id, device_info, created_at", { count: "exact" });

    // Apply filters
    if (filters?.sessionFilters?.platform) {
      // This would require extending the schema to store platform info
    }

    if (filters?.dateRange) {
      query = query
        .gte("created_at", filters.dateRange.start)
        .lte("created_at", filters.dateRange.end);
    }

    // Apply sorting
    if (sort?.field && sort?.direction) {
      query = query.order(sort.field, { ascending: sort.direction === "asc" });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    // Apply pagination
    if (pagination?.limit) {
      query = query.limit(pagination.limit);
    }
    if (pagination?.offset) {
      query = query.range(pagination.offset, pagination.offset + (pagination.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      return {
        success: false,
        error: {
          code: "SESSION_SEARCH_ERROR",
          message: error.message,
          details: error,
        },
      };
    }

    // Convert to SessionMetadata format
    const items: SessionMetadata[] =
      data?.map((item) => ({
        version: this.version,
        createdAt: item.created_at,
        updatedAt: item.created_at,
        source: "app",
        device: item.device_info || {},
        performance: {
          errorCount: 0,
          crashCount: 0,
        },
        behavior: {
          pagesVisited: [],
          featuresUsed: [],
          interactions: {
            taps: 0,
            swipes: 0,
            scrolls: 0,
          },
        },
      })) || [];

    return {
      success: true,
      data: {
        items,
        totalCount: count || 0,
        hasMore: count ? count > (pagination?.offset || 0) + (pagination?.limit || 10) : false,
      },
    };
  }

  private async searchFileMetadata(
    filters: any,
    sort: any,
    pagination: any
  ): Promise<MetadataOperationResult<MetadataSearchResult<FileMetadata>>> {
    // Similar to image search for now
    return this.searchImageMetadata(filters, sort, pagination) as Promise<
      MetadataOperationResult<MetadataSearchResult<FileMetadata>>
    >;
  }

  // ================================================
  // VALIDATION METHODS
  // ================================================

  async validateMetadata(
    entityType: MetadataEntityType,
    metadata: MetadataType
  ): Promise<MetadataValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Common validations
      if (!metadata.version) {
        errors.push("Version is required");
      }

      if (!metadata.createdAt && !metadata.updatedAt) {
        errors.push("At least one timestamp (createdAt or updatedAt) is required");
      }

      if (!metadata.source) {
        warnings.push("Source information is missing");
      }

      // Entity-specific validations
      switch (entityType) {
        case "image":
          this.validateImageMetadata(metadata as ImageMetadata, errors, warnings, suggestions);
          break;
        case "poem":
          this.validatePoemMetadata(metadata as PoemMetadata, errors, warnings, suggestions);
          break;
        case "session":
          this.validateSessionMetadata(metadata as SessionMetadata, errors, warnings, suggestions);
          break;
        case "file":
          this.validateFileMetadata(metadata as FileMetadata, errors, warnings, suggestions);
          break;
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : "Unknown error"}`],
        warnings,
        suggestions,
      };
    }
  }

  private validateImageMetadata(
    metadata: ImageMetadata,
    errors: string[],
    warnings: string[],
    suggestions: string[]
  ): void {
    if (!metadata.dimensions?.width || !metadata.dimensions?.height) {
      errors.push("Image dimensions are required");
    }

    if (!metadata.file?.size) {
      warnings.push("File size information is missing");
    }

    if (!metadata.storage?.originalUrl) {
      errors.push("Original URL is required for image metadata");
    }

    if (metadata.file?.size && metadata.file.size > 10 * 1024 * 1024) {
      warnings.push("Image file size is quite large (>10MB)");
      suggestions.push("Consider compressing the image");
    }
  }

  private validatePoemMetadata(
    metadata: PoemMetadata,
    errors: string[],
    warnings: string[],
    suggestions: string[]
  ): void {
    if (!metadata.text?.lineCount) {
      errors.push("Line count is required for poem metadata");
    }

    if (!metadata.text?.wordCount) {
      errors.push("Word count is required for poem metadata");
    }

    if (!metadata.language?.detected) {
      warnings.push("Detected language is missing");
    }

    if (
      metadata.quality?.score !== undefined &&
      (metadata.quality.score < 0 || metadata.quality.score > 100)
    ) {
      errors.push("Quality score must be between 0 and 100");
    }
  }

  private validateSessionMetadata(
    metadata: SessionMetadata,
    errors: string[],
    warnings: string[],
    suggestions: string[]
  ): void {
    if (!metadata.device?.platform) {
      errors.push("Device platform is required");
    }

    if (!metadata.device?.appVersion) {
      warnings.push("App version information is missing");
    }

    if (metadata.performance?.errorCount > 10) {
      warnings.push("High error count detected in session");
      suggestions.push("Review error logs for this session");
    }
  }

  private validateFileMetadata(
    metadata: FileMetadata,
    errors: string[],
    warnings: string[],
    suggestions: string[]
  ): void {
    if (!metadata.file?.name) {
      errors.push("File name is required");
    }

    if (!metadata.file?.size) {
      warnings.push("File size information is missing");
    }

    if (!metadata.storage?.provider) {
      errors.push("Storage provider is required");
    }
  }

  // ================================================
  // UTILITY METHODS
  // ================================================

  private getTableName(entityType: MetadataEntityType): string {
    switch (entityType) {
      case "image":
      case "file":
        return "images";
      case "poem":
        return "poems";
      case "session":
        return "user_sessions";
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }

  /**
   * Get metadata statistics
   */
  async getMetadataStats(entityType: MetadataEntityType): Promise<MetadataOperationResult<any>> {
    try {
      const table = this.getTableName(entityType);
      const { data, error } = await supabase
        .from(table)
        .select("metadata, created_at")
        .not("metadata", "is", null);

      if (error) {
        return {
          success: false,
          error: {
            code: "STATS_ERROR",
            message: error.message,
            details: error,
          },
        };
      }

      const stats = {
        totalRecords: data?.length || 0,
        recordsWithMetadata:
          data?.filter((item) => Object.keys(item.metadata || {}).length > 0).length || 0,
        averageMetadataSize: 0,
        oldestRecord: null as string | null,
        newestRecord: null as string | null,
      };

      if (data && data.length > 0) {
        const metadataSizes = data.map((item) => JSON.stringify(item.metadata || {}).length);
        stats.averageMetadataSize = metadataSizes.reduce((a, b) => a + b, 0) / metadataSizes.length;

        const dates = data.map((item) => new Date(item.created_at).getTime()).sort();
        stats.oldestRecord = new Date(dates[0]).toISOString();
        stats.newestRecord = new Date(dates[dates.length - 1]).toISOString();
      }

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "STATS_ERROR",
          message: error instanceof Error ? error.message : "Unknown stats error",
          details: error,
        },
      };
    }
  }
}

// Export singleton instance
export const metadataService = new MetadataService();

// Export individual functions for convenience
export const storeMetadata = metadataService.storeMetadata.bind(metadataService);
export const getMetadata = metadataService.getMetadata.bind(metadataService);
export const searchMetadata = metadataService.searchMetadata.bind(metadataService);
export const deleteMetadata = metadataService.deleteMetadata.bind(metadataService);
export const validateMetadata = metadataService.validateMetadata.bind(metadataService);
export const getMetadataStats = metadataService.getMetadataStats.bind(metadataService);
