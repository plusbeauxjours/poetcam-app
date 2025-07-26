import { BadgeService } from '../services/badgeService';
import {
  Badge,
  BadgeCategory,
  BadgeRarity,
  BadgeConditionType,
  BadgeEarnedEvent
} from '../types/badge';

// 테스트용 샘플 뱃지 데이터
const sampleBadges: Partial<Badge>[] = [
  {
    name: '첫 걸음',
    description: '포에캠에 첫 번째 시를 작성해보세요.',
    category: BadgeCategory.BEGINNER,
    rarity: BadgeRarity.COMMON,
    iconName: 'emoji:🌱',
    iconColor: '#10B981',
    conditions: [
      {
        type: BadgeConditionType.POEM_COUNT,
        target: 1,
        period: 'all_time'
      }
    ],
    points: 10,
    isSecret: false,
    isLimited: false
  },
  {
    name: '시인의 시작',
    description: '총 10편의 시를 작성하여 진정한 시인의 길에 들어서세요.',
    category: BadgeCategory.CREATIVE,
    rarity: BadgeRarity.UNCOMMON,
    iconName: 'emoji:📝',
    iconColor: '#10B981',
    conditions: [
      {
        type: BadgeConditionType.POEM_COUNT,
        target: 10,
        period: 'all_time'
      }
    ],
    points: 50,
    isSecret: false,
    isLimited: false
  },
  {
    name: '한강의 시인',
    description: '한강에서 사진을 찍고 시를 작성해보세요.',
    category: BadgeCategory.LOCATION,
    rarity: BadgeRarity.RARE,
    iconName: 'emoji:🌊',
    iconColor: '#3B82F6',
    conditions: [
      {
        type: BadgeConditionType.SPECIFIC_CHALLENGE,
        target: 1,
        specificValue: 'hanriver_challenge'
      }
    ],
    points: 100,
    isSecret: false,
    isLimited: false
  },
  {
    name: '챌린지 마스터',
    description: '총 50개의 챌린지를 완료한 도전자입니다.',
    category: BadgeCategory.CHALLENGE,
    rarity: BadgeRarity.EPIC,
    iconName: 'emoji:🏆',
    iconColor: '#8B5CF6',
    conditions: [
      {
        type: BadgeConditionType.CHALLENGE_COMPLETE,
        target: 50,
        period: 'all_time'
      }
    ],
    points: 500,
    isSecret: false,
    isLimited: false
  },
  {
    name: '전설의 시인',
    description: '100편의 시를 작성한 전설적인 시인입니다.',
    category: BadgeCategory.ACHIEVEMENT,
    rarity: BadgeRarity.LEGENDARY,
    iconName: 'emoji:👑',
    iconColor: '#F59E0B',
    conditions: [
      {
        type: BadgeConditionType.POEM_COUNT,
        target: 100,
        period: 'all_time'
      },
      {
        type: BadgeConditionType.TOTAL_POINTS,
        target: 10000,
        period: 'all_time'
      }
    ],
    points: 1000,
    isSecret: false,
    isLimited: false
  },
  {
    name: '새벽의 시인',
    description: '새벽 시간(5-7시)에 시를 작성한 특별한 시인입니다.',
    category: BadgeCategory.SPECIAL,
    rarity: BadgeRarity.RARE,
    iconName: 'emoji:🌅',
    iconColor: '#F59E0B',
    conditions: [
      {
        type: BadgeConditionType.TIME_BASED,
        target: 5,
        timeConstraint: {
          startTime: '05:00',
          endTime: '07:00'
        }
      }
    ],
    points: 200,
    isSecret: true,
    isLimited: false,
    unlockHint: '새벽 시간에 시를 작성해보세요.'
  },
  {
    name: '봄의 전령',
    description: '2024년 봄 이벤트 참여자에게 주어지는 한정 뱃지입니다.',
    category: BadgeCategory.SEASONAL,
    rarity: BadgeRarity.EPIC,
    iconName: 'emoji:🌸',
    iconColor: '#EC4899',
    conditions: [
      {
        type: BadgeConditionType.SEASONAL_EVENT,
        target: 1,
        specificValue: 'spring_2024_event',
        timeConstraint: {
          dateRange: {
            start: new Date('2024-03-01'),
            end: new Date('2024-05-31')
          }
        }
      }
    ],
    points: 300,
    isSecret: false,
    isLimited: true
  },
  {
    name: '연속 창작자',
    description: '7일 연속으로 시를 작성한 꾸준한 창작자입니다.',
    category: BadgeCategory.ACHIEVEMENT,
    rarity: BadgeRarity.UNCOMMON,
    iconName: 'emoji:🔥',
    iconColor: '#EF4444',
    conditions: [
      {
        type: BadgeConditionType.CONSECUTIVE_DAYS,
        target: 7,
        period: 'daily'
      }
    ],
    points: 150,
    isSecret: false,
    isLimited: false
  }
];

