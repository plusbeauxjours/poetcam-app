import { supabase } from '../supabase';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import { 
  SharedContent, 
  ShareLink, 
  LinkClick, 
  LinkAnalytics, 
  DeepLinkParams,
  LinkGenerationOptions 
} from '@/types/linkTypes';

// Constants
const BASE_URL = 'https://poetcam.app';
const APP_SCHEME = 'poetcam';
const LINK_PREFIX = `${BASE_URL}/s/`;
const DEFAULT_EXPIRATION_DAYS = 30;

/**
 * Create shared content and generate shareable link
 */
export async function createShareableContent(
  poemText: string,
  imageUri: string,
  options: LinkGenerationOptions & {
    poemId?: string;
    location?: { latitude: number; longitude: number; address?: string };
    style?: any;
    tags?: string[];
  } = {}
): Promise<{ content: SharedContent; link: ShareLink; fullUrl: string }> {
  try {
    // Create shared content
    const contentId = await Crypto.randomUUID();
    const expiresAt = options.expirationDays 
      ? new Date(Date.now() + options.expirationDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    const sharedContent: SharedContent = {
      id: contentId,
      poemId: options.poemId,
      poemText,
      imageUri,
      createdAt: new Date().toISOString(),
      expiresAt,
      metadata: {
        location: options.location,
        style: options.style,
        tags: options.tags,
      }
    };

    // Generate short code
    const shortCode = options.customSlug || await generateShortCode();
    const fullUrl = `${LINK_PREFIX}${shortCode}`;

    // Create share link
    const shareLink: ShareLink = {
      id: await Crypto.randomUUID(),
      shortCode,
      fullUrl,
      contentId,
      createdAt: new Date().toISOString(),
      expiresAt,
      isActive: true,
      clickCount: 0,
      metadata: {
        platform: options.platform,
        campaign: options.campaign,
        source: options.source,
      }
    };

    // Store in database
    const { error: contentError } = await supabase
      .from('shared_content')
      .insert(sharedContent);

    if (contentError) throw contentError;

    const { error: linkError } = await supabase
      .from('share_links')
      .insert(shareLink);

    if (linkError) throw linkError;

    return { content: sharedContent, link: shareLink, fullUrl };
  } catch (error) {
    console.error('Failed to create shareable content:', error);
    throw new Error(`Failed to create shareable content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate unique short code
 */
async function generateShortCode(length: number = 8): Promise<string> {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  // Check if code already exists
  const { data: existing } = await supabase
    .from('share_links')
    .select('shortCode')
    .eq('shortCode', result)
    .single();

  if (existing) {
    // Generate new code if collision
    return generateShortCode(length);
  }

  return result;
}

/**
 * Retrieve shared content by short code or link ID
 */
export async function getSharedContent(
  identifier: string
): Promise<{ content: SharedContent; link: ShareLink } | null> {
  try {
    // First try to find by short code
    const { data: linkData, error: linkError } = await supabase
      .from('share_links')
      .select('*')
      .eq('shortCode', identifier)
      .eq('isActive', true)
      .single();

    if (linkError && linkError.code !== 'PGRST116') {
      console.error('Error fetching link:', linkError);
      return null;
    }

    // If not found by short code, try by link ID
    let shareLink = linkData;
    if (!shareLink) {
      const { data: linkByIdData, error: linkByIdError } = await supabase
        .from('share_links')
        .select('*')
        .eq('id', identifier)
        .eq('isActive', true)
        .single();

      if (linkByIdError) {
        console.error('Error fetching link by ID:', linkByIdError);
        return null;
      }
      shareLink = linkByIdData;
    }

    if (!shareLink) return null;

    // Check if link has expired
    if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
      await deactivateLink(shareLink.id);
      return null;
    }

    // Get shared content
    const { data: contentData, error: contentError } = await supabase
      .from('shared_content')
      .select('*')
      .eq('id', shareLink.contentId)
      .single();

    if (contentError) {
      console.error('Error fetching content:', contentError);
      return null;
    }

    // Check if content has expired
    if (contentData.expiresAt && new Date(contentData.expiresAt) < new Date()) {
      await deactivateLink(shareLink.id);
      return null;
    }

    return { content: contentData, link: shareLink };
  } catch (error) {
    console.error('Failed to get shared content:', error);
    return null;
  }
}

/**
 * Track link click and update analytics
 */
export async function trackLinkClick(
  linkId: string,
  metadata: {
    userAgent?: string;
    referrer?: string;
    platform?: 'web' | 'ios' | 'android';
    ipAddress?: string;
  } = {}
): Promise<void> {
  try {
    // Create click record
    const clickRecord: LinkClick = {
      id: await Crypto.randomUUID(),
      linkId,
      timestamp: new Date().toISOString(),
      userAgent: metadata.userAgent,
      referrer: metadata.referrer,
      platform: metadata.platform,
      ipAddress: metadata.ipAddress,
    };

    // Store click
    const { error: clickError } = await supabase
      .from('link_clicks')
      .insert(clickRecord);

    if (clickError) {
      console.error('Error storing click:', clickError);
    }

    // Update link click count
    const { error: updateError } = await supabase
      .from('share_links')
      .update({ 
        clickCount: supabase.sql`click_count + 1`,
        lastAccessedAt: new Date().toISOString()
      })
      .eq('id', linkId);

    if (updateError) {
      console.error('Error updating click count:', updateError);
    }
  } catch (error) {
    console.error('Failed to track link click:', error);
  }
}

/**
 * Get link analytics
 */
export async function getLinkAnalytics(linkId: string): Promise<LinkAnalytics | null> {
  try {
    // Get all clicks for the link
    const { data: clicks, error: clicksError } = await supabase
      .from('link_clicks')
      .select('*')
      .eq('linkId', linkId)
      .order('timestamp', { ascending: false });

    if (clicksError) {
      console.error('Error fetching clicks:', clicksError);
      return null;
    }

    if (!clicks || clicks.length === 0) {
      return {
        linkId,
        totalClicks: 0,
        uniqueClicks: 0,
        clicksByPlatform: {},
        clicksByDate: {},
        clicksByHour: {},
        topReferrers: [],
        geographicDistribution: {},
      };
    }

    // Process analytics
    const analytics: LinkAnalytics = {
      linkId,
      totalClicks: clicks.length,
      uniqueClicks: new Set(clicks.map(c => c.ipAddress || c.userAgent)).size,
      clicksByPlatform: {},
      clicksByDate: {},
      clicksByHour: {},
      topReferrers: [],
      geographicDistribution: {},
    };

    // Process clicks
    const referrerCounts: Record<string, number> = {};
    
    clicks.forEach(click => {
      // Platform distribution
      if (click.platform) {
        analytics.clicksByPlatform[click.platform] = 
          (analytics.clicksByPlatform[click.platform] || 0) + 1;
      }

      // Date distribution
      const date = new Date(click.timestamp).toISOString().split('T')[0];
      analytics.clicksByDate[date] = (analytics.clicksByDate[date] || 0) + 1;

      // Hour distribution
      const hour = new Date(click.timestamp).getHours().toString().padStart(2, '0') + ':00';
      analytics.clicksByHour[hour] = (analytics.clicksByHour[hour] || 0) + 1;

      // Referrer tracking
      if (click.referrer) {
        referrerCounts[click.referrer] = (referrerCounts[click.referrer] || 0) + 1;
      }

      // Geographic distribution (would need IP geolocation service)
      if (click.location?.country) {
        analytics.geographicDistribution[click.location.country] = 
          (analytics.geographicDistribution[click.location.country] || 0) + 1;
      }
    });

    // Top referrers
    analytics.topReferrers = Object.entries(referrerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([referrer, count]) => ({ referrer, count }));

    return analytics;
  } catch (error) {
    console.error('Failed to get link analytics:', error);
    return null;
  }
}

/**
 * Generate deep link URL
 */
export function generateDeepLink(params: DeepLinkParams): string {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      queryParams.append(key, value.toString());
    }
  });

  return `${APP_SCHEME}://open?${queryParams.toString()}`;
}

/**
 * Parse deep link URL
 */
export function parseDeepLink(url: string): DeepLinkParams | null {
  try {
    const parsed = Linking.parse(url);
    
    if (parsed.scheme !== APP_SCHEME) {
      return null;
    }

    const params = parsed.queryParams || {};
    
    return {
      action: (params.action as any) || 'view',
      contentId: params.contentId as string,
      linkId: params.linkId as string,
      utm_source: params.utm_source as string,
      utm_medium: params.utm_medium as string,
      utm_campaign: params.utm_campaign as string,
    };
  } catch (error) {
    console.error('Failed to parse deep link:', error);
    return null;
  }
}

/**
 * Create universal link (web + deep link)
 */
export function createUniversalLink(
  shortCode: string,
  deepLinkParams?: DeepLinkParams
): { webUrl: string; deepLink: string } {
  const webUrl = `${LINK_PREFIX}${shortCode}`;
  
  const deepLink = generateDeepLink({
    action: 'view',
    ...deepLinkParams,
  });

  return { webUrl, deepLink };
}

/**
 * Deactivate a link
 */
export async function deactivateLink(linkId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('share_links')
      .update({ isActive: false })
      .eq('id', linkId);

    if (error) {
      console.error('Error deactivating link:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to deactivate link:', error);
    throw error;
  }
}

/**
 * Get user's created links
 */
export async function getUserLinks(userId?: string): Promise<ShareLink[]> {
  try {
    let query = supabase
      .from('share_links')
      .select(`
        *,
        shared_content (
          poemText,
          createdAt
        )
      `)
      .eq('isActive', true)
      .order('createdAt', { ascending: false });

    // If userId is provided, filter by creator
    if (userId) {
      query = query.eq('shared_content.createdBy', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user links:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get user links:', error);
    return [];
  }
}

/**
 * Clean up expired links
 */
export async function cleanupExpiredLinks(): Promise<number> {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('share_links')
      .update({ isActive: false })
      .lt('expiresAt', now)
      .eq('isActive', true)
      .select('id');

    if (error) {
      console.error('Error cleaning up expired links:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Failed to cleanup expired links:', error);
    return 0;
  }
}

/**
 * Generate QR code data for sharing
 */
export function generateQRCodeData(shortCode: string): string {
  return `${LINK_PREFIX}${shortCode}`;
}

/**
 * Validate short code format
 */
export function validateShortCode(shortCode: string): boolean {
  return /^[A-Za-z0-9]{6,12}$/.test(shortCode);
}

/**
 * Get popular shared content
 */
export async function getPopularContent(limit: number = 10): Promise<Array<SharedContent & { clickCount: number }>> {
  try {
    const { data, error } = await supabase
      .from('shared_content')
      .select(`
        *,
        share_links!inner (
          clickCount
        )
      `)
      .gte('share_links.expiresAt', new Date().toISOString())
      .eq('share_links.isActive', true)
      .order('share_links.clickCount', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching popular content:', error);
      return [];
    }

    return data?.map(item => ({
      ...item,
      clickCount: item.share_links?.clickCount || 0
    })) || [];
  } catch (error) {
    console.error('Failed to get popular content:', error);
    return [];
  }
}