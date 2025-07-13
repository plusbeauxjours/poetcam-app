/**
 * Comprehensive Metadata Type System
 * Defines metadata structures for various entities in the PoetCam app
 */

// ================================================
// BASE METADATA TYPES
// ================================================

export interface BaseMetadata {
  version: string; // Schema version for migrations
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  source: string; // Where this metadata came from
  checksum?: string; // Data integrity check
}

export interface MetadataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// ================================================
// IMAGE METADATA
// ================================================

export interface ImageMetadata extends BaseMetadata {
  // Basic image properties
  dimensions: {
    width: number;
    height: number;
    aspectRatio: number;
  };

  // File properties
  file: {
    size: number; // bytes
    format: string; // 'jpeg', 'png', 'webp', 'heic'
    mimeType: string;
    encoding?: string;
    compression?: number;
  };

  // EXIF data (if available)
  exif?: {
    camera?: {
      make?: string;
      model?: string;
      software?: string;
    };
    capture?: {
      iso?: number;
      aperture?: number;
      shutterSpeed?: number;
      focalLength?: number;
      flash?: boolean;
      exposureTime?: number;
    };
    location?: {
      latitude?: number;
      longitude?: number;
      altitude?: number;
      direction?: number;
    };
    timestamp?: string; // When photo was taken
  };

  // Processing metadata
  processing: {
    originalSize: number;
    compressedSize?: number;
    compressionRatio?: number;
    resized: boolean;
    filters?: string[];
    optimizations?: string[];
  };

  // Content analysis
  analysis?: {
    dominantColors?: string[];
    brightness?: number;
    contrast?: number;
    saturation?: number;
    sharpness?: number;
    faceDetection?: boolean;
    objectDetection?: string[];
    sceneAnalysis?: string[];
  };

  // Storage information
  storage: {
    originalUrl: string;
    compressedUrl?: string;
    thumbnailUrl?: string;
    backupUrls?: string[];
    cdnEnabled?: boolean;
    cacheSettings?: {
      ttl: number;
      strategy: string;
    };
  };
}

// ================================================
// POEM METADATA
// ================================================

export interface PoemMetadata extends BaseMetadata {
  // Text analysis
  text: {
    lineCount: number;
    wordCount: number;
    characterCount: number;
    syllableCount?: number;
    sentenceCount?: number;
    averageLineLength: number;
    averageWordLength: number;
  };

  // Language and style
  language: {
    detected: string; // 'ko', 'en', 'ja', 'zh'
    confidence: number; // 0-1
    dialect?: string;
    formalityLevel?: "formal" | "informal" | "mixed";
  };

  style: {
    detected: string;
    confidence: number;
    characteristics: string[];
    mood?: "joyful" | "melancholic" | "romantic" | "mystical" | "peaceful" | "energetic";
    tone?: "positive" | "negative" | "neutral";
  };

  // Structure analysis
  structure: {
    hasRhyme: boolean;
    rhymeScheme?: string;
    meter?: string;
    stanzaCount?: number;
    stanzaLengths?: number[];
    repetition?: {
      words: string[];
      phrases: string[];
    };
  };

  // Reading experience
  reading: {
    estimatedReadingTime: number; // seconds
    difficultyLevel: "easy" | "medium" | "hard";
    recommendedAge?: number;
    accessibility?: {
      readability: number; // 0-100
      complexity: number; // 0-100
    };
  };

  // Generation metadata
  generation: {
    modelUsed: string;
    parameters: GenerationParameters;
    processingTime: number; // milliseconds
    tokenUsage: {
      prompt: number;
      completion: number;
      total: number;
    };
    iterations?: number;
    temperature?: number;
  };

  // Quality metrics
  quality: {
    score: number; // 0-100
    factors: {
      coherence: number;
      creativity: number;
      relevance: number;
      grammar: number;
      fluency: number;
    };
    feedback?: {
      userRating?: number;
      flagged?: boolean;
      flagReason?: string;
    };
  };

  // Content safety
  safety: {
    scanned: boolean;
    safe: boolean;
    concerns?: string[];
    confidence: number;
  };
}

export interface GenerationParameters {
  temperature: number;
  maxTokens: number;
  style?: string;
  language?: string;
  preset?: "CREATIVE" | "BALANCED" | "FOCUSED";
  customPrompt?: string;
  enableFormatting?: boolean;
  retryCount?: number;
  timeout?: number;
}

// ================================================
// USER SESSION METADATA
// ================================================

export interface SessionMetadata extends BaseMetadata {
  // Device information
  device: {
    platform: "ios" | "android" | "web";
    model?: string;
    osVersion?: string;
    appVersion: string;
    screenSize?: {
      width: number;
      height: number;
      density: number;
    };
    capabilities?: {
      camera: boolean;
      location: boolean;
      notifications: boolean;
    };
  };

