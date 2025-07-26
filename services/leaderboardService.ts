import { supabase } from '../lib/supabase';

// 타입 정의들
export interface UserStats {
  id: string;
  user_id: string;
  total_points: number;
  weekly_points: number;
  monthly_points: number;
  lifetime_points: number;
  experience_points: number;
  level_points: number;
  current_level: number;
  level_name: 'beginner' | 'novice' | 'intermediate' | 'advanced' | 'expert' | 'master' | 'legend';
  poems_created: number;
  photos_uploaded: number;
  challenges_completed: number;
  badges_earned: number;
  locations_discovered: number;
  social_shares: number;
  likes_received: number;
  comments_received: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date?: string;
  average_poem_rating?: number;
  high_quality_poems: number;
  created_at: string;
  updated_at: string;
}

export interface UserRanking {
  id: string;
  user_id: string;
  global_rank?: number;
  global_percentile?: number;
  weekly_rank?: number;
  monthly_rank?: number;
  regional_rank?: number;
  region_code?: string;
  level_rank?: number;
  level_group?: string;
  creative_rank?: number;
  activity_rank?: number;
  ranking_score: number;
  last_calculated: string;
  is_valid: boolean;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar_url?: string;
  rank: number;
  points: number;
  current_level: number;
  level_name: string;
  current_streak?: number;
  ranking_score?: number;
  global_percentile?: number;
}

export interface PointTransaction {
  id: string;
  user_id: string;
  source: 'poem_creation' | 'photo_upload' | 'challenge_completion' | 'badge_earned' | 
          'daily_login' | 'location_discover' | 'social_share' | 'like_received' |
          'comment_received' | 'streak_bonus' | 'quality_bonus' | 'event_participation';
  points: number;
  multiplier: number;
  final_points: number;
  description?: string;
  related_poem_id?: string;
  related_challenge_id?: string;
  related_badge_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface LeaderboardFilters {
  period?: 'global' | 'weekly' | 'monthly';
  region?: string;
  level_group?: string;
  limit?: number;
  offset?: number;
}

export interface UserRankingInfo {
  global_rank?: number;
  global_percentile?: number;
  weekly_rank?: number;
  monthly_rank?: number;
  regional_rank?: number;
  region_code?: string;
  level_rank?: number;
  level_group?: string;
  ranking_score: number;
  total_points: number;
  weekly_points: number;
  monthly_points: number;
  current_level: number;
  level_name: string;
}

class LeaderboardService {
  /**
   * 사용자 통계 정보 조회
   */
  async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('사용자 통계 조회 실패:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('getUserStats 오류:', error);
      return null;
    }
  }

  /**
   * 사용자 랭킹 정보 조회
   */
  async getUserRankingInfo(userId: string): Promise<UserRankingInfo | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_ranking_info', { user_uuid: userId });

      if (error) {
        console.error('사용자 랭킹 정보 조회 실패:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('getUserRankingInfo 오류:', error);
      return null;
    }
  }

