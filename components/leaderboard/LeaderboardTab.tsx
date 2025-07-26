import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { leaderboardService, LeaderboardEntry } from '../../services/leaderboardService';
import { LeaderboardCard } from './LeaderboardCard';
import { UserRankCard } from './UserRankCard';

const { width } = Dimensions.get('window');

interface LeaderboardTabProps {
  type: 'global' | 'weekly' | 'monthly' | 'regional' | 'level';
  userId?: string;
  regionCode?: string;
  levelGroup?: string;
  onUserPress?: (userId: string) => void;
}

export const LeaderboardTab: React.FC<LeaderboardTabProps> = ({
  type,
  userId,
  regionCode,
  levelGroup,
  onUserPress
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRanking, setUserRanking] = useState<any>(null);
  const [nearbyRankings, setNearbyRankings] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const pageSize = 20;

  const loadLeaderboard = useCallback(async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(0);
        setHasMore(true);
      }

      const currentPage = reset ? 0 : page;
      const offset = currentPage * pageSize;

      let newEntries: LeaderboardEntry[] = [];

      switch (type) {
        case 'global':
          newEntries = await leaderboardService.getGlobalLeaderboard(pageSize, offset);
          break;
        case 'weekly':
          newEntries = await leaderboardService.getWeeklyLeaderboard(pageSize, offset);
          break;
        case 'monthly':
          newEntries = await leaderboardService.getMonthlyLeaderboard(pageSize, offset);
          break;
        case 'regional':
          if (regionCode) {
            newEntries = await leaderboardService.getRegionalLeaderboard(regionCode, pageSize);
          }
          break;
        case 'level':
          if (levelGroup) {
            newEntries = await leaderboardService.getLevelLeaderboard(levelGroup, pageSize);
          }
          break;
      }

      if (reset) {
        setEntries(newEntries);
      } else {
        setEntries(prev => [...prev, ...newEntries]);
      }

      setHasMore(newEntries.length === pageSize);
      setPage(currentPage + 1);

      // 사용자 랭킹 정보 로드
      if (userId && reset) {
        const rankingInfo = await leaderboardService.getUserRankingInfo(userId);
        setUserRanking(rankingInfo);

        // 내 주변 랭킹 로드
        if (type !== 'regional' && type !== 'level') {
          const nearby = await leaderboardService.getNearbyRankings(userId, type === 'global' ? 'global' : type, 3);
          setNearbyRankings(nearby);
        }
      }
    } catch (error) {
      console.error('리더보드 로드 실패:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [type, userId, regionCode, levelGroup, page, pageSize]);

  useEffect(() => {
    loadLeaderboard(true);
  }, [type, regionCode, levelGroup]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadLeaderboard(true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && entries.length > 0) {
      setLoadingMore(true);
      loadLeaderboard();
    }
  };

  const handleUserPress = (entry: LeaderboardEntry) => {
    if (onUserPress) {
      onUserPress(entry.id);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'global':
        return '전체 랭킹';
      case 'weekly':
        return '주간 랭킹';
      case 'monthly':
        return '월간 랭킹';
      case 'regional':
        return '지역 랭킹';
      case 'level':
        return '레벨별 랭킹';
      default:
        return '랭킹';
    }
  };

  const getSubtitle = () => {
    switch (type) {
      case 'global':
        return '전체 사용자 종합 랭킹';
      case 'weekly':
        return '이번 주 활동 점수';
      case 'monthly':
        return '이번 달 활동 점수';
      case 'regional':
        return `${regionCode} 지역 랭킹`;
      case 'level':
        return `레벨 ${levelGroup} 그룹`;
      default:
        return '';
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{getTitle()}</Text>
          <Text style={styles.headerSubtitle}>{getSubtitle()}</Text>
        </View>
        
        {type === 'global' && (
          <View style={styles.headerStats}>
            <View style={styles.statItem}>
              <Ionicons name="trophy" size={16} color="#FFD700" />
              <Text style={styles.statText}>최고의 시인들</Text>
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  );

  const renderUserRankCard = () => {
    if (!userId || !userRanking) return null;

    let rank: number | undefined;
    let points: number;

    switch (type) {
      case 'global':
        rank = userRanking.global_rank;
        points = userRanking.total_points;
        break;
      case 'weekly':
        rank = userRanking.weekly_rank;
        points = userRanking.weekly_points;
        break;
      case 'monthly':
        rank = userRanking.monthly_rank;
        points = userRanking.monthly_points;
        break;
      case 'regional':
        rank = userRanking.regional_rank;
        points = userRanking.total_points;
        break;
      case 'level':
        rank = userRanking.level_rank;
        points = userRanking.total_points;
        break;
      default:
        rank = undefined;
        points = 0;
    }

    return (
      <UserRankCard
        rank={rank}
        points={points}
        level={userRanking.current_level}
        levelName={userRanking.level_name}
        type={type}
        percentile={type === 'global' ? userRanking.global_percentile : undefined}
        style={styles.userRankCard}
      />
    );
  };

  const renderNearbyRankings = () => {
    if (nearbyRankings.length === 0 || type === 'regional' || type === 'level') return null;

    return (
      <View style={styles.nearbySection}>
        <Text style={styles.nearbySectionTitle}>내 주변 랭킹</Text>
        {nearbyRankings.map((entry, index) => (
          <LeaderboardCard
            key={entry.id}
            entry={entry}
            isCurrentUser={entry.id === userId}
            onPress={() => handleUserPress(entry)}
            style={[
              styles.nearbyCard,
              entry.id === userId && styles.currentUserCard
            ]}
          />
        ))}
      </View>
    );
  };

  const renderListHeader = () => (
    <View>
      {renderHeader()}
      {renderUserRankCard()}
      {renderNearbyRankings()}
      <View style={styles.listTitleContainer}>
        <Text style={styles.listTitle}>전체 랭킹</Text>
        <TouchableOpacity 
          onPress={() => loadLeaderboard(true)}
          style={styles.refreshButton}
        >
          <Ionicons name="refresh" size={16} color="#667eea" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderLeaderboardEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => (
    <LeaderboardCard
      entry={item}
      isCurrentUser={item.id === userId}
      onPress={() => handleUserPress(item)}
      style={[
        styles.entryCard,
        item.id === userId && styles.currentUserCard
      ]}
    />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#667eea" />
        <Text style={styles.footerText}>더 불러오는 중...</Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="trophy-outline" size={64} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>아직 랭킹이 없습니다</Text>
      <Text style={styles.emptySubtitle}>
        첫 번째 시를 작성하고 랭킹에 올라보세요!
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>랭킹을 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={entries}
        renderItem={renderLeaderboardEntry}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#667eea']}
            tintColor="#667eea"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContainer,
          entries.length === 0 && styles.emptyListContainer
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 16,
  },
  headerGradient: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  headerContent: {
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerStats: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: {
    marginLeft: 8,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  userRankCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  nearbySection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  nearbySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  nearbyCard: {
    marginBottom: 8,
  },
  currentUserCard: {
    borderColor: '#667eea',
    borderWidth: 2,
    backgroundColor: 'rgba(102, 126, 234, 0.05)',
  },
  listTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  refreshButton: {
    padding: 8,
  },
  entryCard: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  footerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});