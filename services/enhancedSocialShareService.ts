import { ShareResult, ShareContentData } from './socialShareService';
import { useShareAnalyticsStore } from '@/store/useShareAnalyticsStore';
import { SharePlatform, ShareStatus, ShareRetryConfig } from '@/types/shareTypes';
import * as socialShareService from './socialShareService';

// Retry configuration
const DEFAULT_RETRY_CONFIG: ShareRetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
};

// Share tracking state
interface ShareTrackingState {
  eventId: string;
  platform: SharePlatform;
  retryCount: number;
  maxRetries: number;
}

// Active share operations
const activeShares = new Map<string, ShareTrackingState>();

/**
 * Enhanced share function with analytics and retry capability
 */
export async function shareWithTracking(
  content: ShareContentData,
  platform: SharePlatform = 'other',
  retryConfig: ShareRetryConfig = DEFAULT_RETRY_CONFIG,
  onProgress?: (status: ShareStatus, message: string) => void
): Promise<ShareResult> {
  const { logShareEvent, updateShareStatus, incrementRetryCount } = useShareAnalyticsStore.getState();
  
  // Log the share attempt
  await logShareEvent({
    platform,
    status: 'pending',
    poemText: content.poemText,
    imageUri: content.imageUri,
    poemId: content.poemId,
  });

  // Get the latest event (the one we just logged)
  const { events } = useShareAnalyticsStore.getState();
  const currentEvent = events[0];
  
  if (!currentEvent) {
    return {
      success: false,
      platform,
      error: 'Failed to create tracking event',
    };
  }

  // Track the share operation
  const trackingState: ShareTrackingState = {
    eventId: currentEvent.id,
    platform,
    retryCount: 0,
    maxRetries: retryConfig.maxRetries,
  };

  activeShares.set(currentEvent.id, trackingState);

  try {
    onProgress?.('pending', '공유를 시작하는 중...');
    
    const result = await attemptShare(content, platform, trackingState, retryConfig, onProgress);
    
    // Update final status
    updateShareStatus(
      currentEvent.id,
      result.success ? 'success' : 'failed',
      result.error
    );

    activeShares.delete(currentEvent.id);
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    updateShareStatus(currentEvent.id, 'failed', errorMessage);
    activeShares.delete(currentEvent.id);
    
    onProgress?.('failed', `공유 실패: ${errorMessage}`);
    
    return {
      success: false,
      platform,
      error: errorMessage,
    };
  }
}

/**
 * Attempt share with retry logic
 */
