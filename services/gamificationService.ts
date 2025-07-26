/**
 * 게임화 시스템 통합 서비스
 * 리더보드, 뱃지, 포인트 시스템을 통합 관리
 */

import { BadgeService } from './badgeService';
import { leaderboardService } from './leaderboardService';
import { BadgeConditionType, BadgeEarnedEvent } from '../types/badge';

export interface GameActionResult {
  success: boolean;
  pointsAwarded: number;
  badgesEarned: BadgeEarnedEvent[];
  levelUp?: {
    oldLevel: number;
    newLevel: number;
    levelName: string;
  };
  rankingChange?: {
    oldRank: number;
    newRank: number;
  };
}

export interface ActivityContext {
  action: string;
  metadata?: any;
  location?: {
    latitude: number;
    longitude: number;
    placeName?: string;
  };
  difficulty?: number; // 1.0 = 기본, 1.5 = 어려움
  quality?: number; // 1-5 품질 점수
}

/**
 * 게임화 시스템 통합 서비스 클래스
 */
export class GamificationService {
  /**
   * 시 작성 완료 시 포인트 및 뱃지 처리
   */
  static async onPoemCreated(
    userId: string,
    poemId: string,
    context: ActivityContext = { action: 'poem_created' }
  ): Promise<GameActionResult> {
    try {
      const result: GameActionResult = {
        success: false,
        pointsAwarded: 0,
        badgesEarned: []
      };

      // 1. 포인트 계산 및 추가
      const basePoints = 50; // 시 작성 기본 포인트
      const difficultyMultiplier = context.difficulty || 1.0;
      const qualityMultiplier = context.quality ? (context.quality / 3.0) : 1.0; // 3점 기준으로 정규화

      const finalMultiplier = difficultyMultiplier * qualityMultiplier;
      const pointsAwarded = Math.round(basePoints * finalMultiplier);

      // 리더보드에 포인트 추가
      const pointsAdded = await leaderboardService.addPoints(
        userId,
        'poem_creation',
        basePoints,
        finalMultiplier,
        '시 작성으로 포인트 획득',
        {
          poem_id: poemId,
          quality_score: context.quality,
          difficulty: context.difficulty,
          location: context.location
        }
      );

      if (!pointsAdded) {
        throw new Error('Failed to add points to leaderboard');
      }

      result.pointsAwarded = pointsAwarded;

      // 2. 뱃지 진행도 업데이트
      const badgeEvents = await BadgeService.onPoemCreated(userId, poemId);
      result.badgesEarned.push(...badgeEvents);

      // 3. 레벨업 확인
      const userStats = await leaderboardService.getUserStats(userId);
      if (userStats) {
        const currentLevel = leaderboardService.calculateLevelFromPoints(userStats.total_points);
        const previousPoints = userStats.total_points - pointsAwarded;
        const previousLevel = leaderboardService.calculateLevelFromPoints(previousPoints);

        if (currentLevel.level > previousLevel.level) {
          result.levelUp = {
            oldLevel: previousLevel.level,
            newLevel: currentLevel.level,
            levelName: currentLevel.levelName
          };

          // 레벨업 뱃지 확인
          const levelUpBadges = await BadgeService.updateBadgeProgress(
            userId,
            BadgeConditionType.TOTAL_POINTS,
            0, // 증가값 없음, 현재 총 포인트로 확인
            {
              triggeredBy: { action: 'level_up', oldLevel: previousLevel.level, newLevel: currentLevel.level }
            }
          );
          result.badgesEarned.push(...levelUpBadges);
        }
      }

      // 4. 위치 기반 뱃지 확인
      if (context.location) {
        const locationBadges = await BadgeService.updateBadgeProgress(
          userId,
          BadgeConditionType.LOCATION_VISIT,
          1,
          {
            triggeredBy: { action: 'location_visit', location: context.location },
            location: context.location
          }
        );
        result.badgesEarned.push(...locationBadges);
      }

      // 5. 랭킹 업데이트 트리거
      await leaderboardService.triggerRankingUpdate();

      result.success = true;
      return result;

    } catch (error) {
      console.error('Error processing poem creation in gamification system:', error);
      return {
        success: false,
        pointsAwarded: 0,
        badgesEarned: []
      };
    }
  }

