import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  View,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useShareAnalyticsStore } from '@/store/useShareAnalyticsStore';
import { SharePlatform, ShareEvent } from '@/types/shareTypes';
import {
  TrendingUp,
  Share2,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart3,
  PieChart,
  Calendar,
  Download,
} from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

interface ShareStatsDashboardProps {
  visible?: boolean;
  onClose?: () => void;
}

export function ShareStatsDashboard({ visible = true, onClose }: ShareStatsDashboardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { statistics, events, exportAnalytics, getRecentEvents, getEventsByDateRange } = useShareAnalyticsStore();
  
  const [selectedTimeRange, setSelectedTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [showDetails, setShowDetails] = useState(false);

  // Animation value for cards
  const cardScale = useSharedValue(1);

  useEffect(() => {
    // Animate cards on mount
    cardScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, []);

  const getFilteredEvents = (): ShareEvent[] => {
    const now = new Date();
    let startDate: Date;

    switch (selectedTimeRange) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    return getEventsByDateRange(startDate, now);
  };

  const filteredEvents = getFilteredEvents();
  const recentEvents = getRecentEvents(5);

  const getPlatformIcon = (platform: SharePlatform) => {
    switch (platform) {
      case 'instagram':
        return '📷';
      case 'facebook':
        return '📘';
      case 'twitter':
        return '🐦';
      case 'kakao':
        return '💬';
      default:
        return '📤';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return colors.success;
      case 'failed':
        return colors.error;
      case 'pending':
        return colors.primary;
      case 'cancelled':
        return colors.warning;
      default:
        return colors.text;
    }
  };

  const calculateSuccessRate = () => {
    if (filteredEvents.length === 0) return 0;
    const successCount = filteredEvents.filter(e => e.status === 'success').length;
    return Math.round((successCount / filteredEvents.length) * 100);
  };

  const getMostPopularPlatform = (): string => {
    const platformCounts = filteredEvents.reduce((acc, event) => {
      acc[event.platform] = (acc[event.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topPlatform = Object.entries(platformCounts)
      .sort(([, a], [, b]) => b - a)[0];

    return topPlatform ? topPlatform[0] : 'N/A';
  };

  const handleExport = async () => {
    try {
      const data = await exportAnalytics();
      // In a real app, you might save this to a file or share it
      console.log('Exported analytics:', data);
    } catch (error) {
      console.error('Failed to export analytics:', error);
    }
  };

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const renderStatsCard = (
    title: string,
    value: string | number,
    icon: React.ReactNode,
    trend?: string,
    trendUp?: boolean
  ) => (
    <Animated.View style={[styles.statsCard, { backgroundColor: colors.card }, animatedCardStyle]}>
      <View style={styles.statsCardHeader}>
        <View style={styles.statsCardIcon}>{icon}</View>
        <ThemedText style={styles.statsCardTitle}>{title}</ThemedText>
      </View>
      <ThemedText style={styles.statsCardValue}>{value}</ThemedText>
      {trend && (
        <View style={styles.trendContainer}>
          <TrendingUp 
            color={trendUp ? colors.success : colors.error} 
            size={12}
            style={{ transform: [{ rotate: trendUp ? '0deg' : '180deg' }] }}
          />
          <ThemedText style={[styles.trendText, { color: trendUp ? colors.success : colors.error }]}>
            {trend}
          </ThemedText>
        </View>
      )}
    </Animated.View>
  );

  const renderTimeRangeSelector = () => (
    <View style={styles.timeRangeSelector}>
      {(['day', 'week', 'month'] as const).map((range) => (
        <TouchableOpacity
          key={range}
          style={[
            styles.timeRangeButton,
            {
              backgroundColor: selectedTimeRange === range ? colors.primary : colors.surface,
              borderColor: colors.border,
            }
          ]}
          onPress={() => setSelectedTimeRange(range)}
        >
          <ThemedText
            style={[
              styles.timeRangeButtonText,
              { color: selectedTimeRange === range ? '#FFF' : colors.text }
            ]}
          >
            {range === 'day' ? '24H' : range === 'week' ? '7D' : '30D'}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderRecentActivity = () => (
    <ThemedView style={[styles.section, { backgroundColor: colors.card }]}>
      <ThemedText style={styles.sectionTitle}>최근 공유 활동</ThemedText>
      {recentEvents.length === 0 ? (
        <ThemedText style={[styles.emptyText, { color: colors.secondaryText }]}>
          최근 공유 활동이 없습니다
        </ThemedText>
      ) : (
        recentEvents.map((event) => (
          <View key={event.id} style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <ThemedText style={styles.platformEmoji}>
                {getPlatformIcon(event.platform)}
              </ThemedText>
            </View>
            <View style={styles.activityContent}>
              <ThemedText style={styles.activityText} numberOfLines={2}>
                {event.poemText.substring(0, 50)}...
              </ThemedText>
              <ThemedText style={[styles.activityTime, { color: colors.secondaryText }]}>
                {new Date(event.timestamp).toLocaleDateString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </ThemedText>
            </View>
            <View style={styles.activityStatus}>
              {event.status === 'success' && <CheckCircle color={colors.success} size={16} />}
              {event.status === 'failed' && <AlertCircle color={colors.error} size={16} />}
              {event.status === 'pending' && <Clock color={colors.primary} size={16} />}
            </View>
          </View>
        ))
      )}
    </ThemedView>
  );

  const renderPlatformBreakdown = () => (
    <ThemedView style={[styles.section, { backgroundColor: colors.card }]}>
      <ThemedText style={styles.sectionTitle}>플랫폼별 공유</ThemedText>
      {Object.entries(statistics.platformBreakdown).length === 0 ? (
        <ThemedText style={[styles.emptyText, { color: colors.secondaryText }]}>
          공유 데이터가 없습니다
        </ThemedText>
      ) : (
        Object.entries(statistics.platformBreakdown)
          .sort(([, a], [, b]) => b - a)
          .map(([platform, count]) => (
            <View key={platform} style={styles.platformItem}>
              <View style={styles.platformInfo}>
                <ThemedText style={styles.platformEmoji}>
                  {getPlatformIcon(platform as SharePlatform)}
                </ThemedText>
                <ThemedText style={styles.platformName}>
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </ThemedText>
              </View>
              <View style={styles.platformStats}>
                <ThemedText style={styles.platformCount}>{count}</ThemedText>
                <View
                  style={[
                    styles.platformBar,
                    {
                      backgroundColor: colors.primary,
                      width: `${(count / Math.max(...Object.values(statistics.platformBreakdown))) * 100}%`,
                    }
                  ]}
                />
              </View>
            </View>
          ))
      )}
    </ThemedView>
  );

  if (!visible) return null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>공유 통계</ThemedText>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: colors.primary }]}
            onPress={handleExport}
          >
            <Download color="#FFF" size={16} />
            <ThemedText style={styles.exportButtonText}>내보내기</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {renderTimeRangeSelector()}

      <View style={styles.statsGrid}>
        {renderStatsCard(
          '총 공유',
          filteredEvents.length,
          <Share2 color={colors.primary} size={20} />
        )}
        {renderStatsCard(
          '성공률',
          `${calculateSuccessRate()}%`,
          <CheckCircle color={colors.success} size={20} />
        )}
        {renderStatsCard(
          '인기 플랫폼',
          getMostPopularPlatform(),
          <TrendingUp color={colors.accent} size={20} />
        )}
        {renderStatsCard(
          '평균 재시도',
          `${statistics.averageRetryCount.toFixed(1)}회`,
          <BarChart3 color={colors.warning} size={20} />
        )}
      </View>

      {renderRecentActivity()}
      {renderPlatformBreakdown()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  exportButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  timeRangeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  timeRangeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statsCard: {
    flex: 1,
    minWidth: isTablet ? '22%' : '48%',
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsCardIcon: {
    marginRight: 8,
  },
  statsCardTitle: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.7,
  },
  statsCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  platformEmoji: {
    fontSize: 18,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
  },
  activityStatus: {
    marginLeft: 8,
  },
  platformItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  platformInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  platformName: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  platformStats: {
    alignItems: 'flex-end',
    flex: 1,
  },
  platformCount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  platformBar: {
    height: 4,
    borderRadius: 2,
    minWidth: 20,
  },
});