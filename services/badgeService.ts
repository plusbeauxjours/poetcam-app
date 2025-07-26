import { supabase } from '../config/supabase';
import {
  Badge,
  BadgeCategory,
  BadgeRarity,
  BadgeConditionType,
  BadgeCondition,
  UserBadge,
  BadgeProgress,
  BadgeStats,
  BadgeFilterOptions,
  BadgeEarnedEvent,
  BadgeNotificationSettings
} from '../types/badge';

export class BadgeService {
  // 모든 활성 뱃지 조회
  static async getAllBadges(filters?: BadgeFilterOptions): Promise<Badge[]> {
    try {
      let query = supabase
        .from('badges')
        .select('*')
        .eq('is_active', true)
        .order('rarity', { ascending: true })
        .order('name', { ascending: true });

      if (filters) {
        if (filters.category && filters.category.length > 0) {
          query = query.in('category', filters.category);
        }
        if (filters.rarity && filters.rarity.length > 0) {
          query = query.in('rarity', filters.rarity);
        }
        if (filters.secret !== undefined) {
          query = query.eq('is_secret', filters.secret);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching badges:', error);
      throw error;
    }
  }

  // 특정 뱃지 조회
  static async getBadgeById(badgeId: string): Promise<Badge | null> {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .eq('id', badgeId)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching badge:', error);
      throw error;
    }
  }

  // 사용자가 획득한 뱃지 목록 조회
  static async getUserBadges(userId: string): Promise<UserBadge[]> {
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          *,
          badges (
            id, name, description, category, rarity, 
            icon_name, icon_color, points
          )
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user badges:', error);
      throw error;
    }
  }

