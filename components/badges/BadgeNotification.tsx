import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { BadgeEarnedEvent } from '../../types/badge';
import {
  BADGE_RARITY_COLORS,
  BADGE_CATEGORY_THEMES,
  BADGE_TYPOGRAPHY,
  BADGE_ANIMATIONS
} from '../../constants/badgeDesign';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface BadgeNotificationProps {
  badgeEvent: BadgeEarnedEvent;
  isVisible: boolean;
  onDismiss: () => void;
  onPress?: () => void;
}

export const BadgeNotification: React.FC<BadgeNotificationProps> = ({
  badgeEvent,
  isVisible,
  onDismiss,
  onPress
}) => {
  const translateY = useRef(new Animated.Value(-200)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0.5)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  const { badge } = badgeEvent;
  const rarityColors = BADGE_RARITY_COLORS[badge.rarity];
  const categoryTheme = BADGE_CATEGORY_THEMES[badge.category];

  useEffect(() => {
    if (isVisible) {
      showNotification();
    } else {
      hideNotification();
    }
  }, [isVisible]);

  const showNotification = () => {
    // 알림 등장 애니메이션
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 50,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // 뱃지 애니메이션 (지연 실행)
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(badgeScale, {
          toValue: 1.2,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 스케일 정상화
        Animated.spring(badgeScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();
      });

      // 글로우 애니메이션
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0.8,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 200);

    // 자동 닫기 (5초 후)
    setTimeout(() => {
      if (isVisible) {
        onDismiss();
      }
    }, 5000);
  };

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -200,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleNotificationPress = () => {
    if (onPress) {
      onPress();
    }
    onDismiss();
  };

  const getBadgeIcon = () => {
    if (badge.iconName.startsWith('http')) {
      return (
        <Text style={styles.badgeEmoji}>
          {categoryTheme.icon}
        </Text>
      );
    } else if (badge.iconName.length === 1 || badge.iconName.includes('emoji:')) {
      const emoji = badge.iconName.replace('emoji:', '');
      return (
        <Text style={styles.badgeEmoji}>
          {emoji || categoryTheme.icon}
        </Text>
      );
    } else {
      return (
        <Ionicons
          name={badge.iconName as any}
          size={40}
          color={badge.iconColor}
        />
      );
    }
  };

  const getRarityText = () => {
    const rarityNames = {
      common: '일반',
      uncommon: '고급',
      rare: '희귀',
      epic: '영웅',
      legendary: '전설'
    };
    return rarityNames[badge.rarity] || badge.rarity;
  };

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              { translateY },
              { scale }
            ],
            opacity
          }
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleNotificationPress}
          style={styles.touchable}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F9FAFB']}
            style={styles.notification}
          >
            {/* 글로우 배경 */}
            <Animated.View
              style={[
                styles.glowBackground,
                {
                  backgroundColor: rarityColors.glow,
                  opacity: glowOpacity
                }
              ]}
            />

            {/* 헤더 */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>🎉 뱃지 획득!</Text>
                <Text style={[
                  styles.rarityText,
                  { color: rarityColors.primary }
                ]}>
                  {getRarityText()} 등급
                </Text>
              </View>
              <TouchableOpacity
                onPress={onDismiss}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* 뱃지 및 정보 */}
            <View style={styles.content}>
              {/* 뱃지 아이콘 */}
              <Animated.View
                style={[
                  styles.badgeContainer,
                  {
                    transform: [
                      { scale: badgeScale },
                      { 
                        rotate: rotation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg']
                        })
                      }
                    ]
                  }
                ]}
              >
                <LinearGradient
                  colors={rarityColors.gradient}
                  style={[
                    styles.badgeIcon,
                    {
                      borderColor: rarityColors.border,
                    }
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {getBadgeIcon()}
                </LinearGradient>

                {/* 등급 표시 */}
                <View style={[
                  styles.rarityBadge,
                  { backgroundColor: rarityColors.primary }
                ]}>
                  <Text style={styles.rarityBadgeText}>
                    {badge.rarity.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </Animated.View>

              {/* 뱃지 정보 */}
              <View style={styles.badgeInfo}>
                <Text style={styles.badgeName} numberOfLines={2}>
                  {badge.name}
                </Text>
                <Text style={styles.badgeDescription} numberOfLines={3}>
                  {badge.description}
                </Text>
                
                {/* 포인트 정보 */}
                {badge.points > 0 && (
                  <View style={styles.pointsContainer}>
                    <Ionicons name="star" size={16} color="#F59E0B" />
                    <Text style={styles.pointsText}>
                      +{badge.points} 포인트
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* 액션 버튼 */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: rarityColors.primary }
                ]}
                onPress={handleNotificationPress}
              >
                <Text style={styles.actionButtonText}>
                  자세히 보기
                </Text>
              </TouchableOpacity>
            </View>

            {/* 장식 요소 */}
            <View style={styles.decorations}>
              {[...Array(5)].map((_, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.decoration,
                    {
                      left: 20 + index * 50,
                      animationDelay: index * 100,
                      transform: [
                        {
                          translateY: opacity.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0]
                          })
                        }
                      ]
                    }
                  ]}
                >
                  <Text style={styles.decorationText}>✨</Text>
                </Animated.View>
              ))}
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  container: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 1001,
  },
  touchable: {
    flex: 1,
  },
  notification: {
    borderRadius: 16,
    padding: 20,
    marginTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  glowBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  rarityText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeContainer: {
    marginRight: 16,
    position: 'relative',
  },
  badgeIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize: 32,
    textAlign: 'center',
  },
  rarityBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  rarityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
  },
  actions: {
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  decorations: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 20,
  },
  decoration: {
    position: 'absolute',
    top: 0,
  },
  decorationText: {
    fontSize: 16,
    opacity: 0.7,
  },
});