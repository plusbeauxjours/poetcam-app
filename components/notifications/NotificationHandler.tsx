/**
 * 알림 핸들러 컴포넌트
 * Notification Handler Component
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
  useColorScheme
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import SwipeableNotification from './SwipeableNotification';

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

interface NotificationHandlerProps {
  onNotificationPress?: (notification: InAppNotification) => void;
  onNotificationDismiss?: (notificationId: string) => void;
}

const NotificationHandler: React.FC<NotificationHandlerProps> = ({
  onNotificationPress,
  onNotificationDismiss
}) => {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [animatedValues] = useState(() => new Map<string, Animated.Value>());
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    // 알림 수신 리스너
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        handleNotificationReceived(notification);
      }
    );

    // 알림 응답 리스너 (사용자가 알림을 탭했을 때)
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handleNotificationResponse(response);
      }
    );

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  const handleNotificationReceived = (notification: Notifications.Notification) => {
    const { content } = notification.request;
    
    const inAppNotification: InAppNotification = {
      id: notification.request.identifier,
      type: content.data?.type || NotificationType.CUSTOM_REMINDER,
      title: content.title || '알림',
      body: content.body || '',
      data: content.data,
      priority: content.data?.priority || NotificationPriority.NORMAL,
      timestamp: new Date()
    };

    // 인앱 알림 표시
    showInAppNotification(inAppNotification);
  };

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const { notification } = response;
    const { content } = notification.request;
    
    const inAppNotification: InAppNotification = {
      id: notification.request.identifier,
      type: content.data?.type || NotificationType.CUSTOM_REMINDER,
      title: content.title || '알림',
      body: content.body || '',
      data: content.data,
      priority: content.data?.priority || NotificationPriority.NORMAL,
      timestamp: new Date()
    };

    // 알림 클릭 처리
    onNotificationPress?.(inAppNotification);
  };

  const showInAppNotification = (notification: InAppNotification) => {
    // 중복 알림 방지
    if (notifications.some(n => n.id === notification.id)) {
      return;
    }

    // 애니메이션 값 초기화
    const animatedValue = new Animated.Value(-100);
    animatedValues.set(notification.id, animatedValue);

    // 알림 목록에 추가
    setNotifications(prev => [...prev, notification]);

    // 슬라이드 인 애니메이션
    Animated.sequence([
      Animated.spring(animatedValue, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // 자동 제거 (우선순위에 따라 시간 조정)
    const dismissTime = notification.priority === NotificationPriority.HIGH ? 7000 : 5000;
    setTimeout(() => {
      dismissNotification(notification.id);
    }, dismissTime);
  };

  const dismissNotification = useCallback((notificationId: string) => {
    const animatedValue = animatedValues.get(notificationId);
    
    if (animatedValue) {
      // 햅틱 피드백
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // 슬라이드 아웃 애니메이션 (60fps 최적화)
      Animated.timing(animatedValue, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        // 알림 제거
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        animatedValues.delete(notificationId);
      });
    }

    onNotificationDismiss?.(notificationId);
  }, [animatedValues, onNotificationDismiss]);

  const handleNotificationPress = useCallback(async (notification: InAppNotification) => {
    // 햅틱 피드백
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    dismissNotification(notification.id);
    onNotificationPress?.(notification);
  }, [dismissNotification, onNotificationPress]);

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
        gradient: ['#D1FAE5', '#A7F3D0']
      },
      [NotificationType.WEEKLY_CHALLENGE]: {
        primary: '#8B5CF6',
        gradient: ['#E9D5FF', '#DDD6FE']
      },
      [NotificationType.LOCATION_CHALLENGE]: {
        primary: '#3B82F6',
        gradient: ['#DBEAFE', '#BFDBFE']
      },
      [NotificationType.STREAK_REMINDER]: {
        primary: '#EF4444',
        gradient: ['#FECACA', '#FCA5A5']
      },
      [NotificationType.BADGE_EARNED]: {
        primary: '#F59E0B',
        gradient: ['#FEF3C7', '#FDE68A']
      },
      [NotificationType.LEADERBOARD_UPDATE]: {
        primary: '#06B6D4',
        gradient: ['#CFFAFE', '#A5F3FC']
      },
      [NotificationType.CUSTOM_REMINDER]: {
        primary: '#6B7280',
        gradient: ['#F3F4F6', '#E5E7EB']
      },
      [NotificationType.CHALLENGE_EXPIRING]: {
        primary: '#F97316',
        gradient: ['#FED7AA', '#FDBA74']
      },
      [NotificationType.MILESTONE_ACHIEVED]: {
        primary: '#EC4899',
        gradient: ['#FCE7F3', '#FBCFE8']
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

  if (notifications.length === 0) {
    return null;
  }

  // 스와이프 액션 핸들러
  const handleSwipeAction = useCallback(async (notification: InAppNotification, action: 'dismiss' | 'action') => {
    if (action === 'dismiss') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onNotificationDismiss?.(notification.id);
    } else if (action === 'action') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onNotificationPress?.(notification);
    }
  }, [onNotificationPress, onNotificationDismiss]);

  // 알림 목록 메모이제이션 (성능 최적화)
  const notificationElements = useMemo(() => {
    return notifications.map((notification) => {
      const animatedValue = animatedValues.get(notification.id);

      return (
        <Animated.View
          key={notification.id}
          style={[
            styles.notificationContainer,
            {
              transform: [
                {
                  translateY: animatedValue || new Animated.Value(-100)
                }
              ]
            }
          ]}
        >
          <SwipeableNotification
            notification={notification}
            onPress={handleNotificationPress}
            onDismiss={dismissNotification}
            onSwipeAction={handleSwipeAction}
          />
        </Animated.View>
      );
    });
  }, [notifications, animatedValues, handleNotificationPress, dismissNotification, handleSwipeAction]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]} pointerEvents="box-none">
      {notificationElements}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  notificationContainer: {
    marginBottom: 8,
  },
  notification: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
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
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  body: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 18,
  },
  dismissButton: {
    padding: 4,
  },
  priorityIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  
  // 다크 테마 스타일
  containerDark: {
    // 다크 테마에서는 컨테이너 배경색을 변경하지 않음 (투명)
  },
});

export default NotificationHandler;