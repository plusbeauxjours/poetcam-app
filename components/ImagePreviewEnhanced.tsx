import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  View,
  Text,
  SafeAreaView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AVAILABLE_FONTS, TextStyle } from '@/constants/fonts';
import {
  X,
  Type,
  Move,
  Download,
  Share2,
  Edit3,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Maximize2,
} from 'lucide-react-native';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';
import { shareToSocial } from '@/services/socialShareService';
import { shareWithTracking } from '@/services/enhancedSocialShareService';
import { ShareNotification } from './ShareNotification';
import { ShareStatus } from '@/types/shareTypes';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  PinchGestureHandler,
  State,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { Image } from 'expo-image';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth > 768;

interface ImagePreviewEnhancedProps {
  visible: boolean;
  onClose: () => void;
  imageUri: string;
  poemText: string;
  textStyle: TextStyle;
}

export function ImagePreviewEnhanced({
  visible,
  onClose,
  imageUri,
  poemText,
  textStyle,
}: ImagePreviewEnhancedProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const viewShotRef = useRef<any>(null);

  const [editableText, setEditableText] = useState(poemText);
  const [isEditing, setIsEditing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [shareNotification, setShareNotification] = useState<{
    visible: boolean;
    status: ShareStatus;
    message: string;
    canRetry: boolean;
  }>({
    visible: false,
    status: 'pending',
    message: '',
    canRetry: false,
  });

  // Animation values for image transform
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const imageTranslateX = useSharedValue(0);
  const imageTranslateY = useSharedValue(0);

  // Animation values for text dragging
  const textTranslateX = useSharedValue(0);
  const textTranslateY = useSharedValue(0);

  useEffect(() => {
    setEditableText(poemText);
    // Reset positions when modal opens
    scale.value = 1;
    savedScale.value = 1;
    imageTranslateX.value = 0;
    imageTranslateY.value = 0;
    textTranslateX.value = 0;
    textTranslateY.value = 0;
  }, [visible, poemText]);

  const pinchHandler = useAnimatedGestureHandler({
    onActive: (event) => {
      scale.value = savedScale.value * event.scale;
    },
    onEnd: () => {
      savedScale.value = scale.value;
    },
  });

  const panHandler = useAnimatedGestureHandler({
    onActive: (event) => {
      imageTranslateX.value = event.translationX;
      imageTranslateY.value = event.translationY;
    },
  });

  const textPanHandler = useAnimatedGestureHandler({
    onActive: (event) => {
      textTranslateX.value = event.translationX;
      textTranslateY.value = event.translationY;
    },
  });

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: imageTranslateX.value },
      { translateY: imageTranslateY.value },
      { scale: scale.value },
    ],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: textTranslateX.value },
      { translateY: textTranslateY.value },
    ],
  }));

  const handleZoomIn = () => {
    scale.value = withSpring(Math.min(scale.value + 0.2, 3));
    savedScale.value = scale.value;
  };

  const handleZoomOut = () => {
    scale.value = withSpring(Math.max(scale.value - 0.2, 0.5));
    savedScale.value = scale.value;
  };

  const handleReset = () => {
    scale.value = withSpring(1);
    savedScale.value = 1;
    imageTranslateX.value = withSpring(0);
    imageTranslateY.value = withSpring(0);
    textTranslateX.value = withSpring(0);
    textTranslateY.value = withSpring(0);
    setEditableText(poemText);
  };

  const captureImage = async () => {
    if (!viewShotRef.current || isCapturing) return null;

    try {
      setIsCapturing(true);
      const uri = await viewShotRef.current.capture();
      return uri;
    } catch (error) {
      console.error('Failed to capture image:', error);
      Alert.alert('오류', '이미지 캡처에 실패했습니다.');
      return null;
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSave = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진을 저장하려면 갤러리 접근 권한이 필요합니다.');
      return;
    }

    const uri = await captureImage();
    if (!uri) return;

    try {
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('저장 완료', '이미지가 갤러리에 저장되었습니다.');
    } catch (error) {
      console.error('Failed to save image:', error);
      Alert.alert('저장 실패', '이미지 저장 중 문제가 발생했습니다.');
    }
  };

  const handleShare = async () => {
    const uri = await captureImage();
    if (!uri) return;

    try {
      const result = await shareWithTracking(
        {
          imageUri: uri,
          poemText: editableText,
        },
        'other',
        undefined,
        (status, message) => {
          setShareNotification({
            visible: true,
            status,
            message,
            canRetry: status === 'failed',
          });
        }
      );

      if (!result.success && !shareNotification.visible) {
        setShareNotification({
          visible: true,
          status: 'failed',
          message: result.error || '공유 중 문제가 발생했습니다.',
          canRetry: true,
        });
      }
    } catch (error) {
      console.error('Failed to share:', error);
      setShareNotification({
        visible: true,
        status: 'failed',
        message: '공유 중 문제가 발생했습니다.',
        canRetry: true,
      });
    }
  };

  const handleRetryShare = () => {
    setShareNotification({ ...shareNotification, visible: false });
    setTimeout(() => handleShare(), 300);
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    previewContainer: {
      flex: 1,
      backgroundColor: '#000',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    imageContainer: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    overlayTextContainer: {
      position: 'absolute',
      padding: 16,
      backgroundColor: textStyle.backgroundColor || 'rgba(0, 0, 0, 0.5)',
      borderRadius: 8,
      maxWidth: '80%',
    },
    overlayText: {
      fontFamily: AVAILABLE_FONTS.find((f) => f.id === textStyle.fontId)?.fontFamily || 'System',
      fontSize: textStyle.fontSize,
      color: textStyle.color,
      lineHeight: textStyle.fontSize * textStyle.lineHeight,
      letterSpacing: textStyle.letterSpacing,
      textAlign: textStyle.textAlign,
      fontWeight: textStyle.fontWeight,
      opacity: textStyle.opacity,
    },
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    toolButton: {
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activeToolButton: {
      backgroundColor: colors.primary,
    },
    bottomActions: {
      flexDirection: 'row',
      gap: 12,
      padding: 16,
      backgroundColor: colors.background,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      gap: 8,
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    secondaryButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    gridOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0.3,
    },
    gridLine: {
      position: 'absolute',
      backgroundColor: colors.border,
    },
  });

  const renderGrid = () => {
    if (!showGrid) return null;

    const lines = [];
    // Vertical lines
    for (let i = 1; i < 3; i++) {
      lines.push(
        <View
          key={`v${i}`}
          style={[
            dynamicStyles.gridLine,
            {
              left: `${(i * 100) / 3}%`,
              top: 0,
              bottom: 0,
              width: 1,
            },
          ]}
        />
      );
    }
    // Horizontal lines
    for (let i = 1; i < 3; i++) {
      lines.push(
        <View
          key={`h${i}`}
          style={[
            dynamicStyles.gridLine,
            {
              top: `${(i * 100) / 3}%`,
              left: 0,
              right: 0,
              height: 1,
            },
          ]}
        />
      );
    }

    return <View style={dynamicStyles.gridOverlay}>{lines}</View>;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={dynamicStyles.container}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={dynamicStyles.header}>
              <TouchableOpacity onPress={onClose}>
                <X color={colors.text} size={24} />
              </TouchableOpacity>
              <ThemedText style={styles.headerTitle}>미리보기</ThemedText>
              <TouchableOpacity onPress={handleReset}>
                <RefreshCw color={colors.text} size={24} />
              </TouchableOpacity>
            </View>

            <View style={dynamicStyles.previewContainer}>
              <ViewShot
                ref={viewShotRef}
                style={dynamicStyles.imageContainer}
                options={{ format: 'jpg', quality: 0.9 }}
              >
                <PinchGestureHandler onGestureEvent={pinchHandler}>
                  <Animated.View style={dynamicStyles.imageContainer}>
                    <PanGestureHandler onGestureEvent={panHandler}>
                      <Animated.View style={[dynamicStyles.imageContainer, animatedImageStyle]}>
                        <Image
                          source={{ uri: imageUri }}
                          style={styles.previewImage}
                          contentFit="contain"
                        />
                      </Animated.View>
                    </PanGestureHandler>
                  </Animated.View>
                </PinchGestureHandler>

                <PanGestureHandler onGestureEvent={textPanHandler} enabled={!isEditing}>
                  <Animated.View
                    style={[dynamicStyles.overlayTextContainer, animatedTextStyle]}
                  >
                    {isEditing ? (
                      <TextInput
                        style={dynamicStyles.overlayText}
                        value={editableText}
                        onChangeText={setEditableText}
                        multiline
                        autoFocus
                        onBlur={() => setIsEditing(false)}
                      />
                    ) : (
                      <Text style={dynamicStyles.overlayText}>{editableText}</Text>
                    )}
                  </Animated.View>
                </PanGestureHandler>

                {renderGrid()}
              </ViewShot>
            </View>

            <View style={dynamicStyles.toolbar}>
              <TouchableOpacity
                style={[dynamicStyles.toolButton, isEditing && dynamicStyles.activeToolButton]}
                onPress={() => setIsEditing(!isEditing)}
              >
                <Edit3 color={isEditing ? '#FFF' : colors.icon} size={20} />
              </TouchableOpacity>

              <TouchableOpacity style={dynamicStyles.toolButton} onPress={handleZoomIn}>
                <ZoomIn color={colors.icon} size={20} />
              </TouchableOpacity>

              <TouchableOpacity style={dynamicStyles.toolButton} onPress={handleZoomOut}>
                <ZoomOut color={colors.icon} size={20} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[dynamicStyles.toolButton, showGrid && dynamicStyles.activeToolButton]}
                onPress={() => setShowGrid(!showGrid)}
              >
                <Maximize2 color={showGrid ? '#FFF' : colors.icon} size={20} />
              </TouchableOpacity>
            </View>

            <View style={dynamicStyles.bottomActions}>
              <TouchableOpacity
                style={[dynamicStyles.actionButton, dynamicStyles.secondaryButton]}
                onPress={handleSave}
                disabled={isCapturing}
              >
                <Download color={colors.icon} size={20} />
                <ThemedText style={{ color: colors.text }}>저장</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[dynamicStyles.actionButton, dynamicStyles.primaryButton]}
                onPress={handleShare}
                disabled={isCapturing}
              >
                <Share2 color="#FFF" size={20} />
                <ThemedText style={{ color: '#FFF' }}>공유</ThemedText>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>

          {/* Share Notification */}
          <ShareNotification
            visible={shareNotification.visible}
            status={shareNotification.status}
            message={shareNotification.message}
            onClose={() => setShareNotification({ ...shareNotification, visible: false })}
            onRetry={shareNotification.canRetry ? handleRetryShare : undefined}
            autoHideDuration={shareNotification.status === 'success' ? 2000 : 5000}
          />
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
});