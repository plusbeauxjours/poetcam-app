/**
 * 알림 및 리마인더 서비스
 * Notification and Reminder Service
 */

import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

// 알림 타입 정의
export enum NotificationType {
  DAILY_CHALLENGE = 'daily_challenge',
  WEEKLY_CHALLENGE = 'weekly_challenge', 
  LOCATION_CHALLENGE = 'location_challenge',
  STREAK_REMINDER = 'streak_reminder',
  BADGE_EARNED = 'badge_earned',
  LEADERBOARD_UPDATE = 'leaderboard_update',
  CUSTOM_REMINDER = 'custom_reminder',
  CHALLENGE_EXPIRING = 'challenge_expiring',
  MILESTONE_ACHIEVED = 'milestone_achieved'
}

// 알림 우선순위
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal', 
  HIGH = 'high'
}

// 알림 설정 인터페이스
export interface NotificationSettings {
  userId: string;
  enabled: boolean;
  types: {
    [NotificationType.DAILY_CHALLENGE]: boolean;
    [NotificationType.WEEKLY_CHALLENGE]: boolean;
    [NotificationType.LOCATION_CHALLENGE]: boolean;
    [NotificationType.STREAK_REMINDER]: boolean;
    [NotificationType.BADGE_EARNED]: boolean;
    [NotificationType.LEADERBOARD_UPDATE]: boolean;
    [NotificationType.CUSTOM_REMINDER]: boolean;
    [NotificationType.CHALLENGE_EXPIRING]: boolean;
    [NotificationType.MILESTONE_ACHIEVED]: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM 형식
    endTime: string;   // HH:MM 형식
  };
  frequency: {
    dailyChallenges: 'once' | 'twice' | 'three_times';
    streakReminders: 'daily' | 'every_2_days' | 'weekly';
    locationReminders: 'immediate' | 'hourly' | 'daily';
  };
  customTimes: {
    morningReminder: string;  // HH:MM
    eveningReminder: string;  // HH:MM
    weekendReminder: string;  // HH:MM
  };
}

// 예약된 알림 인터페이스
export interface ScheduledNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: any;
  scheduledTime: Date;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    endDate?: Date;
  };
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // 미터 단위
  };
  priority: NotificationPriority;
  sent: boolean;
  createdAt: Date;
}

// 백그라운드 작업 정의
const BACKGROUND_NOTIFICATION_TASK = 'background-notification-task';
const LOCATION_TASK_NAME = 'location-notification-task';

