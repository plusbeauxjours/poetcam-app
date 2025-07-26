/**
 * 스와이프 가능한 알림 컴포넌트  
 * Swipeable Notification Component
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  useColorScheme,
  Dimensions
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { NotificationType, NotificationPriority } from '../../services/notificationService';

const { width: screenWidth } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.25;

interface InAppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: any;
  priority: NotificationPriority;
  timestamp: Date;
}

interface SwipeableNotificationProps {
  notification: InAppNotification;
  onPress?: (notification: InAppNotification) => void;
  onDismiss?: (notificationId: string) => void;
  onSwipeAction?: (notification: InAppNotification, action: 'dismiss' | 'action') => void;
}

const SwipeableNotification: React.FC<SwipeableNotificationProps> = ({
  notification,
  onPress,
  onDismiss,
  onSwipeAction
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  
  const dismissThreshold = -SWIPE_THRESHOLD;
  const actionThreshold = SWIPE_THRESHOLD;

  useEffect(() => {
    // 등장 애니메이션
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { 
      useNativeDriver: true,
      listener: (event: any) => {
        const { translationX } = event.nativeEvent;
        
        // 햅틱 피드백 (임계점 도달 시)
        if (Math.abs(translationX) > SWIPE_THRESHOLD) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
    }
  );

  const handleStateChange = (event: any) => {
    const { translationX, state } = event.nativeEvent;

    if (state === State.END) {
      if (translationX < dismissThreshold) {
        // 왼쪽 스와이프 - 삭제
        handleSwipeAction('dismiss');
      } else if (translationX > actionThreshold) {
        // 오른쪽 스와이프 - 액션
        handleSwipeAction('action');
      } else {
        // 원래 위치로 복귀
        Animated.spring(translateX, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  const handleSwipeAction = (action: 'dismiss' | 'action') => {
    const targetX = action === 'dismiss' ? -screenWidth : screenWidth;
    
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: targetX,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      onSwipeAction?.(notification, action);
      if (action === 'dismiss') {
        onDismiss?.(notification.id);
      }
    });
  };

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(notification);
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
    switch (priority) {
      case NotificationPriority.HIGH:
        return {
          borderLeftWidth: 4,
          borderLeftColor: '#EF4444',
          elevation: 8,
          shadowOpacity: 0.3
        };
      case NotificationPriority.LOW:
        return {
          opacity: 0.9,
          elevation: 2,
          shadowOpacity: 0.1
        };
      default:
        return {
          elevation: 4,
          shadowOpacity: 0.2
        };
    }
  };

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - timestamp.getTime()) / 1000);

    if (diff < 60) {
      return '방금 전';
    } else if (diff < 3600) {
      return `${Math.floor(diff / 60)}분 전`;
    } else if (diff < 86400) {
      return `${Math.floor(diff / 3600)}시간 전`;
    } else {
      return timestamp.toLocaleDateString('ko-KR');
    }
  };

  const colors = getNotificationColors(notification.type);
  const priorityStyle = getPriorityStyle(notification.priority);

  return (
    <View style={styles.container}>
      {/* 스와이프 액션 배경 */}
      <View style={[styles.actionBackground, styles.leftAction]}>
        <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
        <Text style={styles.actionText}>삭제</Text>
      </View>
      
      <View style={[styles.actionBackground, styles.rightAction]}>
        <Ionicons name="open-outline" size={24} color="#FFFFFF" />
        <Text style={styles.actionText}>열기</Text>
      </View>

      {/* 메인 알림 */}
      <PanGestureHandler
        onGestureEvent={handleGestureEvent}
        onHandlerStateChange={handleStateChange}
        activeOffsetX={[-10, 10]}
      >
        <Animated.View
          style={[
            styles.notificationContainer,
            {
              transform: [
                { translateX },
                { scale }
              ],
              opacity
            }
          ]}
        >
          <TouchableOpacity
            style={[
              styles.notification,
              priorityStyle,
              isDark && styles.notificationDark
            ]}
            onPress={handlePress}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={colors.gradient}
              style={styles.notificationBackground}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.notificationContent}>
                {/* 아이콘 */}
                <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
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
                      style={[styles.title, isDark && styles.titleDark]} 
                      numberOfLines={1}
                    >
                      {notification.title}
                    </Text>
                    <Text style={[styles.timestamp, isDark && styles.timestampDark]}>
                      {formatTimestamp(notification.timestamp)}
                    </Text>
                  </View>
                  <Text 
                    style={[styles.body, isDark && styles.bodyDark]} 
                    numberOfLines={2}
                  >
                    {notification.body}
                  </Text>
                </View>

                {/* 스와이프 힌트 */}
                <View style={styles.swipeHint}>
                  <Ionicons name="chevron-back" size={12} color="#9CA3AF" />
                  <Ionicons name="chevron-forward" size={12} color="#9CA3AF" />
                </View>
              </View>

              {/* 우선순위 인디케이터 */}
              {notification.priority === NotificationPriority.HIGH && (
                <View style={styles.priorityIndicator}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 8,
  },
  actionBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SWIPE_THRESHOLD,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  leftAction: {
    left: 0,
    backgroundColor: '#EF4444',
  },
  rightAction: {
    right: 0,
    backgroundColor: '#10B981',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  notificationContainer: {
    zIndex: 1,
  },
  notification: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  notificationDark: {
    backgroundColor: '#1F2937',
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
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  titleDark: {
    color: '#F9FAFB',
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  timestampDark: {
    color: '#9CA3AF',
  },
  body: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 18,
  },
  bodyDark: {
    color: '#D1D5DB',
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  priorityIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});

export default SwipeableNotification;