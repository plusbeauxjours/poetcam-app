import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TextStyle, DEFAULT_TEXT_STYLE } from '@/constants/fonts';

const STORAGE_KEY = '@poetcam_text_style';

export function useTextStyle() {
  const [textStyle, setTextStyle] = useState<TextStyle>(DEFAULT_TEXT_STYLE);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved style from AsyncStorage
  useEffect(() => {
    loadTextStyle();
  }, []);

  const loadTextStyle = async () => {
    try {
      const savedStyle = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedStyle) {
        setTextStyle(JSON.parse(savedStyle));
      }
    } catch (error) {
      console.error('Failed to load text style:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTextStyle = async (style: TextStyle) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(style));
      setTextStyle(style);
    } catch (error) {
      console.error('Failed to save text style:', error);
    }
  };

  const resetTextStyle = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setTextStyle(DEFAULT_TEXT_STYLE);
    } catch (error) {
      console.error('Failed to reset text style:', error);
    }
  };

  return {
    textStyle,
    isLoading,
    saveTextStyle,
    resetTextStyle,
  };
}