  // 사용자의 뱃지 통계 조회
  static async getUserBadgeStats(userId: string): Promise<BadgeStats> {
    try {
      const { data, error } = await supabase
        .from('user_badge_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      // 최근 획득한 뱃지들
      const recentBadges = await this.getUserBadges(userId);
      const recentEarned = recentBadges.slice(0, 5);

      // 다음 획득 가능한 뱃지들
      const nextAvailable = await this.getNextAvailableBadges(userId);

      const stats: BadgeStats = {
        totalBadges: data.total_available_badges || 0,
        earnedBadges: data.earned_badges || 0,
        completionRate: data.completion_rate || 0,
        byRarity: {
          common: data.common_badges || 0,
          uncommon: data.uncommon_badges || 0,
          rare: data.rare_badges || 0,
          epic: data.epic_badges || 0,
          legendary: data.legendary_badges || 0
        },
        byCategory: {
          beginner: data.beginner_badges || 0,
          creative: data.creative_badges || 0,
          location: data.location_badges || 0,
          challenge: data.challenge_badges || 0,
          social: data.social_badges || 0,
          achievement: data.achievement_badges || 0,
          seasonal: data.seasonal_badges || 0,
          special: data.special_badges || 0
        },
        recentEarned,
        nextAvailable
      };

      return stats;
    } catch (error) {
      console.error('Error fetching user badge stats:', error);
      throw error;
    }
  }

  // 다음 획득 가능한 뱃지들 조회
  static async getNextAvailableBadges(userId: string, limit: number = 5): Promise<Badge[]> {
    try {
      // 이미 획득한 뱃지 ID들 조회
      const { data: earnedBadges } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', userId);

      const earnedBadgeIds = earnedBadges?.map(ub => ub.badge_id) || [];

      // 획득하지 않은 뱃지들 중에서 조건이 가장 가까운 것들 조회
      let query = supabase
        .from('badges')
        .select('*')
        .eq('is_active', true)
        .eq('is_secret', false)
        .order('rarity', { ascending: true })
        .limit(limit);

      if (earnedBadgeIds.length > 0) {
        query = query.not('id', 'in', `(${earnedBadgeIds.join(',')})`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching next available badges:', error);
      throw error;
    }
  }

  // 뱃지 진행도 조회
  static async getBadgeProgress(userId: string, badgeId: string): Promise<BadgeProgress[]> {
    try {
      const { data, error } = await supabase
        .from('badge_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('badge_id', badgeId)
        .order('condition_index', { ascending: true });

      if (error) throw error;

      return (data || []).map(row => ({
        conditionIndex: row.condition_index,
        current: row.current_value,
        target: row.target_value,
        completed: row.completed,
        lastUpdated: new Date(row.last_updated)
      }));
    } catch (error) {
      console.error('Error fetching badge progress:', error);
      throw error;
    }
  }

  // 뱃지 진행도 업데이트
  static async updateBadgeProgress(
    userId: string,
    conditionType: BadgeConditionType,
    increment: number = 1,
    metadata?: any
  ): Promise<BadgeEarnedEvent[]> {
    try {
      const earnedEvents: BadgeEarnedEvent[] = [];

      // 해당 조건 타입을 가진 모든 뱃지 조회
      const badges = await this.getBadgesWithCondition(conditionType);

      for (const badge of badges) {
        // 이미 획득한 뱃지는 스킵
        const existingBadge = await this.getUserBadge(userId, badge.id);
        if (existingBadge) continue;

        // 각 조건에 대해 진행도 업데이트
        let allConditionsMet = true;
        const updatedProgress: BadgeProgress[] = [];

        for (let i = 0; i < badge.conditions.length; i++) {
          const condition = badge.conditions[i];
          
          if (condition.type === conditionType) {
            // 해당 조건의 진행도 업데이트
            const progress = await this.updateSingleBadgeProgress(
              userId,
              badge.id,
              i,
              condition,
              increment
            );
            updatedProgress.push(progress);
            
            if (!progress.completed) {
              allConditionsMet = false;
            }
          } else {
            // 다른 조건의 현재 진행도 확인
            const progress = await this.checkConditionProgress(userId, badge.id, i, condition);
            updatedProgress.push(progress);
            
            if (!progress.completed) {
              allConditionsMet = false;
            }
          }
        }

        // 모든 조건이 만족되면 뱃지 수여
        if (allConditionsMet) {
          const earnedEvent = await this.awardBadge(userId, badge, metadata);
          if (earnedEvent) {
            earnedEvents.push(earnedEvent);
          }
        }
      }

      return earnedEvents;
    } catch (error) {
      console.error('Error updating badge progress:', error);
      throw error;
    }
  }

  // 특정 조건을 가진 뱃지들 조회
  private static async getBadgesWithCondition(conditionType: BadgeConditionType): Promise<Badge[]> {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      // 조건 배열에서 해당 타입을 가진 뱃지들 필터링
      return (data || []).filter(badge => 
        badge.conditions.some((condition: BadgeCondition) => condition.type === conditionType)
      );
    } catch (error) {
      console.error('Error fetching badges with condition:', error);
      throw error;
    }
  }

  // 사용자의 특정 뱃지 획득 여부 확인
  private static async getUserBadge(userId: string, badgeId: string): Promise<UserBadge | null> {
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', userId)
        .eq('badge_id', badgeId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116: Row not found
      return data;
    } catch (error) {
      console.error('Error checking user badge:', error);
      return null;
    }
  }

  // 단일 뱃지 조건 진행도 업데이트
  private static async updateSingleBadgeProgress(
    userId: string,
    badgeId: string,
    conditionIndex: number,
    condition: BadgeCondition,
    increment: number
  ): Promise<BadgeProgress> {
    try {
      // 현재 진행도 조회
      const { data: existing } = await supabase
        .from('badge_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('badge_id', badgeId)
        .eq('condition_index', conditionIndex)
        .single();

      const currentValue = existing ? existing.current_value + increment : increment;
      const targetValue = condition.target;

      // 진행도 업데이트/삽입
      const { data, error } = await supabase
        .from('badge_progress')
        .upsert({
          user_id: userId,
          badge_id: badgeId,
          condition_index: conditionIndex,
          current_value: Math.min(currentValue, targetValue),
          target_value: targetValue,
          completed: currentValue >= targetValue,
          last_updated: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        conditionIndex,
        current: data.current_value,
        target: data.target_value,
        completed: data.completed,
        lastUpdated: new Date(data.last_updated)
      };
    } catch (error) {
      console.error('Error updating single badge progress:', error);
      throw error;
    }
  }

  // 조건 진행도 확인 (업데이트 없이)
  private static async checkConditionProgress(
    userId: string,
    badgeId: string,
    conditionIndex: number,
    condition: BadgeCondition
  ): Promise<BadgeProgress> {
    try {
      // 현재 사용자 데이터 기반으로 조건 확인
      const currentValue = await this.getCurrentValueForCondition(userId, condition);
      
      return {
        conditionIndex,
        current: currentValue,
        target: condition.target,
        completed: currentValue >= condition.target,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error checking condition progress:', error);
      return {
        conditionIndex,
        current: 0,
        target: condition.target,
        completed: false,
        lastUpdated: new Date()
      };
    }
  }

  // 조건 타입에 따른 현재 값 계산
  private static async getCurrentValueForCondition(
    userId: string,
    condition: BadgeCondition
  ): Promise<number> {
    try {
      switch (condition.type) {
        case BadgeConditionType.POEM_COUNT:
          // 시 작성 개수 조회 (실제 구현 시 poems 테이블 참조)
          return 0; // TODO: 구현 필요

        case BadgeConditionType.PHOTO_COUNT:
          // 사진 촬영 개수 조회 (실제 구현 시 photos 테이블 참조)
          return 0; // TODO: 구현 필요

        case BadgeConditionType.CHALLENGE_COMPLETE:
          // 챌린지 완료 개수 조회
          const { data: completedChallenges } = await supabase
            .from('user_challenges')
            .select('id')
            .eq('user_id', userId)
            .eq('status', 'completed');
          return completedChallenges?.length || 0;

        case BadgeConditionType.TOTAL_POINTS:
          // 총 포인트 조회 (실제 구현 시 user_stats 테이블 참조)
          return 0; // TODO: 구현 필요

        default:
          return 0;
      }
    } catch (error) {
      console.error('Error getting current value for condition:', error);
      return 0;
    }
  }

  // 뱃지 수여
  private static async awardBadge(
    userId: string,
    badge: Badge,
    metadata?: any
  ): Promise<BadgeEarnedEvent | null> {
    try {
      // 뱃지 수여 기록
      const { data: userBadge, error } = await supabase
        .from('user_badges')
        .insert({
          user_id: userId,
          badge_id: badge.id,
          earned_at: new Date().toISOString(),
          metadata: metadata || {}
        })
        .select()
        .single();

      if (error) throw error;

      // 이벤트 로그 기록
      await supabase
        .from('badge_events')
        .insert({
          user_id: userId,
          badge_id: badge.id,
          event_type: 'earned',
          event_data: { badge },
          triggered_by: metadata?.triggeredBy || {}
        });

      const earnedEvent: BadgeEarnedEvent = {
        badge,
        userBadge: {
          id: userBadge.id,
          userId: userBadge.user_id,
          badgeId: userBadge.badge_id,
          earnedAt: new Date(userBadge.earned_at),
          notificationSent: userBadge.notification_sent,
          metadata: userBadge.metadata
        },
        isFirstTime: true,
        triggeredBy: metadata?.triggeredBy || { action: 'unknown' }
      };

      console.log(`Badge earned: ${badge.name} by user ${userId}`);
      return earnedEvent;
    } catch (error) {
      console.error('Error awarding badge:', error);
      return null;
    }
  }

  // 뱃지 알림 발송
  static async sendBadgeNotification(userId: string, badgeEvent: BadgeEarnedEvent): Promise<void> {
    try {
      // 사용자의 알림 설정 확인
      const settings = await this.getBadgeNotificationSettings(userId);
      
      if (!settings.enabled || !settings.showInApp) {
        return;
      }

      // 알림 발송 로직 (실제 구현 시 푸시 알림 서비스 연동)
      console.log(`Sending badge notification for: ${badgeEvent.badge.name}`);

      // 알림 발송 완료 표시
      await supabase
        .from('user_badges')
        .update({ notification_sent: true })
        .eq('id', badgeEvent.userBadge.id);

    } catch (error) {
      console.error('Error sending badge notification:', error);
    }
  }

  // 뱃지 알림 설정 조회
  static async getBadgeNotificationSettings(userId: string): Promise<BadgeNotificationSettings> {
    try {
      // 기본 설정 (실제 구현 시 user_settings 테이블에서 조회)
      return {
        enabled: true,
        showProgress: true,
        progressThreshold: 80,
        soundEnabled: true,
        vibrationEnabled: true,
        showInApp: true,
        showPush: true
      };
    } catch (error) {
      console.error('Error fetching badge notification settings:', error);
      return {
        enabled: false,
        showProgress: false,
        progressThreshold: 100,
        soundEnabled: false,
        vibrationEnabled: false,
        showInApp: false,
        showPush: false
      };
    }
  }

  // 챌린지 완료 시 뱃지 진행도 업데이트
  static async onChallengeCompleted(
    userId: string,
    challengeId: string,
    challengeType: string
  ): Promise<BadgeEarnedEvent[]> {
    try {
      const events: BadgeEarnedEvent[] = [];

      // 챌린지 완료 관련 뱃지 업데이트
      const challengeEvents = await this.updateBadgeProgress(
        userId,
        BadgeConditionType.CHALLENGE_COMPLETE,
        1,
        { triggeredBy: { action: 'challenge_completed', challengeId } }
      );
      events.push(...challengeEvents);

      // 특정 챌린지 완료 뱃지 확인
      const specificEvents = await this.updateBadgeProgress(
        userId,
        BadgeConditionType.SPECIFIC_CHALLENGE,
        1,
        { 
          triggeredBy: { action: 'specific_challenge_completed', challengeId },
          specificValue: challengeId
        }
      );
      events.push(...specificEvents);

      return events;
    } catch (error) {
      console.error('Error handling challenge completion for badges:', error);
      return [];
    }
  }

  // 시 작성 시 뱃지 진행도 업데이트
  static async onPoemCreated(userId: string, poemId: string): Promise<BadgeEarnedEvent[]> {
    try {
      return await this.updateBadgeProgress(
        userId,
        BadgeConditionType.POEM_COUNT,
        1,
        { triggeredBy: { action: 'poem_created', poemId } }
      );
    } catch (error) {
      console.error('Error handling poem creation for badges:', error);
      return [];
    }
  }

  // 사진 촬영 시 뱃지 진행도 업데이트
  static async onPhotoTaken(userId: string, photoId: string): Promise<BadgeEarnedEvent[]> {
    try {
      return await this.updateBadgeProgress(
        userId,
        BadgeConditionType.PHOTO_COUNT,
        1,
        { triggeredBy: { action: 'photo_taken', photoId } }
      );
    } catch (error) {
      console.error('Error handling photo taken for badges:', error);
      return [];
    }
  }
}