async function attemptShare(
  content: ShareContentData,
  platform: SharePlatform,
  trackingState: ShareTrackingState,
  retryConfig: ShareRetryConfig,
  onProgress?: (status: ShareStatus, message: string) => void
): Promise<ShareResult> {
  const { incrementRetryCount } = useShareAnalyticsStore.getState();
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        incrementRetryCount(trackingState.eventId);
        trackingState.retryCount = attempt;
        
        const delay = retryConfig.retryDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1);
        onProgress?.('pending', `재시도 중... (${attempt}/${retryConfig.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Map our platform types to the original service platform strings
      const platformString = mapPlatformToString(platform);
      
      const result = await socialShareService.shareToSocial(
        content.imageUri,
        content.poemText,
        platformString,
        content.poemId,
        {
          title: content.title,
          description: content.description,
          url: content.url,
        }
      );

      if (result.success) {
        onProgress?.('success', '공유가 완료되었습니다!');
        return result;
      } else if (attempt === retryConfig.maxRetries) {
        // Last attempt failed
        onProgress?.('failed', `공유 실패: ${result.error}`);
        return result;
      }

      // Continue to next retry
      console.warn(`Share attempt ${attempt + 1} failed:`, result.error);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (attempt === retryConfig.maxRetries) {
        // Last attempt failed
        onProgress?.('failed', `공유 실패: ${errorMessage}`);
        return {
          success: false,
          platform: platformString,
          error: errorMessage,
        };
      }

      console.warn(`Share attempt ${attempt + 1} failed with error:`, errorMessage);
    }
  }

  // Should never reach here, but just in case
  return {
    success: false,
    platform: mapPlatformToString(platform),
    error: 'All retry attempts failed',
  };
}

/**
 * Map our SharePlatform enum to the original service's string format
 */
function mapPlatformToString(platform: SharePlatform): string {
  switch (platform) {
    case 'instagram':
      return 'instagram';
    case 'facebook':
      return 'facebook';
    case 'twitter':
      return 'twitter';
    case 'kakao':
      return 'kakaotalk';
    case 'copy':
    case 'save':
    case 'other':
    default:
      return 'general';
  }
}

/**
 * Map platform string back to our SharePlatform enum
 */
function mapStringToPlatform(platformString: string): SharePlatform {
  switch (platformString.toLowerCase()) {
    case 'instagram':
      return 'instagram';
    case 'facebook':
      return 'facebook';
    case 'twitter':
    case 'x':
      return 'twitter';
    case 'kakaotalk':
    case 'kakao':
      return 'kakao';
    default:
      return 'other';
  }
}

/**
 * Cancel an active share operation
 */
export function cancelShare(eventId: string): boolean {
  const trackingState = activeShares.get(eventId);
  if (trackingState) {
    const { updateShareStatus } = useShareAnalyticsStore.getState();
    updateShareStatus(eventId, 'cancelled');
    activeShares.delete(eventId);
    return true;
  }
  return false;
}

/**
 * Get active share operations
 */
export function getActiveShares(): ShareTrackingState[] {
  return Array.from(activeShares.values());
}

/**
 * Quick share function for simple use cases (backward compatibility)
 */
export async function quickShare(
  imageUri: string,
  poemText: string,
  platform: SharePlatform = 'other',
  onProgress?: (status: ShareStatus, message: string) => void
): Promise<boolean> {
  const content: ShareContentData = {
    imageUri,
    poemText,
  };

  const result = await shareWithTracking(content, platform, DEFAULT_RETRY_CONFIG, onProgress);
  return result.success;
}

/**
 * Batch share to multiple platforms
 */
export async function batchShare(
  content: ShareContentData,
  platforms: SharePlatform[],
  onProgress?: (platform: SharePlatform, status: ShareStatus, message: string) => void
): Promise<Record<SharePlatform, ShareResult>> {
  const results: Record<SharePlatform, ShareResult> = {} as any;

  // Share to all platforms in parallel
  const sharePromises = platforms.map(async (platform) => {
    const result = await shareWithTracking(
      content,
      platform,
      DEFAULT_RETRY_CONFIG,
      (status, message) => onProgress?.(platform, status, message)
    );
    results[platform] = result;
    return result;
  });

  await Promise.all(sharePromises);
  return results;
}

/**
 * Get share recommendations based on user's sharing history
 */
export function getShareRecommendations(): SharePlatform[] {
  const { statistics } = useShareAnalyticsStore.getState();
  
  // Sort platforms by usage frequency
  const platformUsage = Object.entries(statistics.platformBreakdown)
    .sort(([, a], [, b]) => b - a)
    .map(([platform]) => platform as SharePlatform);

  // Return top 3 most used platforms, or default platforms if no history
  if (platformUsage.length === 0) {
    return ['instagram', 'facebook', 'twitter'];
  }

  return platformUsage.slice(0, 3);
}

/**
 * Check if a platform has high failure rate
 */
export function isPlatformReliable(platform: SharePlatform): boolean {
  const { events } = useShareAnalyticsStore.getState();
  
  const platformEvents = events.filter(e => e.platform === platform);
  if (platformEvents.length < 5) {
    return true; // Not enough data, assume reliable
  }

  const failureRate = platformEvents.filter(e => e.status === 'failed').length / platformEvents.length;
  return failureRate < 0.3; // Consider reliable if failure rate < 30%
}

/**
 * Get optimal retry configuration based on platform reliability
 */
export function getOptimalRetryConfig(platform: SharePlatform): ShareRetryConfig {
  const isReliable = isPlatformReliable(platform);
  
  if (isReliable) {
    return {
      maxRetries: 2,
      retryDelay: 1000,
      backoffMultiplier: 1.5,
    };
  } else {
    return {
      maxRetries: 3,
      retryDelay: 2000,
      backoffMultiplier: 2,
    };
  }
}

// Export for backward compatibility
export { socialShareService };

// Re-export types
export type { ShareResult, ShareContentData, SharePlatform, ShareStatus, ShareRetryConfig };