import { leaderboardService } from '../services/leaderboardService';
import { leaderboardRealtimeService } from '../services/leaderboardRealtimeService';
import { supabase } from '../lib/supabase';

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
    auth: {
      getSession: jest.fn()
    }
  }
}));

describe('LeaderboardService', () => {
  const mockUserId = 'test-user-id';
  const mockUserStats = {
    id: 'stats-id',
    user_id: mockUserId,
    total_points: 1000,
    weekly_points: 200,
    monthly_points: 500,
    lifetime_points: 1000,
    experience_points: 1000,
    level_points: 100,
    current_level: 5,
    level_name: 'novice',
    poems_created: 10,
    photos_uploaded: 8,
    challenges_completed: 3,
    badges_earned: 2,
    locations_discovered: 5,
    social_shares: 4,
    likes_received: 25,
    comments_received: 12,
    current_streak: 7,
    longest_streak: 15,
    last_activity_date: '2024-01-28',
    average_poem_rating: 4.2,
    high_quality_poems: 3,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-28T00:00:00Z'
  };

  const mockLeaderboardEntry = {
    id: mockUserId,
    name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    rank: 1,
    points: 1000,
    current_level: 5,
    level_name: 'novice',
    current_streak: 7,
    ranking_score: 1500.5,
    global_percentile: 95.5
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserStats', () => {
    it('사용자 통계를 성공적으로 조회해야 함', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockUserStats,
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const result = await leaderboardService.getUserStats(mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('user_stats');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(result).toEqual(mockUserStats);
    });

    it('사용자 통계 조회 실패 시 null을 반환해야 함', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'User not found' }
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const result = await leaderboardService.getUserStats(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('getUserRankingInfo', () => {
    it('사용자 랭킹 정보를 성공적으로 조회해야 함', async () => {
      const mockRankingInfo = {
        global_rank: 1,
        global_percentile: 95.5,
        weekly_rank: 2,
        monthly_rank: 1,
        regional_rank: 1,
        region_code: 'KR_SE',
        level_rank: 1,
        level_group: '1-10',
        ranking_score: 1500.5,
        total_points: 1000,
        weekly_points: 200,
        monthly_points: 500,
        current_level: 5,
        level_name: 'novice'
      };

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: [mockRankingInfo],
        error: null
      });

      const result = await leaderboardService.getUserRankingInfo(mockUserId);

      expect(supabase.rpc).toHaveBeenCalledWith('get_user_ranking_info', { 
        user_uuid: mockUserId 
      });
      expect(result).toEqual(mockRankingInfo);
    });
  });

  describe('getGlobalLeaderboard', () => {
    it('전체 리더보드를 성공적으로 조회해야 함', async () => {
      const mockLeaderboardData = [mockLeaderboardEntry];

      const mockSelect = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockResolvedValue({
        data: mockLeaderboardData,
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        range: mockRange,
      });

      const result = await leaderboardService.getGlobalLeaderboard(50, 0);

      expect(supabase.from).toHaveBeenCalledWith('global_leaderboard');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockRange).toHaveBeenCalledWith(0, 49);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockUserId,
        name: 'Test User',
        rank: 1,
        points: 1000
      });
    });
  });

  describe('addPoints', () => {
    it('포인트를 성공적으로 추가해야 함', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        data: null,
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      const result = await leaderboardService.addPoints(
        mockUserId,
        'poem_creation',
        100,
        1.5,
        '시 작성으로 포인트 획득'
      );

      expect(supabase.from).toHaveBeenCalledWith('point_transactions');
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: mockUserId,
        source: 'poem_creation',
        points: 100,
        multiplier: 1.5,
        final_points: 150,
        description: '시 작성으로 포인트 획득',
        metadata: {},
        related_poem_id: undefined,
        related_challenge_id: undefined,
        related_badge_id: undefined
      });
      expect(result).toBe(true);
    });

    it('포인트 추가 실패 시 false를 반환해야 함', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' }
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      const result = await leaderboardService.addPoints(
        mockUserId,
        'poem_creation',
        100
      );

      expect(result).toBe(false);
    });
  });

  describe('getNearbyRankings', () => {
    it('내 주변 랭킹을 성공적으로 조회해야 함', async () => {
      const mockUserRanking = {
        global_rank: 5,
        weekly_rank: 3,
        monthly_rank: 7,
        total_points: 1000,
        weekly_points: 200,
        monthly_points: 500,
        current_level: 5,
        level_name: 'novice'
      };

      // Mock getUserRankingInfo
      jest.spyOn(leaderboardService, 'getUserRankingInfo')
        .mockResolvedValue(mockUserRanking as any);

      const mockNearbyData = [
        { ...mockLeaderboardEntry, rank: 3, global_rank: 3 },
        { ...mockLeaderboardEntry, rank: 4, global_rank: 4 },
        { ...mockLeaderboardEntry, rank: 5, global_rank: 5, id: mockUserId },
        { ...mockLeaderboardEntry, rank: 6, global_rank: 6 },
        { ...mockLeaderboardEntry, rank: 7, global_rank: 7 },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockGte = jest.fn().mockReturnThis();
      const mockLte = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockNearbyData,
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        gte: mockGte,
      });
      mockGte.mockReturnValue({
        lte: mockLte,
      });
      mockLte.mockReturnValue({
        order: mockOrder,
      });

      const result = await leaderboardService.getNearbyRankings(mockUserId, 'global', 2);

      expect(result).toHaveLength(5);
      expect(result.find(entry => entry.id === mockUserId)).toBeDefined();
    });
  });

  describe('calculateLevelFromPoints', () => {
    it('포인트로부터 레벨을 정확히 계산해야 함', () => {
      const testCases = [
        { points: 0, expectedLevel: 1, expectedLevelName: 'beginner' },
        { points: 100, expectedLevel: 2, expectedLevelName: 'beginner' },
        { points: 400, expectedLevel: 3, expectedLevelName: 'beginner' },
        { points: 2500, expectedLevel: 6, expectedLevelName: 'novice' },
        { points: 10000, expectedLevel: 11, expectedLevelName: 'intermediate' },
      ];

      testCases.forEach(({ points, expectedLevel, expectedLevelName }) => {
        const result = leaderboardService.calculateLevelFromPoints(points);
        
        expect(result.level).toBe(expectedLevel);
        expect(result.levelName).toBe(expectedLevelName);
        expect(result.progress).toBeGreaterThanOrEqual(0);
        expect(result.progress).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('formatPoints', () => {
    it('포인트를 올바른 형식으로 변환해야 함', () => {
      const formatPoints = (points: number) => {
        if (points >= 1000000) {
          return `${(points / 1000000).toFixed(1)}M`;
        } else if (points >= 1000) {
          return `${(points / 1000).toFixed(1)}K`;
        }
        return points.toLocaleString();
      };

      expect(formatPoints(500)).toBe('500');
      expect(formatPoints(1500)).toBe('1.5K');
      expect(formatPoints(1500000)).toBe('1.5M');
    });
  });
});

describe('LeaderboardRealtimeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('실시간 서비스를 성공적으로 초기화해야 함', async () => {
      const mockGetSession = jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user' } } }
      });

      (supabase.auth.getSession as jest.Mock) = mockGetSession;

      const mockChannel = jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn()
      });

      (supabase.channel as jest.Mock) = mockChannel;

      const result = await leaderboardRealtimeService.initialize();

      expect(result).toBe(true);
      expect(mockGetSession).toHaveBeenCalled();
    });
  });

  describe('event listeners', () => {
    it('랭킹 이벤트 리스너를 추가하고 제거할 수 있어야 함', () => {
      const mockListener = jest.fn();
      
      const unsubscribe = leaderboardRealtimeService.addRankingListener(mockListener);
      
      expect(typeof unsubscribe).toBe('function');
      
      // 리스너 제거
      unsubscribe();
    });

    it('포인트 이벤트 리스너를 추가하고 제거할 수 있어야 함', () => {
      const mockListener = jest.fn();
      
      const unsubscribe = leaderboardRealtimeService.addPointsListener(mockListener);
      
      expect(typeof unsubscribe).toBe('function');
      
      // 리스너 제거
      unsubscribe();
    });

    it('사용자별 통계 리스너를 추가하고 제거할 수 있어야 함', () => {
      const mockListener = jest.fn();
      const userId = 'test-user-id';
      
      const unsubscribe = leaderboardRealtimeService.addUserStatsListener(userId, mockListener);
      
      expect(typeof unsubscribe).toBe('function');
      
      // 리스너 제거
      unsubscribe();
    });
  });

  describe('getDebugInfo', () => {
    it('디버그 정보를 올바르게 반환해야 함', () => {
      const debugInfo = leaderboardRealtimeService.getDebugInfo();
      
      expect(debugInfo).toHaveProperty('isConnected');
      expect(debugInfo).toHaveProperty('reconnectAttempts');
      expect(debugInfo).toHaveProperty('activeSubscriptions');
      expect(debugInfo).toHaveProperty('rankingListeners');
      expect(debugInfo).toHaveProperty('pointsListeners');
      expect(debugInfo).toHaveProperty('userStatsListeners');
      
      expect(typeof debugInfo.isConnected).toBe('boolean');
      expect(typeof debugInfo.reconnectAttempts).toBe('number');
      expect(typeof debugInfo.activeSubscriptions).toBe('number');
    });
  });
});

