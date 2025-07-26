import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  leaderboardRealtimeService, 
  RankingUpdateEvent, 
  PointsUpdateEvent 
} from '../services/leaderboardRealtimeService';
import { leaderboardService, LeaderboardEntry, UserRankingInfo } from '../services/leaderboardService';

interface UseLeaderboardRealtimeOptions {
  userId?: string;
  leaderboardType?: 'global' | 'weekly' | 'monthly' | 'regional' | 'level';
  regionCode?: string;
  levelGroup?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface LeaderboardRealtimeState {
  entries: LeaderboardEntry[];
  userRanking: UserRankingInfo | null;
  loading: boolean;
  connected: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

interface RealtimeNotification {
  id: string;
  type: 'ranking' | 'points' | 'achievement' | 'level_up';
  title: string;
  message: string;
  timestamp: Date;
  userId: string;
  data?: any;
  read: boolean;
}

export const useLeaderboardRealtime = (options: UseLeaderboardRealtimeOptions = {}) => {
  const {
    userId,
    leaderboardType = 'global',
    regionCode,
    levelGroup,
    autoRefresh = true,
    refreshInterval = 30000
  } = options;

  // 상태 관리
  const [state, setState] = useState<LeaderboardRealtimeState>({
    entries: [],
    userRanking: null,
    loading: true,
    connected: false,
    lastUpdated: null,
    error: null
  });

  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // 참조 및 타이머
  const subscriptionIdRef = useRef<string | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeFuncsRef = useRef<(() => void)[]>([]);

  // 데이터 로드
  const loadLeaderboardData = useCallback(async (showLoading: boolean = false) => {
    if (showLoading) {
      setState(prev => ({ ...prev, loading: true, error: null }));
    }

    try {
      let entries: LeaderboardEntry[] = [];
      let userRanking: UserRankingInfo | null = null;

      // 리더보드 데이터 로드
      switch (leaderboardType) {
        case 'global':
          entries = await leaderboardService.getGlobalLeaderboard(50);
          break;
        case 'weekly':
          entries = await leaderboardService.getWeeklyLeaderboard(50);
          break;
        case 'monthly':
          entries = await leaderboardService.getMonthlyLeaderboard(50);
          break;
        case 'regional':
          if (regionCode) {
            entries = await leaderboardService.getRegionalLeaderboard(regionCode, 50);
          }
          break;
        case 'level':
          if (levelGroup) {
            entries = await leaderboardService.getLevelLeaderboard(levelGroup, 50);
          }
          break;
      }

      // 사용자 랭킹 정보 로드
      if (userId) {
        userRanking = await leaderboardService.getUserRankingInfo(userId);
      }

      setState(prev => ({
        ...prev,
        entries,
        userRanking,
        loading: false,
        lastUpdated: new Date(),
        error: null
      }));

    } catch (error) {
      console.error('리더보드 데이터 로드 실패:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: '데이터를 불러오는데 실패했습니다.'
      }));
    }
  }, [leaderboardType, regionCode, levelGroup, userId]);

  // 알림 생성
  const createNotification = useCallback((
    type: RealtimeNotification['type'],
    title: string,
    message: string,
    userId: string,
    data?: any
  ): RealtimeNotification => {
    return {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      timestamp: new Date(),
      userId,
      data,
      read: false
    };
  }, []);

  // 랭킹 이벤트 처리
  const handleRankingUpdate = useCallback((event: RankingUpdateEvent) => {
    console.log('랭킹 업데이트 이벤트:', event);

    // 사용자별 알림 생성
    let notification: RealtimeNotification | null = null;

    switch (event.type) {
      case 'new_leader':
        notification = createNotification(
          'ranking',
          '🏆 새로운 1위!',
          event.data.message || '새로운 1위 시인이 탄생했습니다!',
          event.userId,
          event.data
        );
        break;
      
      case 'user_level_up':
        if (event.userId === userId) {
          notification = createNotification(
            'level_up',
            '🎉 레벨업!',
            event.data.message || `레벨 ${event.data.newLevel}로 승급했습니다!`,
            event.userId,
            event.data
          );
        }
        break;
      
      case 'position_change':
        if (event.userId === userId && event.data.oldRank && event.data.newRank) {
          const isImprovement = event.data.oldRank > event.data.newRank;
          notification = createNotification(
            'ranking',
            isImprovement ? '📈 순위 상승!' : '📉 순위 변동',
            event.data.message || `${event.data.oldRank}위 → ${event.data.newRank}위`,
            event.userId,
            event.data
          );
        }
        break;
      
      case 'ranking_update':
        // 전체 업데이트는 조용히 처리
        break;
    }

    if (notification) {
      setNotifications(prev => [notification!, ...prev.slice(0, 19)]); // 최대 20개 유지
    }

    // 관련 데이터 새로고침
    if (event.type !== 'ranking_update') {
      loadLeaderboardData(false);
    }
  }, [userId, createNotification, loadLeaderboardData]);

