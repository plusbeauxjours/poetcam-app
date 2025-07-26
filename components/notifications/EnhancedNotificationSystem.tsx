/**
 * 향상된 알림 시스템 통합 컴포넌트
 * Enhanced Notification System Integration Component
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  AccessibilityInfo,
  useColorScheme
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

import { NotificationType, NotificationPriority } from '../../services/notificationService';
import SwipeableNotification from './SwipeableNotification';
import AccessibleNotification from './AccessibleNotification';

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

interface EnhancedNotificationSystemProps {
  maxNotifications?: number;
  autoHideDelay?: number;
  enableSwipeGestures?: boolean;
  enableAccessibilityMode?: boolean;
  onNotificationPress?: (notification: InAppNotification) => void;
  onNotificationDismiss?: (notificationId: string) => void;
  onQueueUpdate?: (queueLength: number) => void;
}

const EnhancedNotificationSystem: React.FC<EnhancedNotificationSystemProps> = ({
  maxNotifications = 3,
  autoHideDelay = 5000,
  enableSwipeGestures = true,
  enableAccessibilityMode = 'auto',
  onNotificationPress,
  onNotificationDismiss,
  onQueueUpdate
}) => {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [notificationQueue, setNotificationQueue] = useState<InAppNotification[]>([]);
  const [animatedValues] = useState(() => new Map<string, Animated.Value>());
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // 접근성 모드 결정
  const accessibilityMode = useMemo(() => {
    if (enableAccessibilityMode === 'auto') {
      return isScreenReaderEnabled;
    }
    return enableAccessibilityMode;
  }, [enableAccessibilityMode, isScreenReaderEnabled]);

  useEffect(() => {
    // 접근성 설정 초기화
    AccessibilityInfo.isScreenReaderEnabled().then(setIsScreenReaderEnabled);
    AccessibilityInfo.isReduceMotionEnabled().then(setIsReduceMotionEnabled);

    const screenReaderListener = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );
    
    const reduceMotionListener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReduceMotionEnabled
    );

    // 알림 리스너 설정
    const notificationListener = Notifications.addNotificationReceivedListener(
      handleNotificationReceived
    );

    const responseListener = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    return () => {
      screenReaderListener?.remove();
      reduceMotionListener?.remove();
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  // 큐 업데이트 알림
  useEffect(() => {
    onQueueUpdate?.(notifications.length + notificationQueue.length);
  }, [notifications.length, notificationQueue.length, onQueueUpdate]);

  // 큐에서 알림 처리
  useEffect(() => {
    if (notifications.length < maxNotifications && notificationQueue.length > 0) {
      const nextNotification = notificationQueue[0];
      setNotificationQueue(prev => prev.slice(1));
      showInAppNotification(nextNotification);
    }
  }, [notifications.length, notificationQueue.length, maxNotifications]);

  const handleNotificationReceived = useCallback((notification: Notifications.Notification) => {
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

    // 중복 알림 방지
    if (notifications.some(n => n.id === inAppNotification.id) || 
        notificationQueue.some(n => n.id === inAppNotification.id)) {
      return;
    }

    // 알림 큐 관리
    if (notifications.length >= maxNotifications) {
      setNotificationQueue(prev => {
        const updated = [...prev, inAppNotification];
        // 큐 크기 제한 (최대 10개)
        return updated.slice(-10);
      });
    } else {
      showInAppNotification(inAppNotification);
    }
  }, [notifications, notificationQueue, maxNotifications]);

  const handleNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
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

    onNotificationPress?.(inAppNotification);
  }, [onNotificationPress]);

  const showInAppNotification = useCallback((notification: InAppNotification) => {
    // 애니메이션 값 초기화
    const animatedValue = new Animated.Value(-100);
    animatedValues.set(notification.id, animatedValue);

    // 알림 목록에 추가
    setNotifications(prev => {
      // 우선순위에 따른 정렬
      const updated = [...prev, notification].sort((a, b) => {
        const priorityOrder = {
          [NotificationPriority.HIGH]: 3,
          [NotificationPriority.NORMAL]: 2,
          [NotificationPriority.LOW]: 1
        };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
      
      return updated.slice(0, maxNotifications);
    });

    // 등장 애니메이션
    const animationDuration = isReduceMotionEnabled ? 150 : 300;
    const useSpring = !isReduceMotionEnabled;

    const animation = useSpring
      ? Animated.spring(animatedValue, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        })
      : Animated.timing(animatedValue, {
          toValue: 0,
          duration: animationDuration,
          useNativeDriver: true,
        });

    animation.start();

    // 자동 숨기기 (우선순위에 따라 시간 조정)
    const hideDelay = notification.priority === NotificationPriority.HIGH 
      ? autoHideDelay * 1.5 
      : autoHideDelay;

    setTimeout(() => {
      dismissNotification(notification.id, false);
    }, hideDelay);
  }, [animatedValues, isReduceMotionEnabled, maxNotifications, autoHideDelay]);

  const dismissNotification = useCallback((notificationId: string, userInitiated: boolean = true) => {
    const animatedValue = animatedValues.get(notificationId);
    
    if (animatedValue) {
      // 햅틱 피드백 (사용자 작업 시에만)
      if (userInitiated && !isScreenReaderEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      // 퇴장 애니메이션
      const animationDuration = isReduceMotionEnabled ? 100 : 250;
      
      Animated.timing(animatedValue, {
        toValue: -100,
        duration: animationDuration,
        useNativeDriver: true,
      }).start(() => {
        // 알림 제거
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        animatedValues.delete(notificationId);
      });
    }

    onNotificationDismiss?.(notificationId);
  }, [animatedValues, isScreenReaderEnabled, isReduceMotionEnabled, onNotificationDismiss]);

  const handleNotificationPress = useCallback(async (notification: InAppNotification) => {
    // 햅틱 피드백
    if (!isScreenReaderEnabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    dismissNotification(notification.id, true);
    onNotificationPress?.(notification);
  }, [isScreenReaderEnabled, dismissNotification, onNotificationPress]);

  const handleSwipeAction = useCallback(async (notification: InAppNotification, action: 'dismiss' | 'action') => {
    if (action === 'dismiss') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onNotificationDismiss?.(notification.id);
    } else if (action === 'action') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onNotificationPress?.(notification);
    }
  }, [onNotificationPress, onNotificationDismiss]);

  // 알림 컴포넌트 렌더링
  const renderNotification = useCallback((notification: InAppNotification, index: number) => {
    const animatedValue = animatedValues.get(notification.id);
    const isFirst = index === 0;

    const containerStyle = {
      transform: [
        {
          translateY: animatedValue || new Animated.Value(-100)
        }
      ],
      zIndex: notifications.length - index
    };

    if (accessibilityMode) {
      // 접근성 모드 - AccessibleNotification 사용
      return (
        <Animated.View
          key={notification.id}
          style={[styles.notificationContainer, containerStyle]}
        >
          <AccessibleNotification
            notification={notification}
            onPress={handleNotificationPress}
            onDismiss={dismissNotification}
            autoFocus={isFirst}
          />
        </Animated.View>
      );
    } else if (enableSwipeGestures) {
      // 스와이프 모드 - SwipeableNotification 사용
      return (
        <Animated.View
          key={notification.id}
          style={[styles.notificationContainer, containerStyle]}
        >
          <SwipeableNotification
            notification={notification}
            onPress={handleNotificationPress}
            onDismiss={dismissNotification}
            onSwipeAction={handleSwipeAction}
          />
        </Animated.View>
      );
    } else {
      // 기본 모드 - AccessibleNotification (스와이프 없음)
      return (
        <Animated.View
          key={notification.id}
          style={[styles.notificationContainer, containerStyle]}
        >
          <AccessibleNotification
            notification={notification}
            onPress={handleNotificationPress}
            onDismiss={dismissNotification}
            autoFocus={false}
          />
        </Animated.View>
      );
    }
  }, [
    animatedValues,
    notifications.length,
    accessibilityMode,
    enableSwipeGestures,
    handleNotificationPress,
    dismissNotification,
    handleSwipeAction
  ]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <View 
      style={[
        styles.container, 
        isDark && styles.containerDark,
        Platform.OS === 'android' && styles.containerAndroid
      ]} 
      pointerEvents="box-none"
    >
      {notifications.map(renderNotification)}
      
      {/* 큐 인디케이터 (3개 이상일 때) */}
      {notificationQueue.length > 0 && (
        <View style={[styles.queueIndicator, isDark && styles.queueIndicatorDark]}>
          <Text style={[styles.queueText, isDark && styles.queueTextDark]}>
            +{notificationQueue.length}개 더
          </Text>
        </View>
      )}
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
  containerAndroid: {
    top: 40,
  },
  containerDark: {
    // 다크 테마 컨테이너는 투명
  },
  notificationContainer: {
    marginBottom: 8,
  },
  queueIndicator: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  queueIndicatorDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  queueText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  queueTextDark: {
    color: '#E5E7EB',
  },
});

export default EnhancedNotificationSystem;