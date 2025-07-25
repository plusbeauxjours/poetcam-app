import * as Sharing from "expo-sharing";
import * as ImageManipulator from "expo-image-manipulator";
import Share, { ShareOptions } from 'react-native-share';
import { ShareDialog } from 'react-native-fbsdk-next';
import { KakaoShareParams, shareWithKakaoTalk } from '@react-native-kakao/share';
import { supabase } from "../supabase";
import { Platform, Alert } from 'react-native';

export interface OverlayOptions {
  fontName?: string;
  fontSize?: number;
  color?: string;
  position?: { x: number; y: number };
}

export interface SocialPlatform {
  id: string;
  name: string;
  icon: string;
  isAvailable: boolean;
}

export interface ShareContentData {
  imageUri: string;
  poemText: string;
  poemId?: string;
  title?: string;
  description?: string;
  url?: string;
}

export interface ShareResult {
  success: boolean;
  platform?: string;
  error?: string;
  message?: string;
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { id: 'facebook', name: 'Facebook', icon: 'facebook', isAvailable: true },
  { id: 'twitter', name: 'Twitter/X', icon: 'twitter', isAvailable: true },
  { id: 'instagram', name: 'Instagram', icon: 'instagram', isAvailable: true },
  { id: 'kakaotalk', name: 'KakaoTalk', icon: 'message-circle', isAvailable: true },
  { id: 'general', name: 'More Options', icon: 'share', isAvailable: true },
];

export async function addTextOverlay(
  imageUri: string,
  text: string,
  options: OverlayOptions = {}
): Promise<string> {
  try {
    // Resize image for consistent output
    const manipulated = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 1000 } }],
      { format: ImageManipulator.SaveFormat.JPEG }
    );

    // Placeholder: Text overlay would require a canvas or native module.
    // In production, draw the text onto the image using a library like
    // react-native-canvas or a custom native module.
    return manipulated.uri;
  } catch (error) {
    console.error("Failed to add text overlay:", error);
    return imageUri;
  }
}

// Platform-specific sharing functions

/**
 * Share to Facebook using Facebook SDK
 */
export async function shareToFacebook(content: ShareContentData): Promise<ShareResult> {
  try {
    // Validate content
    if (!content.imageUri || !content.poemText) {
      throw new Error('Image URI and poem text are required for Facebook sharing');
    }

    // Check if Facebook sharing is available
    const shareContent = {
      contentType: 'photo' as const,
      photos: [{
        imageUrl: content.imageUri,
        caption: `${content.poemText}\n\n#포엠캠 #PoetCam #AI시`,
      }],
    };

    const canShow = await ShareDialog.canShow(shareContent);
    
    if (!canShow) {
      // Fallback to react-native-share for Facebook
      const shareOptions = {
        title: content.title || '포엠캠에서 생성된 시',
        message: `${content.poemText}\n\n#포엠캠 #PoetCam #AI시`,
        url: content.imageUri,
      };
      
      await Share.shareSingle({
        ...shareOptions,
        social: Share.Social.FACEBOOK as any,
      });
      
      await safeUpdateSharedStatus(content.poemId || '', true);
      return { success: true, platform: 'facebook', message: 'Successfully shared to Facebook via fallback' };
    }

    const result = await ShareDialog.show(shareContent);
    
    if (result.isCancelled) {
      return { success: false, platform: 'facebook', message: 'User cancelled sharing' };
    }

    await safeUpdateSharedStatus(content.poemId || '', true);
    return { success: true, platform: 'facebook', message: 'Successfully shared to Facebook' };
  } catch (error) {
    console.error('Facebook sharing error:', error);
    return { 
      success: false, 
      platform: 'facebook', 
      error: error instanceof Error ? error.message : 'Failed to share to Facebook' 
    };
  }
}

/**
 * Share to Twitter/X using native sharing or web intent
 */
