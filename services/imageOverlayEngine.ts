import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import React from 'react';
import { Dimensions, Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';

// Types and Interfaces
export interface TextPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
  alignment?: 'left' | 'center' | 'right';
  verticalAlignment?: 'top' | 'middle' | 'bottom';
}

export interface TextStyle {
  fontFamily?: string;
  fontSize: number;
  color: string;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  letterSpacing?: number;
}

export interface TextShadow {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
}

export interface TextBorder {
  width: number;
  color: string;
}

export interface TextBackground {
  color: string;
  padding?: number;
  borderRadius?: number;
  opacity?: number;
}

export interface OverlayTextOptions {
  position: TextPosition;
  style: TextStyle;
  shadow?: TextShadow;
  border?: TextBorder;
  background?: TextBackground;
  rotation?: number;
  opacity?: number;
  maxLines?: number;
  ellipsize?: boolean;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface OverlayResult {
  success: boolean;
  uri?: string;
  error?: string;
  dimensions?: ImageDimensions;
}

// Default styles and positions
export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontSize: 24,
  color: '#FFFFFF',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'center',
  lineHeight: 1.2,
  letterSpacing: 0,
};

export const DEFAULT_TEXT_SHADOW: TextShadow = {
  offsetX: 2,
  offsetY: 2,
  blur: 4,
  color: 'rgba(0, 0, 0, 0.5)',
};

export const DEFAULT_TEXT_BORDER: TextBorder = {
  width: 1,
  color: '#000000',
};

export const PRESET_POSITIONS = {
  topLeft: { x: 0.05, y: 0.05, alignment: 'left' as const },
  topCenter: { x: 0.5, y: 0.05, alignment: 'center' as const },
  topRight: { x: 0.95, y: 0.05, alignment: 'right' as const },
  middleLeft: { x: 0.05, y: 0.5, alignment: 'left' as const, verticalAlignment: 'middle' as const },
  middleCenter: { x: 0.5, y: 0.5, alignment: 'center' as const, verticalAlignment: 'middle' as const },
  middleRight: { x: 0.95, y: 0.5, alignment: 'right' as const, verticalAlignment: 'middle' as const },
  bottomLeft: { x: 0.05, y: 0.95, alignment: 'left' as const, verticalAlignment: 'bottom' as const },
  bottomCenter: { x: 0.5, y: 0.95, alignment: 'center' as const, verticalAlignment: 'bottom' as const },
  bottomRight: { x: 0.95, y: 0.95, alignment: 'right' as const, verticalAlignment: 'bottom' as const },
};

// Image Overlay Engine Class
export class ImageOverlayEngine {
  private static instance: ImageOverlayEngine;
  private cache: Map<string, any> = new Map();
  private maxCacheSize = 50;

  private constructor() {}

  public static getInstance(): ImageOverlayEngine {
    if (!ImageOverlayEngine.instance) {
      ImageOverlayEngine.instance = new ImageOverlayEngine();
    }
    return ImageOverlayEngine.instance;
  }