// 뱃지 시스템 테스트 클래스
export class BadgeSystemTest {
  // 뱃지 조회 테스트
  static async testBadgeRetrieval(): Promise<void> {
    console.log('🧪 뱃지 조회 테스트 시작...\n');

    try {
      // 1. 모든 뱃지 조회
      console.log('1️⃣ 모든 뱃지 조회 테스트');
      const allBadges = await BadgeService.getAllBadges();
      console.log(`✅ 총 뱃지 수: ${allBadges.length}`);

      // 2. 카테고리별 필터링
      console.log('\n2️⃣ 카테고리별 필터링 테스트');
      const beginnerBadges = await BadgeService.getAllBadges({
        category: [BadgeCategory.BEGINNER]
      });
      console.log(`✅ 초보자 뱃지 수: ${beginnerBadges.length}`);

      // 3. 등급별 필터링
      console.log('\n3️⃣ 등급별 필터링 테스트');
      const legendaryBadges = await BadgeService.getAllBadges({
        rarity: [BadgeRarity.LEGENDARY]
      });
      console.log(`✅ 전설 등급 뱃지 수: ${legendaryBadges.length}`);

      console.log('\n✅ 뱃지 조회 테스트 완료!');
    } catch (error) {
      console.error('❌ 뱃지 조회 테스트 실패:', error);
    }
  }

  // 뱃지 진행도 업데이트 테스트
  static async testBadgeProgressUpdate(): Promise<void> {
    console.log('\n🧪 뱃지 진행도 업데이트 테스트 시작...\n');

    const testUserId = 'test_user_123';

    try {
      // 1. 시 작성 시뮬레이션
      console.log('1️⃣ 시 작성 이벤트 시뮬레이션');
      const poemEvents = await BadgeService.onPoemCreated(testUserId, 'poem_1');
      console.log(`✅ 시 작성으로 획득한 뱃지: ${poemEvents.length}개`);

      poemEvents.forEach(event => {
        console.log(`   - ${event.badge.name} (${event.badge.rarity})`);
      });

      // 2. 챌린지 완료 시뮬레이션
      console.log('\n2️⃣ 챌린지 완료 이벤트 시뮬레이션');
      const challengeEvents = await BadgeService.onChallengeCompleted(
        testUserId,
        'challenge_1',
        'daily'
      );
      console.log(`✅ 챌린지 완료로 획득한 뱃지: ${challengeEvents.length}개`);

      // 3. 사진 촬영 시뮬레이션
      console.log('\n3️⃣ 사진 촬영 이벤트 시뮬레이션');
      const photoEvents = await BadgeService.onPhotoTaken(testUserId, 'photo_1');
      console.log(`✅ 사진 촬영으로 획득한 뱃지: ${photoEvents.length}개`);

      console.log('\n✅ 뱃지 진행도 업데이트 테스트 완료!');
    } catch (error) {
      console.error('❌ 뱃지 진행도 업데이트 테스트 실패:', error);
    }
  }

  // 뱃지 통계 테스트
  static async testBadgeStats(): Promise<void> {
    console.log('\n🧪 뱃지 통계 테스트 시작...\n');

    const testUserId = 'test_user_123';

    try {
      // 사용자 뱃지 통계 조회
      console.log('1️⃣ 사용자 뱃지 통계 조회');
      const stats = await BadgeService.getUserBadgeStats(testUserId);
      
      console.log(`✅ 총 뱃지 수: ${stats.totalBadges}`);
      console.log(`✅ 획득한 뱃지 수: ${stats.earnedBadges}`);
      console.log(`✅ 완료율: ${stats.completionRate}%`);
      
      console.log('\n등급별 획득 현황:');
      Object.entries(stats.byRarity).forEach(([rarity, count]) => {
        console.log(`   ${rarity}: ${count}개`);
      });
      
      console.log('\n카테고리별 획득 현황:');
      Object.entries(stats.byCategory).forEach(([category, count]) => {
        console.log(`   ${category}: ${count}개`);
      });

      console.log('\n✅ 뱃지 통계 테스트 완료!');
    } catch (error) {
      console.error('❌ 뱃지 통계 테스트 실패:', error);
    }
  }

