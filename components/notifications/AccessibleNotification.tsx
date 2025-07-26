/**
 * 접근성 개선된 알림 컴포넌트
 * Accessibility Enhanced Notification Component
 * WCAG 2.1 AA 준수
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  AccessibilityInfo,
  useColorScheme,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { NotificationType, NotificationPriority } from '../../services/notificationService';

const { width: screenWidth } = Dimensions.get('window');

interface InAppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: any;
  priority: NotificationPriority;
  timestamp: Date;
}

interface AccessibleNotificationProps {
  notification: InAppNotification;
  onPress?: (notification: InAppNotification) => void;
  onDismiss?: (notificationId: string) => void;
  autoFocus?: boolean;
}

const AccessibleNotification: React.FC<AccessibleNotificationProps> = ({
  notification,
  onPress,
  onDismiss,
  autoFocus = false
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);
  const notificationRef = useRef<TouchableOpacity>(null);
  
  const translateY = useRef(new Animated.Value(-100)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 접근성 설정 확인
    AccessibilityInfo.isScreenReaderEnabled().then(setIsScreenReaderEnabled);
    AccessibilityInfo.isReduceMotionEnabled().then(setIsReduceMotionEnabled);

    // 접근성 설정 변경 리스너
    const screenReaderListener = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );
    
    const reduceMotionListener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReduceMotionEnabled
    );

    return () => {
      screenReaderListener?.remove();
      reduceMotionListener?.remove();
    };
  }, []);

  useEffect(() => {
    // 등장 애니메이션 (모션 감소 설정 고려)
    const animationDuration = isReduceMotionEnabled ? 150 : 300;
    const useSpring = !isReduceMotionEnabled;

    const animations = [
      useSpring 
        ? Animated.spring(translateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          })
        : Animated.timing(translateY, {
            toValue: 0,
            duration: animationDuration,
            useNativeDriver: true,
          }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: animationDuration,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: animationDuration,
        useNativeDriver: true,
      })
    ];

    Animated.parallel(animations).start();

    // 자동 포커스 (스크린 리더 사용 시)
    if (autoFocus && isScreenReaderEnabled && notificationRef.current) {
      setTimeout(() => {
        AccessibilityInfo.setAccessibilityFocus(notificationRef.current as any);
      }, animationDuration + 100);
    }
  }, [isReduceMotionEnabled, autoFocus, isScreenReaderEnabled]);

  const handlePress = async () => {
    // 햅틱 피드백 (접근성 고려)
    if (!isScreenReaderEnabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    onPress?.(notification);
  };

  const handleDismiss = async () => {
    // 햅틱 피드백
    if (!isScreenReaderEnabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // 퇴장 애니메이션
    const animationDuration = isReduceMotionEnabled ? 100 : 250;
    
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: animationDuration,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: animationDuration,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: animationDuration,
        useNativeDriver: true,
      })
    ]).start(() => {
      onDismiss?.(notification.id);
    });
  };

  const getNotificationIcon = (type: NotificationType): string => {
    const iconMap: Record<NotificationType, string> = {
      [NotificationType.DAILY_CHALLENGE]: 'calendar-outline',
      [NotificationType.WEEKLY_CHALLENGE]: 'trophy-outline',
      [NotificationType.LOCATION_CHALLENGE]: 'location-outline',
      [NotificationType.STREAK_REMINDER]: 'flame-outline',
      [NotificationType.BADGE_EARNED]: 'medal-outline',
      [NotificationType.LEADERBOARD_UPDATE]: 'podium-outline',
      [NotificationType.CUSTOM_REMINDER]: 'notifications-outline',
      [NotificationType.CHALLENGE_EXPIRING]: 'time-outline',
      [NotificationType.MILESTONE_ACHIEVED]: 'star-outline'
    };

    return iconMap[type] || 'notifications-outline';
  };

  const getAccessibilityLabel = (): string => {
    const typeLabels: Record<NotificationType, string> = {
      [NotificationType.DAILY_CHALLENGE]: '일일 챌린지',
      [NotificationType.WEEKLY_CHALLENGE]: '주간 챌린지',
      [NotificationType.LOCATION_CHALLENGE]: '위치 챌린지',
      [NotificationType.STREAK_REMINDER]: '연속 기록 알림',
      [NotificationType.BADGE_EARNED]: '뱃지 획득',
      [NotificationType.LEADERBOARD_UPDATE]: '순위 업데이트',
      [NotificationType.CUSTOM_REMINDER]: '사용자 알림',
      [NotificationType.CHALLENGE_EXPIRING]: '챌린지 만료',
      [NotificationType.MILESTONE_ACHIEVED]: '성취 달성'
    };

    const typeLabel = typeLabels[notification.type] || '알림';
    const priorityLabel = notification.priority === NotificationPriority.HIGH ? '중요 ' : '';
    const timeLabel = formatTimestamp(notification.timestamp, true);
    
    return `${priorityLabel}${typeLabel}, ${notification.title}, ${notification.body}, ${timeLabel}`;
  };

  const getAccessibilityHint = (): string => {
    return '터치하여 자세히 보기, 오른쪽으로 스와이프하여 삭제';
  };

  const getNotificationColors = (type: NotificationType): { primary: string; gradient: string[] } => {
    const colorMap: Record<NotificationType, { primary: string; gradient: string[] }> = {
      [NotificationType.DAILY_CHALLENGE]: {
        primary: '#10B981',
        gradient: isDark ? ['#064E3B', '#065F46'] : ['#D1FAE5', '#A7F3D0']
      },
      [NotificationType.WEEKLY_CHALLENGE]: {
        primary: '#8B5CF6',
        gradient: isDark ? ['#4C1D95', '#5B21B6'] : ['#E9D5FF', '#DDD6FE']
      },
      [NotificationType.LOCATION_CHALLENGE]: {
        primary: '#3B82F6',
        gradient: isDark ? ['#1E3A8A', '#1D4ED8'] : ['#DBEAFE', '#BFDBFE']
      },
      [NotificationType.STREAK_REMINDER]: {
        primary: '#EF4444',
        gradient: isDark ? ['#7F1D1D', '#991B1B'] : ['#FECACA', '#FCA5A5']
      },
      [NotificationType.BADGE_EARNED]: {
        primary: '#F59E0B',
        gradient: isDark ? ['#92400E', '#B45309'] : ['#FEF3C7', '#FDE68A']
      },
      [NotificationType.LEADERBOARD_UPDATE]: {
        primary: '#06B6D4',
        gradient: isDark ? ['#0E7490', '#0891B2'] : ['#CFFAFE', '#A5F3FC']
      },
      [NotificationType.CUSTOM_REMINDER]: {
        primary: '#6B7280',
        gradient: isDark ? ['#374151', '#4B5563'] : ['#F3F4F6', '#E5E7EB']
      },
      [NotificationType.CHALLENGE_EXPIRING]: {
        primary: '#F97316',
        gradient: isDark ? ['#9A3412', '#C2410C'] : ['#FED7AA', '#FDBA74']
      },
      [NotificationType.MILESTONE_ACHIEVED]: {
        primary: '#EC4899',
        gradient: isDark ? ['#9D174D', '#BE185D'] : ['#FCE7F3', '#FBCFE8']
      }
    };

    return colorMap[type] || colorMap[NotificationType.CUSTOM_REMINDER];
  };

  const getPriorityStyle = (priority: NotificationPriority) => {
    const baseStyle = {
      borderRadius: 12,
      overflow: 'hidden' as const,
      // 고대비 지원
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? '#4B5563' : 'transparent',
    };

    switch (priority) {
      case NotificationPriority.HIGH:
        return {
          ...baseStyle,
          borderLeftWidth: 4,
          borderLeftColor: '#EF4444',
          elevation: 8,
          shadowOpacity: 0.3,
          shadowColor: isDark ? '#FFFFFF' : '#000000',
        };
      case NotificationPriority.LOW:
        return {
          ...baseStyle,
          opacity: 0.9,
          elevation: 2,
          shadowOpacity: 0.1,
        };
      default:
        return {
          ...baseStyle,
          elevation: 4,
          shadowOpacity: 0.2,
        };
    }
  };

  const formatTimestamp = (timestamp: Date, forAccessibility: boolean = false): string => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - timestamp.getTime()) / 1000);

    if (diff < 60) {
      return forAccessibility ? '방금 전에 받은 알림' : '방금 전';
    } else if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      return forAccessibility ? `${minutes}분 전에 받은 알림` : `${minutes}분 전`;
    } else if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return forAccessibility ? `${hours}시간 전에 받은 알림` : `${hours}시간 전`;
    } else {
      const dateStr = timestamp.toLocaleDateString('ko-KR');
      return forAccessibility ? `${dateStr}에 받은 알림` : dateStr;
    }
  };

  const colors = getNotificationColors(notification.type);
  const priorityStyle = getPriorityStyle(notification.priority);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }, { scale }],
          opacity
        }
      ]}
    >
      <TouchableOpacity
        ref={notificationRef}
        style={[styles.notification, priorityStyle]}
        onPress={handlePress}
        activeOpacity={0.8}
        // 접근성 속성
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={getAccessibilityLabel()}
        accessibilityHint={getAccessibilityHint()}
        accessibilityState={{
          selected: false,
          busy: false
        }}
        // 고대비 지원
        accessibilityElementsHidden={false}
        importantForAccessibility="yes"
      >
        <LinearGradient
          colors={colors.gradient}
          style={styles.notificationBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.notificationContent}>
            {/* 아이콘 */}
            <View 
              style={[
                styles.iconContainer, 
                { backgroundColor: colors.primary },
                // 고대비 테두리
                isDark && { borderWidth: 1, borderColor: '#6B7280' }
              ]}
              accessible={false}
            >
              <Ionicons
                name={getNotificationIcon(notification.type) as any}
                size={20}
                color="#FFFFFF"
              />
            </View>

            {/* 콘텐츠 */}
            <View style={styles.textContainer}>
              <View style={styles.titleRow}>
                <Text 
                  style={[
                    styles.title, 
                    isDark && styles.titleDark,
                    // 접근성을 위한 최소 글자 크기 보장
                    { fontSize: Math.max(16, 16) }
                  ]} 
                  numberOfLines={2}
                  accessible={false}
                >
                  {notification.title}
                </Text>
                <Text 
                  style={[
                    styles.timestamp, 
                    isDark && styles.timestampDark,
                    { fontSize: Math.max(12, 12) }
                  ]}
                  accessible={false}
                >
                  {formatTimestamp(notification.timestamp)}
                </Text>
              </View>
              <Text 
                style={[
                  styles.body, 
                  isDark && styles.bodyDark,
                  { fontSize: Math.max(14, 14) }
                ]} 
                numberOfLines={3}
                accessible={false}
              >
                {notification.body}
              </Text>
            </View>

            {/* 닫기 버튼 */}
            <TouchableOpacity
              style={[
                styles.dismissButton,
                // 접근성을 위한 최소 터치 영역
                { minWidth: 44, minHeight: 44 }
              ]}
              onPress={handleDismiss}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="알림 닫기"
              accessibilityHint="이 알림을 닫습니다"
              hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
            >
              <Ionicons 
                name="close" 
                size={20} 
                color={isDark ? '#9CA3AF' : '#6B7280'} 
              />
            </TouchableOpacity>
          </View>

          {/* 우선순위 인디케이터 */}
          {notification.priority === NotificationPriority.HIGH && (
            <View 
              style={styles.priorityIndicator}
              accessible={false}
            >
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  notification: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  notificationBackground: {
    padding: 16,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
    lineHeight: 22,
  },
  titleDark: {
    color: '#F9FAFB',
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  timestampDark: {
    color: '#9CA3AF',
  },
  body: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  bodyDark: {
    color: '#D1D5DB',
  },
  dismissButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});

export default AccessibleNotification;