  /**
   * 챌린지 완료 시 포인트 및 뱃지 처리
   */
  static async onChallengeCompleted(
    userId: string,
    challengeId: string,
    challengeType: string,
    context: ActivityContext = { action: 'challenge_completed' }
  ): Promise<GameActionResult> {
    try {
      const result: GameActionResult = {
        success: false,
        pointsAwarded: 0,
        badgesEarned: []
      };

      // 1. 챌린지 타입에 따른 포인트 계산
      const challengePointsMap: { [key: string]: number } = {
        'daily': 100,
        'weekly': 300,
        'special': 500,
        'location': 200,
        'creative': 250
      };

      const basePoints = challengePointsMap[challengeType] || 100;
      const multiplier = context.difficulty || 1.0;
      const pointsAwarded = Math.round(basePoints * multiplier);

      // 리더보드에 포인트 추가
      const pointsAdded = await leaderboardService.addPoints(
        userId,
        'challenge_completion',
        basePoints,
        multiplier,
        `${challengeType} 챌린지 완료`,
        {
          challenge_id: challengeId,
          challenge_type: challengeType,
          difficulty: context.difficulty
        }
      );

      if (!pointsAdded) {
        throw new Error('Failed to add points for challenge completion');
      }

      result.pointsAwarded = pointsAwarded;

      // 2. 챌린지 완료 뱃지 진행도 업데이트
      const challengeBadges = await BadgeService.onChallengeCompleted(
        userId,
        challengeId,
        challengeType
      );
      result.badgesEarned.push(...challengeBadges);

      // 3. 연속 챌린지 완료 확인 (연속 일수 뱃지)
      const streakBadges = await BadgeService.updateBadgeProgress(
        userId,
        BadgeConditionType.CONSECUTIVE_DAYS,
        0, // 현재 스트릭으로 확인
        {
          triggeredBy: { action: 'challenge_completed', challengeId }
        }
      );
      result.badgesEarned.push(...streakBadges);

      // 4. 랭킹 업데이트
      await leaderboardService.triggerRankingUpdate();

      result.success = true;
      return result;

    } catch (error) {
      console.error('Error processing challenge completion in gamification system:', error);
      return {
        success: false,
        pointsAwarded: 0,
        badgesEarned: []
      };
    }
  }

  /**
   * 사진 촬영 시 포인트 및 뱃지 처리
   */
  static async onPhotoTaken(
    userId: string,
    photoId: string,
    context: ActivityContext = { action: 'photo_taken' }
  ): Promise<GameActionResult> {
    try {
      const result: GameActionResult = {
        success: false,
        pointsAwarded: 0,
        badgesEarned: []
      };

      // 1. 포인트 추가
      const basePoints = 25; // 사진 촬영 기본 포인트
      const multiplier = context.difficulty || 1.0;
      const pointsAwarded = Math.round(basePoints * multiplier);

      const pointsAdded = await leaderboardService.addPoints(
        userId,
        'photo_upload',
        basePoints,
        multiplier,
        '사진 촬영으로 포인트 획득',
        {
          photo_id: photoId,
          location: context.location
        }
      );

      if (!pointsAdded) {
        throw new Error('Failed to add points for photo upload');
      }

      result.pointsAwarded = pointsAwarded;

      // 2. 사진 촬영 뱃지 진행도 업데이트
      const photoBadges = await BadgeService.onPhotoTaken(userId, photoId);
      result.badgesEarned.push(...photoBadges);

      result.success = true;
      return result;

    } catch (error) {
      console.error('Error processing photo upload in gamification system:', error);
      return {
        success: false,
        pointsAwarded: 0,
        badgesEarned: []
      };
    }
  }

  /**
   * 소셜 활동 (좋아요, 댓글, 공유) 처리
   */
  static async onSocialActivity(
    userId: string,
    activityType: 'like_given' | 'comment_posted' | 'content_shared',
    targetId: string,
    context: ActivityContext
  ): Promise<GameActionResult> {
    try {
      const result: GameActionResult = {
        success: false,
        pointsAwarded: 0,
        badgesEarned: []
      };

      // 1. 활동 타입에 따른 포인트
      const socialPointsMap = {
        'like_given': 5,
        'comment_posted': 15,
        'content_shared': 10
      };

      const points = socialPointsMap[activityType];
      
      const pointsAdded = await leaderboardService.addPoints(
        userId,
        activityType,
        points,
        1.0,
        `소셜 활동: ${activityType}`,
        { target_id: targetId }
      );

      if (!pointsAdded) {
        throw new Error(`Failed to add points for ${activityType}`);
      }

      result.pointsAwarded = points;

      // 2. 소셜 활동 뱃지 진행도 업데이트
      let conditionType: BadgeConditionType;
      switch (activityType) {
        case 'comment_posted':
          conditionType = BadgeConditionType.COMMENT_COUNT;
          break;
        case 'content_shared':
          conditionType = BadgeConditionType.SHARE_COUNT;
          break;
        default:
          // like_given은 별도 뱃지 조건이 없으므로 소셜 일반 활동으로 처리
          result.success = true;
          return result;
      }

      const socialBadges = await BadgeService.updateBadgeProgress(
        userId,
        conditionType,
        1,
        {
          triggeredBy: { action: activityType, targetId }
        }
      );
      result.badgesEarned.push(...socialBadges);

      result.success = true;
      return result;

    } catch (error) {
      console.error('Error processing social activity in gamification system:', error);
      return {
        success: false,
        pointsAwarded: 0,
        badgesEarned: []
      };
    }
  }

