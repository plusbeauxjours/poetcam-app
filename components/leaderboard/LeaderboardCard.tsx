import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { LeaderboardEntry } from '../../services/leaderboardService';

interface LeaderboardCardProps {
  entry: LeaderboardEntry;
  isCurrentUser?: boolean;
  onPress?: (entry: LeaderboardEntry) => void;
  style?: any;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  entry,
  isCurrentUser = false,
  onPress,
  style
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  // 순위별 색상 및 스타일
  const getRankStyle = (rank: number) => {
    if (rank === 1) {
      return {
        colors: ['#FFD700', '#FFA500'],
        iconName: 'trophy' as const,
        iconColor: '#FFFFFF',
        textColor: '#FFFFFF',
        showGlow: true
      };
    } else if (rank === 2) {
      return {
        colors: ['#C0C0C0', '#A8A8A8'],
        iconName: 'medal' as const,
        iconColor: '#FFFFFF',
        textColor: '#FFFFFF',
        showGlow: false
      };
    } else if (rank === 3) {
      return {
        colors: ['#CD7F32', '#B8860B'],
        iconName: 'medal' as const,
        iconColor: '#FFFFFF',
        textColor: '#FFFFFF',
        showGlow: false
      };
    } else if (rank <= 10) {
      return {
        colors: ['#667eea', '#764ba2'],
        iconName: 'star' as const,
        iconColor: '#FFFFFF',
        textColor: '#FFFFFF',
        showGlow: false
      };
    } else {
      return {
        colors: ['#FFFFFF', '#F9FAFB'],
        iconName: 'person' as const,
        iconColor: '#6B7280',
        textColor: '#374151',
        showGlow: false
      };
    }
  };

  const rankStyle = getRankStyle(entry.rank);

  // 레벨별 색상
  const getLevelColor = (levelName: string) => {
    switch (levelName) {
      case 'beginner': return '#10B981';
      case 'novice': return '#3B82F6';
      case 'intermediate': return '#8B5CF6';
      case 'advanced': return '#F59E0B';
      case 'expert': return '#EF4444';
      case 'master': return '#EC4899';
      case 'legend': return '#F97316';
      default: return '#6B7280';
    }
  };

  // 글로우 애니메이션 (1등만)
  useEffect(() => {
    if (rankStyle.showGlow) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.8,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [rankStyle.showGlow]);

  const handlePress = () => {
    if (onPress) {
      // 터치 애니메이션
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.98,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      
      onPress(entry);
    }
  };

  const formatPoints = (points: number) => {
    if (points >= 1000000) {
      return `${(points / 1000000).toFixed(1)}M`;
    } else if (points >= 1000) {
      return `${(points / 1000).toFixed(1)}K`;
    }
    return points.toLocaleString();
  };

  const renderAvatar = () => {
    if (entry.avatar_url) {
      return (
        <Image
          source={{ uri: entry.avatar_url }}
          style={styles.avatar}
        />
      );
    }

    return (
      <View style={[styles.avatarPlaceholder, { backgroundColor: getLevelColor(entry.level_name) }]}>
        <Text style={styles.avatarText}>
          {entry.name.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  };

  const renderRankBadge = () => (
    <View style={styles.rankContainer}>
      <LinearGradient
        colors={rankStyle.colors}
        style={[
          styles.rankBadge,
          entry.rank <= 3 && styles.topRankBadge
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* 글로우 효과 (1등) */}
        {rankStyle.showGlow && (
          <Animated.View
            style={[
              styles.glowOverlay,
              {
                opacity: glowAnim
              }
            ]}
          />
        )}
        
        {entry.rank <= 3 ? (
          <Ionicons
            name={rankStyle.iconName}
            size={entry.rank === 1 ? 18 : 16}
            color={rankStyle.iconColor}
          />
        ) : (
          <Text style={[styles.rankText, { color: rankStyle.textColor }]}>
            {entry.rank}
          </Text>
        )}
      </LinearGradient>

      {/* 1등 크라운 효과 */}
      {entry.rank === 1 && (
        <View style={styles.crownContainer}>
          <Ionicons name="diamond" size={12} color="#FFD700" />
        </View>
      )}
    </View>
  );

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        style={[
          styles.container,
          isCurrentUser && styles.currentUserContainer,
          entry.rank <= 3 && styles.topRankContainer
        ]}
      >
        <LinearGradient
          colors={entry.rank <= 3 ? ['rgba(255, 215, 0, 0.1)', 'rgba(255, 255, 255, 0.05)'] : ['#FFFFFF', '#FFFFFF']}
          style={styles.cardGradient}
        >
          {/* 랭킹 뱃지 */}
          {renderRankBadge()}

          {/* 사용자 정보 */}
          <View style={styles.userInfo}>
            {renderAvatar()}
            
            <View style={styles.userDetails}>
              <Text style={[
                styles.userName,
                isCurrentUser && styles.currentUserName
              ]}>
                {entry.name}
                {isCurrentUser && (
                  <Text style={styles.youBadge}> (나)</Text>
                )}
              </Text>
              
              <View style={styles.levelContainer}>
                <View style={[
                  styles.levelBadge,
                  { backgroundColor: getLevelColor(entry.level_name) }
                ]}>
                  <Text style={styles.levelText}>
                    Lv.{entry.current_level}
                  </Text>
                </View>
                <Text style={styles.levelName}>
                  {entry.level_name}
                </Text>
              </View>
            </View>
          </View>

          {/* 점수 및 통계 */}
          <View style={styles.statsContainer}>
            <View style={styles.pointsContainer}>
              <Text style={[
                styles.points,
                entry.rank <= 3 && styles.topRankPoints
              ]}>
                {formatPoints(entry.points)}
              </Text>
              <Text style={styles.pointsLabel}>점</Text>
            </View>

            {/* 추가 정보 */}
            <View style={styles.additionalInfo}>
              {entry.current_streak && entry.current_streak > 0 && (
                <View style={styles.streakContainer}>
                  <Ionicons name="flame" size={12} color="#F59E0B" />
                  <Text style={styles.streakText}>{entry.current_streak}일</Text>
                </View>
              )}

              {entry.global_percentile && (
                <Text style={styles.percentile}>
                  상위 {entry.global_percentile.toFixed(1)}%
                </Text>
              )}
            </View>
          </View>

          {/* 현재 사용자 표시 */}
          {isCurrentUser && (
            <View style={styles.currentUserIndicator}>
              <Ionicons name="person" size={16} color="#667eea" />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentUserContainer: {
    shadowColor: '#667eea',
    shadowOpacity: 0.3,
    elevation: 6,
  },
  topRankContainer: {
    shadowColor: '#FFD700',
    shadowOpacity: 0.3,
    elevation: 8,
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    minHeight: 80,
  },
  rankContainer: {
    position: 'relative',
    marginRight: 16,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  topRankBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  glowOverlay: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 215, 0, 0.5)',
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  crownContainer: {
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  currentUserName: {
    color: '#667eea',
  },
  youBadge: {
    fontSize: 12,
    fontWeight: '500',
    color: '#667eea',
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  levelName: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  points: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  topRankPoints: {
    color: '#F59E0B',
  },
  pointsLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 2,
  },
  additionalInfo: {
    alignItems: 'flex-end',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  streakText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '500',
    marginLeft: 2,
  },
  percentile: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  currentUserIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 12,
    padding: 4,
  },
});