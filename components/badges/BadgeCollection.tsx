import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView
} from 'react-native';
import { Badge, UserBadge, BadgeProgress, BadgeCategory, BadgeRarity, BadgeDisplayOptions } from '../../types/badge';
import { BadgeService } from '../../services/badgeService';
import BadgeCard from './BadgeCard';
import BadgeIcon from './BadgeIcon';
import {
  BADGE_TYPOGRAPHY,
  COLLECTION_VIEW_CONFIGS,
  BADGE_CATEGORY_THEMES
} from '../../constants/badgeDesign';

interface BadgeCollectionProps {
  userId: string;
  displayOptions?: BadgeDisplayOptions;
  viewType?: 'grid' | 'detailed' | 'compact';
  onBadgePress?: (badge: Badge, userBadge?: UserBadge) => void;
}

interface BadgeWithUserData {
  badge: Badge;
  userBadge?: UserBadge;
  progress?: BadgeProgress[];
  state: 'earned' | 'locked' | 'inProgress' | 'almostEarned';
}

const BadgeCollection: React.FC<BadgeCollectionProps> = ({
  userId,
  displayOptions = {
    showLocked: true,
    sortBy: 'rarity',
    groupBy: 'category'
  },
  viewType = 'detailed',
  onBadgePress
}) => {
  const [badges, setBadges] = useState<BadgeWithUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const viewConfig = COLLECTION_VIEW_CONFIGS[viewType];

  useEffect(() => {
    loadBadges();
  }, [userId, displayOptions]);

  const loadBadges = async () => {
    try {
      setLoading(true);
      
      // 모든 뱃지와 사용자 뱃지, 진행도 정보를 병렬로 가져오기
      const [allBadges, userBadges] = await Promise.all([
        BadgeService.getAllBadges({
          category: displayOptions.filterBy?.category,
          rarity: displayOptions.filterBy?.rarity,
          secret: false // 기본적으로 숨겨진 뱃지는 제외
        }),
        BadgeService.getUserBadges(userId)
      ]);

      // 사용자 뱃지 데이터를 Map으로 변환
      const userBadgeMap = new Map(userBadges.map(ub => [ub.badgeId, ub]));

      // 뱃지 데이터와 사용자 데이터 결합
      const badgesWithUserData: BadgeWithUserData[] = await Promise.all(
        allBadges.map(async (badge) => {
          const userBadge = userBadgeMap.get(badge.id);
          let progress: BadgeProgress[] = [];
          let state: 'earned' | 'locked' | 'inProgress' | 'almostEarned' = 'locked';

          if (userBadge) {
            state = 'earned';
          } else {
            // 진행도 확인
            progress = await BadgeService.getBadgeProgress(userId, badge.id);
            
            if (progress.length > 0) {
              const completedConditions = progress.filter(p => p.completed).length;
              const totalConditions = progress.length;
              const progressPercentage = (completedConditions / totalConditions) * 100;

              if (progressPercentage >= 80) {
                state = 'almostEarned';
              } else if (progressPercentage > 0) {
                state = 'inProgress';
              }
            }
          }

          return {
            badge,
            userBadge,
            progress,
            state
          };
        })
      );

      // 필터링
      let filteredBadges = badgesWithUserData;
      
      if (!displayOptions.showLocked) {
        filteredBadges = filteredBadges.filter(item => item.state === 'earned');
      }

      if (displayOptions.filterBy?.earned !== undefined) {
        filteredBadges = filteredBadges.filter(item => 
          (item.state === 'earned') === displayOptions.filterBy!.earned
        );
      }

      if (selectedCategory) {
        filteredBadges = filteredBadges.filter(item => 
          item.badge.category === selectedCategory
        );
      }

      // 정렬
      filteredBadges.sort((a, b) => {
        switch (displayOptions.sortBy) {
          case 'rarity':
            const rarityOrder = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
            return rarityOrder[b.badge.rarity] - rarityOrder[a.badge.rarity];
          
          case 'category':
            return a.badge.category.localeCompare(b.badge.category);
          
          case 'earnedDate':
            if (a.userBadge && b.userBadge) {
              return new Date(b.userBadge.earnedAt).getTime() - new Date(a.userBadge.earnedAt).getTime();
            }
            return a.state === 'earned' ? -1 : 1;
          
          case 'name':
            return a.badge.name.localeCompare(b.badge.name);
          
          default:
            return 0;
        }
      });

      setBadges(filteredBadges);
    } catch (error) {
      console.error('Error loading badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBadgePress = (badgeData: BadgeWithUserData) => {
    if (onBadgePress) {
      onBadgePress(badgeData.badge, badgeData.userBadge);
    }
  };

  const renderCategoryFilter = () => {
    const categories = Object.values(BadgeCategory);
    
    return (
      <View style={styles.categoryFilter}>
        <TouchableOpacity
          style={[
            styles.categoryButton,
            selectedCategory === null && styles.categoryButtonActive
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[
            styles.categoryButtonText,
            selectedCategory === null && styles.categoryButtonTextActive
          ]}>
            전체
          </Text>
        </TouchableOpacity>
        
        {categories.map((category) => {
          const theme = BADGE_CATEGORY_THEMES[category];
          const isActive = selectedCategory === category;
          
          return (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                isActive && { backgroundColor: theme.accentColor }
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={styles.categoryIcon}>{theme.icon}</Text>
              <Text style={[
                styles.categoryButtonText,
                isActive && styles.categoryButtonTextActive
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderBadgeItem = ({ item }: { item: BadgeWithUserData }) => {
    if (viewType === 'grid' || viewType === 'compact') {
      return (
        <TouchableOpacity
          style={styles.gridItem}
          onPress={() => handleBadgePress(item)}
        >
          <BadgeIcon
            badge={item.badge}
            size={viewType === 'compact' ? 'small' : 'medium'}
            state={item.state}
            progress={item.progress ? 
              Math.round((item.progress.filter(p => p.completed).length / item.progress.length) * 100) : 
              0
            }
            showProgress={viewConfig.showProgress && item.state === 'inProgress'}
          />
          {viewConfig.showTitle && (
            <Text style={styles.gridItemTitle} numberOfLines={2}>
              {item.badge.name}
            </Text>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <BadgeCard
        badge={item.badge}
        userBadge={item.userBadge}
        progress={item.progress}
        state={item.state}
        showDescription={viewConfig.showDescription}
        showProgress={viewConfig.showProgress}
        onPress={() => handleBadgePress(item)}
      />
    );
  };

  const renderStats = () => {
    const stats = {
      total: badges.length,
      earned: badges.filter(b => b.state === 'earned').length,
      inProgress: badges.filter(b => b.state === 'inProgress' || b.state === 'almostEarned').length
    };

    const completion = stats.total > 0 ? Math.round((stats.earned / stats.total) * 100) : 0;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.earned}</Text>
          <Text style={styles.statLabel}>획득</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.inProgress}</Text>
          <Text style={styles.statLabel}>진행중</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{completion}%</Text>
          <Text style={styles.statLabel}>완료율</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>뱃지를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderStats()}
      {renderCategoryFilter()}
      
      <FlatList
        data={badges}
        renderItem={renderBadgeItem}
        keyExtractor={(item) => item.badge.id}
        numColumns={viewConfig.numColumns}
        columnWrapperStyle={viewConfig.numColumns > 1 ? styles.row : undefined}
        contentContainerStyle={[
          styles.listContainer,
          { padding: viewConfig.spacing }
        ]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  statItem: {
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827'
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4
  },
  categoryFilter: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#F3F4F6'
  },
  categoryButtonActive: {
    backgroundColor: '#3B82F6'
  },
  categoryIcon: {
    fontSize: 14,
    marginRight: 4
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500'
  },
  categoryButtonTextActive: {
    color: '#FFFFFF'
  },
  listContainer: {
    paddingBottom: 20
  },
  row: {
    justifyContent: 'space-around'
  },
  gridItem: {
    alignItems: 'center',
    marginBottom: 16,
    width: '30%'
  },
  gridItemTitle: {
    ...BADGE_TYPOGRAPHY.hint,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 80
  }
});

export default BadgeCollection;