describe('Integration Tests', () => {
  const mockUserId = 'integration-test-user';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('포인트 추가 -> 랭킹 업데이트 흐름', () => {
    it('포인트 추가 후 랭킹이 업데이트되어야 함', async () => {
      // Mock 포인트 추가 성공
      const mockInsert = jest.fn().mockResolvedValue({
        data: null,
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      // Mock 랭킹 업데이트 성공
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: null
      });

      // 포인트 추가
      const pointsAdded = await leaderboardService.addPoints(
        mockUserId,
        'poem_creation',
        100,
        1.0,
        '테스트 포인트 추가'
      );

      expect(pointsAdded).toBe(true);

      // 랭킹 업데이트 트리거
      const rankingUpdated = await leaderboardService.triggerRankingUpdate();

      expect(rankingUpdated).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('update_user_rankings');
    });
  });

  describe('레벨 계산 정확성', () => {
    it('다양한 포인트 값에 대해 레벨 계산이 정확해야 함', () => {
      const testCases = [
        { points: 0, minLevel: 1, maxLevel: 1 },
        { points: 100, minLevel: 1, maxLevel: 2 },
        { points: 500, minLevel: 2, maxLevel: 4 },
        { points: 1000, minLevel: 3, maxLevel: 5 },
        { points: 2500, minLevel: 5, maxLevel: 7 },
        { points: 10000, minLevel: 10, maxLevel: 12 },
      ];

      testCases.forEach(({ points, minLevel, maxLevel }) => {
        const result = leaderboardService.calculateLevelFromPoints(points);
        
        expect(result.level).toBeGreaterThanOrEqual(minLevel);
        expect(result.level).toBeLessThanOrEqual(maxLevel);
        expect(result.progress).toBeGreaterThanOrEqual(0);
        expect(result.progress).toBeLessThanOrEqual(100);
        
        // 레벨명이 올바른지 확인
        const expectedLevelNames = ['beginner', 'novice', 'intermediate', 'advanced', 'expert', 'master', 'legend'];
        expect(expectedLevelNames).toContain(result.levelName);
      });
    });
  });

  describe('실시간 이벤트 시뮬레이션', () => {
    it('랭킹 변경 이벤트를 올바르게 처리해야 함', async () => {
      const mockRankingListener = jest.fn();
      
      // 리스너 등록
      const unsubscribe = leaderboardRealtimeService.addRankingListener(mockRankingListener);

      // 실시간 서비스 초기화 (모의)
      await leaderboardRealtimeService.initialize();

      // 이벤트 시뮬레이션을 위한 내부 메서드 호출
      // 실제 환경에서는 Supabase 실시간 구독을 통해 호출됨
      const mockRankingEvent = {
        type: 'user_level_up' as const,
        userId: mockUserId,
        data: {
          oldLevel: 4,
          newLevel: 5,
          points: 2500,
          message: '레벨 5로 승급했습니다!'
        },
        timestamp: new Date().toISOString()
      };

      // private 메서드에 접근하기 위한 타입 캐스팅
      (leaderboardRealtimeService as any).notifyRankingListeners(mockRankingEvent);

      expect(mockRankingListener).toHaveBeenCalledWith(mockRankingEvent);
      
      // 정리
      unsubscribe();
    });
  });

  describe('에러 처리', () => {
    it('네트워크 오류 시 적절히 처리해야 함', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockRejectedValue(new Error('Network error'));

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const result = await leaderboardService.getUserStats(mockUserId);

      expect(result).toBeNull();
    });

    it('데이터베이스 오류 시 적절히 처리해야 함', async () => {
      (supabase.rpc as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await leaderboardService.triggerRankingUpdate();

      expect(result).toBe(false);
    });
  });
});

