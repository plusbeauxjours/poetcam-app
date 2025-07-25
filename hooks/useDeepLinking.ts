import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { parseDeepLink } from '@/services/shareLinkService';
import { DeepLinkParams } from '@/types/linkTypes';

interface DeepLinkState {
  isReady: boolean;
  params: DeepLinkParams | null;
  error: string | null;
}

export function useDeepLinking() {
  const [state, setState] = useState<DeepLinkState>({
    isReady: false,
    params: null,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const handleDeepLink = (url: string) => {
      if (!isMounted) return;

      try {
        console.log('Processing deep link:', url);
        
        // Parse the deep link
        const params = parseDeepLink(url);
        
        if (params) {
          setState({
            isReady: true,
            params,
            error: null,
          });
        } else {
          // Check if it's a web URL format (https://poetcam.app/s/shortCode)
          const webUrlMatch = url.match(/https:\/\/poetcam\.app\/s\/([A-Za-z0-9]+)/);
          if (webUrlMatch) {
            const shortCode = webUrlMatch[1];
            setState({
              isReady: true,
              params: {
                action: 'view',
                contentId: shortCode, // Using contentId to pass shortCode
              },
              error: null,
            });
          } else {
            setState({
              isReady: true,
              params: null,
              error: 'Invalid link format',
            });
          }
        }
      } catch (error) {
        console.error('Failed to parse deep link:', error);
        setState({
          isReady: true,
          params: null,
          error: 'Failed to parse link',
        });
      }
    };

    const setupDeepLinking = async () => {
      try {
        // Check if app was opened with a URL
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          handleDeepLink(initialUrl);
        } else {
          setState(prev => ({ ...prev, isReady: true }));
        }

        // Listen for incoming URLs while app is running
        const subscription = Linking.addEventListener('url', (event) => {
          handleDeepLink(event.url);
        });

        return () => {
          subscription?.remove();
        };
      } catch (error) {
        console.error('Failed to setup deep linking:', error);
        setState({
          isReady: true,
          params: null,
          error: 'Failed to setup deep linking',
        });
      }
    };

    const cleanup = setupDeepLinking();

    return () => {
      isMounted = false;
      cleanup?.then(fn => fn?.());
    };
  }, []);

  const clearParams = () => {
    setState(prev => ({
      ...prev,
      params: null,
      error: null,
    }));
  };

  const handleError = () => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  };

  return {
    isReady: state.isReady,
    params: state.params,
    error: state.error,
    clearParams,
    handleError,
  };
}

// Hook for handling shared content links specifically
export function useSharedContentLink() {
  const { isReady, params, error, clearParams, handleError } = useDeepLinking();
  
  const [sharedContentShortCode, setSharedContentShortCode] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && params && params.action === 'view' && params.contentId) {
      // Extract shortCode from contentId (for web URLs) or use contentId directly
      const shortCode = params.contentId;
      setSharedContentShortCode(shortCode);
    }
  }, [isReady, params]);

  const clearSharedContent = () => {
    setSharedContentShortCode(null);
    clearParams();
  };

  return {
    isReady,
    shortCode: sharedContentShortCode,
    error,
    clearSharedContent,
    handleError,
  };
}