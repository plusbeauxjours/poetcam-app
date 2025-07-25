import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  View,
  Text,
  SafeAreaView,
  TextInput,
  Alert,
  Image,
  PanResponder,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AVAILABLE_FONTS, TextStyle } from '@/constants/fonts';
import {
  X,
  Check,
  Type,
  Move,
  Download,
  Share2,
  Edit3,
  ZoomIn,
  ZoomOut,
  RefreshCw,
} from 'lucide-react-native';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { shareToSocial } from '@/services/socialShareService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth > 768;

interface ImagePreviewProps {
  visible: boolean;
  onClose: () => void;
  imageUri: string;
  poemText: string;
  textStyle: TextStyle;
}

export function ImagePreview({
  visible,
  onClose,
  imageUri,
  poemText,
  textStyle,
}: ImagePreviewProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const viewShotRef = useRef<any>(null);

  const [editableText, setEditableText] = useState(poemText);
  const [isEditing, setIsEditing] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [isCapturing, setIsCapturing] = useState(false);

  // Animation values for text dragging
  const pan = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    setEditableText(poemText);
    // Reset position when modal opens
    pan.setValue({ x: 0, y: 0 });
    setTextPosition({ x: 0, y: 0 });
    setImageScale(1);
  }, [visible, poemText]);

  // Pan responder for dragging text
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => !isEditing,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: textPosition.x,
          y: textPosition.y,
        });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        const newPosition = {
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        };
        setTextPosition(newPosition);
      },
    })
  ).current;

  const handleZoomIn = () => {
    if (imageScale < 2) {
      setImageScale(imageScale + 0.1);
    }
  };

  const handleZoomOut = () => {
    if (imageScale > 0.5) {
      setImageScale(imageScale - 0.1);
    }
  };

  const handleReset = () => {
    setImageScale(1);
    pan.setValue({ x: 0, y: 0 });
    setTextPosition({ x: 0, y: 0 });
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
      const shared = await shareToSocial(uri, editableText);
      if (!shared) {
        Alert.alert('공유 실패', '공유 중 문제가 발생했습니다.');
      }
    } catch (error) {
      console.error('Failed to share:', error);
      Alert.alert('공유 실패', '공유 중 문제가 발생했습니다.');
    }
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
      backgroundColor: colors.grey[100],
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    imageContainer: {
      position: 'relative',
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    overlayText: {
      position: 'absolute',
      fontFamily: AVAILABLE_FONTS.find((f) => f.id === textStyle.fontId)?.fontFamily || 'System',
      fontSize: textStyle.fontSize,
      color: textStyle.color,
      lineHeight: textStyle.fontSize * textStyle.lineHeight,
      letterSpacing: textStyle.letterSpacing,
      textAlign: textStyle.textAlign,
      fontWeight: textStyle.fontWeight,
      padding: 16,
      backgroundColor: textStyle.backgroundColor || 'rgba(0, 0, 0, 0.5)',
      borderRadius: 8,
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
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
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
              <Image
                source={{ uri: imageUri }}
                style={[
                  styles.previewImage,
                  {
                    transform: [{ scale: imageScale }],
                  },
                ]}
                resizeMode="contain"
              />
              <Animated.View
                style={[
                  dynamicStyles.overlayText,
                  {
                    transform: [{ translateX: pan.x }, { translateY: pan.y }],
                  },
                ]}
                {...panResponder.panHandlers}
              >
                {isEditing ? (
                  <TextInput
                    style={[
                      dynamicStyles.overlayText,
                      { backgroundColor: 'transparent', opacity: 1 },
                    ]}
                    value={editableText}
                    onChangeText={setEditableText}
                    multiline
                    autoFocus
                    onBlur={() => setIsEditing(false)}
                  />
                ) : (
                  <Text style={{ color: textStyle.color }}>{editableText}</Text>
                )}
              </Animated.View>
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

            <TouchableOpacity style={dynamicStyles.toolButton}>
              <Move color={colors.icon} size={20} />
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
      </SafeAreaView>
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