  // 포인트 이벤트 처리
  const handlePointsUpdate = useCallback((event: PointsUpdateEvent) => {
    console.log('포인트 업데이트 이벤트:', event);

    if (event.userId === userId) {
      let notification: RealtimeNotification | null = null;

      switch (event.type) {
        case 'points_added':
          notification = createNotification(
            'points',
            '💰 포인트 획득!',
            event.data.message || `+${event.data.points}점을 획득했습니다!`,
            event.userId,
            event.data
          );
          break;
        
        case 'achievement_unlocked':
          notification = createNotification(
            'achievement',
            '🏅 업적 달성!',
            event.data.message || '새로운 뱃지를 획득했습니다!',
            event.userId,
            event.data
          );
          break;
        
        case 'streak_bonus':
          notification = createNotification(
            'points',
            '🔥 연속 활동 보너스!',
            event.data.message || `보너스 +${event.data.points}점!`,
            event.userId,
            event.data
          );
          break;
      }

      if (notification) {
        setNotifications(prev => [notification!, ...prev.slice(0, 19)]);
      }

      // 사용자 데이터 새로고침
      loadLeaderboardData(false);
    }
  }, [userId, createNotification, loadLeaderboardData]);

  // 실시간 서비스 초기화
  useEffect(() => {
    const initializeRealtime = async () => {
      try {
        const success = await leaderboardRealtimeService.initialize();
        setState(prev => ({ ...prev, connected: success }));

        if (success) {
          // 이벤트 리스너 등록
          const unsubscribeRanking = leaderboardRealtimeService.addRankingListener(handleRankingUpdate);
          const unsubscribePoints = leaderboardRealtimeService.addPointsListener(handlePointsUpdate);
          
          unsubscribeFuncsRef.current = [unsubscribeRanking, unsubscribePoints];

          // 사용자별 통계 리스너 (사용자가 있는 경우)
          if (userId) {
            const unsubscribeUserStats = leaderboardRealtimeService.addUserStatsListener(
              userId,
              (event) => {
                console.log('사용자 통계 변경:', event);
                loadLeaderboardData(false);
              }
            );
            unsubscribeFuncsRef.current.push(unsubscribeUserStats);
          }

          // 리더보드 구독
          const subscriptionId = await leaderboardRealtimeService.subscribeToLeaderboard(
            leaderboardType,
            { regionCode, levelGroup }
          );
          subscriptionIdRef.current = subscriptionId;
        }
      } catch (error) {
        console.error('실시간 서비스 초기화 실패:', error);
        setState(prev => ({ ...prev, connected: false, error: '실시간 연결에 실패했습니다.' }));
      }
    };

    initializeRealtime();

    return () => {
      // 정리 작업
      unsubscribeFuncsRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribeFuncsRef.current = [];
      
      if (subscriptionIdRef.current) {
        leaderboardRealtimeService.unsubscribeFromLeaderboard(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
    };
  }, [leaderboardType, regionCode, levelGroup, userId, handleRankingUpdate, handlePointsUpdate]);

  // 초기 데이터 로드
  useEffect(() => {
    loadLeaderboardData(true);
  }, [loadLeaderboardData]);

  // 자동 새로고침 설정
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshTimerRef.current = setInterval(() => {
        if (!isRefreshing) {
          loadLeaderboardData(false);
        }
      }, refreshInterval);

      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
      };
    }
  }, [autoRefresh, refreshInterval, isRefreshing, loadLeaderboardData]);

  // 수동 새로고침
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadLeaderboardData(true);
      // 서버 랭킹 업데이트 트리거
      await leaderboardRealtimeService.triggerManualUpdate();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadLeaderboardData]);

  // 알림 읽음 처리
  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  // 알림 삭제
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // 모든 알림 삭제
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // 읽지 않은 알림 개수
  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    // 상태
    ...state,
    isRefreshing,
    
    // 알림
    notifications,
    unreadCount,
    
    // 액션
    refresh,
    markNotificationAsRead,
    removeNotification,
    clearAllNotifications,
    
    // 유틸리티
    getDebugInfo: leaderboardRealtimeService.getDebugInfo.bind(leaderboardRealtimeService)
  };
};