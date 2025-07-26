import { supabase } from '../config/supabase';
import {
  Challenge,
  ChallengeFilterOptions,
  ChallengeStatus,
  ChallengeType,
  UserChallenge,
  UserChallengeStatus,
  ChallengeStats
} from '../types/challenge';

export class ChallengeService {
  // 챌린지 목록 조회
  static async getChallenges(filters?: ChallengeFilterOptions): Promise<Challenge[]> {
    try {
      let query = supabase
        .from('challenges')
        .select('*')
        .order('start_date', { ascending: false });

      // 필터 적용
      if (filters) {
        if (filters.type && filters.type.length > 0) {
          query = query.in('type', filters.type);
        }
        if (filters.difficulty && filters.difficulty.length > 0) {
          query = query.in('difficulty', filters.difficulty);
        }
        if (filters.status && filters.status.length > 0) {
          query = query.in('status', filters.status);
        }
        if (filters.dateRange) {
          query = query
            .gte('start_date', filters.dateRange.start.toISOString())
            .lte('end_date', filters.dateRange.end.toISOString());
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching challenges:', error);
      throw error;
    }
  }

  // 특정 챌린지 조회
  static async getChallengeById(challengeId: string): Promise<Challenge | null> {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching challenge:', error);
      throw error;
    }
  }

  // 활성 챌린지 목록 조회
  static async getActiveChallenges(): Promise<Challenge[]> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', ChallengeStatus.ACTIVE)
        .lte('start_date', now)
        .gte('end_date', now)
        .order('end_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching active challenges:', error);
      throw error;
    }
  }

  // 사용자의 챌린지 참여 현황 조회
  static async getUserChallenges(userId: string): Promise<UserChallenge[]> {
    try {
      const { data, error } = await supabase
        .from('user_challenges')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user challenges:', error);
      throw error;
    }
  }

  // 사용자의 특정 챌린지 진행 상황 조회
  static async getUserChallengeProgress(
    userId: string,
    challengeId: string
  ): Promise<UserChallenge | null> {
    try {
      const { data, error } = await supabase
        .from('user_challenges')
        .select('*')
        .eq('user_id', userId)
        .eq('challenge_id', challengeId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116: Row not found
      return data;
    } catch (error) {
      console.error('Error fetching user challenge progress:', error);
      throw error;
    }
  }

  // 챌린지 시작
  static async startChallenge(
    userId: string,
    challengeId: string
  ): Promise<UserChallenge> {
    try {
      // 챌린지 정보 확인
      const challenge = await this.getChallengeById(challengeId);
      if (!challenge) throw new Error('Challenge not found');
      
      // 이미 시작한 챌린지인지 확인
      const existingProgress = await this.getUserChallengeProgress(userId, challengeId);
      if (existingProgress) {
        throw new Error('Challenge already started');
      }

      // 챌린지 시작
      const { data, error } = await supabase
        .from('user_challenges')
        .insert({
          user_id: userId,
          challenge_id: challengeId,
          status: UserChallengeStatus.IN_PROGRESS,
          progress: challenge.goals.map(goal => ({
            ...goal,
            current: 0
          })),
          attempts: 1
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error starting challenge:', error);
      throw error;
    }
  }

  // 챌린지 진행도 업데이트
  static async updateChallengeProgress(
    userId: string,
    challengeId: string,
    goalType: string,
    increment: number = 1
  ): Promise<UserChallenge> {
    try {
      // 현재 진행 상황 조회
      const userChallenge = await this.getUserChallengeProgress(userId, challengeId);
      if (!userChallenge) throw new Error('User challenge not found');

      // 진행도 업데이트
      const updatedProgress = userChallenge.progress.map(goal => {
        if (goal.type === goalType) {
          return {
            ...goal,
            current: (goal.current || 0) + increment
          };
        }
        return goal;
      });

      // 모든 목표 달성 여부 확인
      const isCompleted = updatedProgress.every(goal => 
        (goal.current || 0) >= goal.target
      );

      // 업데이트
      const { data, error } = await supabase
        .from('user_challenges')
        .update({
          progress: updatedProgress,
          status: isCompleted ? UserChallengeStatus.COMPLETED : UserChallengeStatus.IN_PROGRESS,
          completed_at: isCompleted ? new Date().toISOString() : null,
          metadata: {
            ...userChallenge.metadata,
            lastActivityAt: new Date().toISOString()
          }
        })
        .eq('id', userChallenge.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating challenge progress:', error);
      throw error;
    }
  }

  // 보상 수령
  static async claimRewards(
    userId: string,
    challengeId: string
  ): Promise<UserChallenge> {
    try {
      const userChallenge = await this.getUserChallengeProgress(userId, challengeId);
      if (!userChallenge) throw new Error('User challenge not found');
      if (userChallenge.status !== UserChallengeStatus.COMPLETED) {
        throw new Error('Challenge not completed');
      }
      if (userChallenge.claimedRewards) {
        throw new Error('Rewards already claimed');
      }

      // 보상 수령 처리
      const { data, error } = await supabase
        .from('user_challenges')
        .update({
          claimed_rewards: true
        })
        .eq('id', userChallenge.id)
        .select()
        .single();

      if (error) throw error;

      // TODO: 실제 보상 지급 로직 구현 (포인트, 배지 등)

      return data;
    } catch (error) {
      console.error('Error claiming rewards:', error);
      throw error;
    }
  }

  // 사용자 챌린지 통계 조회
  static async getUserChallengeStats(userId: string): Promise<ChallengeStats> {
    try {
      const userChallenges = await this.getUserChallenges(userId);
      
      const stats: ChallengeStats = {
        totalChallenges: userChallenges.length,
        completedChallenges: userChallenges.filter(c => c.status === UserChallengeStatus.COMPLETED).length,
        failedChallenges: userChallenges.filter(c => c.status === UserChallengeStatus.FAILED).length,
        inProgressChallenges: userChallenges.filter(c => c.status === UserChallengeStatus.IN_PROGRESS).length,
        totalPoints: 0, // TODO: 실제 포인트 계산 로직 구현
        totalBadges: 0, // TODO: 실제 배지 계산 로직 구현
        completionRate: 0,
        currentStreak: 0, // TODO: 연속 완료 일수 계산 로직 구현
        longestStreak: 0  // TODO: 최장 연속 완료 일수 계산 로직 구현
      };

      if (stats.totalChallenges > 0) {
        stats.completionRate = Math.round((stats.completedChallenges / stats.totalChallenges) * 100);
      }

      return stats;
    } catch (error) {
      console.error('Error fetching user challenge stats:', error);
      throw error;
    }
  }

  // 일일 챌린지 확인 및 생성 (크론잡이나 서버에서 실행)
  static async checkAndCreateDailyChallenges(): Promise<void> {
    try {
      // TODO: 일일 챌린지 자동 생성 로직 구현
      console.log('Checking and creating daily challenges...');
    } catch (error) {
      console.error('Error creating daily challenges:', error);
      throw error;
    }
  }

  // 챌린지 만료 처리 (크론잡이나 서버에서 실행)
  static async processExpiredChallenges(): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // 만료된 챌린지 상태 업데이트
      const { error: challengeError } = await supabase
        .from('challenges')
        .update({ status: ChallengeStatus.EXPIRED })
        .eq('status', ChallengeStatus.ACTIVE)
        .lt('end_date', now);

      if (challengeError) throw challengeError;

      // 진행 중이었던 사용자 챌린지를 실패로 처리
      const { error: userChallengeError } = await supabase
        .from('user_challenges')
        .update({ status: UserChallengeStatus.FAILED })
        .eq('status', UserChallengeStatus.IN_PROGRESS)
        .in('challenge_id', 
          supabase
            .from('challenges')
            .select('id')
            .eq('status', ChallengeStatus.EXPIRED)
        );

      if (userChallengeError) throw userChallengeError;

      console.log('Expired challenges processed successfully');
    } catch (error) {
      console.error('Error processing expired challenges:', error);
      throw error;
    }
  }
}