  /**
   * 사용자의 전체 게임화 상태 조회
   */
  static async getUserGamificationStatus(userId: string) {
    try {
      // 1. 리더보드 정보
      const [userStats, rankingInfo, badgeStats] = await Promise.all([
        leaderboardService.getUserStats(userId),
        leaderboardService.getUserRankingInfo(userId),
        BadgeService.getUserBadgeStats(userId)
      ]);

      const levelInfo = userStats ? 
        leaderboardService.calculateLevelFromPoints(userStats.total_points) : 
        { level: 1, levelName: 'beginner', progress: 0, nextLevelPoints: 100 };

      return {
        // 레벨 및 포인트 정보
        level: levelInfo,
        points: {
          total: userStats?.total_points || 0,
          weekly: userStats?.weekly_points || 0,
          monthly: userStats?.monthly_points || 0,
          lifetime: userStats?.lifetime_points || 0
        },
        
        // 랭킹 정보
        ranking: {
          global: rankingInfo?.global_rank || null,
          weekly: rankingInfo?.weekly_rank || null,
          monthly: rankingInfo?.monthly_rank || null,
          regional: rankingInfo?.regional_rank || null,
          percentile: rankingInfo?.global_percentile || null
        },

        // 뱃지 정보
        badges: {
          total: badgeStats.totalBadges,
          earned: badgeStats.earnedBadges,
          completionRate: badgeStats.completionRate,
          byRarity: badgeStats.byRarity,
          byCategory: badgeStats.byCategory,
          recent: badgeStats.recentEarned.slice(0, 3), // 최근 3개만
          nextAvailable: badgeStats.nextAvailable.slice(0, 3) // 다음 3개만
        },

        // 통계 정보
        stats: {
          poemsCreated: userStats?.poems_created || 0,
          photosUploaded: userStats?.photos_uploaded || 0,
          challengesCompleted: userStats?.challenges_completed || 0,
          currentStreak: userStats?.current_streak || 0,
          longestStreak: userStats?.longest_streak || 0,
          locationsDiscovered: userStats?.locations_discovered || 0,
          socialShares: userStats?.social_shares || 0,
          likesReceived: userStats?.likes_received || 0
        }
      };

    } catch (error) {
      console.error('Error getting user gamification status:', error);
      throw error;
    }
  }

  /**
   * 모든 뱃지 알림 발송
   */
  static async sendBadgeNotifications(badgeEvents: BadgeEarnedEvent[]): Promise<void> {
    for (const event of badgeEvents) {
      try {
        await BadgeService.sendBadgeNotification(event.userBadge.userId, event);
      } catch (error) {
        console.error('Error sending badge notification:', error);
      }
    }
  }

  /**
   * 특정 기간 동안의 활동 요약
   */
  static async getActivitySummary(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ) {
    try {
      const userStats = await leaderboardService.getUserStats(userId);
      const badgeStats = await BadgeService.getUserBadgeStats(userId);
      
      let periodPoints = 0;
      switch (period) {
        case 'daily':
          // 일일 포인트는 별도 계산 필요 (현재 스키마에는 없음)
          periodPoints = userStats?.weekly_points || 0; // 임시로 주간 포인트 사용
          break;
        case 'weekly':
          periodPoints = userStats?.weekly_points || 0;
          break;
        case 'monthly':
          periodPoints = userStats?.monthly_points || 0;
          break;
      }

      return {
        period,
        points: periodPoints,
        activitiesCompleted: {
          poems: userStats?.poems_created || 0,
          photos: userStats?.photos_uploaded || 0,
          challenges: userStats?.challenges_completed || 0
        },
        badgesEarned: badgeStats.recentEarned.length,
        streak: userStats?.current_streak || 0,
        ranking: {
          global: period === 'weekly' ? await leaderboardService.getUserRankingInfo(userId).then(r => r?.weekly_rank) : null,
          change: 0 // 변화량 계산은 별도 로직 필요
        }
      };

    } catch (error) {
      console.error('Error getting activity summary:', error);
      throw error;
    }
  }
}

export default GamificationService;