describe('Performance Tests', () => {
  it('대량 리더보드 데이터 처리 성능', async () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: `user-${i}`,
      name: `User ${i}`,
      avatar_url: null,
      rank: i + 1,
      points: 10000 - i * 10,
      current_level: Math.floor(i / 100) + 1,
      level_name: 'intermediate',
      global_rank: i + 1
    }));

    const mockSelect = jest.fn().mockReturnThis();
    const mockRange = jest.fn().mockResolvedValue({
      data: largeDataset,
      error: null
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      range: mockRange,
    });

    const startTime = Date.now();
    const result = await leaderboardService.getGlobalLeaderboard(1000, 0);
    const endTime = Date.now();

    expect(result).toHaveLength(1000);
    expect(endTime - startTime).toBeLessThan(1000); // 1초 이내 처리
  });

  it('레벨 계산 성능', () => {
    const testPoints = [0, 100, 1000, 10000, 100000, 1000000];
    
    const startTime = Date.now();
    
    testPoints.forEach(points => {
      const result = leaderboardService.calculateLevelFromPoints(points);
      expect(result.level).toBeGreaterThan(0);
    });
    
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(100); // 100ms 이내 처리
  });
});

// Cleanup
afterAll(async () => {
  await leaderboardRealtimeService.cleanup();
});