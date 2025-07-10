/**
 * Database Type Definitions
 * Generated from Supabase schema for type safety
 */

// ================================================
// CORE ENTITY TYPES
// ================================================

export interface User {
  id: string; // UUID from auth.users
  email: string;
  name?: string;
  avatar_url?: string;
  preferences: Record<string, any>;
  subscription_type: "free" | "premium";
  subscription_expires_at?: string; // ISO timestamp
  total_poems_generated: number;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface Image {
  id: string; // UUID
  user_id: string; // UUID
  original_url: string;
  compressed_url?: string;
  thumbnail_url?: string;
  file_size?: number;
  width?: number;
  height?: number;
  format?: string; // 'jpeg', 'png', 'webp', etc.
  metadata: Record<string, any>; // EXIF data, etc.
  upload_source: "camera" | "gallery";
  created_at: string; // ISO timestamp
}

export interface Poem {
  id: string; // UUID
  user_id: string; // UUID
  image_id?: string; // UUID, nullable

  // Poem content
  original_text: string;
  formatted_text: string;
  language: "ko" | "en" | "ja" | "zh";
  style:
    | "romantic"
    | "nature"
    | "minimalist"
    | "classical"
    | "modern"
    | "melancholic"
    | "joyful"
    | "mystical";

  // Location data
  location_point?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  location_address?: string;

  // Poem metadata
  metadata: PoemMetadata;

  // Engagement metrics
  like_count: number;
  share_count: number;
  view_count: number;
  is_favorite: boolean;
  is_public: boolean;

  // Timestamps
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface PoemGeneration {
  id: string; // UUID
  poem_id: string; // UUID
  user_id: string; // UUID

  // API generation details
  model_used: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  generation_time_ms?: number;

  // Request parameters
  parameters: GenerationParameters;

  // Success/failure tracking
  status: "success" | "failed" | "retry";
  error_message?: string;

  created_at: string; // ISO timestamp
}

export interface UserReminder {
  id: string; // UUID
  user_id: string; // UUID
  poem_id: string; // UUID

  location_point: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  radius_meters: number;
  notification_title?: string;
  notification_body?: string;

  is_active: boolean;
  last_triggered_at?: string; // ISO timestamp
  trigger_count: number;

  created_at: string; // ISO timestamp
}

export interface UserSession {
  id: string; // UUID
  user_id: string; // UUID

  session_start: string; // ISO timestamp
  session_end?: string; // ISO timestamp
  duration_seconds?: number;

  // Activity tracking
  poems_generated: number;
  images_captured: number;
  images_selected: number;

  // Device/app info
  device_info: Record<string, any>;
  app_version?: string;

  created_at: string; // ISO timestamp
}

// ================================================
// METADATA TYPES
// ================================================

export interface PoemMetadata {
  lineCount: number;
  wordCount: number;
  characterCount: number;
  estimatedReadingTime: number; // in seconds
  detectedStyle: string;
  language: string;
  hasRhyme: boolean;
  meter?: string;