export class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * 알림 서비스 초기화
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 알림 권한 요청
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
        return;
      }

      // 알림 핸들러 설정
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // 백그라운드 작업 등록
      this.registerBackgroundTasks();

      // 위치 기반 알림 설정
      await this.setupLocationNotifications();

      this.isInitialized = true;
      console.log('NotificationService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
    }
  }

  /**
   * 백그라운드 작업 등록
   */
  private registerBackgroundTasks(): void {
    // 정기 알림 확인 작업
    TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
      try {
        await this.processScheduledNotifications();
        return { success: true };
      } catch (error) {
        console.error('Background notification task failed:', error);
        return { success: false };
      }
    });

    // 위치 기반 알림 작업
    TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
      if (error) {
        console.error('Location task error:', error);
        return;
      }

      if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        await this.handleLocationBasedNotifications(locations);
      }
    });
  }

  /**
   * 위치 기반 알림 설정
   */
  private async setupLocationNotifications(): Promise<void> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permissions not granted');
        return;
      }

      // 백그라운드 위치 권한 요청
      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus.status === 'granted') {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 300000, // 5분마다 체크
          distanceInterval: 100, // 100m 이동 시 체크
        });
      }
    } catch (error) {
      console.error('Failed to setup location notifications:', error);
    }
  }

  /**
   * 사용자 알림 설정 조회
   */
  async getUserNotificationSettings(userId: string): Promise<NotificationSettings> {
    try {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // 기본 설정 반환 (설정이 없는 경우)
      if (!data) {
        return this.getDefaultNotificationSettings(userId);
      }

      return {
        userId: data.user_id,
        enabled: data.enabled,
        types: data.notification_types,
        quietHours: data.quiet_hours,
        frequency: data.frequency_settings,
        customTimes: data.custom_times
      };
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      return this.getDefaultNotificationSettings(userId);
    }
  }

  /**
   * 기본 알림 설정
   */
  private getDefaultNotificationSettings(userId: string): NotificationSettings {
    return {
      userId,
      enabled: true,
      types: {
        [NotificationType.DAILY_CHALLENGE]: true,
        [NotificationType.WEEKLY_CHALLENGE]: true,
        [NotificationType.LOCATION_CHALLENGE]: true,
        [NotificationType.STREAK_REMINDER]: true,
        [NotificationType.BADGE_EARNED]: true,
        [NotificationType.LEADERBOARD_UPDATE]: false,
        [NotificationType.CUSTOM_REMINDER]: true,
        [NotificationType.CHALLENGE_EXPIRING]: true,
        [NotificationType.MILESTONE_ACHIEVED]: true
      },
      quietHours: {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00'
      },
      frequency: {
        dailyChallenges: 'once',
        streakReminders: 'daily',
        locationReminders: 'hourly'
      },
      customTimes: {
        morningReminder: '09:00',
        eveningReminder: '19:00',
        weekendReminder: '10:00'
      }
    };
  }

  /**
   * 알림 설정 업데이트
   */
  async updateNotificationSettings(settings: NotificationSettings): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_notification_settings')
        .upsert({
          user_id: settings.userId,
          enabled: settings.enabled,
          notification_types: settings.types,
          quiet_hours: settings.quietHours,
          frequency_settings: settings.frequency,
          custom_times: settings.customTimes,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // 로컬 스토리지에도 저장
      await AsyncStorage.setItem(
        `notification_settings_${settings.userId}`,
        JSON.stringify(settings)
      );

      console.log('Notification settings updated successfully');
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  }

  /**
   * 일반 푸시 알림 발송
   */
  async sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: any,
    priority: NotificationPriority = NotificationPriority.NORMAL
  ): Promise<string | null> {
    try {
      // 사용자 알림 설정 확인
      const settings = await this.getUserNotificationSettings(userId);
      
      if (!settings.enabled || !settings.types[type]) {
        console.log(`Notification ${type} disabled for user ${userId}`);
        return null;
      }

      // 조용한 시간 확인
      if (this.isQuietHours(settings.quietHours)) {
        console.log('Skipping notification due to quiet hours');
        return null;
      }

      // 디바이스 토큰 조회
      const expoPushToken = await this.getExpoPushToken(userId);
      if (!expoPushToken) {
        console.warn(`No push token found for user ${userId}`);
        return null;
      }

      // 알림 전송
      const notification = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type,
            userId,
            ...data
          }
        },
        trigger: null // 즉시 전송
      });

      // 알림 로그 저장
      await this.logNotification(userId, type, title, body, data);

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }

  /**
   * 예약 알림 설정
   */
  async scheduleNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    scheduledTime: Date,
    data?: any,
    priority: NotificationPriority = NotificationPriority.NORMAL,
    recurring?: { frequency: 'daily' | 'weekly' | 'monthly'; endDate?: Date }
  ): Promise<string | null> {
    try {
      const settings = await this.getUserNotificationSettings(userId);
      
      if (!settings.enabled || !settings.types[type]) {
        return null;
      }

      const notificationRequest: Notifications.NotificationRequestInput = {
        content: {
          title,
          body,
          data: {
            type,
            userId,
            ...data
          }
        },
        trigger: {
          date: scheduledTime
        }
      };

      // 반복 알림 설정
      if (recurring) {
        let repeatInterval: Notifications.CalendarTriggerInput['repeats'];
        switch (recurring.frequency) {
          case 'daily':
            repeatInterval = true;
            break;
          case 'weekly':
            (notificationRequest.trigger as Notifications.CalendarTriggerInput).weekday = scheduledTime.getDay() + 1;
            repeatInterval = true;
            break;
          case 'monthly':
            (notificationRequest.trigger as Notifications.CalendarTriggerInput).day = scheduledTime.getDate();
            repeatInterval = true;
            break;
        }
        (notificationRequest.trigger as Notifications.CalendarTriggerInput).repeats = repeatInterval;
      }

      const notificationId = await Notifications.scheduleNotificationAsync(notificationRequest);

      // 스케줄된 알림 정보 저장
      await this.saveScheduledNotification({
        id: notificationId,
        userId,
        type,
        title,
        body,
        data,
        scheduledTime,
        recurring,
        priority,
        sent: false,
        createdAt: new Date()
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * 위치 기반 알림 설정
   */
  async scheduleLocationNotification(
    userId: string,
    title: string,
    body: string,
    latitude: number,
    longitude: number,
    radius: number = 100,
    data?: any
  ): Promise<string | null> {
    try {
      const settings = await this.getUserNotificationSettings(userId);
      
      if (!settings.enabled || !settings.types[NotificationType.LOCATION_CHALLENGE]) {
        return null;
      }

      // 위치 기반 알림은 현재 Expo에서 직접 지원하지 않으므로
      // 백그라운드 작업에서 위치를 확인하여 알림 발송
      const locationNotification: ScheduledNotification = {
        id: `location_${Date.now()}`,
        userId,
        type: NotificationType.LOCATION_CHALLENGE,
        title,
        body,
        data,
        scheduledTime: new Date(),
        location: {
          latitude,
          longitude,
          radius
        },
        priority: NotificationPriority.NORMAL,
        sent: false,
        createdAt: new Date()
      };

      await this.saveScheduledNotification(locationNotification);
      return locationNotification.id;
    } catch (error) {
      console.error('Error scheduling location notification:', error);
      return null;
    }
  }

  /**
   * 데일리 챌린지 알림 스케줄링
   */
  async scheduleDailyChallengeReminders(userId: string): Promise<void> {
    try {
      const settings = await this.getUserNotificationSettings(userId);
      
      if (!settings.enabled || !settings.types[NotificationType.DAILY_CHALLENGE]) {
        return;
      }

      const now = new Date();
      const times: string[] = [];
      
      // 빈도에 따른 알림 시간 설정
      switch (settings.frequency.dailyChallenges) {
        case 'once':
          times.push(settings.customTimes.morningReminder);
          break;
        case 'twice':
          times.push(settings.customTimes.morningReminder);
          times.push(settings.customTimes.eveningReminder);
          break;
        case 'three_times':
          times.push(settings.customTimes.morningReminder);
          times.push('14:00'); // 오후 2시
          times.push(settings.customTimes.eveningReminder);
          break;
      }

      // 각 시간에 대해 알림 스케줄링
      for (const timeStr of times) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const scheduledTime = new Date(now);
        scheduledTime.setHours(hours, minutes, 0, 0);
        
        // 오늘 시간이 지났으면 내일로 설정
        if (scheduledTime <= now) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        await this.scheduleNotification(
          userId,
          NotificationType.DAILY_CHALLENGE,
          '오늘의 챌린지가 기다리고 있어요! 📸',
          '새로운 데일리 챌린지에 참여하고 포인트를 획득하세요.',
          scheduledTime,
          { challengeType: 'daily' },
          NotificationPriority.NORMAL,
          { frequency: 'daily' }
        );
      }
    } catch (error) {
      console.error('Error scheduling daily challenge reminders:', error);
    }
  }

  /**
   * 연속 기록 리마인더 설정
   */
  async scheduleStreakReminder(userId: string, currentStreak: number): Promise<void> {
    try {
      const settings = await this.getUserNotificationSettings(userId);
      
      if (!settings.enabled || !settings.types[NotificationType.STREAK_REMINDER]) {
        return;
      }

      const now = new Date();
      let nextReminderDate = new Date(now);
      
      // 빈도에 따른 다음 리마인더 시간 계산
      switch (settings.frequency.streakReminders) {
        case 'daily':
          nextReminderDate.setDate(now.getDate() + 1);
          break;
        case 'every_2_days':
          nextReminderDate.setDate(now.getDate() + 2);
          break;
        case 'weekly':
          nextReminderDate.setDate(now.getDate() + 7);
          break;
      }

      // 저녁 시간으로 설정
      const [hours, minutes] = settings.customTimes.eveningReminder.split(':').map(Number);
      nextReminderDate.setHours(hours, minutes, 0, 0);

      let title: string;
      let body: string;

      if (currentStreak === 0) {
        title = '새로운 연속 기록을 시작해보세요! 🔥';
        body = '오늘 시를 작성하고 연속 기록을 시작해보세요.';
      } else {
        title = `${currentStreak}일 연속 기록을 유지하세요! 🔥`;
        body = '연속 기록이 끊어지기 전에 오늘의 시를 작성해보세요.';
      }

      await this.scheduleNotification(
        userId,
        NotificationType.STREAK_REMINDER,
        title,
        body,
        nextReminderDate,
        { currentStreak },
        NotificationPriority.HIGH
      );
    } catch (error) {
      console.error('Error scheduling streak reminder:', error);
    }
  }

  /**
   * 챌린지 만료 알림
   */
  async scheduleExpiringChallengeNotification(
    userId: string,
    challengeId: string,
    challengeName: string,
    expiresAt: Date
  ): Promise<void> {
    try {
      const settings = await this.getUserNotificationSettings(userId);
      
      if (!settings.enabled || !settings.types[NotificationType.CHALLENGE_EXPIRING]) {
        return;
      }

      // 만료 24시간 전에 알림
      const reminderTime = new Date(expiresAt.getTime() - 24 * 60 * 60 * 1000);
      
      if (reminderTime > new Date()) {
        await this.scheduleNotification(
          userId,
          NotificationType.CHALLENGE_EXPIRING,
          '챌린지가 곧 만료됩니다! ⏰',
          `"${challengeName}" 챌린지가 24시간 후에 만료됩니다. 지금 참여하세요!`,
          reminderTime,
          { challengeId, challengeName, expiresAt: expiresAt.toISOString() },
          NotificationPriority.HIGH
        );
      }

      // 만료 1시간 전에도 알림
      const urgentReminderTime = new Date(expiresAt.getTime() - 60 * 60 * 1000);
      
      if (urgentReminderTime > new Date()) {
        await this.scheduleNotification(
          userId,
          NotificationType.CHALLENGE_EXPIRING,
          '마지막 기회! 챌린지가 곧 종료됩니다! ⚡',
          `"${challengeName}" 챌린지가 1시간 후에 종료됩니다.`,
          urgentReminderTime,
          { challengeId, challengeName, expiresAt: expiresAt.toISOString(), urgent: true },
          NotificationPriority.HIGH
        );
      }
    } catch (error) {
      console.error('Error scheduling expiring challenge notification:', error);
    }
  }

  /**
   * 예약된 알림 처리 (백그라운드 작업)
   */
  private async processScheduledNotifications(): Promise<void> {
    try {
      const now = new Date();
      
      // 처리해야 할 알림들 조회
      const { data: notifications, error } = await supabase
        .from('scheduled_notifications')
        .select('*')
        .eq('sent', false)
        .lte('scheduled_time', now.toISOString());

      if (error) throw error;

      for (const notification of notifications || []) {
        await this.processScheduledNotification(notification);
      }
    } catch (error) {
      console.error('Error processing scheduled notifications:', error);
    }
  }

  /**
   * 개별 예약 알림 처리
   */
  private async processScheduledNotification(notification: any): Promise<void> {
    try {
      // 위치 기반 알림 처리
      if (notification.location) {
        const userLocation = await this.getCurrentUserLocation(notification.user_id);
        if (!userLocation) return;

        const distance = this.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          notification.location.latitude,
          notification.location.longitude
        );

        if (distance > notification.location.radius) {
          return; // 위치 조건 불만족
        }
      }

      // 알림 발송
      await this.sendNotification(
        notification.user_id,
        notification.type,
        notification.title,
        notification.body,
        notification.data,
        notification.priority
      );

      // 발송 완료 표시
      await supabase
        .from('scheduled_notifications')
        .update({ sent: true, sent_at: new Date().toISOString() })
        .eq('id', notification.id);

    } catch (error) {
      console.error('Error processing individual notification:', error);
    }
  }

  /**
   * 위치 기반 알림 처리
   */
  private async handleLocationBasedNotifications(locations: Location.LocationObject[]): Promise<void> {
    if (!locations || locations.length === 0) return;

    const currentLocation = locations[locations.length - 1];
    
    try {
      // 현재 위치 근처의 활성 위치 챌린지 조회
      const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('type', 'location')
        .eq('status', 'active');

      if (error) throw error;

      for (const challenge of challenges || []) {
        if (!challenge.location_data) continue;

        const distance = this.calculateDistance(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          challenge.location_data.latitude,
          challenge.location_data.longitude
        );

        // 100m 이내에 있으면 알림 발송
        if (distance <= 100) {
          // TODO: 사용자 ID를 실제로 가져와야 함
          const userId = 'current_user_id';
          
          await this.sendNotification(
            userId,
            NotificationType.LOCATION_CHALLENGE,
            '위치 챌린지 발견! 📍',
            `"${challenge.name}" 챌린지 장소에 도착했습니다. 지금 참여해보세요!`,
            {
              challengeId: challenge.id,
              challengeName: challenge.name,
              location: challenge.location_data
            },
            NotificationPriority.HIGH
          );
        }
      }
    } catch (error) {
      console.error('Error handling location-based notifications:', error);
    }
  }

  /**
   * 조용한 시간 확인
   */
  private isQuietHours(quietHours: NotificationSettings['quietHours']): boolean {
    if (!quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const startTime = parseInt(quietHours.startTime.replace(':', ''));
    const endTime = parseInt(quietHours.endTime.replace(':', ''));

    // 자정을 넘나드는 경우 처리
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  /**
   * Expo Push Token 조회
   */
  private async getExpoPushToken(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('user_device_tokens')
        .select('expo_push_token')
        .eq('user_id', userId)
        .eq('active', true)
        .single();

      if (error) return null;
      return data?.expo_push_token || null;
    } catch (error) {
      console.error('Error fetching push token:', error);
      return null;
    }
  }

  /**
   * 사용자 현재 위치 조회
   */
  private async getCurrentUserLocation(userId: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * 두 지점 간 거리 계산 (미터 단위)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // 지구 반지름 (미터)
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * 예약된 알림 정보 저장
   */
  private async saveScheduledNotification(notification: ScheduledNotification): Promise<void> {
    try {
      const { error } = await supabase
        .from('scheduled_notifications')
        .insert({
          id: notification.id,
          user_id: notification.userId,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          scheduled_time: notification.scheduledTime.toISOString(),
          recurring_settings: notification.recurring,
          location_data: notification.location,
          priority: notification.priority,
          sent: notification.sent,
          created_at: notification.createdAt.toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving scheduled notification:', error);
    }
  }

  /**
   * 알림 로그 저장
   */
  private async logNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_logs')
        .insert({
          user_id: userId,
          type,
          title,
          body,
          data,
          sent_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }

  /**
   * 모든 예약된 알림 취소
   */
  async cancelAllNotifications(userId: string): Promise<void> {
    try {
      // Expo 알림 취소
      await Notifications.cancelAllScheduledNotificationsAsync();

      // DB에서 알림 제거
      await supabase
        .from('scheduled_notifications')
        .delete()
        .eq('user_id', userId)
        .eq('sent', false);

    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }

  /**
   * 특정 타입 알림 취소
   */
  async cancelNotificationsByType(userId: string, type: NotificationType): Promise<void> {
    try {
      // DB에서 해당 타입 알림 조회
      const { data: notifications, error } = await supabase
        .from('scheduled_notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', type)
        .eq('sent', false);

      if (error) throw error;

      // 각각 취소
      for (const notification of notifications || []) {
        await Notifications.cancelScheduledNotificationAsync(notification.id);
      }

      // DB에서 제거
      await supabase
        .from('scheduled_notifications')
        .delete()
        .eq('user_id', userId)
        .eq('type', type)
        .eq('sent', false);

    } catch (error) {
      console.error('Error canceling notifications by type:', error);
    }
  }
}

export default NotificationService.getInstance();