export async function shareToTwitter(content: ShareContentData): Promise<ShareResult> {
  try {
    // Validate content
    if (!content.poemText) {
      throw new Error('Poem text is required for Twitter sharing');
    }

    const tweetText = `${content.poemText}\n\n#포엠캠 #PoetCam #AI시`;
    const url = content.url || generateShareLink(content.poemId || '');
    
    const shareOptions = {
      title: 'Share to Twitter',
      message: tweetText,
      url: url,
      filename: 'poem-image.jpg',
    };

    if (content.imageUri) {
      (shareOptions as any).urls = [content.imageUri];
    }

    await Share.shareSingle({
      ...shareOptions,
      social: Share.Social.TWITTER as any,
    });
    
    await safeUpdateSharedStatus(content.poemId || '', true);
    return { success: true, platform: 'twitter', message: 'Successfully shared to Twitter' };
  } catch (error) {
    console.error('Twitter sharing error:', error);
    
    // Fallback: Open Twitter web intent
    try {
      const tweetText = encodeURIComponent(`${content.poemText}\n\n#포엠캠 #PoetCam #AI시`);
      const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
      
      await Share.open({
        url: twitterUrl,
      });
      
      return { success: true, platform: 'twitter', message: 'Opened Twitter web intent' };
    } catch (fallbackError) {
      return { 
        success: false, 
        platform: 'twitter', 
        error: error instanceof Error ? error.message : 'Failed to share to Twitter' 
      };
    }
  }
}

/**
 * Share to Instagram using native sharing
 */
export async function shareToInstagram(content: ShareContentData): Promise<ShareResult> {
  try {
    // Validate content
    if (!content.imageUri) {
      throw new Error('Image URI is required for Instagram sharing');
    }

    const shareOptions = {
      title: 'Share to Instagram',
      url: content.imageUri,
      filename: 'poem-image.jpg',
    };

    await Share.shareSingle({
      ...shareOptions,
      social: Share.Social.INSTAGRAM as any,
    });
    
    await safeUpdateSharedStatus(content.poemId || '', true);
    return { success: true, platform: 'instagram', message: 'Successfully shared to Instagram' };
  } catch (error) {
    console.error('Instagram sharing error:', error);
    
    // Fallback: Use general sharing
    try {
      await Share.open({
        url: content.imageUri,
        message: `${content.poemText}\n\n#포엠캠 #PoetCam #AI시`,
      });
      
      return { success: true, platform: 'instagram', message: 'Opened general share dialog' };
    } catch (fallbackError) {
      return { 
        success: false, 
        platform: 'instagram', 
        error: error instanceof Error ? error.message : 'Failed to share to Instagram' 
      };
    }
  }
}

/**
 * Share to KakaoTalk using Kakao SDK
 */
export async function shareToKakaoTalk(content: ShareContentData): Promise<ShareResult> {
  try {
    // Validate content
    if (!content.poemText) {
      throw new Error('Poem text is required for KakaoTalk sharing');
    }

    const kakaoContent: KakaoShareParams = {
      templateType: 'Feed',
      templateArgs: {
        THM: content.imageUri || '',
        TXT: content.poemText,
        LNK: content.url || generateShareLink(content.poemId || ''),
        TITLE: content.title || '포엠캠에서 생성된 시',
        DESC: content.description || content.poemText.substring(0, 100) + (content.poemText.length > 100 ? '...' : ''),
      },
    };

    await shareWithKakaoTalk(kakaoContent);
    await safeUpdateSharedStatus(content.poemId || '', true);
    
    return { success: true, platform: 'kakaotalk', message: 'Successfully shared to KakaoTalk' };
  } catch (error) {
    console.error('KakaoTalk sharing error:', error);
    return { 
      success: false, 
      platform: 'kakaotalk', 
      error: error instanceof Error ? error.message : 'Failed to share to KakaoTalk' 
    };
  }
}

/**
 * General sharing using system share dialog
 */
