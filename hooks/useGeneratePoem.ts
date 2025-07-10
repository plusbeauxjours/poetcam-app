import { CLAUDE_CONFIG } from "@/constants/api";
import {
  GeneratePoemOptions,
  generatePoemWithRetry,
  getRequestMetrics,
  PoemGenerationResult,
} from "@/services/claudeApi";
import { ImageProcessingOptions, processImageForAPI } from "@/utils/image";
import { useMutation } from "@tanstack/react-query";

interface GeneratePoemRequest {
  imageUri: string;
  poemOptions?: GeneratePoemOptions;
  imageOptions?: ImageProcessingOptions;
}

interface EnhancedPoemResult extends PoemGenerationResult {
  imageMetadata: {
    width: number;
    height: number;
    size: number;
    format: string;
    originalSize?: number;
    compressionRatio?: number;
  };
}

/**
 * Generate poem from image using Claude API with optimized image preprocessing
 */
async function generatePoem({
  imageUri,
  poemOptions = {},
  imageOptions = {},
}: GeneratePoemRequest): Promise<EnhancedPoemResult> {
  try {
    // Set default style if not provided
    const finalPoemOptions: GeneratePoemOptions = {
      style: "modern",
      language: "ko",
      preset: "BALANCED",
      ...poemOptions,
    };

    // Process and optimize image for Claude API
    const { base64, metadata } = await processImageForAPI(imageUri, imageOptions);

    // Log image processing results if monitoring is enabled
    if (CLAUDE_CONFIG.MONITORING.LOG_PERFORMANCE) {
      console.log("Image processed for API:", {
        originalSize: metadata.originalSize,
        newSize: metadata.size,
        compressionRatio: metadata.compressionRatio,
        dimensions: `${metadata.width}x${metadata.height}`,
        format: metadata.format,
      });
    }

    // Call Claude API with retry logic and enhanced parameters
    const result = await generatePoemWithRetry(base64, finalPoemOptions);

    // Log final result if monitoring is enabled
    if (CLAUDE_CONFIG.MONITORING.LOG_RESPONSES) {
      console.log("Poem generation completed:", {
        requestId: result.metadata.requestId,
        duration: result.metadata.duration,
        tokensUsed: result.metadata.tokensUsed,
        poemLength: result.poem.length,
        parameters: result.metadata.parameters,
      });
    }

    return {
      ...result,
      imageMetadata: metadata,
    };
  } catch (error) {
    // Enhanced error logging
    if (CLAUDE_CONFIG.MONITORING.LOG_ERRORS) {
      console.error("Failed to generate poem:", {
        error: error instanceof Error ? error.message : String(error),
        imageUri: imageUri.substring(0, 50) + "...", // Log partial URI for debugging
        poemOptions,
        imageOptions,
        requestMetrics: getRequestMetrics().slice(-3), // Last 3 requests for context
      });
    }

    throw error;
  }
}

/**
 * Hook for generating poems from images using Claude API with enhanced parameter support
 *
 * @example
 * ```tsx
 * const { mutate: generatePoem, isPending, error, data } = useGeneratePoem();
 *
 * // Generate poem with specific style and language
 * generatePoem({
 *   imageUri: 'file://...',
 *   poemOptions: {
 *     style: 'romantic',
 *     language: 'ko',
 *     preset: 'CREATIVE',
 *     length: 6
 *   }
 * });
 * ```
 */
export function useGeneratePoem() {
  return useMutation({
    mutationFn: generatePoem,
    retry: false, // Retry logic is handled in the service layer
    onError: (error) => {
      // Additional error handling can be added here
      console.error("useGeneratePoem mutation error:", error);
    },
    onSuccess: (data) => {
      // Success callback - can be used for analytics or logging
      if (CLAUDE_CONFIG.MONITORING.LOG_RESPONSES) {
        console.log("Poem generation hook success:", {
          requestId: data.metadata.requestId,
          duration: data.metadata.duration,
        });
      }
    },
  });
}

/**
 * Get available style options for poem generation
 */
export function getAvailableStyles(): (keyof typeof CLAUDE_CONFIG.STYLE_PROMPTS)[] {
  return Object.keys(CLAUDE_CONFIG.STYLE_PROMPTS) as (keyof typeof CLAUDE_CONFIG.STYLE_PROMPTS)[];
}

/**
 * Get available language options for poem generation
 */
export function getAvailableLanguages(): (keyof typeof CLAUDE_CONFIG.LANGUAGE_PROMPTS)[] {
  return Object.keys(
    CLAUDE_CONFIG.LANGUAGE_PROMPTS
  ) as (keyof typeof CLAUDE_CONFIG.LANGUAGE_PROMPTS)[];
}

/**
 * Get available preset options for poem generation
 */
export function getAvailablePresets(): (keyof typeof CLAUDE_CONFIG.PRESETS)[] {
  return Object.keys(CLAUDE_CONFIG.PRESETS) as (keyof typeof CLAUDE_CONFIG.PRESETS)[];
}

/**
 * Hook to get recent request metrics for monitoring
 */
export function useRequestMetrics() {
  return getRequestMetrics();
}
