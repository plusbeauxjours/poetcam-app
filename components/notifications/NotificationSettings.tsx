/**
 * 알림 설정 화면 컴포넌트
 * Notification Settings Screen Component
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
  useColorScheme
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { SkeletonList, SkeletonSettingItem } from '../ui/SkeletonLoader';

import NotificationService, { 
  NotificationSettings, 
  NotificationType 
} from '../../services/notificationService';

interface NotificationSettingsProps {
  userId: string;
  onSettingsChanged?: (settings: NotificationSettings) => void;
}

const NotificationSettingsComponent: React.FC<NotificationSettingsProps> = ({
  userId,
  onSettingsChanged
}) => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState<{
    type: 'quietStart' | 'quietEnd' | 'morning' | 'evening' | 'weekend' | null;
    time: Date;
  } | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const userSettings = await NotificationService.getUserNotificationSettings(userId);
      setSettings(userSettings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
      Alert.alert('오류', '알림 설정을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: NotificationSettings) => {
    try {
      await NotificationService.updateNotificationSettings(newSettings);
      setSettings(newSettings);
      onSettingsChanged?.(newSettings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      Alert.alert('오류', '설정 저장에 실패했습니다.');
    }
  };

  const toggleNotifications = useCallback(async (enabled: boolean) => {
    if (!settings) return;

    // 햅틱 피드백
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newSettings = { ...settings, enabled };
    updateSettings(newSettings);
  }, [settings]);

  const toggleNotificationType = useCallback(async (type: NotificationType, enabled: boolean) => {
    if (!settings) return;

    // 햅틱 피드백
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newSettings = {
      ...settings,
      types: {
        ...settings.types,
        [type]: enabled
      }
    };
    updateSettings(newSettings);
  }, [settings]);

  const toggleQuietHours = useCallback(async (enabled: boolean) => {
    if (!settings) return;

    // 햅틱 피드백
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newSettings = {
      ...settings,
      quietHours: {
        ...settings.quietHours,
        enabled
      }
    };
    updateSettings(newSettings);
  }, [settings]);

  const updateQuietHoursTime = (type: 'startTime' | 'endTime', time: string) => {
    if (!settings) return;

    const newSettings = {
      ...settings,
      quietHours: {
        ...settings.quietHours,
        [type]: time
      }
    };
    updateSettings(newSettings);
  };

  const updateCustomTime = (type: 'morningReminder' | 'eveningReminder' | 'weekendReminder', time: string) => {
    if (!settings) return;

    const newSettings = {
      ...settings,
      customTimes: {
        ...settings.customTimes,
        [type]: time
      }
    };
    updateSettings(newSettings);
  };

  const updateFrequency = useCallback(async (type: keyof NotificationSettings['frequency'], value: string) => {
    if (!settings) return;

    // 햅틱 피드백
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newSettings = {
      ...settings,
      frequency: {
        ...settings.frequency,
        [type]: value as any
      }
    };
    updateSettings(newSettings);
  }, [settings]);

  const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? '오후' : '오전';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${ampm} ${displayHour}:${minutes}`;
  };

  const parseTime = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTimeForStorage = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const showTimePickerFor = useCallback(async (type: 'quietStart' | 'quietEnd' | 'morning' | 'evening' | 'weekend') => {
    if (!settings) return;

    // 햅틱 피드백
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let currentTime: string;
    switch (type) {
      case 'quietStart':
        currentTime = settings.quietHours.startTime;
        break;
      case 'quietEnd':
        currentTime = settings.quietHours.endTime;
        break;
      case 'morning':
        currentTime = settings.customTimes.morningReminder;
        break;
      case 'evening':
        currentTime = settings.customTimes.eveningReminder;
        break;
      case 'weekend':
        currentTime = settings.customTimes.weekendReminder;
        break;
    }

    setShowTimePicker({
      type,
      time: parseTime(currentTime)
    });
  }, [settings]);

  const handleTimePickerChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(null);
    }

    if (selectedTime && showTimePicker) {
      const timeStr = formatTimeForStorage(selectedTime);
      
      switch (showTimePicker.type) {
        case 'quietStart':
          updateQuietHoursTime('startTime', timeStr);
          break;
        case 'quietEnd':
          updateQuietHoursTime('endTime', timeStr);
          break;
        case 'morning':
          updateCustomTime('morningReminder', timeStr);
          break;
        case 'evening':
          updateCustomTime('eveningReminder', timeStr);
          break;
        case 'weekend':
          updateCustomTime('weekendReminder', timeStr);
          break;
      }

      if (Platform.OS === 'ios') {
        setShowTimePicker(null);
      }
    }
  };

  if (loading || !settings) {
    return (
      <ScrollView 
        style={[styles.container, isDark && styles.containerDark]} 
        showsVerticalScrollIndicator={false}
      >
        <SkeletonList 
          itemCount={5}
          itemHeight={80}
          showHeader={true}
          style={{ marginBottom: 16 }}
        />
        <SkeletonList 
          itemCount={8}
          itemHeight={70}
          showHeader={true}
          style={{ marginBottom: 16 }}
        />
        <SkeletonList 
          itemCount={3}
          itemHeight={60}
          showHeader={true}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, isDark && styles.containerDark]} 
      showsVerticalScrollIndicator={false}
    >
      {/* 전체 알림 설정 */}
      <View style={[styles.section, isDark && styles.sectionDark]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="notifications" size={24} color="#3B82F6" />
          <Text style={styles.sectionTitle}>알림 설정</Text>
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>알림 받기</Text>
            <Text style={styles.settingDescription}>
              모든 알림을 활성화하거나 비활성화합니다
            </Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: '#F3F4F6', true: '#DBEAFE' }}
            thumbColor={settings.enabled ? '#3B82F6' : '#9CA3AF'}
          />
        </View>
      </View>

      {/* 알림 타입별 설정 */}
      {settings.enabled && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list" size={24} color="#10B981" />
            <Text style={styles.sectionTitle}>알림 유형</Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>데일리 챌린지</Text>
              <Text style={styles.settingDescription}>
                새로운 일일 챌린지 알림
              </Text>
            </View>
            <Switch
              value={settings.types[NotificationType.DAILY_CHALLENGE]}
              onValueChange={(value) => toggleNotificationType(NotificationType.DAILY_CHALLENGE, value)}
              trackColor={{ false: '#F3F4F6', true: '#D1FAE5' }}
              thumbColor={settings.types[NotificationType.DAILY_CHALLENGE] ? '#10B981' : '#9CA3AF'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>주간 챌린지</Text>
              <Text style={styles.settingDescription}>
                새로운 주간 챌린지 알림
              </Text>
            </View>
            <Switch
              value={settings.types[NotificationType.WEEKLY_CHALLENGE]}
              onValueChange={(value) => toggleNotificationType(NotificationType.WEEKLY_CHALLENGE, value)}
              trackColor={{ false: '#F3F4F6', true: '#D1FAE5' }}
              thumbColor={settings.types[NotificationType.WEEKLY_CHALLENGE] ? '#10B981' : '#9CA3AF'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>위치 기반 챌린지</Text>
              <Text style={styles.settingDescription}>
                특정 장소에 도착했을 때 알림
              </Text>
            </View>
            <Switch
              value={settings.types[NotificationType.LOCATION_CHALLENGE]}
              onValueChange={(value) => toggleNotificationType(NotificationType.LOCATION_CHALLENGE, value)}
              trackColor={{ false: '#F3F4F6', true: '#D1FAE5' }}
              thumbColor={settings.types[NotificationType.LOCATION_CHALLENGE] ? '#10B981' : '#9CA3AF'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>연속 기록 리마인더</Text>
              <Text style={styles.settingDescription}>
                연속 기록 유지를 위한 알림
              </Text>
            </View>
            <Switch
              value={settings.types[NotificationType.STREAK_REMINDER]}
              onValueChange={(value) => toggleNotificationType(NotificationType.STREAK_REMINDER, value)}
              trackColor={{ false: '#F3F4F6', true: '#FECACA' }}
              thumbColor={settings.types[NotificationType.STREAK_REMINDER] ? '#EF4444' : '#9CA3AF'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>뱃지 획득</Text>
              <Text style={styles.settingDescription}>
                새로운 뱃지를 획득했을 때 알림
              </Text>
            </View>
            <Switch
              value={settings.types[NotificationType.BADGE_EARNED]}
              onValueChange={(value) => toggleNotificationType(NotificationType.BADGE_EARNED, value)}
              trackColor={{ false: '#F3F4F6', true: '#FEF3C7' }}
              thumbColor={settings.types[NotificationType.BADGE_EARNED] ? '#F59E0B' : '#9CA3AF'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>챌린지 만료 알림</Text>
              <Text style={styles.settingDescription}>
                챌린지가 곧 종료될 때 알림
              </Text>
            </View>
            <Switch
              value={settings.types[NotificationType.CHALLENGE_EXPIRING]}
              onValueChange={(value) => toggleNotificationType(NotificationType.CHALLENGE_EXPIRING, value)}
              trackColor={{ false: '#F3F4F6', true: '#FED7AA' }}
              thumbColor={settings.types[NotificationType.CHALLENGE_EXPIRING] ? '#F97316' : '#9CA3AF'}
            />
          </View>
        </View>
      )}

      {/* 방해 금지 시간 설정 */}
      {settings.enabled && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="moon" size={24} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>방해 금지 시간</Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>방해 금지 시간 사용</Text>
              <Text style={styles.settingDescription}>
                설정된 시간에는 알림을 받지 않습니다
              </Text>
            </View>
            <Switch
              value={settings.quietHours.enabled}
              onValueChange={toggleQuietHours}
              trackColor={{ false: '#F3F4F6', true: '#E9D5FF' }}
              thumbColor={settings.quietHours.enabled ? '#8B5CF6' : '#9CA3AF'}
            />
          </View>

          {settings.quietHours.enabled && (
            <>
              <TouchableOpacity
                style={styles.timeSettingItem}
                onPress={() => showTimePickerFor('quietStart')}
              >
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>시작 시간</Text>
                  <Text style={styles.timeValue}>
                    {formatTime(settings.quietHours.startTime)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.timeSettingItem}
                onPress={() => showTimePickerFor('quietEnd')}
              >
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>종료 시간</Text>
                  <Text style={styles.timeValue}>
                    {formatTime(settings.quietHours.endTime)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* 알림 빈도 설정 */}
      {settings.enabled && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="timer" size={24} color="#F59E0B" />
            <Text style={styles.sectionTitle}>알림 빈도</Text>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingTitle}>데일리 챌린지 알림</Text>
            <View style={styles.frequencyButtons}>
              {['once', 'twice', 'three_times'].map((freq) => {
                const labels = {
                  'once': '1회',
                  'twice': '2회',
                  'three_times': '3회'
                };
                
                return (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyButton,
                      settings.frequency.dailyChallenges === freq && styles.frequencyButtonActive
                    ]}
                    onPress={() => updateFrequency('dailyChallenges', freq)}
                  >
                    <Text style={[
                      styles.frequencyButtonText,
                      settings.frequency.dailyChallenges === freq && styles.frequencyButtonTextActive
                    ]}>
                      {labels[freq as keyof typeof labels]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingTitle}>연속 기록 리마인더</Text>
            <View style={styles.frequencyButtons}>
              {['daily', 'every_2_days', 'weekly'].map((freq) => {
                const labels = {
                  'daily': '매일',
                  'every_2_days': '2일마다',
                  'weekly': '주간'
                };
                
                return (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyButton,
                      settings.frequency.streakReminders === freq && styles.frequencyButtonActive
                    ]}
                    onPress={() => updateFrequency('streakReminders', freq)}
                  >
                    <Text style={[
                      styles.frequencyButtonText,
                      settings.frequency.streakReminders === freq && styles.frequencyButtonTextActive
                    ]}>
                      {labels[freq as keyof typeof labels]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* 사용자 정의 시간 설정 */}
      {settings.enabled && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={24} color="#EF4444" />
            <Text style={styles.sectionTitle}>알림 시간</Text>
          </View>

          <TouchableOpacity
            style={styles.timeSettingItem}
            onPress={() => showTimePickerFor('morning')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>오전 알림</Text>
              <Text style={styles.timeValue}>
                {formatTime(settings.customTimes.morningReminder)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.timeSettingItem}
            onPress={() => showTimePickerFor('evening')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>저녁 알림</Text>
              <Text style={styles.timeValue}>
                {formatTime(settings.customTimes.eveningReminder)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.timeSettingItem}
            onPress={() => showTimePickerFor('weekend')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>주말 알림</Text>
              <Text style={styles.timeValue}>
                {formatTime(settings.customTimes.weekendReminder)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      )}

      {/* 시간 선택기 */}
      {showTimePicker && (
        <DateTimePicker
          value={showTimePicker.time}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimePickerChange}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  timeSettingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  timeValue: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  frequencyButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  frequencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  frequencyButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  frequencyButtonTextActive: {
    color: '#FFFFFF',
  },
  
  // 다크 테마 스타일
  containerDark: {
    backgroundColor: '#111827',
  },
  sectionDark: {
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  sectionTitleDark: {
    color: '#F9FAFB',
  },
  settingItemDark: {
    borderBottomColor: '#374151',
  },
  settingTitleDark: {
    color: '#F9FAFB',
  },
  settingDescriptionDark: {
    color: '#9CA3AF',
  },
  timeValueDark: {
    color: '#60A5FA',
  },
  frequencyButtonDark: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  frequencyButtonActiveDark: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  frequencyButtonTextDark: {
    color: '#D1D5DB',
  },
});

export default NotificationSettingsComponent;