  // Additional formatting metadata
  appliedFormatting?: string[];
  validationWarnings?: string[];
  originalLength?: number;
  formattedLength?: number;
  cleaningApplied?: string[];
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
// DATABASE OPERATION TYPES
// ================================================

export interface CreatePoemRequest {
  user_id: string;
  image_id?: string;
  original_text: string;
  formatted_text: string;
  language: Poem["language"];
  style: Poem["style"];
  location_point?: Poem["location_point"];
  location_address?: string;
  metadata: PoemMetadata;
  is_public?: boolean;
}

export interface CreateImageRequest {
  user_id: string;
  original_url: string;
  compressed_url?: string;
  thumbnail_url?: string;
  file_size?: number;
  width?: number;
  height?: number;
  format?: string;
  metadata?: Record<string, any>;
  upload_source: Image["upload_source"];
}

export interface CreateUserReminderRequest {
  user_id: string;
  poem_id: string;
  location_point: UserReminder["location_point"];
  radius_meters?: number;
  notification_title?: string;
  notification_body?: string;
}

export interface UpdatePoemRequest {
  original_text?: string;
  formatted_text?: string;
  language?: Poem["language"];
  style?: Poem["style"];
  metadata?: Partial<PoemMetadata>;
  like_count?: number;
  share_count?: number;
  view_count?: number;
  is_favorite?: boolean;
  is_public?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  avatar_url?: string;
  preferences?: Record<string, any>;
  subscription_type?: User["subscription_type"];
  subscription_expires_at?: string;
}

// ================================================
// QUERY TYPES
// ================================================

export interface PoemQueryFilters {
  user_id?: string;
  language?: Poem["language"];
  style?: Poem["style"];
  is_favorite?: boolean;
  is_public?: boolean;
  created_after?: string; // ISO timestamp
  created_before?: string; // ISO timestamp
  near_location?: {
    latitude: number;
    longitude: number;
    radius_meters: number;
  };
  search_text?: string;
}

export interface PoemQuerySort {
  field: "created_at" | "updated_at" | "like_count" | "share_count" | "view_count";
  direction: "asc" | "desc";
}

export interface PaginationOptions {
  limit: number;
  offset: number;
}

export interface PoemQueryResult {
  poems: Poem[];
  total_count: number;
  has_more: boolean;
}

// ================================================
// RESPONSE TYPES
// ================================================

export interface PoemWithImage extends Poem {
  image: Image | null;
}

export interface PoemWithGeneration extends Poem {
  generation: PoemGeneration | null;
}

export interface PoemWithDetails extends Poem {
  image: Image | null;
  generation: PoemGeneration | null;
  reminders: UserReminder[];
}

export interface UserWithStats extends User {
  poem_count: number;
  favorite_count: number;
  total_likes: number;
  total_shares: number;
  recent_poems: Poem[];
}

// ================================================
// ERROR TYPES
// ================================================

export interface DatabaseError {
  code: string;
  message: string;
  details?: any;
  hint?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ================================================
// UTILITY TYPES
// ================================================

export type PoemStatus = "draft" | "published" | "archived";
export type SubscriptionType = User["subscription_type"];
export type PoemLanguage = Poem["language"];
export type PoemStyle = Poem["style"];
export type ImageUploadSource = Image["upload_source"];
export type GenerationStatus = PoemGeneration["status"];

// Geographic utilities
export interface Location {
  latitude: number;
  longitude: number;
}

export interface LocationWithAddress extends Location {
  address?: string;
}

export interface GeoPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

// Helper function type definitions
export interface NearbyPoemResult {
  poem_id: string;
  distance_meters: number;
  text: string;
  created_at: string;
}

// ================================================
// SUPABASE-SPECIFIC TYPES
// ================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<User, "id" | "created_at">>;
      };
      images: {
        Row: Image;
        Insert: Omit<Image, "id" | "created_at">;
        Update: Partial<Omit<Image, "id" | "user_id" | "created_at">>;
      };
      poems: {
        Row: Poem;
        Insert: Omit<Poem, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Poem, "id" | "user_id" | "created_at">>;
      };
      poem_generations: {
        Row: PoemGeneration;
        Insert: Omit<PoemGeneration, "id" | "created_at">;
        Update: Partial<Omit<PoemGeneration, "id" | "created_at">>;
      };
      user_reminders: {
        Row: UserReminder;
        Insert: Omit<UserReminder, "id" | "created_at">;
        Update: Partial<Omit<UserReminder, "id" | "user_id" | "created_at">>;
      };
      user_sessions: {
        Row: UserSession;
        Insert: Omit<UserSession, "id" | "created_at">;
        Update: Partial<Omit<UserSession, "id" | "user_id" | "created_at">>;
      };
    };
    Functions: {
      get_poems_near_location: {
        Args: {
          target_lat: number;
          target_lng: number;
          radius_meters?: number;
          user_uuid?: string;
        };
        Returns: NearbyPoemResult[];
      };
    };
  };
}

// Type helpers for Supabase operations
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Inserts<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type Updates<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Re-export for convenience
export type DbUser = Tables<"users">;
export type DbImage = Tables<"images">;
export type DbPoem = Tables<"poems">;
export type DbPoemGeneration = Tables<"poem_generations">;
export type DbUserReminder = Tables<"user_reminders">;
export type DbUserSession = Tables<"user_sessions">;

export type InsertUser = Inserts<"users">;
export type InsertImage = Inserts<"images">;
export type InsertPoem = Inserts<"poems">;
export type InsertPoemGeneration = Inserts<"poem_generations">;
export type InsertUserReminder = Inserts<"user_reminders">;
export type InsertUserSession = Inserts<"user_sessions">;

export type UpdateUser = Updates<"users">;
export type UpdateImage = Updates<"images">;
export type UpdatePoem = Updates<"poems">;
export type UpdatePoemGeneration = Updates<"poem_generations">;
export type UpdateUserReminder = Updates<"user_reminders">;
export type UpdateUserSession = Updates<"user_sessions">;
