import { useState, useCallback, useRef } from 'react';
import { 
  imageOverlayEngine, 
  OverlayTextOptions, 
  OverlayResult, 
  addPoemTextOverlay,
  addSimpleTextOverlay,
  addStyledTextOverlay,
  PRESET_POSITIONS,
  prepareTextForOverlay
} from '../services/imageOverlayEngine';

export interface UseTextOverlayOptions {
  enableCache?: boolean;
  maxCacheSize?: number;
  autoOptimize?: boolean;
}

export interface UseTextOverlayReturn {
  // State
  isProcessing: boolean;
  lastResult: OverlayResult | null;
  error: string | null;
  
  // Main functions
  createOverlay: (
    imageUri: string,
    text: string,
    options?: Partial<OverlayTextOptions>
  ) => Promise<OverlayResult>;
  
  // Convenience functions
  addSimpleOverlay: (
    imageUri: string,
    text: string,
    position?: keyof typeof PRESET_POSITIONS,
    fontSize?: number,
    color?: string
  ) => Promise<OverlayResult>;
  
  addStyledOverlay: (
    imageUri: string,
    text: string,
    options?: {
      position?: keyof typeof PRESET_POSITIONS;
      fontSize?: number;
      color?: string;
      withShadow?: boolean;
      withBorder?: boolean;
      backgroundColor?: string;
    }
  ) => Promise<OverlayResult>;
  
  addPoemOverlay: (
    imageUri: string,
    poemText: string,
    options?: {
      position?: keyof typeof PRESET_POSITIONS;
      fontSize?: number;
      color?: string;
      backgroundColor?: string;
      withShadow?: boolean;
    }
  ) => Promise<OverlayResult>;
  
  // Utility functions
  prepareText: (text: string, maxLength?: number, maxLines?: number) => string;
  clearCache: () => void;
  getCacheStats: () => { size: number; maxSize: number };
  
  // Canvas capture (for advanced usage)
  captureCanvas: (
    canvasRef: React.RefObject<any>,
    options?: {
      format?: 'png' | 'jpg' | 'webm';
      quality?: number;
      width?: number;
      height?: number;
    }
  ) => Promise<string>;
}

export const useTextOverlay = (options: UseTextOverlayOptions = {}): UseTextOverlayReturn => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<OverlayResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { enableCache = true, autoOptimize = true } = options;

  // Main overlay creation function
  const createOverlay = useCallback(async (
    imageUri: string,
    text: string,
    overlayOptions: Partial<OverlayTextOptions> = {}
  ): Promise<OverlayResult> => {
    setIsProcessing(true);\n    setError(null);\n    \n    try {\n      // Prepare text if auto-optimize is enabled\n      const processedText = autoOptimize ? prepareTextForOverlay(text) : text;\n      \n      const result = await imageOverlayEngine.createTextOverlay(\n        imageUri,\n        processedText,\n        overlayOptions\n      );\n      \n      setLastResult(result);\n      \n      if (!result.success) {\n        setError(result.error || 'Unknown error occurred');\n      }\n      \n      return result;\n    } catch (err) {\n      const errorMessage = err instanceof Error ? err.message : 'Failed to create overlay';\n      setError(errorMessage);\n      \n      const failedResult: OverlayResult = {\n        success: false,\n        error: errorMessage\n      };\n      \n      setLastResult(failedResult);\n      return failedResult;\n    } finally {\n      setIsProcessing(false);\n    }\n  }, [autoOptimize]);\n\n  // Simple overlay function\n  const addSimpleOverlay = useCallback(async (\n    imageUri: string,\n    text: string,\n    position: keyof typeof PRESET_POSITIONS = 'bottomCenter',\n    fontSize: number = 24,\n    color: string = '#FFFFFF'\n  ): Promise<OverlayResult> => {\n    return addSimpleTextOverlay(imageUri, text, position, fontSize, color);\n  }, []);\n\n  // Styled overlay function\n  const addStyledOverlay = useCallback(async (\n    imageUri: string,\n    text: string,\n    styleOptions: {\n      position?: keyof typeof PRESET_POSITIONS;\n      fontSize?: number;\n      color?: string;\n      withShadow?: boolean;\n      withBorder?: boolean;\n      backgroundColor?: string;\n    } = {}\n  ): Promise<OverlayResult> => {\n    return addStyledTextOverlay(imageUri, text, styleOptions);\n  }, []);\n\n  // Poem-specific overlay function\n  const addPoemOverlay = useCallback(async (\n    imageUri: string,\n    poemText: string,\n    poemOptions: {\n      position?: keyof typeof PRESET_POSITIONS;\n      fontSize?: number;\n      color?: string;\n      backgroundColor?: string;\n      withShadow?: boolean;\n    } = {}\n  ): Promise<OverlayResult> => {\n    return addPoemTextOverlay(imageUri, poemText, poemOptions);\n  }, []);\n\n  // Text preparation function\n  const prepareText = useCallback((text: string, maxLength?: number, maxLines?: number): string => {\n    return prepareTextForOverlay(text, maxLength, maxLines);\n  }, []);\n\n  // Cache management functions\n  const clearCache = useCallback(() => {\n    imageOverlayEngine.clearCache();\n  }, []);\n\n  const getCacheStats = useCallback(() => {\n    return imageOverlayEngine.getCacheStats();\n  }, []);\n\n  // Canvas capture function\n  const captureCanvas = useCallback(async (\n    canvasRef: React.RefObject<any>,\n    captureOptions: {\n      format?: 'png' | 'jpg' | 'webm';\n      quality?: number;\n      width?: number;\n      height?: number;\n    } = {}\n  ): Promise<string> => {\n    setIsProcessing(true);\n    setError(null);\n    \n    try {\n      const uri = await imageOverlayEngine.captureTextOverlay(canvasRef, captureOptions);\n      return uri;\n    } catch (err) {\n      const errorMessage = err instanceof Error ? err.message : 'Failed to capture canvas';\n      setError(errorMessage);\n      throw new Error(errorMessage);\n    } finally {\n      setIsProcessing(false);\n    }\n  }, []);\n\n  return {\n    // State\n    isProcessing,\n    lastResult,\n    error,\n    \n    // Main functions\n    createOverlay,\n    \n    // Convenience functions\n    addSimpleOverlay,\n    addStyledOverlay,\n    addPoemOverlay,\n    \n    // Utility functions\n    prepareText,\n    clearCache,\n    getCacheStats,\n    \n    // Canvas capture\n    captureCanvas,\n  };\n};\n\n// Hook for poem-specific text overlay (convenience)\nexport const usePoemOverlay = (options: UseTextOverlayOptions = {}) => {\n  const textOverlay = useTextOverlay(options);\n  \n  const createPoemOverlay = useCallback(async (\n    imageUri: string,\n    poemText: string,\n    customOptions: {\n      position?: keyof typeof PRESET_POSITIONS;\n      fontSize?: number;\n      color?: string;\n      backgroundColor?: string;\n      withShadow?: boolean;\n    } = {}\n  ): Promise<OverlayResult> => {\n    const defaultOptions = {\n      position: 'bottomCenter' as keyof typeof PRESET_POSITIONS,\n      fontSize: 18,\n      color: '#FFFFFF',\n      withShadow: true,\n      ...customOptions\n    };\n    \n    return textOverlay.addPoemOverlay(imageUri, poemText, defaultOptions);\n  }, [textOverlay]);\n  \n  return {\n    ...textOverlay,\n    createPoemOverlay,\n  };\n};