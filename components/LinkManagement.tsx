import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ScrollView,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  Link,
  Copy,
  Share2,
  Eye,
  Calendar,
  TrendingUp,
  ExternalLink,
  Trash2,
  QrCode,
  Settings,
  Plus,
  Refresh,
} from 'lucide-react-native';
import { ShareLink, LinkAnalytics } from '@/types/linkTypes';
import {
  getUserLinks,
  getLinkAnalytics,
  deactivateLink,
  createShareableContent,
  generateQRCodeData,
  cleanupExpiredLinks,
} from '@/services/shareLinkService';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

interface LinkManagementProps {
  visible: boolean;
  onClose: () => void;
  userId?: string;
}

interface LinkWithAnalytics extends ShareLink {
  analytics?: LinkAnalytics;
  shared_content?: {
    poemText: string;
    createdAt: string;
    imageUri: string;
  };
}

export function LinkManagement({ visible, onClose, userId }: LinkManagementProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [links, setLinks] = useState<LinkWithAnalytics[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLink, setSelectedLink] = useState<LinkWithAnalytics | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (visible) {
      loadLinks();
    }
  }, [visible, userId]);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const userLinks = await getUserLinks(userId);
      
      // Load analytics for each link
      const linksWithAnalytics = await Promise.all(
        userLinks.map(async (link) => {
          const analytics = await getLinkAnalytics(link.id);
          return {
            ...link,
            analytics,
          } as LinkWithAnalytics;
        })
      );

      setLinks(linksWithAnalytics);
    } catch (error) {
      console.error('Failed to load links:', error);
      Alert.alert('오류', '링크를 불러오는 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await cleanupExpiredLinks();
    await loadLinks();
    setRefreshing(false);
  };

  const handleCopyLink = async (link: ShareLink) => {
    try {
      await Clipboard.setStringAsync(link.fullUrl);
      Alert.alert('복사 완료', '링크가 클립보드에 복사되었습니다.');
    } catch (error) {
      Alert.alert('오류', '링크 복사 중 문제가 발생했습니다.');
    }
  };

  const handleShareLink = async (link: ShareLink) => {
    try {
      const { Share } = await import('react-native');
      await Share.share({
        message: `시 작품을 확인해보세요: ${link.fullUrl}`,
        url: link.fullUrl,
        title: '시 작품 공유',
      });
    } catch (error) {
      console.error('Failed to share link:', error);
    }
  };

  const handleDeleteLink = (link: ShareLink) => {
    Alert.alert(
      '링크 삭제',
      '이 링크를 삭제하시겠습니까? 삭제된 링크는 더 이상 접근할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivateLink(link.id);
              setLinks(links.filter(l => l.id !== link.id));
              Alert.alert('삭제 완료', '링크가 삭제되었습니다.');
            } catch (error) {
              Alert.alert('오류', '링크 삭제 중 문제가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  const handleShowAnalytics = (link: LinkWithAnalytics) => {
    setSelectedLink(link);
    setShowAnalytics(true);
  };

  const handleShowQR = (link: LinkWithAnalytics) => {
    setSelectedLink(link);
    setShowQR(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'yyyy.MM.dd HH:mm', { locale: ko });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: ko });
  };

  const getStatusColor = (link: ShareLink) => {
    if (!link.isActive) return colors.textSecondary;
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) return colors.error;
    return colors.success;
  };

  const getStatusText = (link: ShareLink) => {
    if (!link.isActive) return '비활성';
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) return '만료됨';
    return '활성';
  };

  const renderLinkItem = (link: LinkWithAnalytics) => (
    <ThemedView key={link.id} style={[styles.linkItem, { borderColor: colors.border }]}>
      <View style={styles.linkHeader}>
        <View style={styles.linkInfo}>
          <ThemedText style={styles.linkTitle} numberOfLines={2}>
            {link.shared_content?.poemText?.substring(0, 50) || '제목 없음'}...
          </ThemedText>
          <View style={styles.linkMeta}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(link) }]}>
              <ThemedText style={[styles.statusText, { color: '#FFF' }]}>
                {getStatusText(link)}
              </ThemedText>
            </View>
            <ThemedText style={[styles.metaText, { color: colors.textSecondary }]}>
              {formatRelativeTime(link.createdAt)}
            </ThemedText>
          </View>
        </View>
        
        <View style={styles.linkStats}>
          <View style={styles.statItem}>
            <Eye color={colors.textSecondary} size={16} />
            <ThemedText style={[styles.statText, { color: colors.textSecondary }]}>
              {link.clickCount}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.linkUrl}>
        <ThemedText style={[styles.urlText, { color: colors.textSecondary }]} numberOfLines={1}>
          {link.fullUrl}
        </ThemedText>
      </View>

      <View style={styles.linkActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surface }]}
          onPress={() => handleCopyLink(link)}
        >
          <Copy color={colors.icon} size={16} />
          <ThemedText style={[styles.actionText, { color: colors.text }]}>복사</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surface }]}
          onPress={() => handleShareLink(link)}
        >
          <Share2 color={colors.icon} size={16} />
          <ThemedText style={[styles.actionText, { color: colors.text }]}>공유</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surface }]}
          onPress={() => handleShowAnalytics(link)}
        >
          <TrendingUp color={colors.icon} size={16} />
          <ThemedText style={[styles.actionText, { color: colors.text }]}>분석</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surface }]}
          onPress={() => handleShowQR(link)}
        >
          <QrCode color={colors.icon} size={16} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surface }]}
          onPress={() => handleDeleteLink(link)}
        >
          <Trash2 color={colors.error} size={16} />
        </TouchableOpacity>
      </View>

      {link.expiresAt && (
        <View style={styles.expirationInfo}>
          <Calendar color={colors.textSecondary} size={14} />
          <ThemedText style={[styles.expirationText, { color: colors.textSecondary }]}>
            만료: {formatDate(link.expiresAt)}
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );

  const renderAnalyticsModal = () => {
    if (!selectedLink?.analytics) return null;

    const { analytics } = selectedLink;

    return (
      <Modal
        visible={showAnalytics}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAnalytics(false)}
      >
        <ThemedView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <ThemedText style={styles.modalTitle}>링크 분석</ThemedText>
            <TouchableOpacity onPress={() => setShowAnalytics(false)}>
              <ThemedText style={[styles.closeButton, { color: colors.primary }]}>완료</ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.analyticsSection}>
              <ThemedText style={styles.sectionTitle}>기본 통계</ThemedText>
              
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                  <ThemedText style={styles.statValue}>{analytics.totalClicks}</ThemedText>
                  <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
                    총 클릭수
                  </ThemedText>
                </View>
                
                <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                  <ThemedText style={styles.statValue}>{analytics.uniqueClicks}</ThemedText>
                  <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
                    고유 클릭수
                  </ThemedText>
                </View>
              </View>
            </View>

            {Object.keys(analytics.clicksByPlatform).length > 0 && (
              <View style={styles.analyticsSection}>
                <ThemedText style={styles.sectionTitle}>플랫폼별 클릭</ThemedText>
                {Object.entries(analytics.clicksByPlatform).map(([platform, count]) => (
                  <View key={platform} style={styles.platformItem}>
                    <ThemedText style={styles.platformName}>{platform}</ThemedText>
                    <ThemedText style={[styles.platformCount, { color: colors.textSecondary }]}>
                      {count}회
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}

            {analytics.topReferrers.length > 0 && (
              <View style={styles.analyticsSection}>
                <ThemedText style={styles.sectionTitle}>상위 참조</ThemedText>
                {analytics.topReferrers.map((referrer, index) => (
                  <View key={index} style={styles.referrerItem}>
                    <ThemedText style={styles.referrerName} numberOfLines={1}>
                      {referrer.referrer}
                    </ThemedText>
                    <ThemedText style={[styles.referrerCount, { color: colors.textSecondary }]}>
                      {referrer.count}회
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </ThemedView>
      </Modal>
    );
  };

  const renderQRModal = () => {
    if (!selectedLink) return null;

    const qrData = generateQRCodeData(selectedLink.shortCode);

    return (
      <Modal
        visible={showQR}
        animationType="fade"
        transparent
        onRequestClose={() => setShowQR(false)}
      >
        <View style={styles.qrModalOverlay}>
          <ThemedView style={[styles.qrModalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.qrHeader, { borderBottomColor: colors.border }]}>
              <ThemedText style={styles.qrTitle}>QR 코드</ThemedText>
              <TouchableOpacity onPress={() => setShowQR(false)}>
                <ThemedText style={[styles.closeButton, { color: colors.primary }]}>닫기</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.qrContainer}>
              {/* QR 코드를 실제로 생성하려면 react-native-qrcode-svg 등의 라이브러리 필요 */}
              <View style={[styles.qrPlaceholder, { backgroundColor: colors.surface }]}>
                <QrCode color={colors.textSecondary} size={100} />
                <ThemedText style={[styles.qrText, { color: colors.textSecondary }]}>
                  QR 코드
                </ThemedText>
              </View>
              
              <ThemedText style={[styles.qrUrl, { color: colors.textSecondary }]}>
                {selectedLink.fullUrl}
              </ThemedText>
            </View>
          </ThemedView>
        </View>
      </Modal>
    );
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
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyIcon: {
      marginBottom: 16,
    },
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ThemedView style={dynamicStyles.container}>
        <View style={dynamicStyles.header}>
          <ThemedText style={styles.headerTitle}>공유 링크 관리</ThemedText>
          <TouchableOpacity onPress={onClose}>
            <ThemedText style={[styles.closeButton, { color: colors.primary }]}>완료</ThemedText>
          </TouchableOpacity>
        </View>

        {links.length === 0 && !loading ? (
          <View style={dynamicStyles.emptyState}>
            <Link color={colors.textSecondary} size={64} style={dynamicStyles.emptyIcon} />
            <ThemedText style={styles.emptyTitle}>공유 링크가 없습니다</ThemedText>
            <ThemedText style={[styles.emptyDescription, { color: colors.textSecondary }]}>
              작품을 공유하면 여기에서 링크를 관리할 수 있습니다.
            </ThemedText>
          </View>
        ) : (
          <ScrollView
            style={styles.linksList}
            contentContainerStyle={styles.linksContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
          >
            {links.map(renderLinkItem)}
          </ScrollView>
        )}

        {renderAnalyticsModal()}
        {renderQRModal()}
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  linksList: {
    flex: 1,
  },
  linksContent: {
    padding: 16,
  },
  linkItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  linkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  linkInfo: {
    flex: 1,
    marginRight: 12,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  linkMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  metaText: {
    fontSize: 12,
  },
  linkStats: {
    alignItems: 'flex-end',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    fontWeight: '500',
  },
  linkUrl: {
    marginBottom: 12,
  },
  urlText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  linkActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  expirationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  expirationText: {
    fontSize: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  analyticsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  platformItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  platformName: {
    fontSize: 14,
    fontWeight: '500',
  },
  platformCount: {
    fontSize: 14,
  },
  referrerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  referrerName: {
    flex: 1,
    fontSize: 14,
    marginRight: 12,
  },
  referrerCount: {
    fontSize: 14,
  },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    width: screenWidth * 0.9,
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  qrContainer: {
    padding: 24,
    alignItems: 'center',
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  qrText: {
    marginTop: 8,
    fontSize: 14,
  },
  qrUrl: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});