export async function shareGeneral(content: ShareContentData): Promise<ShareResult> {
  try {
    // Validate content
    if (!content.imageUri || !content.poemText) {
      throw new Error('Image URI and poem text are required for sharing');
    }

    const overlayUri = await addTextOverlay(content.imageUri, content.poemText);
    
    const shareOptions: ShareOptions = {
      title: content.title || '포엠캠에서 생성된 시',
      message: `${content.poemText}\n\n#포엠캠 #PoetCam #AI시`,
      url: overlayUri,
      subject: content.title || '포엠캠에서 생성된 시',
    };

    await Share.open(shareOptions);
    await safeUpdateSharedStatus(content.poemId || '', true);
    
    return { success: true, platform: 'general', message: 'Successfully opened share dialog' };
  } catch (error) {
    console.error('General sharing error:', error);
    
    // Fallback to Expo sharing
    try {
      const available = await Sharing.isAvailableAsync();
      
      if (available) {
        const overlayUri = await addTextOverlay(content.imageUri, content.poemText);
        await Sharing.shareAsync(overlayUri, {
          mimeType: "image/jpeg",
          dialogTitle: "포엠캠에서 생성된 시 공유하기",
        });
        
        await safeUpdateSharedStatus(content.poemId || '', true);
        return { success: true, platform: 'general', message: 'Successfully shared using Expo sharing' };
      } else {
        throw new Error('Sharing is not available on this device');
      }
    } catch (fallbackError) {
      console.error('Fallback sharing error:', fallbackError);
      return { 
        success: false, 
        platform: 'general', 
        error: 'All sharing methods failed. Please try again.' 
      };
    }
  }
}

/**
 * Main sharing function that routes to platform-specific implementations
 */
export async function shareToSocial(
  imageUri: string,
  poemText: string,
  platform: string = 'general',
  poemId?: string,
  options?: { title?: string; description?: string; url?: string }
): Promise<ShareResult> {
  const content: ShareContentData = {
    imageUri,
    poemText,
    poemId,
    title: options?.title,
    description: options?.description,
    url: options?.url,
  };

  // Validate content before sharing
  const validation = validateShareContent(content);
  if (!validation.isValid) {
    const result = {
      success: false,
      platform,
      error: validation.error || 'Invalid content'
    };
    
    await logSharingAnalytics(platform, false, validation.error);
    return result;
  }

  try {
    let result: ShareResult;
    
    switch (platform.toLowerCase()) {
      case 'facebook':
        result = await shareToFacebook(content);
        break;
      case 'twitter':
      case 'x':
        result = await shareToTwitter(content);
        break;
      case 'instagram':
        result = await shareToInstagram(content);
        break;
      case 'kakaotalk':
      case 'kakao':
        result = await shareToKakaoTalk(content);
        break;
      case 'general':
      default:
        result = await shareGeneral(content);
        break;
    }
    
    // Log analytics
    await logSharingAnalytics(platform, result.success, result.error);
    
    return result;
  } catch (error) {
    console.error(`Sharing to ${platform} failed:`, error);
    const result = {
      success: false,
      platform,
      error: error instanceof Error ? error.message : 'Unknown sharing error'
    };
    
    await logSharingAnalytics(platform, false, result.error);
    return result;
  }
}

/**
 * Legacy function for backward compatibility
 */
export async function shareToSocialLegacy(
  imageUri: string,
  poemText: string,
  poemId?: string
): Promise<boolean> {
  const result = await shareToSocial(imageUri, poemText, 'general', poemId);
  return result.success;
}

export async function updateSharedStatus(
  poemId: string,
  increment = true
): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("poems")
      .select("share_count")
      .eq("id", poemId)
      .single();
    if (!error && data) {
      const newCount = (data.share_count || 0) + (increment ? 1 : 0);
      await supabase.from("poems").update({ share_count: newCount }).eq("id", poemId);
    }
  } catch (err) {
    console.error("Failed to update share status:", err);
  }
}

/**
 * Check platform availability
 */