  /**
   * 전체 리더보드 조회
   */
  async getGlobalLeaderboard(limit: number = 50, offset: number = 0): Promise<LeaderboardEntry[]> {
    try {
      const { data, error } = await supabase
        .from('global_leaderboard')
        .select('*')
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('전체 리더보드 조회 실패:', error);
        return [];
      }

      return data.map(entry => ({
        id: entry.id,
        name: entry.name || '익명',
        avatar_url: entry.avatar_url,
        rank: entry.global_rank || 0,
        points: entry.total_points,
        current_level: entry.current_level,
        level_name: entry.level_name,
        current_streak: entry.current_streak,
        ranking_score: entry.ranking_score,
        global_percentile: entry.global_percentile
      }));
    } catch (error) {
      console.error('getGlobalLeaderboard 오류:', error);
      return [];
    }
  }

  /**
   * 주간 리더보드 조회
   */
  async getWeeklyLeaderboard(limit: number = 50, offset: number = 0): Promise<LeaderboardEntry[]> {
    try {
      const { data, error } = await supabase
        .from('weekly_leaderboard')
        .select('*')
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('주간 리더보드 조회 실패:', error);
        return [];
      }

      return data.map(entry => ({
        id: entry.id,
        name: entry.name || '익명',
        avatar_url: entry.avatar_url,
        rank: entry.current_weekly_rank || 0,
        points: entry.weekly_points,
        current_level: entry.current_level,
        level_name: entry.level_name
      }));
    } catch (error) {
      console.error('getWeeklyLeaderboard 오류:', error);
      return [];
    }
  }

  /**
   * 월간 리더보드 조회
   */
  async getMonthlyLeaderboard(limit: number = 50, offset: number = 0): Promise<LeaderboardEntry[]> {
    try {
      const { data, error } = await supabase
        .from('monthly_leaderboard')
        .select('*')
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('월간 리더보드 조회 실패:', error);
        return [];
      }

      return data.map(entry => ({
        id: entry.id,
        name: entry.name || '익명',
        avatar_url: entry.avatar_url,
        rank: entry.current_monthly_rank || 0,
        points: entry.monthly_points,
        current_level: entry.current_level,
        level_name: entry.level_name
      }));
    } catch (error) {
      console.error('getMonthlyLeaderboard 오류:', error);
      return [];
    }
  }

  /**
   * 지역별 리더보드 조회
   */
  async getRegionalLeaderboard(regionCode: string, limit: number = 50): Promise<LeaderboardEntry[]> {
    try {
      const { data, error } = await supabase
        .from('user_rankings')
        .select(`
          user_id,
          regional_rank,
          ranking_score,
          region_code,
          users!inner (
            id,
            name,
            avatar_url
          ),
          user_stats!inner (
            total_points,
            current_level,
            level_name
          )
        `)
        .eq('region_code', regionCode)
        .eq('is_valid', true)
        .not('regional_rank', 'is', null)
        .order('regional_rank', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('지역별 리더보드 조회 실패:', error);
        return [];
      }

      return data.map(entry => ({
        id: entry.user_id,
        name: (entry.users as any).name || '익명',
        avatar_url: (entry.users as any).avatar_url,
        rank: entry.regional_rank || 0,
        points: (entry.user_stats as any).total_points,
        current_level: (entry.user_stats as any).current_level,
        level_name: (entry.user_stats as any).level_name,
        ranking_score: entry.ranking_score
      }));
    } catch (error) {
      console.error('getRegionalLeaderboard 오류:', error);
      return [];
    }
  }

  /**
   * 레벨별 리더보드 조회
   */
  async getLevelLeaderboard(levelGroup: string, limit: number = 50): Promise<LeaderboardEntry[]> {
    try {
      const { data, error } = await supabase
        .from('user_rankings')
        .select(`
          user_id,
          level_rank,
          ranking_score,
          level_group,
          users!inner (
            id,
            name,
            avatar_url
          ),
          user_stats!inner (
            total_points,
            current_level,
            level_name
          )
        `)
        .eq('level_group', levelGroup)
        .eq('is_valid', true)
        .not('level_rank', 'is', null)
        .order('level_rank', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('레벨별 리더보드 조회 실패:', error);
        return [];
      }

      return data.map(entry => ({
        id: entry.user_id,
        name: (entry.users as any).name || '익명',
        avatar_url: (entry.users as any).avatar_url,
        rank: entry.level_rank || 0,
        points: (entry.user_stats as any).total_points,
        current_level: (entry.user_stats as any).current_level,
        level_name: (entry.user_stats as any).level_name,
        ranking_score: entry.ranking_score
      }));
    } catch (error) {
      console.error('getLevelLeaderboard 오류:', error);
      return [];
    }
  }

  /**
   * 포인트 추가
   */
  async addPoints(
    userId: string,
    source: PointTransaction['source'],
    points: number,
    multiplier: number = 1.0,
    description?: string,
    metadata?: Record<string, any>,
    relatedIds?: {
      poemId?: string;
      challengeId?: string;
      badgeId?: string;
    }
  ): Promise<boolean> {
    try {
      const finalPoints = Math.floor(points * multiplier);

      const { error } = await supabase
        .from('point_transactions')
        .insert({
          user_id: userId,
          source,
          points,
          multiplier,
          final_points: finalPoints,
          description,
          metadata: metadata || {},
          related_poem_id: relatedIds?.poemId,
          related_challenge_id: relatedIds?.challengeId,
          related_badge_id: relatedIds?.badgeId
        });

      if (error) {
        console.error('포인트 추가 실패:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('addPoints 오류:', error);
      return false;
    }
  }

  /**
   * 사용자 포인트 거래 내역 조회
   */
  async getUserPointHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<PointTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('포인트 거래 내역 조회 실패:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('getUserPointHistory 오류:', error);
      return [];
    }
  }

  /**
   * 사용자 주변 랭킹 조회 (내 랭킹 위아래 사용자들)
   */
  async getNearbyRankings(
    userId: string,
    period: 'global' | 'weekly' | 'monthly' = 'global',
    range: number = 5
  ): Promise<LeaderboardEntry[]> {
    try {
      // 먼저 사용자의 현재 랭킹 조회
      const userRanking = await this.getUserRankingInfo(userId);
      if (!userRanking) return [];

      let currentRank: number;
      let leaderboardView: string;

      switch (period) {
        case 'weekly':
          currentRank = userRanking.weekly_rank || 0;
          leaderboardView = 'weekly_leaderboard';
          break;
        case 'monthly':
          currentRank = userRanking.monthly_rank || 0;
          leaderboardView = 'monthly_leaderboard';
          break;
        default:
          currentRank = userRanking.global_rank || 0;
          leaderboardView = 'global_leaderboard';
      }

      if (currentRank === 0) return [];

      const startRank = Math.max(1, currentRank - range);
      const endRank = currentRank + range;

      let query = supabase
        .from(leaderboardView)
        .select('*');

      if (period === 'global') {
        query = query
          .gte('global_rank', startRank)
          .lte('global_rank', endRank)
          .order('global_rank', { ascending: true });
      } else if (period === 'weekly') {
        query = query
          .gte('current_weekly_rank', startRank)
          .lte('current_weekly_rank', endRank)
          .order('current_weekly_rank', { ascending: true });
      } else {
        query = query
          .gte('current_monthly_rank', startRank)
          .lte('current_monthly_rank', endRank)
          .order('current_monthly_rank', { ascending: true });
      }

      const { data, error } = await query;

      if (error) {
        console.error('주변 랭킹 조회 실패:', error);
        return [];
      }

      return data.map(entry => ({
        id: entry.id,
        name: entry.name || '익명',
        avatar_url: entry.avatar_url,
        rank: entry.global_rank || entry.current_weekly_rank || entry.current_monthly_rank || 0,
        points: entry.total_points || entry.weekly_points || entry.monthly_points,
        current_level: entry.current_level,
        level_name: entry.level_name,
        current_streak: entry.current_streak,
        ranking_score: entry.ranking_score,
        global_percentile: entry.global_percentile
      }));
    } catch (error) {
      console.error('getNearbyRankings 오류:', error);
      return [];
    }
  }

  /**
   * 리더보드 스냅샷 조회 (과거 리더보드)
   */
  async getLeaderboardSnapshot(
    period: 'weekly' | 'monthly' | 'seasonal',
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('leaderboard_snapshots')
        .select('*')
        .eq('period_type', period)
        .gte('period_start', startDate)
        .lte('period_end', endDate)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('리더보드 스냅샷 조회 실패:', error);
        return [];
      }

      return data?.[0]?.rankings || [];
    } catch (error) {
      console.error('getLeaderboardSnapshot 오류:', error);
      return [];
    }
  }

  /**
   * 랭킹 업데이트 트리거
   */
  async triggerRankingUpdate(): Promise<boolean> {
    try {
      const { error } = await supabase
        .rpc('update_user_rankings');

      if (error) {
        console.error('랭킹 업데이트 실패:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('triggerRankingUpdate 오류:', error);
      return false;
    }
  }

  /**
   * 사용자 통계 초기화 (새 사용자용)
   */
  async initializeUserStats(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_stats')
        .insert({
          user_id: userId,
          last_activity_date: new Date().toISOString().split('T')[0]
        });

      if (error && error.code !== '23505') { // 이미 존재하는 경우는 무시
        console.error('사용자 통계 초기화 실패:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('initializeUserStats 오류:', error);
      return false;
    }
  }

  /**
   * 레벨 정보 조회
   */
  getLevelInfo(level: number): {
    name: string;
    pointsRequired: number;
    nextLevelPoints: number;
  } {
    let name: string;
    
    if (level <= 5) name = 'beginner';
    else if (level <= 10) name = 'novice';
    else if (level <= 20) name = 'intermediate';
    else if (level <= 35) name = 'advanced';
    else if (level <= 50) name = 'expert';
    else if (level <= 75) name = 'master';
    else name = 'legend';

    const pointsRequired = ((level - 1) * (level - 1)) * 100;
    const nextLevelPoints = (level * level) * 100;

    return {
      name,
      pointsRequired,
      nextLevelPoints
    };
  }

  /**
   * 포인트로부터 레벨 계산
   */
  calculateLevelFromPoints(experiencePoints: number): {
    level: number;
    levelName: string;
    levelPoints: number;
    nextLevelPoints: number;
    progress: number;
  } {
    const level = Math.max(1, Math.floor(Math.sqrt(experiencePoints / 100)) + 1);
    const levelInfo = this.getLevelInfo(level);
    const levelPoints = experiencePoints - levelInfo.pointsRequired;
    const pointsToNext = levelInfo.nextLevelPoints - levelInfo.pointsRequired;
    const progress = pointsToNext > 0 ? (levelPoints / pointsToNext) * 100 : 100;
    
    return {
      level,
      levelName: levelInfo.name,
      levelPoints,
      nextLevelPoints: levelInfo.nextLevelPoints,
      progress: Math.min(100, Math.max(0, progress))
    };
  }
}

export const leaderboardService = new LeaderboardService();