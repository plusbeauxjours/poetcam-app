import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Badge, BadgeRarity, UserBadge } from '../../types/badge';
import {
  BADGE_RARITY_COLORS,
  BADGE_CATEGORY_THEMES,
  BADGE_SIZES,
  BADGE_ANIMATIONS,
  BADGE_STATE_STYLES,
  BADGE_TYPOGRAPHY,
  BADGE_SHADOWS
} from '../../constants/badgeDesign';

interface BadgeComponentProps {
  badge: Badge;
  userBadge?: UserBadge | null;
  size?: keyof typeof BADGE_SIZES;
  showTitle?: boolean;
  showDescription?: boolean;
  showProgress?: boolean;
  progress?: number; // 0-100
  isAnimated?: boolean;
  onPress?: (badge: Badge) => void;
  style?: any;
}

export const BadgeComponent: React.FC<BadgeComponentProps> = ({
  badge,
  userBadge,
  size = 'medium',
  showTitle = true,
  showDescription = false,
  showProgress = false,
  progress = 0,
  isAnimated = true,
  onPress,
  style
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const shimmerAnim = useRef(new Animated.Value(-100)).current;

  const sizeConfig = BADGE_SIZES[size];
  const rarityColors = BADGE_RARITY_COLORS[badge.rarity];
  const categoryTheme = BADGE_CATEGORY_THEMES[badge.category];
  const shadowConfig = BADGE_SHADOWS[badge.rarity];

  // 뱃지 상태 결정
  const isEarned = !!userBadge;
  const isInProgress = !isEarned && progress > 0;
  const isAlmostEarned = !isEarned && progress >= 80;
  const isLocked = !isEarned && progress === 0;

  const badgeState = isEarned 
    ? BADGE_STATE_STYLES.earned
    : isAlmostEarned 
    ? BADGE_STATE_STYLES.almostEarned
    : isInProgress 
    ? BADGE_STATE_STYLES.inProgress
    : BADGE_STATE_STYLES.locked;

  // 애니메이션 효과
  useEffect(() => {
    if (isAnimated && isEarned) {
      // 획득 애니메이션
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }

    if (badgeState.showGlow) {
      // 글로우 애니메이션
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.8,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    if (badge.rarity === BadgeRarity.LEGENDARY && isEarned) {
      // 전설 등급 심머 효과
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: sizeConfig.width + 100,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isEarned, isAnimated, badge.rarity]);

  const handlePress = () => {
    if (onPress) {
      // 터치 애니메이션
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      
      onPress(badge);
    }
  };

  const getBadgeIcon = () => {
    if (badge.iconName.startsWith('http')) {
      // 이미지 URL인 경우 (실제 구현 시 Image 컴포넌트 사용)
      return (
        <Text style={[styles.iconEmoji, { fontSize: sizeConfig.iconSize }]}>
          {categoryTheme.icon}
        </Text>
      );
    } else if (badge.iconName.length === 1 || badge.iconName.includes('emoji:')) {
      // 이모지인 경우
      const emoji = badge.iconName.replace('emoji:', '');
      return (
        <Text style={[styles.iconEmoji, { fontSize: sizeConfig.iconSize }]}>
          {emoji || categoryTheme.icon}
        </Text>
      );
    } else {
      // Ionicons 아이콘인 경우
      return (
        <Ionicons
          name={badge.iconName as any}
          size={sizeConfig.iconSize}
          color={badgeState.opacity < 1 ? '#9CA3AF' : badge.iconColor}
        />
      );
    }
  };

  const renderProgressBar = () => {
    if (!showProgress || progress === 0) return null;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { 
                width: `${Math.min(progress, 100)}%`,
                backgroundColor: progress >= 80 ? '#F59E0B' : '#10B981'
              }
            ]} 
          />
        </View>
        <Text style={[BADGE_TYPOGRAPHY.progress, styles.progressText]}>
          {Math.round(progress)}%
        </Text>
      </View>
    );
  };

  const renderBadgeContent = () => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={[style]}
    >
      <Animated.View
        style={[
          styles.container,
          {
            width: sizeConfig.width,
            height: sizeConfig.height,
            transform: [{ scale: scaleAnim }],
            opacity: badgeState.opacity
          }
        ]}
      >
        {/* 백그라운드 그라데이션 */}
        <LinearGradient
          colors={rarityColors.gradient}
          style={[
            styles.badgeBackground,
            {
              borderWidth: sizeConfig.borderWidth,
              borderColor: rarityColors.border,
            },
            shadowConfig
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* 글로우 효과 */}
          {badgeState.showGlow && (
            <Animated.View
              style={[
                styles.glowOverlay,
                {
                  backgroundColor: rarityColors.glow,
                  opacity: glowAnim
                }
              ]}
            />
          )}

          {/* 심머 효과 (전설 등급) */}
          {badge.rarity === BadgeRarity.LEGENDARY && isEarned && (
            <Animated.View
              style={[
                styles.shimmerOverlay,
                {
                  transform: [{ translateX: shimmerAnim }]
                }
              ]}
            />
          )}

          {/* 아이콘 */}
          <View style={styles.iconContainer}>
            {getBadgeIcon()}
          </View>

          {/* 잠금 오버레이 */}
          {isLocked && !badge.isSecret && (
            <View style={styles.lockOverlay}>
              <Ionicons
                name="lock-closed"
                size={sizeConfig.iconSize * 0.6}
                color="#FFFFFF"
              />
            </View>
          )}

          {/* 시크릿 뱃지 오버레이 */}
          {badge.isSecret && !isEarned && (
            <View style={styles.secretOverlay}>
              <Text style={[styles.secretText, { fontSize: sizeConfig.fontSize }]}>
                ???
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* 등급 표시 */}
        <View style={[styles.rarityBadge, { backgroundColor: rarityColors.primary }]}>
          <Text style={[
            BADGE_TYPOGRAPHY.rarity,
            { 
              color: '#FFFFFF',
              fontSize: sizeConfig.fontSize 
            }
          ]}>
            {badge.rarity.charAt(0).toUpperCase()}
          </Text>
        </View>
      </Animated.View>

      {/* 제목 */}
      {showTitle && (
        <Text
          style={[
            BADGE_TYPOGRAPHY.title,
            styles.title,
            {
              maxWidth: sizeConfig.width * 1.5,
              opacity: badgeState.opacity
            }
          ]}
          numberOfLines={2}
        >
          {badge.isSecret && !isEarned ? '???' : badge.name}
        </Text>
      )}

      {/* 설명 */}
      {showDescription && !badge.isSecret && (
        <Text
          style={[
            BADGE_TYPOGRAPHY.description,
            styles.description,
            {
              maxWidth: sizeConfig.width * 2,
              opacity: badgeState.opacity * 0.8
            }
          ]}
          numberOfLines={3}
        >
          {badge.description}
        </Text>
      )}

      {/* 진행도 바 */}
      {renderProgressBar()}

      {/* 힌트 텍스트 */}
      {badge.isSecret && !isEarned && badge.unlockHint && (
        <Text style={[BADGE_TYPOGRAPHY.hint, styles.hint]}>
          {badge.unlockHint}
        </Text>
      )}
    </TouchableOpacity>
  );

  return renderBadgeContent();
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeBackground: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    textAlign: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  secretOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  secretText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  rarityBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  title: {
    marginTop: 8,
    textAlign: 'center',
  },
  description: {
    marginTop: 4,
    textAlign: 'center',
  },
  progressContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    marginTop: 4,
  },
  hint: {
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 120,
  },
});