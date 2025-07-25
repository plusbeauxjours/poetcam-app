export interface SharedContent {
  id: string;
  poemId?: string;
  poemText: string;
  imageUri: string;
  createdAt: string;
  expiresAt?: string;
  createdBy?: string;
  metadata?: {
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    style?: {
      fontId: string;
      fontSize: number;
      color: string;
      backgroundColor?: string;
    };
    tags?: string[];
  };
}

export interface ShareLink {
  id: string;
  shortCode: string;
  fullUrl: string;
  contentId: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
  clickCount: number;
  lastAccessedAt?: string;
  metadata?: {
    platform?: string;
    campaign?: string;
    source?: string;
  };
}

export interface LinkClick {
  id: string;
  linkId: string;
  timestamp: string;
  userAgent?: string;
  referrer?: string;
  ipAddress?: string;
  platform?: 'web' | 'ios' | 'android';
  location?: {
    country?: string;
    city?: string;
  };
}

export interface LinkAnalytics {
  linkId: string;
  totalClicks: number;
  uniqueClicks: number;
  clicksByPlatform: Record<string, number>;
  clicksByDate: Record<string, number>; // YYYY-MM-DD -> count
  clicksByHour: Record<string, number>; // HH:00 -> count
  topReferrers: Array<{ referrer: string; count: number }>;
  geographicDistribution: Record<string, number>; // country -> count
}

export interface DeepLinkParams {
  action: 'view' | 'share' | 'create';
  contentId?: string;
  linkId?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export interface LinkGenerationOptions {
  expirationDays?: number;
  customSlug?: string;
  trackingEnabled?: boolean;
  platform?: string;
  campaign?: string;
  source?: string;
}