export interface StorageFile {
  name: string;
  path: string;
  url: string;
  size?: number;
  lastModified?: string;
}

export interface StorageUsage {
  success: boolean;
  totalSize?: number;
  fileCount?: number;
  totalSizeMB?: number;
  error?: string;
}

export interface StorageListResult {
  success: boolean;
  images?: StorageFile[];
  error?: string;
}

export interface StorageOperation {
  success: boolean;
  error?: string;
}

export type ImageContentType =
  | "image/jpeg"
  | "image/jpg"
  | "image/png"
  | "image/webp"
  | "image/heic";

export interface ImageMetadata {
  width: number;
  height: number;
  size: number;
  contentType: ImageContentType;
  lastModified?: Date;
}