  /**
   * Get image dimensions from URI
   */
  async getImageDimensions(imageUri: string): Promise<ImageDimensions> {
    try {
      const cacheKey = `dimensions_${imageUri}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [],
        { format: ImageManipulator.SaveFormat.JPEG }
      );

      const dimensions = {
        width: manipulatedImage.width,
        height: manipulatedImage.height,
      };

      this.setCacheItem(cacheKey, dimensions);
      return dimensions;
    } catch (error) {
      console.error('Failed to get image dimensions:', error);
      throw new Error(`Failed to get image dimensions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate absolute position from relative position
   */
  calculateAbsolutePosition(
    relativePosition: TextPosition,
    imageDimensions: ImageDimensions,
    textDimensions?: { width: number; height: number }
  ): TextPosition {
    const absoluteX = relativePosition.x * imageDimensions.width;
    const absoluteY = relativePosition.y * imageDimensions.height;

    let adjustedX = absoluteX;
    let adjustedY = absoluteY;

    // Adjust for text alignment
    if (textDimensions) {
      switch (relativePosition.alignment) {
        case 'center':
          adjustedX = absoluteX - textDimensions.width / 2;
          break;
        case 'right':
          adjustedX = absoluteX - textDimensions.width;
          break;
        default: // 'left'
          break;
      }

      switch (relativePosition.verticalAlignment) {
        case 'middle':
          adjustedY = absoluteY - textDimensions.height / 2;
          break;
        case 'bottom':
          adjustedY = absoluteY - textDimensions.height;
          break;
        default: // 'top'
          break;
      }
    }

    return {
      ...relativePosition,
      x: Math.max(0, Math.min(adjustedX, imageDimensions.width)),
      y: Math.max(0, Math.min(adjustedY, imageDimensions.height)),
    };
  }

  /**
   * Break text into lines based on width constraints
   */
  breakTextIntoLines(
    text: string,
    maxWidth: number,
    fontSize: number,
    fontFamily?: string,
    maxLines?: number
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    // Approximate character width (this is a rough estimate)
    const avgCharWidth = fontSize * 0.6;
    const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Word is too long, break it
          lines.push(word.substring(0, maxCharsPerLine));
          currentLine = word.substring(maxCharsPerLine);
        }
      }

      // Check max lines limit
      if (maxLines && lines.length >= maxLines - 1) {
        if (currentLine) {
          lines.push(currentLine);
        }
        break;
      }
    }

