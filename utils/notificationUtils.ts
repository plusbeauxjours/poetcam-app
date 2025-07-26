/**
 * 알림 유틸리티 함수
 * Notification Utility Functions
 */

import NotificationService, { NotificationType } from '../services/notificationService';
import { GamificationService } from '../services/gamificationService';
import { BadgeService } from '../services/badgeService';
import { leaderboardService } from '../services/leaderboardService';

export class NotificationUtils {
  /**
   * 게임화 시스템과 통합된 알림 초기화
   */
  static async initializeNotifications(userId: string): Promise<void> {
    try {
      // 알림 서비스 초기화
      await NotificationService.initialize();

      // 데일리 챌린지 알림 스케줄링
      await NotificationService.scheduleDailyChallengeReminders(userId);

      // 사용자 상태에 따른 연속 기록 리마인더 설정
      const userStats = await leaderboardService.getUserStats(userId);
      if (userStats) {
        await NotificationService.scheduleStreakReminder(userId, userStats.current_streak || 0);
      }

      console.log('Notifications initialized for user:', userId);
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  /**
   * 뱃지 획득 알림 발송
   */
  static async sendBadgeEarnedNotification(
    userId: string,
    badgeName: string,
    badgeDescription: string,
    badgeRarity: string,
    points: number
  ): Promise<void> {
    try {
      const rarityEmojis: Record<string, string> = {
        'common': '🥉',
        'uncommon': '🥈',
        'rare': '🥇',
        'epic': '💎',
        'legendary': '👑'
      };

      const emoji = rarityEmojis[badgeRarity] || '🏆';
      
      await NotificationService.sendNotification(
        userId,
        NotificationType.BADGE_EARNED,
        `${emoji} 새로운 뱃지 획득!`,
        `"${badgeName}" 뱃지를 획득했습니다! (+${points} 포인트)`,
        {
          badgeName,
          badgeDescription,
          badgeRarity,
          points,
          navigateTo: 'BadgeCollection'
        }
      );
    } catch (error) {
      console.error('Error sending badge earned notification:', error);
    }
  }

  /**
   * 레벨업 알림 발송
   */
  static async sendLevelUpNotification(
    userId: string,
    oldLevel: number,
    newLevel: number,
    levelName: string
  ): Promise<void> {
    try {
      await NotificationService.sendNotification(
        userId,
        NotificationType.MILESTONE_ACHIEVED,
        '🎉 레벨업!',
        `축하합니다! 레벨 ${newLevel} (${levelName})에 도달했습니다!`,
        {
          oldLevel,
          newLevel,
          levelName,
          navigateTo: 'Profile'
        }
      );
    } catch (error) {
      console.error('Error sending level up notification:', error);
    }
  }

  /**
   * 랭킹 변동 알림 발송
   */
  static async sendRankingUpdateNotification(
    userId: string,
    oldRank: number,
    newRank: number,
    rankType: 'global' | 'weekly' | 'monthly' = 'global'
  ): Promise<void> {
    try {
      const rankTypeNames = {
        'global': '전체',
        'weekly': '주간',
        'monthly': '월간'
      };

      let title: string;
      let body: string;

      if (newRank < oldRank) {
        // 순위 상승
        title = '📈 순위 상승!';
        body = `${rankTypeNames[rankType]} 랭킹이 ${oldRank}위에서 ${newRank}위로 상승했습니다!`;
      } else if (newRank > oldRank) {
        // 순위 하락
        title = '📉 순위 변동';
        body = `${rankTypeNames[rankType]} 랭킹이 ${oldRank}위에서 ${newRank}위로 변경되었습니다.`;
      } else {
        // 순위 유지
        return;
      }

      await NotificationService.sendNotification(
        userId,
        NotificationType.LEADERBOARD_UPDATE,
        title,
        body,
        {
          oldRank,
          newRank,
          rankType,
          navigateTo: 'Leaderboard'
        }
      );
    } catch (error) {
      console.error('Error sending ranking update notification:', error);
    }
  }

  /**
   * 챌린지 완료 축하 알림
   */
  static async sendChallengeCompletedNotification(
    userId: string,
    challengeName: string,
    challengeType: string,
    pointsEarned: number,
    badgesEarned?: number
  ): Promise<void> {
    try {
      const typeEmojis: Record<string, string> = {
        'daily': '📅',
        'weekly': '🗓️',
        'location': '📍',
        'creative': '🎨',
        'special': '⭐'
      };

      const emoji = typeEmojis[challengeType] || '🎯';
      let body = `"${challengeName}" 챌린지를 완료했습니다! (+${pointsEarned} 포인트)`;
      
      if (badgesEarned && badgesEarned > 0) {
        body += ` 새로운 뱃지 ${badgesEarned}개도 획득했어요!`;
      }

      await NotificationService.sendNotification(
        userId,
        NotificationType.DAILY_CHALLENGE,
        `${emoji} 챌린지 완료!`,
        body,
        {
          challengeName,
          challengeType,
          pointsEarned,
          badgesEarned,
          navigateTo: 'Challenges'
        }
      );
    } catch (error) {
      console.error('Error sending challenge completed notification:', error);
    }
  }

  /**
   * 연속 기록 달성 알림
   */
  static async sendStreakAchievementNotification(
    userId: string,
    streakDays: number,
    isNewRecord: boolean = false
  ): Promise<void> {
    try {
      let title: string;
      let body: string;

      if (isNewRecord) {
        title = '🔥 신기록 달성!';
        body = `축하합니다! ${streakDays}일 연속 기록으로 새로운 개인 기록을 세웠습니다!`;
      } else if (streakDays % 7 === 0) {
        // 주간 단위 달성
        const weeks = streakDays / 7;
        title = `🔥 ${weeks}주 연속 달성!`;
        body = `놀라워요! ${streakDays}일 연속으로 시를 작성하고 있습니다. 계속 이어가세요!`;
      } else if (streakDays >= 30) {
        title = '🔥 놀라운 연속 기록!';
        body = `${streakDays}일 연속 기록을 유지하고 있습니다. 정말 대단해요!`;
      } else {
        title = '🔥 연속 기록 유지!';
        body = `${streakDays}일 연속으로 시를 작성하고 있습니다. 계속해서 기록을 이어가세요!`;
      }

      await NotificationService.sendNotification(
        userId,
        NotificationType.STREAK_REMINDER,
        title,
        body,
        {
          streakDays,
          isNewRecord,
          navigateTo: 'Profile'
        }
      );
    } catch (error) {
      console.error('Error sending streak achievement notification:', error);
    }
  }

  /**
   * 주간 요약 알림
   */
  static async sendWeeklySummaryNotification(userId: string): Promise<void> {
    try {
      const summary = await GamificationService.getActivitySummary(userId, 'weekly');
      
      if (summary.points === 0) {
        // 활동이 없었던 경우
        await NotificationService.sendNotification(
          userId,
          NotificationType.CUSTOM_REMINDER,
          '📊 이번 주를 돌아보세요',
          '이번 주는 어떤 시를 작성해보셨나요? 새로운 챌린지에 참여해보세요!',
          {
            navigateTo: 'Challenges'
          }
        );
        return;
      }

      const achievements = [];
      if (summary.activitiesCompleted.poems > 0) {
        achievements.push(`시 ${summary.activitiesCompleted.poems}편`);
      }
      if (summary.activitiesCompleted.challenges > 0) {
        achievements.push(`챌린지 ${summary.activitiesCompleted.challenges}개`);
      }
      if (summary.badgesEarned > 0) {
        achievements.push(`뱃지 ${summary.badgesEarned}개`);
      }

      const achievementText = achievements.join(', ');
      
      await NotificationService.sendNotification(
        userId,
        NotificationType.CUSTOM_REMINDER,
        '📊 이번 주 활동 요약',
        `이번 주에 ${achievementText}을 달성하며 ${summary.points}포인트를 획득했습니다!`,
        {
          summary,
          navigateTo: 'Profile'
        }
      );
    } catch (error) {
      console.error('Error sending weekly summary notification:', error);
    }
  }

  /**
   * 특별 이벤트 알림
   */
  static async sendSpecialEventNotification(
    userId: string,
    eventName: string,
    eventDescription: string,
    eventData?: any
  ): Promise<void> {
    try {
      await NotificationService.sendNotification(
        userId,
        NotificationType.CUSTOM_REMINDER,
        '🎉 특별 이벤트!',
        `${eventName}: ${eventDescription}`,
        {
          eventName,
          eventDescription,
          eventData,
          navigateTo: 'Events'
        }
      );
    } catch (error) {
      console.error('Error sending special event notification:', error);
    }
  }

  /**
   * 친구 활동 알림 (소셜 기능이 있는 경우)
   */
  static async sendFriendActivityNotification(
    userId: string,
    friendName: string,
    activityType: 'poem_created' | 'badge_earned' | 'level_up',
    activityData: any
  ): Promise<void> {
    try {
      let title: string;
      let body: string;

      switch (activityType) {
        case 'poem_created':
          title = '👥 친구 활동';
          body = `${friendName}님이 새로운 시를 작성했습니다!`;
          break;
        case 'badge_earned':
          title = '👥 친구가 뱃지 획득!';
          body = `${friendName}님이 "${activityData.badgeName}" 뱃지를 획득했습니다!`;
          break;
        case 'level_up':
          title = '👥 친구 레벨업!';
          body = `${friendName}님이 레벨 ${activityData.newLevel}에 도달했습니다!`;
          break;
        default:
          return;
      }

      await NotificationService.sendNotification(
        userId,
        NotificationType.CUSTOM_REMINDER,
        title,
        body,
        {
          friendName,
          activityType,
          activityData,
          navigateTo: 'Social'
        }
      );
    } catch (error) {
      console.error('Error sending friend activity notification:', error);
    }
  }

  /**
   * 개인화된 도전 제안 알림
   */
  static async sendPersonalizedChallengeNotification(userId: string): Promise<void> {
    try {
      // 사용자의 활동 패턴 분석
      const userStats = await leaderboardService.getUserStats(userId);
      const badgeStats = await BadgeService.getUserBadgeStats(userId);
      
      if (!userStats) return;

      let challengeType: string;
      let title: string;
      let body: string;

      // 활동 패턴에 따른 맞춤 챌린지 제안
      if (userStats.current_streak === 0) {
        challengeType = 'streak_start';
        title = '🔥 새로운 도전을 시작해보세요!';
        body = '오늘부터 연속 기록을 시작해보는 것은 어떨까요?';
      } else if (userStats.poems_created < 5) {
        challengeType = 'creativity_boost';
        title = '✍️ 창작 실력을 키워보세요!';
        body = '다양한 주제로 시를 작성하면서 창작 실력을 향상시켜보세요!';
      } else if (badgeStats.completionRate < 30) {
        challengeType = 'badge_collector';
        title = '🏆 뱃지 컬렉터가 되어보세요!';
        body = '아직 획득하지 못한 뱃지들에 도전해보는 것은 어떨까요?';
      } else {
        challengeType = 'advanced_challenge';
        title = '⭐ 고급 챌린지에 도전하세요!';
        body = '이제 더 어려운 챌린지에 도전할 때입니다!';
      }

      await NotificationService.sendNotification(
        userId,
        NotificationType.CUSTOM_REMINDER,
        title,
        body,
        {
          challengeType,
          userStats,
          badgeStats,
          navigateTo: 'Challenges'
        }
      );
    } catch (error) {
      console.error('Error sending personalized challenge notification:', error);
    }
  }

  /**
   * 알림 최적화를 위한 사용자 패턴 분석
   */
  static async analyzeUserNotificationPatterns(userId: string): Promise<{
    optimalTimes: string[];
    preferredTypes: NotificationType[];
    engagementRate: number;
  }> {
    try {
      // 사용자의 알림 상호작용 데이터 분석
      // 실제 구현에서는 더 복잡한 분석이 필요
      
      return {
        optimalTimes: ['09:00', '19:00'], // 기본값
        preferredTypes: [
          NotificationType.DAILY_CHALLENGE,
          NotificationType.BADGE_EARNED,
          NotificationType.STREAK_REMINDER
        ],
        engagementRate: 0.75 // 75% 참여율
      };
    } catch (error) {
      console.error('Error analyzing notification patterns:', error);
      return {
        optimalTimes: ['09:00', '19:00'],
        preferredTypes: [NotificationType.DAILY_CHALLENGE],
        engagementRate: 0.5
      };
    }
  }

  /**
   * 알림 성과 분석 및 최적화
   */
  static async optimizeNotificationStrategy(userId: string): Promise<void> {
    try {
      const patterns = await this.analyzeUserNotificationPatterns(userId);
      const currentSettings = await NotificationService.getUserNotificationSettings(userId);

      // 참여율이 낮은 경우 알림 빈도 조정
      if (patterns.engagementRate < 0.3) {
        const optimizedSettings = {
          ...currentSettings,
          frequency: {
            ...currentSettings.frequency,
            dailyChallenges: 'once' as const, // 빈도 줄이기
            streakReminders: 'every_2_days' as const
          }
        };

        await NotificationService.updateNotificationSettings(optimizedSettings);
      }

      // 최적 시간대로 사용자 정의 시간 조정
      if (patterns.optimalTimes.length >= 2) {
        const optimizedSettings = {
          ...currentSettings,
          customTimes: {
            ...currentSettings.customTimes,
            morningReminder: patterns.optimalTimes[0],
            eveningReminder: patterns.optimalTimes[1]
          }
        };

        await NotificationService.updateNotificationSettings(optimizedSettings);
      }

      console.log('Notification strategy optimized for user:', userId);
    } catch (error) {
      console.error('Error optimizing notification strategy:', error);
    }
  }
}

export default NotificationUtils;