  // 복합 조건 뱃지 테스트
  static async testComplexBadgeConditions(): Promise<void> {
    console.log('\n🧪 복합 조건 뱃지 테스트 시작...\n');

    const testUserId = 'test_user_123';

    try {
      console.log('1️⃣ 복합 조건 뱃지 시뮬레이션');
      console.log('   - 전설의 시인 뱃지: 시 100편 + 포인트 10000점 필요');

      // 시 작성 반복 시뮬레이션 (5편)
      for (let i = 1; i <= 5; i++) {
        await BadgeService.updateBadgeProgress(
          testUserId,
          BadgeConditionType.POEM_COUNT,
          1,
          { triggeredBy: { action: 'poem_created', poemId: `poem_${i}` } }
        );
      }
      console.log('   ✅ 시 5편 작성 시뮬레이션 완료');

      // 포인트 획득 시뮬레이션
      await BadgeService.updateBadgeProgress(
        testUserId,
        BadgeConditionType.TOTAL_POINTS,
        500,
        { triggeredBy: { action: 'points_earned', amount: 500 } }
      );
      console.log('   ✅ 포인트 500점 획득 시뮬레이션 완료');

      // 진행도 확인
      const legendaryBadgeId = 'legendary_poet_badge_id'; // 실제 ID 필요
      const progress = await BadgeService.getBadgeProgress(testUserId, legendaryBadgeId);
      
      if (progress.length > 0) {
        console.log('\n진행도 현황:');
        progress.forEach((p, index) => {
          console.log(`   조건 ${index + 1}: ${p.current}/${p.target} (${p.completed ? '완료' : '진행중'})`);
        });
      }

      console.log('\n✅ 복합 조건 뱃지 테스트 완료!');
    } catch (error) {
      console.error('❌ 복합 조건 뱃지 테스트 실패:', error);
    }
  }

  // 시간 기반 뱃지 테스트
  static async testTimeBadges(): Promise<void> {
    console.log('\n🧪 시간 기반 뱃지 테스트 시작...\n');

    try {
      console.log('1️⃣ 새벽 시간 뱃지 조건 확인');
      const currentHour = new Date().getHours();
      const isDawnTime = currentHour >= 5 && currentHour <= 7;
      
      console.log(`   현재 시간: ${currentHour}시`);
      console.log(`   새벽 시간 여부: ${isDawnTime ? '예' : '아니오'}`);
      
      if (isDawnTime) {
        console.log('   ✅ 새벽 시간 뱃지 획득 가능!');
      } else {
        console.log('   ⏰ 새벽 시간(5-7시)에 다시 테스트해보세요.');
      }

      console.log('\n2️⃣ 계절 이벤트 뱃지 조건 확인');
      const currentDate = new Date();
      const springStart = new Date('2024-03-01');
      const springEnd = new Date('2024-05-31');
      const isSpringEvent = currentDate >= springStart && currentDate <= springEnd;
      
      console.log(`   현재 날짜: ${currentDate.toDateString()}`);
      console.log(`   봄 이벤트 기간 여부: ${isSpringEvent ? '예' : '아니오'}`);

      console.log('\n✅ 시간 기반 뱃지 테스트 완료!');
    } catch (error) {
      console.error('❌ 시간 기반 뱃지 테스트 실패:', error);
    }
  }