  // Network information
  network?: {
    type: "wifi" | "cellular" | "unknown";
    speed?: "slow" | "medium" | "fast";
    strength?: number; // 0-100
  };

  // Performance metrics
  performance: {
    appStartTime?: number;
    avgResponseTime?: number;
    errorCount: number;
    crashCount: number;
    memoryUsage?: number;
    batteryLevel?: number;
  };

  // User behavior
  behavior: {
    pagesVisited: string[];
    featuresUsed: string[];
    interactions: {
      taps: number;
      swipes: number;
      scrolls: number;
    };
    preferences?: Record<string, any>;
  };

  // Geographic data
  location?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
      accuracy: number;
    };
  };
}

// ================================================
// FILE METADATA
// ================================================

export interface FileMetadata extends BaseMetadata {
  // Basic file information
  file: {
    name: string;
    path: string;
    size: number;
    type: string;
    extension: string;
    encoding?: string;
  };

  // Storage details
  storage: {
    provider: "supabase" | "local" | "cdn";
    bucket?: string;
    region?: string;
    redundancy?: "single" | "multiple";
    encryption?: boolean;
  };

  // Access patterns
  access: {
    downloadCount: number;
    lastAccessed?: string;
    accessPattern?: "frequent" | "occasional" | "rare";
    cacheHitRate?: number;
  };

  // Security
  security: {
    permissions: string[];
    public: boolean;
    scanned: boolean;
    virusFree: boolean;
    contentType: "safe" | "questionable" | "unsafe";
  };

  // Relationships
  relationships?: {
    parentId?: string;
    childIds?: string[];
    relatedFiles?: string[];
    dependencies?: string[];
  };
}

// ================================================
// ANALYTICS METADATA
// ================================================

export interface AnalyticsMetadata extends BaseMetadata {
  // Event tracking
  events: {
    category: string;
    action: string;
    label?: string;
    value?: number;
    timestamp: string;
  }[];

  // User journey
  journey: {
    entryPoint: string;
    touchpoints: string[];
    exitPoint?: string;
    duration: number;
    successful: boolean;
  };

  // Performance metrics
  metrics: {
    loadTime?: number;
    renderTime?: number;
    interactionDelay?: number;
    errorRate?: number;
    conversionRate?: number;
  };

  // Attribution
  attribution?: {
    source?: string;
    medium?: string;
    campaign?: string;
    referrer?: string;
  };
}

// ================================================
// METADATA OPERATIONS
// ================================================

export interface MetadataQuery {
  entityType: "image" | "poem" | "session" | "file" | "analytics";
  entityId?: string;
  filters?: MetadataFilters;
  sort?: MetadataSort;
  pagination?: {
    limit: number;
    offset: number;
  };
}

export interface MetadataFilters {
  // Common filters
  dateRange?: {
    start: string;
    end: string;
  };
  version?: string;
  source?: string;

  // Type-specific filters
  imageFilters?: {
    format?: string[];
    sizeRange?: {
      min: number;
      max: number;
    };
    hasExif?: boolean;
    dominantColor?: string;
  };

  poemFilters?: {
    language?: string[];
    style?: string[];
    wordCountRange?: {
      min: number;
      max: number;
    };
    qualityRange?: {
      min: number;
      max: number;
    };
    hasRhyme?: boolean;
  };

  sessionFilters?: {
    platform?: string[];
    durationRange?: {
      min: number;
      max: number;
    };
    errorCount?: {
      min: number;
      max: number;
    };
  };
}

export interface MetadataSort {
  field: string;
  direction: "asc" | "desc";
}

export interface MetadataSearchResult<T = any> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  aggregations?: Record<string, any>;
}

// ================================================
// METADATA CACHE
// ================================================

export interface MetadataCacheEntry<T = any> {
  data: T;
  metadata: {
    cacheKey: string;
    timestamp: string;
    ttl: number;
    hitCount: number;
    size: number;
  };
}

export interface MetadataCacheConfig {
  maxSize: number; // MB
  defaultTtl: number; // seconds
  strategy: "lru" | "fifo" | "lfu";
  compression: boolean;
  persistToDisk: boolean;
}

// ================================================
// UTILITY TYPES
// ================================================

export type MetadataType =
  | ImageMetadata
  | PoemMetadata
  | SessionMetadata
  | FileMetadata
  | AnalyticsMetadata;

export type MetadataEntityType = "image" | "poem" | "session" | "file" | "analytics";

export interface MetadataSchema {
  version: string;
  types: Record<MetadataEntityType, any>;
  validations: Record<string, (data: any) => MetadataValidationResult>;
}

// ================================================
// ERROR TYPES
// ================================================

export interface MetadataError {
  code: string;
  message: string;
  field?: string;
  details?: any;
}

export type MetadataOperationResult<T = any> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: MetadataError;
    };