export async function checkPlatformAvailability(): Promise<SocialPlatform[]> {
  const platforms = [...SOCIAL_PLATFORMS];
  
  // Check Facebook availability
  try {
    const shareContent = {
      contentType: 'photo' as const,
      photos: [{
        imageUrl: 'test',
        caption: 'test',
      }],
    };
    const canShowFacebook = await ShareDialog.canShow(shareContent);
    const facebookPlatform = platforms.find(p => p.id === 'facebook');
    if (facebookPlatform) {
      facebookPlatform.isAvailable = canShowFacebook;
    }
  } catch (error) {
    console.error('Error checking Facebook availability:', error);
    const facebookPlatform = platforms.find(p => p.id === 'facebook');
    if (facebookPlatform) {
      facebookPlatform.isAvailable = false;
    }
  }
  
  // Check general sharing availability
  try {
    const available = await Sharing.isAvailableAsync();
    const generalPlatform = platforms.find(p => p.id === 'general');
    if (generalPlatform) {
      generalPlatform.isAvailable = available;
    }
  } catch (error) {
    console.error('Error checking sharing availability:', error);
    const generalPlatform = platforms.find(p => p.id === 'general');
    if (generalPlatform) {
      generalPlatform.isAvailable = false;
    }
  }
  
  return platforms;
}

/**
 * Show platform selection and share
 */
export async function showShareDialog(content: ShareContentData): Promise<ShareResult> {
  try {
    const platforms = await checkPlatformAvailability();
    const availablePlatforms = platforms.filter(p => p.isAvailable);
    
    if (availablePlatforms.length === 0) {
      return {
        success: false,
        error: 'No sharing platforms available'
      };
    }
    
    // For now, default to general sharing
    // In a real implementation, you would show a modal/action sheet for platform selection
    return await shareGeneral(content);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validate share content before sharing
 */
export function validateShareContent(content: ShareContentData): { isValid: boolean; error?: string } {
  if (!content.poemText || content.poemText.trim().length === 0) {
    return { isValid: false, error: 'Poem text is required' };
  }
  
  if (content.poemText.length > 2000) {
    return { isValid: false, error: 'Poem text is too long (max 2000 characters)' };
  }
  
  if (!content.imageUri || content.imageUri.trim().length === 0) {
    return { isValid: false, error: 'Image is required for sharing' };
  }
  
  return { isValid: true };
}

/**
 * Safely update share status with retry logic
 */
export async function safeUpdateSharedStatus(poemId: string, increment: boolean = true, retries: number = 3): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await updateSharedStatus(poemId, increment);
      return;
    } catch (error) {
      console.error(`Failed to update share status (attempt ${attempt}/${retries}):`, error);
      if (attempt === retries) {
        console.error('All attempts to update share status failed');
        // Don't throw error - sharing was successful even if we can't update the count
      } else {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
}

/**
 * Log sharing analytics
 */
export async function logSharingAnalytics(platform: string, success: boolean, error?: string): Promise<void> {
  try {
    // This could be connected to analytics services like Firebase Analytics, Mixpanel, etc.
    const analyticsData = {
      event: 'social_share',
      platform,
      success,
      error,
      timestamp: new Date().toISOString(),
    };
    
    console.log('Sharing analytics:', analyticsData);
    
    // Example: Send to Supabase analytics table
    // await supabase.from('analytics').insert(analyticsData);
  } catch (error) {
    console.error('Failed to log sharing analytics:', error);
  }
}

export function generateShareLink(poemId: string): string {
  if (!poemId || poemId.trim().length === 0) {
    return 'https://poetcam.app';
  }
  return `https://poetcam.app/poem/${poemId}`;
}

// Export all functions for easy import
export {
  // Main sharing functions
  shareToSocial,
  shareToSocialLegacy,
  
  // Platform-specific functions
  shareToFacebook,
  shareToTwitter,
  shareToInstagram,
  shareToKakaoTalk,
  shareGeneral,
  
  // Utility functions
  addTextOverlay,
  updateSharedStatus,
  checkPlatformAvailability,
  showShareDialog,
  validateShareContent,
  safeUpdateSharedStatus,
  logSharingAnalytics,
  generateShareLink,
  
  // Constants and types
  SOCIAL_PLATFORMS,
};

// Default export for backward compatibility
export default {
  shareToSocial,
  shareToFacebook,
  shareToTwitter,
  shareToInstagram,
  shareToKakaoTalk,
  shareGeneral,
  addTextOverlay,
  updateSharedStatus,
  generateShareLink,
  SOCIAL_PLATFORMS,
};