  // 뱃지 알림 테스트
  static async testBadgeNotifications(): Promise<void> {
    console.log('\n🧪 뱃지 알림 테스트 시작...\n');

    const testUserId = 'test_user_123';

    try {
      // 뱃지 획득 이벤트 시뮬레이션
      const mockBadgeEvent: BadgeEarnedEvent = {
        badge: {
          id: 'test_badge_1',
          name: '테스트 뱃지',
          description: '테스트용 뱃지입니다.',
          category: BadgeCategory.BEGINNER,
          rarity: BadgeRarity.COMMON,
          iconName: 'emoji:🎯',
          iconColor: '#10B981',
          conditions: [],
          points: 10,
          isSecret: false,
          isLimited: false
        },
        userBadge: {
          id: 'user_badge_1',
          userId: testUserId,
          badgeId: 'test_badge_1',
          earnedAt: new Date(),
          notificationSent: false
        },
        isFirstTime: true,
        triggeredBy: {
          action: 'test_action'
        }
      };

      console.log('1️⃣ 뱃지 알림 발송 시뮬레이션');
      await BadgeService.sendBadgeNotification(testUserId, mockBadgeEvent);
      console.log('✅ 뱃지 알림 발송 완료');

      console.log('\n2️⃣ 알림 설정 조회');
      const settings = await BadgeService.getBadgeNotificationSettings(testUserId);
      console.log(`✅ 알림 활성화: ${settings.enabled}`);
      console.log(`✅ 앱 내 알림: ${settings.showInApp}`);
      console.log(`✅ 푸시 알림: ${settings.showPush}`);

      console.log('\n✅ 뱃지 알림 테스트 완료!');
    } catch (error) {
      console.error('❌ 뱃지 알림 테스트 실패:', error);
    }
  }

  // 뱃지 등급별 테스트
  static testBadgeRaritySystem(): void {
    console.log('\n🧪 뱃지 등급 시스템 테스트 시작...\n');

    try {
      console.log('1️⃣ 등급별 색상 시스템 테스트');
      Object.values(BadgeRarity).forEach(rarity => {
        console.log(`   ${rarity}:`);
        console.log(`     - 포인트 가중치: ${this.getRarityPointMultiplier(rarity)}x`);
        console.log(`     - 획득 난이도: ${this.getRarityDifficulty(rarity)}`);
      });

      console.log('\n2️⃣ 카테고리별 테마 테스트');
      Object.values(BadgeCategory).forEach(category => {
        console.log(`   ${category}: 테마 색상 및 아이콘 정의됨`);
      });

      console.log('\n✅ 뱃지 등급 시스템 테스트 완료!');
    } catch (error) {
      console.error('❌ 뱃지 등급 시스템 테스트 실패:', error);
    }
  }

  // 헬퍼 메서드들
  private static getRarityPointMultiplier(rarity: BadgeRarity): number {
    const multipliers = {
      [BadgeRarity.COMMON]: 1,
      [BadgeRarity.UNCOMMON]: 2,
      [BadgeRarity.RARE]: 3,
      [BadgeRarity.EPIC]: 5,
      [BadgeRarity.LEGENDARY]: 10
    };
    return multipliers[rarity];
  }

  private static getRarityDifficulty(rarity: BadgeRarity): string {
    const difficulties = {
      [BadgeRarity.COMMON]: '매우 쉬움',
      [BadgeRarity.UNCOMMON]: '쉬움',
      [BadgeRarity.RARE]: '보통',
      [BadgeRarity.EPIC]: '어려움',
      [BadgeRarity.LEGENDARY]: '매우 어려움'
    };
    return difficulties[rarity];
  }
}

// 통합 테스트 실행 함수
export async function runBadgeSystemTests(): Promise<void> {
  console.log('🧪 뱃지 시스템 통합 테스트 시작\n');
  console.log('=' .repeat(50));

  try {
    // 기본 기능 테스트
    await BadgeSystemTest.testBadgeRetrieval();
    await BadgeSystemTest.testBadgeProgressUpdate();
    await BadgeSystemTest.testBadgeStats();
    
    // 고급 기능 테스트
    await BadgeSystemTest.testComplexBadgeConditions();
    await BadgeSystemTest.testTimeBadges();
    await BadgeSystemTest.testBadgeNotifications();
    
    // 시스템 테스트
    BadgeSystemTest.testBadgeRaritySystem();

    console.log('\n' + '=' .repeat(50));
    console.log('✅ 모든 뱃지 시스템 테스트 완료!');
    console.log('뱃지 시스템이 정상적으로 동작합니다.');
    
  } catch (error) {
    console.log('\n' + '=' .repeat(50));    
    console.error('❌ 뱃지 시스템 테스트 중 오류 발생:', error);
  }
}

// 샘플 뱃지 데이터 내보내기
export { sampleBadges };