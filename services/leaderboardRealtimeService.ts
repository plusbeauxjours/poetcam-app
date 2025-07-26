import { supabase } from '../lib/supabase';
import { leaderboardService } from './leaderboardService';

// 이벤트 타입 정의
export interface RankingUpdateEvent {
  type: 'ranking_update' | 'user_level_up' | 'new_leader' | 'position_change';
  userId: string;
  data: {
    oldRank?: number;
    newRank?: number;
    oldLevel?: number;
    newLevel?: number;
    points?: number;
    category?: 'global' | 'weekly' | 'monthly' | 'regional' | 'level';
    message?: string;
  };
  timestamp: string;
}

export interface PointsUpdateEvent {
  type: 'points_added' | 'achievement_unlocked' | 'streak_bonus';
  userId: string;
  data: {
    points: number;
    source: string;
    totalPoints: number;
    message?: string;
    badgeId?: string;
    achievementId?: string;
  };
  timestamp: string;
}

type EventListener<T> = (event: T) => void;

class LeaderboardRealtimeService {
  private rankingListeners: Set<EventListener<RankingUpdateEvent>> = new Set();
  private pointsListeners: Set<EventListener<PointsUpdateEvent>> = new Set();
  private userStatsListeners: Map<string, Set<EventListener<any>>> = new Map();
  private leaderboardSubscriptions: Map<string, any> = new Map();
  private isConnected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  /**
   * 실시간 서비스 초기화
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('리더보드 실시간 서비스 초기화 중...');
      
      // Supabase 연결 상태 확인
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('사용자 세션이 없습니다. 실시간 업데이트가 제한될 수 있습니다.');
      }

      // 실시간 구독 시작
      this.setupRealtimeSubscriptions();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      console.log('리더보드 실시간 서비스 초기화 완료');
      return true;
    } catch (error) {
      console.error('실시간 서비스 초기화 실패:', error);
      this.scheduleReconnect();
      return false;
    }
  }

  /**
   * 실시간 구독 설정
   */
  private setupRealtimeSubscriptions() {
    // 사용자 통계 변경 구독
    const userStatsSubscription = supabase
      .channel('user-stats-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_stats'
        },
        (payload) => this.handleUserStatsChange(payload)
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'point_transactions'
        },
        (payload) => this.handlePointsTransaction(payload)
      )
      .subscribe();

    // 랭킹 변경 구독
    const rankingSubscription = supabase
      .channel('ranking-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_rankings'
        },
        (payload) => this.handleRankingChange(payload)
      )
      .subscribe();

    // 뱃지 획득 구독
    const badgeSubscription = supabase
      .channel('badge-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_badges'
        },
        (payload) => this.handleBadgeEarned(payload)
      )
      .subscribe();

    this.leaderboardSubscriptions.set('user_stats', userStatsSubscription);
    this.leaderboardSubscriptions.set('rankings', rankingSubscription);
    this.leaderboardSubscriptions.set('badges', badgeSubscription);
  }

  /**
   * 사용자 통계 변경 처리
   */
  private async handleUserStatsChange(payload: any) {
    try {
      const { new: newStats, old: oldStats } = payload;
      
      // 레벨업 감지
      if (oldStats.current_level < newStats.current_level) {
        const levelUpEvent: RankingUpdateEvent = {
          type: 'user_level_up',
          userId: newStats.user_id,
          data: {
            oldLevel: oldStats.current_level,
            newLevel: newStats.current_level,
            points: newStats.total_points,
            message: `레벨 ${newStats.current_level}로 승급했습니다!`
          },
          timestamp: new Date().toISOString()
        };

        this.notifyRankingListeners(levelUpEvent);
      }

      // 사용자별 통계 리스너에게 알림
      const userListeners = this.userStatsListeners.get(newStats.user_id);
      if (userListeners) {
        userListeners.forEach(listener => {
          listener({
            type: 'stats_update',
            userId: newStats.user_id,
            data: newStats,
            timestamp: new Date().toISOString()
          });
        });
      }
    } catch (error) {
      console.error('사용자 통계 변경 처리 오류:', error);
    }
  }

  /**
   * 포인트 거래 처리
   */
  private handlePointsTransaction(payload: any) {
    try {
      const { new: transaction } = payload;
      
      const pointsEvent: PointsUpdateEvent = {
        type: 'points_added',
        userId: transaction.user_id,
        data: {
          points: transaction.final_points,
          source: transaction.source,
          totalPoints: 0, // 실제 구현 시 조회 필요
          message: transaction.description || `${transaction.final_points}점을 획득했습니다!`
        },
        timestamp: new Date().toISOString()
      };

      this.notifyPointsListeners(pointsEvent);
    } catch (error) {
      console.error('포인트 거래 처리 오류:', error);
    }
  }

  /**
   * 랭킹 변경 처리
   */
  private async handleRankingChange(payload: any) {
    try {
      const { new: newRanking, old: oldRanking } = payload;
      
      // 전체 랭킹 변경 감지
      if (oldRanking.global_rank !== newRanking.global_rank) {
        let eventType: RankingUpdateEvent['type'] = 'position_change';
        let message = '';

        // 1위 달성
        if (newRanking.global_rank === 1 && oldRanking.global_rank !== 1) {
          eventType = 'new_leader';
          message = '새로운 1위 시인이 탄생했습니다!';
        }
        // 순위 상승/하락
        else if (oldRanking.global_rank && newRanking.global_rank) {
          const rankChange = oldRanking.global_rank - newRanking.global_rank;
          if (rankChange > 0) {
            message = `${rankChange}단계 상승! (${oldRanking.global_rank}위 → ${newRanking.global_rank}위)`;
          } else {
            message = `${Math.abs(rankChange)}단계 하락 (${oldRanking.global_rank}위 → ${newRanking.global_rank}위)`;
          }
        }

        const rankingEvent: RankingUpdateEvent = {
          type: eventType,
          userId: newRanking.user_id,
          data: {
            oldRank: oldRanking.global_rank,
            newRank: newRanking.global_rank,
            points: 0, // 실제 구현 시 조회 필요
            category: 'global',
            message
          },
          timestamp: new Date().toISOString()
        };

        this.notifyRankingListeners(rankingEvent);
      }
    } catch (error) {
      console.error('랭킹 변경 처리 오류:', error);
    }
  }

  /**
   * 뱃지 획득 처리
   */
  private handleBadgeEarned(payload: any) {
    try {
      const { new: userBadge } = payload;
      
      const achievementEvent: PointsUpdateEvent = {
        type: 'achievement_unlocked',
        userId: userBadge.user_id,
        data: {
          points: 0, // 뱃지 포인트는 별도 조회 필요
          source: 'badge_earned',
          totalPoints: 0,
          message: '새로운 뱃지를 획득했습니다!',
          badgeId: userBadge.badge_id
        },
        timestamp: new Date().toISOString()
      };

      this.notifyPointsListeners(achievementEvent);
    } catch (error) {
      console.error('뱃지 획득 처리 오류:', error);
    }
  }

  /**
   * 랭킹 이벤트 리스너 추가
   */
  addRankingListener(listener: EventListener<RankingUpdateEvent>): () => void {
    this.rankingListeners.add(listener);
    
    return () => {
      this.rankingListeners.delete(listener);
    };
  }

  /**
   * 포인트 이벤트 리스너 추가
   */
  addPointsListener(listener: EventListener<PointsUpdateEvent>): () => void {
    this.pointsListeners.add(listener);
    
    return () => {
      this.pointsListeners.delete(listener);
    };
  }

  /**
   * 사용자별 통계 리스너 추가
   */
  addUserStatsListener(userId: string, listener: EventListener<any>): () => void {
    if (!this.userStatsListeners.has(userId)) {
      this.userStatsListeners.set(userId, new Set());
    }
    
    this.userStatsListeners.get(userId)!.add(listener);
    
    return () => {
      const userListeners = this.userStatsListeners.get(userId);
      if (userListeners) {
        userListeners.delete(listener);
        if (userListeners.size === 0) {
          this.userStatsListeners.delete(userId);
        }
      }
    };
  }

  /**
   * 랭킹 리스너들에게 알림
   */
  private notifyRankingListeners(event: RankingUpdateEvent) {
    this.rankingListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('랭킹 리스너 알림 오류:', error);
      }
    });
  }

  /**
   * 포인트 리스너들에게 알림
   */
  private notifyPointsListeners(event: PointsUpdateEvent) {
    this.pointsListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('포인트 리스너 알림 오류:', error);
      }
    });
  }

  /**
   * 특정 리더보드 실시간 구독
   */
  async subscribeToLeaderboard(
    type: 'global' | 'weekly' | 'monthly' | 'regional' | 'level',
    options?: { regionCode?: string; levelGroup?: string }
  ): Promise<string> {
    const subscriptionId = `leaderboard_${type}_${Date.now()}`;
    
    try {
      // 리더보드별 특화된 구독 로직은 여기에 구현
      // 예: 특정 지역이나 레벨 그룹의 변경사항만 구독
      
      console.log(`리더보드 구독 시작: ${type}`, options);
      return subscriptionId;
    } catch (error) {
      console.error('리더보드 구독 실패:', error);
      throw error;
    }
  }

  /**
   * 리더보드 구독 해제
   */
  async unsubscribeFromLeaderboard(subscriptionId: string): Promise<void> {
    try {
      const subscription = this.leaderboardSubscriptions.get(subscriptionId);
      if (subscription) {
        await supabase.removeChannel(subscription);
        this.leaderboardSubscriptions.delete(subscriptionId);
        console.log(`리더보드 구독 해제: ${subscriptionId}`);
      }
    } catch (error) {
      console.error('리더보드 구독 해제 실패:', error);
    }
  }

  /**
   * 수동 랭킹 업데이트 트리거
   */
  async triggerManualUpdate(): Promise<boolean> {
    try {
      const success = await leaderboardService.triggerRankingUpdate();
      if (success) {
        // 수동 업데이트 완료 이벤트 발생
        const updateEvent: RankingUpdateEvent = {
          type: 'ranking_update',
          userId: '', // 시스템 이벤트
          data: {
            message: '랭킹이 업데이트되었습니다.'
          },
          timestamp: new Date().toISOString()
        };
        
        this.notifyRankingListeners(updateEvent);
      }
      return success;
    } catch (error) {
      console.error('수동 랭킹 업데이트 실패:', error);
      return false;
    }
  }

  /**
   * 연결 상태 확인
   */
  isRealtimeConnected(): boolean {
    return this.isConnected;
  }

  /**
   * 재연결 스케줄링
   */
  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('최대 재연결 시도 횟수 초과');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    this.reconnectTimer = setTimeout(async () => {
      console.log(`재연결 시도 ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}`);
      this.reconnectAttempts++;
      
      const success = await this.initialize();
      if (!success) {
        this.scheduleReconnect();
      }
    }, delay);
  }

  /**
   * 서비스 정리
   */
  async cleanup(): Promise<void> {
    try {
      console.log('리더보드 실시간 서비스 정리 중...');
      
      // 타이머 정리
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // 모든 구독 해제
      for (const [key, subscription] of this.leaderboardSubscriptions) {
        try {
          await supabase.removeChannel(subscription);
        } catch (error) {
          console.error(`구독 해제 실패 (${key}):`, error);
        }
      }

      // 리스너들 정리
      this.rankingListeners.clear();
      this.pointsListeners.clear();
      this.userStatsListeners.clear();
      this.leaderboardSubscriptions.clear();

      this.isConnected = false;
      console.log('리더보드 실시간 서비스 정리 완료');
    } catch (error) {
      console.error('서비스 정리 중 오류:', error);
    }
  }

  /**
   * 디버그 정보 반환
   */
  getDebugInfo() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      activeSubscriptions: this.leaderboardSubscriptions.size,
      rankingListeners: this.rankingListeners.size,
      pointsListeners: this.pointsListeners.size,
      userStatsListeners: this.userStatsListeners.size
    };
  }
}

export const leaderboardRealtimeService = new LeaderboardRealtimeService();