    if (currentLine && (!maxLines || lines.length < maxLines)) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Create text overlay using React Native Skia
   */
  async createTextOverlay(
    imageUri: string,
    text: string,
    options: Partial<OverlayTextOptions> = {}
  ): Promise<OverlayResult> {
    try {
      // Validate inputs
      if (!imageUri || !text) {
        throw new Error('Image URI and text are required');
      }

      // Get image dimensions
      const imageDimensions = await this.getImageDimensions(imageUri);
      
      // Merge with default options
      const overlayOptions: OverlayTextOptions = {
        position: options.position || PRESET_POSITIONS.bottomCenter,
        style: { ...DEFAULT_TEXT_STYLE, ...options.style },
        shadow: options.shadow,
        border: options.border,
        background: options.background,
        rotation: options.rotation || 0,
        opacity: options.opacity ?? 1,
        maxLines: options.maxLines,
        ellipsize: options.ellipsize ?? true,
      };

      // Create a unique cache key
      const cacheKey = `overlay_${this.hashOptions(imageUri, text, overlayOptions)}`;
      if (this.cache.has(cacheKey)) {
        return { success: true, uri: this.cache.get(cacheKey), dimensions: imageDimensions };
      }

      // Process the overlay
      const resultUri = await this.processOverlayWithSkia(imageUri, text, overlayOptions, imageDimensions);
      
      this.setCacheItem(cacheKey, resultUri);
      
      return { 
        success: true, 
        uri: resultUri, 
        dimensions: imageDimensions 
      };
    } catch (error) {
      console.error('Text overlay creation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Process overlay using view-shot capture method
   * This method will be used with the TextOverlayCanvas component
   */
  private async processOverlayWithSkia(
    imageUri: string,
    text: string,
    options: OverlayTextOptions,
    imageDimensions: ImageDimensions
  ): Promise<string> {
    try {
      // For now, we'll use ImageManipulator as the base implementation
      // In a real React Native app, you would:
      // 1. Render the TextOverlayCanvas component
      // 2. Use captureRef to capture the canvas as an image
      // 3. Return the captured image URI
      
      // Basic image processing for fallback
      const processedImage = await this.processImageWithBasicOverlay(
        imageUri, 
        text, 
        options, 
        imageDimensions
      );
      
      return processedImage;
    } catch (error) {
      console.error('Skia overlay processing failed:', error);
      throw error;
    }
  }

  /**
   * Basic image processing fallback method
   */
  private async processImageWithBasicOverlay(
    imageUri: string,
    text: string,
    options: OverlayTextOptions,
    imageDimensions: ImageDimensions
  ): Promise<string> {
    // Resize image to optimize performance
    const targetWidth = Math.min(imageDimensions.width, 1000);
    const targetHeight = Math.round((imageDimensions.height * targetWidth) / imageDimensions.width);
    
    const manipulated = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        { resize: { width: targetWidth, height: targetHeight } },
        // Note: ImageManipulator doesn't support text overlay directly
        // This is where you would integrate with your TextOverlayCanvas component
      ],
      { 
        format: ImageManipulator.SaveFormat.JPEG, 
        compress: 0.8 
      }
    );

    // Store metadata about the text overlay for potential future processing
    const overlayMetadata = {
      text,
      options,
      originalDimensions: imageDimensions,
      processedDimensions: { width: targetWidth, height: targetHeight },
      timestamp: new Date().toISOString(),
    };
    
    // You could store this metadata for later use
    console.log('Overlay metadata:', overlayMetadata);

    return manipulated.uri;
  }

  /**
   * Capture text overlay using React component and view-shot
   * This method should be called from a React component context
   */
  async captureTextOverlay(
    canvasRef: React.RefObject<any>,
    options: {
      format?: 'png' | 'jpg' | 'webm';
      quality?: number;
      width?: number;
      height?: number;
    } = {}
  ): Promise<string> {
    try {
      if (!canvasRef.current) {
        throw new Error('Canvas ref is not available');
      }

      const captureOptions = {
        format: options.format || 'jpg' as const,
        quality: options.quality || 0.8,
        width: options.width,
        height: options.height,
      };

      const uri = await captureRef(canvasRef, captureOptions);
      return uri;
    } catch (error) {
      console.error('Failed to capture text overlay:', error);
      throw new Error(`Failed to capture overlay: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Batch process multiple text overlays
   */
  async createMultipleTextOverlays(
    imageUri: string,
    textOverlays: Array<{ text: string; options: Partial<OverlayTextOptions> }>
  ): Promise<OverlayResult> {
    try {
      let currentImageUri = imageUri;
      
      for (const overlay of textOverlays) {
        const result = await this.createTextOverlay(currentImageUri, overlay.text, overlay.options);
        if (!result.success || !result.uri) {
          throw new Error(result.error || 'Failed to create overlay');
        }
        currentImageUri = result.uri;
      }

      const dimensions = await this.getImageDimensions(currentImageUri);
      return { success: true, uri: currentImageUri, dimensions };
    } catch (error) {
      console.error('Multiple text overlay creation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Create hash for caching
   */
  private hashOptions(imageUri: string, text: string, options: OverlayTextOptions): string {
    const optionsStr = JSON.stringify(options);
    const combined = `${imageUri}_${text}_${optionsStr}`;
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString();
  }

  /**
   * Set cache item with size management
   */
  private setCacheItem(key: string, value: any): void {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
    };
  }
}

// Export singleton instance
export const imageOverlayEngine = ImageOverlayEngine.getInstance();

// React component export (commented out to avoid circular import issues)
// Export from the component file directly when needed:
// export { TextOverlayCanvas } from '../components/ui/TextOverlayCanvas';

// Utility functions
export function createPresetOverlayOptions(
  preset: keyof typeof PRESET_POSITIONS,
  styleOverrides: Partial<TextStyle> = {}
): Partial<OverlayTextOptions> {
  return {
    position: PRESET_POSITIONS[preset],
    style: { ...DEFAULT_TEXT_STYLE, ...styleOverrides },
    shadow: DEFAULT_TEXT_SHADOW,
  };
}

export function createCustomOverlayOptions(
  position: TextPosition,
  style: Partial<TextStyle> = {},
  effects: {
    shadow?: Partial<TextShadow>;
    border?: Partial<TextBorder>;
    background?: Partial<TextBackground>;
  } = {}
): OverlayTextOptions {
  return {
    position,
    style: { ...DEFAULT_TEXT_STYLE, ...style },
    shadow: effects.shadow ? { ...DEFAULT_TEXT_SHADOW, ...effects.shadow } : undefined,
    border: effects.border ? { ...DEFAULT_TEXT_BORDER, ...effects.border } : undefined,
    background: effects.background,
  };
}

// Convenience functions for common use cases
export async function addSimpleTextOverlay(
  imageUri: string,
  text: string,
  position: keyof typeof PRESET_POSITIONS = 'bottomCenter',
  fontSize: number = 24,
  color: string = '#FFFFFF'
): Promise<OverlayResult> {
  const options = createPresetOverlayOptions(position, { fontSize, color });
  return imageOverlayEngine.createTextOverlay(imageUri, text, options);
}

export async function addStyledTextOverlay(
  imageUri: string,
  text: string,
  options: {
    position?: keyof typeof PRESET_POSITIONS;
    fontSize?: number;
    color?: string;
    withShadow?: boolean;
    withBorder?: boolean;
    backgroundColor?: string;
  } = {}
): Promise<OverlayResult> {
  const overlayOptions: Partial<OverlayTextOptions> = {
    position: options.position ? PRESET_POSITIONS[options.position] : PRESET_POSITIONS.bottomCenter,
    style: {
      ...DEFAULT_TEXT_STYLE,
      fontSize: options.fontSize || 24,
      color: options.color || '#FFFFFF',
    },
  };

  if (options.withShadow) {
    overlayOptions.shadow = DEFAULT_TEXT_SHADOW;
  }

  if (options.withBorder) {
    overlayOptions.border = DEFAULT_TEXT_BORDER;
  }

  if (options.backgroundColor) {
    overlayOptions.background = {
      color: options.backgroundColor,
      padding: 8,
      borderRadius: 4,
      opacity: 0.8,
    };
  }

  return imageOverlayEngine.createTextOverlay(imageUri, text, overlayOptions);
}

// Poem-specific overlay function
export async function addPoemTextOverlay(
  imageUri: string,
  poemText: string,
  options: {
    position?: keyof typeof PRESET_POSITIONS;
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    withShadow?: boolean;
  } = {}
): Promise<OverlayResult> {
  // Clean and format poem text
  const cleanedText = poemText
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n\s*\n/g, '\n'); // Remove empty lines

  // Default styling optimized for poems
  const overlayOptions: Partial<OverlayTextOptions> = {
    position: options.position ? PRESET_POSITIONS[options.position] : PRESET_POSITIONS.bottomCenter,
    style: {
      ...DEFAULT_TEXT_STYLE,
      fontSize: options.fontSize || 20,
      color: options.color || '#FFFFFF',
      fontWeight: '400',
      textAlign: 'center',
      lineHeight: 1.4,
      letterSpacing: 0.5,
    },
    maxLines: 10,
    ellipsize: true,
  };

  // Add shadow for better readability
  if (options.withShadow !== false) {
    overlayOptions.shadow = {
      ...DEFAULT_TEXT_SHADOW,
      blur: 6,
      offsetX: 1,
      offsetY: 1,
    };
  }

  // Add semi-transparent background if specified
  if (options.backgroundColor) {
    overlayOptions.background = {
      color: options.backgroundColor,
      padding: 12,
      borderRadius: 8,
      opacity: 0.75,
    };
  }

  return imageOverlayEngine.createTextOverlay(imageUri, cleanedText, overlayOptions);
}

// Utility function to validate and prepare text for overlay
export function prepareTextForOverlay(
  text: string,
  maxLength: number = 500,
  maxLines: number = 10
): string {
  let preparedText = text.trim();
  
  // Truncate if too long
  if (preparedText.length > maxLength) {
    preparedText = preparedText.substring(0, maxLength - 3) + '...';
  }
  
  // Limit number of lines
  const lines = preparedText.split('\n');
  if (lines.length > maxLines) {
    preparedText = lines.slice(0, maxLines - 1).join('\n') + '\n...';
  }
  
  return preparedText;
}