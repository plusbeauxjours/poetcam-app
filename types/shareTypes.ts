export type SharePlatform = 'instagram' | 'facebook' | 'twitter' | 'kakao' | 'copy' | 'save' | 'other';
export type ShareStatus = 'pending' | 'success' | 'failed' | 'cancelled';

export interface ShareEvent {
  id: string;
  timestamp: string;
  platform: SharePlatform;
  status: ShareStatus;
  poemId?: string;
  poemText: string;
  imageUri: string;
  error?: string;
  retryCount: number;
  metadata?: {
    networkType?: string;
    deviceInfo?: string;
    appVersion?: string;
  };
}

export interface ShareStatistics {
  totalShares: number;
  successfulShares: number;
  failedShares: number;
  platformBreakdown: Record<SharePlatform, number>;
  hourlyDistribution: Record<string, number>; // "HH:00" -> count
  dailyDistribution: Record<string, number>; // "YYYY-MM-DD" -> count
  averageRetryCount: number;
  lastShareDate?: string;
}

export interface ShareRetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
}