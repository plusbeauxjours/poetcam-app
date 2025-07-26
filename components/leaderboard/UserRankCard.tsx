import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface UserRankCardProps {
  rank?: number;
  points: number;
  level: number;
  levelName: string;
  type: 'global' | 'weekly' | 'monthly' | 'regional' | 'level';
  percentile?: number;
  style?: any;
}

export const UserRankCard: React.FC<UserRankCardProps> = ({
  rank,
  points,
  level,
  levelName,
  type,
  percentile,
  style
}) => {
  const shimmerAnim = useRef(new Animated.Value(-width)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // 카드 등장 애니메이션
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // 심머 효과 (높은 랭킹일 때)
    if (rank && rank <= 100) {
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: width,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [rank]);

  const getTypeTitle = () => {
    switch (type) {
      case 'global': return '전체 랭킹';
      case 'weekly': return '주간 랭킹';
      case 'monthly': return '월간 랭킹';
      case 'regional': return '지역 랭킹';
      case 'level': return '레벨별 랭킹';
      default: return '랭킹';
    }
  };

  const getGradientColors = () => {
    if (!rank) return ['#6B7280', '#9CA3AF'];
    
    if (rank === 1) return ['#FFD700', '#FFA500'];
    if (rank <= 3) return ['#667eea', '#764ba2'];
    if (rank <= 10) return ['#10B981', '#059669'];
    if (rank <= 100) return ['#8B5CF6', '#7C3AED'];
    return ['#6B7280', '#9CA3AF'];
  };

  const getLevelColor = () => {
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

  const formatPoints = (points: number) => {
    if (points >= 1000000) {
      return `${(points / 1000000).toFixed(1)}M`;
    } else if (points >= 1000) {
      return `${(points / 1000).toFixed(1)}K`;
    }
    return points.toLocaleString();
  };

  const getRankDisplay = () => {
    if (!rank) {
      return {
        text: '순위 없음',
        subtext: '활동하여 랭킹에 진입하세요',
        icon: 'help-circle-outline' as const
      };
    }

    if (rank === 1) {
      return {
        text: '1위',
        subtext: '최고의 시인!',
        icon: 'trophy' as const
      };
    }

    if (rank <= 3) {
      return {
        text: `${rank}위`,
        subtext: '상위 랭커!',
        icon: 'medal' as const
      };
    }

    if (rank <= 10) {
      return {
        text: `${rank}위`,
        subtext: '톱 10 진입!',
        icon: 'star' as const
      };
    }

    if (rank <= 100) {
      return {
        text: `${rank}위`,
        subtext: '상위 100명!',
        icon: 'ribbon' as const
      };
    }

    return {
      text: `${rank}위`,
      subtext: percentile ? `상위 ${percentile.toFixed(1)}%` : '꾸준히 활동해보세요',
      icon: 'chevron-up' as const
    };
  };

  const rankDisplay = getRankDisplay();
  const gradientColors = getGradientColors();

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* 심머 효과 */}
        {rank && rank <= 100 && (
          <Animated.View
            style={[
              styles.shimmerOverlay,
              {
                transform: [{ translateX: shimmerAnim }]
              }
            ]}
          />
        )}

        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.typeTitle}>{getTypeTitle()}</Text>
          <Text style={styles.subtitle}>내 순위</Text>
        </View>

        {/* 메인 콘텐츠 */}
        <View style={styles.content}>
          {/* 랭킹 정보 */}
          <View style={styles.rankSection}>
            <View style={styles.rankIconContainer}>
              <Ionicons
                name={rankDisplay.icon}
                size={32}
                color="#FFFFFF"
              />
            </View>
            
            <View style={styles.rankInfo}>
              <Text style={styles.rankText}>{rankDisplay.text}</Text>
              <Text style={styles.rankSubtext}>{rankDisplay.subtext}</Text>
            </View>
          </View>

          {/* 구분선 */}
          <View style={styles.divider} />

          {/* 통계 정보 */}
          <View style={styles.statsSection}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatPoints(points)}</Text>
              <Text style={styles.statLabel}>포인트</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={styles.levelContainer}>
                <View style={[
                  styles.levelIndicator,
                  { backgroundColor: getLevelColor() }
                ]} />
                <Text style={styles.statValue}>Lv.{level}</Text>
              </View>
              <Text style={styles.statLabel}>{levelName}</Text>
            </View>

            {percentile && type === 'global' && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{percentile.toFixed(1)}%</Text>
                  <Text style={styles.statLabel}>상위 백분율</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* 장식적 요소들 */}
        <View style={styles.decorativeElements}>
          <View style={[styles.decorativeCircle, styles.circle1]} />
          <View style={[styles.decorativeCircle, styles.circle2]} />
          <View style={[styles.decorativeCircle, styles.circle3]} />
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 140,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transform: [{ skewX: '-20deg' }],
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
  },
  rankSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rankIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  rankInfo: {
    flex: 1,
  },
  rankText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  rankSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 16,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  levelIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 80,
    height: 80,
    top: -40,
    right: -40,
  },
  circle2: {
    width: 40,
    height: 40,
    bottom: -20,
    left: -20,
  },
  circle3: {
    width: 20,
    height: 20,
    top: 20,
    left: 20,
  },
});