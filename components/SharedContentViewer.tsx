import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  ArrowLeft,
  Share2,
  Download,
  Heart,
  MessageCircle,
  ExternalLink,
  MapPin,
  Calendar,
  Eye,
  Copy,
} from 'lucide-react-native';
import { SharedContent, ShareLink } from '@/types/linkTypes';
import { AVAILABLE_FONTS } from '@/constants/fonts';
import { getSharedContent, trackLinkClick } from '@/services/shareLinkService';
import * as Clipboard from 'expo-clipboard';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { BlurView } from 'expo-blur';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SharedContentViewerProps {
  shortCode: string;
  onClose: () => void;
  onNotFound?: () => void;
}

export function SharedContentViewer({ 
  shortCode, 
  onClose, 
  onNotFound 
}: SharedContentViewerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [content, setContent] = useState<SharedContent | null>(null);
  const [link, setLink] = useState<ShareLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saving, setSaving] = useState(false);
  const viewShotRef = React.useRef<any>(null);

  useEffect(() => {
    loadSharedContent();
  }, [shortCode]);

  const loadSharedContent = async () => {
    try {
      setLoading(true);
      const result = await getSharedContent(shortCode);
      
      if (!result) {
        onNotFound?.();
        return;
      }

      setContent(result.content);
      setLink(result.link);

      // Track the click
      await trackLinkClick(result.link.id, {
        platform: Platform.OS as 'ios' | 'android',
        userAgent: Platform.OS,
      });

    } catch (error) {
      console.error('Failed to load shared content:', error);
      Alert.alert('오류', '콘텐츠를 불러오는 중 문제가 발생했습니다.');
      onNotFound?.();
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!link) return;

    try {
      const { Share } = await import('react-native');
      await Share.share({
        message: `시 작품을 확인해보세요: ${link.fullUrl}`,
        url: link.fullUrl,
        title: '시 작품',
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleCopyLink = async () => {
    if (!link) return;

    try {
      await Clipboard.setStringAsync(link.fullUrl);
      Alert.alert('복사 완료', '링크가 클립보드에 복사되었습니다.');
    } catch (error) {
      Alert.alert('오류', '링크 복사 중 문제가 발생했습니다.');
    }
  };

  const handleSaveImage = async () => {
    if (!content || saving) return;

    try {
      setSaving(true);
      
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '이미지를 저장하려면 갤러리 접근 권한이 필요합니다.');
        return;
      }

      if (viewShotRef.current) {
        const uri = await viewShotRef.current.capture();
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert('저장 완료', '이미지가 갤러리에 저장되었습니다.');
      }
    } catch (error) {
      console.error('Failed to save image:', error);
      Alert.alert('저장 실패', '이미지 저장 중 문제가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const getTextStyle = () => {
    if (!content?.metadata?.style) {
      return {
        fontFamily: 'System',
        fontSize: 18,
        color: '#FFFFFF',
        lineHeight: 24,
        textAlign: 'center' as const,
      };
    }

    const style = content.metadata.style;
    const font = AVAILABLE_FONTS.find(f => f.id === style.fontId);

    return {
      fontFamily: font?.fontFamily || 'System',
      fontSize: style.fontSize || 18,
      color: style.color || '#FFFFFF',
      backgroundColor: style.backgroundColor,
      lineHeight: (style.fontSize || 18) * 1.3,
      textAlign: 'center' as const,
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'yyyy년 MM월 dd일', { locale: ko });
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ThemedText>로딩 중...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!content || !link) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorTitle}>콘텐츠를 찾을 수 없습니다</ThemedText>
          <ThemedText style={[styles.errorDescription, { color: colors.textSecondary }]}>
            링크가 만료되었거나 삭제된 콘텐츠입니다.
          </ThemedText>
          <TouchableOpacity
            style={[styles.errorButton, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <ThemedText style={{ color: '#FFF' }}>돌아가기</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <BlurView intensity={80} tint={colorScheme} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleCopyLink}>
            <Copy color="#FFF" size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
            <Share2 color="#FFF" size={20} />
          </TouchableOpacity>
        </View>
      </BlurView>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Main Image with Text Overlay */}
        <View style={styles.imageSection}>
          <ViewShot
            ref={viewShotRef}
            style={styles.imageContainer}
            options={{ format: 'jpg', quality: 0.9 }}
          >
            <Image
              source={{ uri: content.imageUri }}
              style={styles.sharedImage}
              contentFit="cover"
            />
            
            <View style={styles.textOverlay}>
              <View style={[styles.textContainer, getTextStyle().backgroundColor && {
                backgroundColor: getTextStyle().backgroundColor,
                padding: 12,
                borderRadius: 8,
              }]}>
                <ThemedText style={[styles.overlayText, getTextStyle()]}>
                  {content.poemText}
                </ThemedText>
              </View>
            </View>
          </ViewShot>
        </View>

        {/* Content Info */}
        <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
          <View style={styles.infoRow}>
            <Calendar color={colors.textSecondary} size={16} />
            <ThemedText style={[styles.infoText, { color: colors.textSecondary }]}>
              {formatDate(content.createdAt)}
            </ThemedText>
          </View>

          {content.metadata?.location && (
            <View style={styles.infoRow}>
              <MapPin color={colors.textSecondary} size={16} />
              <ThemedText style={[styles.infoText, { color: colors.textSecondary }]}>
                {content.metadata.location.address || 
                 `${content.metadata.location.latitude.toFixed(4)}, ${content.metadata.location.longitude.toFixed(4)}`}
              </ThemedText>
            </View>
          )}

          <View style={styles.infoRow}>
            <Eye color={colors.textSecondary} size={16} />
            <ThemedText style={[styles.infoText, { color: colors.textSecondary }]}>
              조회수 {link.clickCount}회
            </ThemedText>
          </View>

          {content.metadata?.tags && content.metadata.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {content.metadata.tags.map((tag, index) => (
                <View key={index} style={[styles.tag, { backgroundColor: colors.primary + '20' }]}>
                  <ThemedText style={[styles.tagText, { color: colors.primary }]}>
                    #{tag}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surface }]}
            onPress={() => setLiked(!liked)}
          >
            <Heart 
              color={liked ? colors.error : colors.textSecondary} 
              size={20}
              fill={liked ? colors.error : 'none'}
            />
            <ThemedText style={[styles.actionText, { color: colors.text }]}>
              좋아요
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surface }]}
            onPress={handleSaveImage}
            disabled={saving}
          >
            <Download color={colors.textSecondary} size={20} />
            <ThemedText style={[styles.actionText, { color: colors.text }]}>
              {saving ? '저장 중...' : '저장'}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surface }]}
          >
            <MessageCircle color={colors.textSecondary} size={20} />
            <ThemedText style={[styles.actionText, { color: colors.text }]}>
              댓글
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
  },
  imageSection: {
    aspectRatio: 1,
    marginBottom: 16,
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  sharedImage: {
    width: '100%',
    height: '100%',
  },
  textOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  textContainer: {
    maxWidth: '90%',
  },
  overlayText: {
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  infoSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 32,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  errorButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
});