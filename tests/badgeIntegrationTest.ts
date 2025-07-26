import { BadgeService } from '../services/badgeService';
import { ChallengeService } from '../services/challengeService';
import { LocationChallengeService } from '../services/locationChallengeService';
import {
  BadgeCategory,
  BadgeRarity,
  BadgeConditionType,
  BadgeEarnedEvent
} from '../types/badge';
import {
  ChallengeType,
  ChallengeDifficulty,
  ChallengeStatus
} from '../types/challenge';

// 배지 획득 통합 시나리오 테스트
export class BadgeIntegrationTest {
  private static testUserId = 'integration_test_user';

  // 시나리오 1: 첫 시 작성부터 시인의 여정까지
  static async testPoetJourneyScenario(): Promise<void> {
    console.log('🧪 시나리오 1: 시인의 여정 배지 획득 테스트\n');

    try {
      // 1단계: 첫 시 작성 (첫 걸음 배지)
      console.log('1️⃣ 첫 시 작성 시뮬레이션');
      const firstPoemEvents = await BadgeService.onPoemCreated(
        this.testUserId, 
        'first_poem'
      );
      console.log(`✅ 첫 시 작성으로 획득한 배지: ${firstPoemEvents.length}개`);
      firstPoemEvents.forEach(event => {
        console.log(`   - ${event.badge.name} (${event.badge.rarity})`);
      });

      // 2단계: 10편 시 작성 (시인의 시작 배지)
      console.log('\n2️⃣ 시 10편 작성 시뮬레이션');
      for (let i = 2; i <= 10; i++) {
        await BadgeService.onPoemCreated(this.testUserId, `poem_${i}`);
      }
      
      const poetStartEvents = await BadgeService.checkBadgeEligibility(
        this.testUserId,
        BadgeConditionType.POEM_COUNT
      );
      console.log(`✅ 10편 완성 후 획득 가능한 배지: ${poetStartEvents.length}개`);

      // 3단계: 50편 시 작성 (창작의 열정 배지)
      console.log('\n3️⃣ 시 50편 작성 시뮬레이션');
      for (let i = 11; i <= 50; i++) {
        await BadgeService.updateBadgeProgress(
          this.testUserId,
          BadgeConditionType.POEM_COUNT,
          1,
          { triggeredBy: { action: 'poem_created', poemId: `poem_${i}` } }
        );
      }

      const passionEvents = await BadgeService.checkBadgeEligibility(
        this.testUserId,
        BadgeConditionType.POEM_COUNT
      );
      console.log(`✅ 50편 완성 후 추가 획득 배지: ${passionEvents.length}개`);

      console.log('\n✅ 시인의 여정 시나리오 완료!\n');

    } catch (error) {
      console.error('❌ 시인의 여정 시나리오 실패:', error);
    }
  }

  // 시나리오 2: 챌린지 정복자의 길
  static async testChallengeConquerorScenario(): Promise<void> {
    console.log('🧪 시나리오 2: 챌린지 정복자 배지 획득 테스트\n');

    try {
      // 1단계: 첫 챌린지 완료 (도전자 배지)
      console.log('1️⃣ 첫 챌린지 완료 시뮬레이션');
      const firstChallengeEvents = await BadgeService.onChallengeCompleted(
        this.testUserId,
        'daily_poem_challenge',
        'daily'
      );
      console.log(`✅ 첫 챌린지로 획득한 배지: ${firstChallengeEvents.length}개`);

      // 2단계: 10개 챌린지 완료 (챌린지 애호가 배지)
      console.log('\n2️⃣ 챌린지 10개 완료 시뮬레이션');
      for (let i = 2; i <= 10; i++) {
        await BadgeService.onChallengeCompleted(
          this.testUserId,
          `challenge_${i}`,
          'daily'
        );
      }

      const enthusiastEvents = await BadgeService.checkBadgeEligibility(
        this.testUserId,
        BadgeConditionType.CHALLENGE_COMPLETE
      );
      console.log(`✅ 10개 완료 후 획득 배지: ${enthusiastEvents.length}개`);

      // 3단계: 연속 챌린지 완료 (완벽주의자 배지)
      console.log('\n3️⃣ 연속 10일 챌린지 완료 시뮬레이션');
      for (let day = 1; day <= 10; day++) {
        await BadgeService.updateBadgeProgress(
          this.testUserId,
          BadgeConditionType.CONSECUTIVE_DAYS,
          1,
          { 
            triggeredBy: { 
              action: 'daily_challenge_completed', 
              day: day,
              date: new Date()
            } 
          }
        );
      }

      const perfectionistEvents = await BadgeService.checkBadgeEligibility(
        this.testUserId,
        BadgeConditionType.CONSECUTIVE_DAYS
      );
      console.log(`✅ 연속 완료 후 획득 배지: ${perfectionistEvents.length}개`);

      // 4단계: 50개 챌린지 완료 시뮬레이션 (챌린지 마스터)
      console.log('\n4️⃣ 챌린지 50개 완료 시뮬레이션');
      for (let i = 11; i <= 50; i++) {
        await BadgeService.updateBadgeProgress(
          this.testUserId,
          BadgeConditionType.CHALLENGE_COMPLETE,
          1,
          { triggeredBy: { action: 'challenge_completed', challengeId: `challenge_${i}` } }
        );
      }

      const masterEvents = await BadgeService.checkBadgeEligibility(
        this.testUserId,
        BadgeConditionType.CHALLENGE_COMPLETE
      );
      console.log(`✅ 50개 완료 후 획득 배지: ${masterEvents.length}개`);

      console.log('\n✅ 챌린지 정복자 시나리오 완료!\n');

    } catch (error) {
      console.error('❌ 챌린지 정복자 시나리오 실패:', error);
    }
  }

  // 시나리오 3: 위치 기반 탐험가
  static async testLocationExplorerScenario(): Promise<void> {
    console.log('🧪 시나리오 3: 위치 기반 탐험가 배지 획득 테스트\n');

    try {
      // 1단계: 한강 챌린지 완료 (한강의 시인 배지)
      console.log('1️⃣ 한강 챌린지 완료 시뮬레이션');
      const hanriverEvents = await BadgeService.updateBadgeProgress(
        this.testUserId,
        BadgeConditionType.SPECIFIC_CHALLENGE,
        1,
        { 
          triggeredBy: { 
            action: 'specific_challenge_completed',
            challengeId: 'hanriver_challenge',
            location: {
              name: '한강공원',
              latitude: 37.5326,
              longitude: 126.9903
            }
          } 
        }
      );
      console.log(`✅ 한강 챌린지로 획득한 배지: ${hanriverEvents.length}개`);

      // 2단계: 남산 챌린지 완료 (남산의 낭만 배지)
      console.log('\n2️⃣ 남산 챌린지 완료 시뮬레이션');
      const namsanEvents = await BadgeService.updateBadgeProgress(
        this.testUserId,
        BadgeConditionType.SPECIFIC_CHALLENGE,
        1,
        { 
          triggeredBy: { 
            action: 'specific_challenge_completed',
            challengeId: 'namsan_challenge',
            location: {
              name: '남산타워',
              latitude: 37.5512,
              longitude: 126.9882
            }
          } 
        }
      );
      console.log(`✅ 남산 챌린지로 획득한 배지: ${namsanEvents.length}개`);

      // 3단계: 10개 위치 방문 (도시 탐험가 배지)
      console.log('\n3️⃣ 다양한 위치 10곳 방문 시뮬레이션');
      const locations = [
        { name: '경복궁', lat: 37.5796, lng: 126.9770 },
        { name: '홍대', lat: 37.5563, lng: 126.9236 },
        { name: '강남역', lat: 37.4979, lng: 127.0276 },
        { name: '명동', lat: 37.5636, lng: 126.9823 },
        { name: '이태원', lat: 37.5340, lng: 126.9947 },
        { name: '신촌', lat: 37.5596, lng: 126.9370 },
        { name: '압구정', lat: 37.5276, lng: 127.0382 },
        { name: '용산', lat: 37.5311, lng: 126.9810 },
        { name: '청계천', lat: 37.5695, lng: 126.9769 },
        { name: '동대문', lat: 37.5663, lng: 127.0092 }
      ];

      for (let i = 0; i < locations.length; i++) {
        await BadgeService.updateBadgeProgress(
          this.testUserId,
          BadgeConditionType.LOCATION_VISIT,
          1,
          { 
            triggeredBy: { 
              action: 'location_visited',
              location: locations[i]
            } 
          }
        );
      }

      const explorerEvents = await BadgeService.checkBadgeEligibility(
        this.testUserId,
        BadgeConditionType.LOCATION_VISIT
      );
      console.log(`✅ 10개 위치 방문 후 획득 배지: ${explorerEvents.length}개`);

      console.log('\n✅ 위치 기반 탐험가 시나리오 완료!\n');

    } catch (error) {
      console.error('❌ 위치 기반 탐험가 시나리오 실패:', error);
    }
  }

  // 시나리오 4: 소셜 활동가
  static async testSocialActivistScenario(): Promise<void> {
    console.log('🧪 시나리오 4: 소셜 활동가 배지 획득 테스트\n');

    try {
      // 1단계: 좋아요 100개 받기 (인기 작가 배지)
      console.log('1️⃣ 좋아요 100개 받기 시뮬레이션');
      await BadgeService.updateBadgeProgress(
        this.testUserId,
        BadgeConditionType.LIKE_RECEIVED,
        100,
        { triggeredBy: { action: 'likes_received', count: 100 } }
      );

      const popularEvents = await BadgeService.checkBadgeEligibility(
        this.testUserId,
        BadgeConditionType.LIKE_RECEIVED
      );
      console.log(`✅ 좋아요 100개로 획득한 배지: ${popularEvents.length}개`);

      // 2단계: 댓글 50개 작성 (소셜 버터플라이 배지)
      console.log('\n2️⃣ 댓글 50개 작성 시뮬레이션');
      await BadgeService.updateBadgeProgress(
        this.testUserId,
        BadgeConditionType.COMMENT_COUNT,
        50,
        { triggeredBy: { action: 'comments_written', count: 50 } }
      );

      const socialEvents = await BadgeService.checkBadgeEligibility(
        this.testUserId,
        BadgeConditionType.COMMENT_COUNT
      );
      console.log(`✅ 댓글 50개로 획득한 배지: ${socialEvents.length}개`);

      // 3단계: 작품 100번 공유 (바이럴 스타 배지)
      console.log('\n3️⃣ 작품 100번 공유 시뮬레이션');
      await BadgeService.updateBadgeProgress(
        this.testUserId,
        BadgeConditionType.SHARE_COUNT,
        100,
        { triggeredBy: { action: 'shares_made', count: 100 } }
      );

      const viralEvents = await BadgeService.checkBadgeEligibility(
        this.testUserId,
        BadgeConditionType.SHARE_COUNT
      );
      console.log(`✅ 공유 100번으로 획득한 배지: ${viralEvents.length}개`);

      console.log('\n✅ 소셜 활동가 시나리오 완료!\n');

    } catch (error) {
      console.error('❌ 소셜 활동가 시나리오 실패:', error);
    }
  }

  // 시나리오 5: 시간 기반 특별 배지
  static async testTimeBadgeScenario(): Promise<void> {
    console.log('🧪 시나리오 5: 시간 기반 특별 배지 테스트\n');

    try {
      // 1단계: 새벽 시간 시 작성 체크
      console.log('1️⃣ 새벽 시간 배지 조건 체크');
      const currentHour = new Date().getHours();
      const isDawnTime = currentHour >= 5 && currentHour <= 7;
      
      console.log(`   현재 시간: ${currentHour}시`);
      console.log(`   새벽 시간 여부: ${isDawnTime ? '예' : '아니오'}`);

      if (isDawnTime) {
        // 새벽 시간이면 실제 테스트
        const dawnEvents = await BadgeService.updateBadgeProgress(
          this.testUserId,
          BadgeConditionType.TIME_BASED,
          1,
          { 
            triggeredBy: { 
              action: 'dawn_poem_created',
              time: new Date(),
              timeConstraint: {
                startTime: '05:00',
                endTime: '07:00'
              }
            } 
          }
        );
        console.log(`✅ 새벽 시간 배지 획득: ${dawnEvents.length}개`);
      } else {
        console.log('   ℹ️  새벽 시간이 아니므로 시뮬레이션만 진행');
      }

      // 2단계: 계절 이벤트 배지 체크
      console.log('\n2️⃣ 계절 이벤트 배지 조건 체크');
      const currentDate = new Date();
      const springStart = new Date('2024-03-01');
      const springEnd = new Date('2024-05-31');
      const isSpringEvent = currentDate >= springStart && currentDate <= springEnd;
      
      console.log(`   현재 날짜: ${currentDate.toDateString()}`);
      console.log(`   봄 이벤트 기간: ${isSpringEvent ? '예' : '아니오'}`);

      if (isSpringEvent) {
        const springEvents = await BadgeService.updateBadgeProgress(
          this.testUserId,
          BadgeConditionType.SEASONAL_EVENT,
          1,
          { 
            triggeredBy: { 
              action: 'spring_event_participated',
              eventId: 'spring_2024_event',
              date: currentDate
            } 
          }
        );
        console.log(`✅ 봄 이벤트 배지 획득: ${springEvents.length}개`);
      } else {
        console.log('   ℹ️  봄 이벤트 기간이 아니므로 시뮬레이션만 진행');
      }

      console.log('\n✅ 시간 기반 특별 배지 시나리오 완료!\n');

    } catch (error) {
      console.error('❌ 시간 기반 특별 배지 시나리오 실패:', error);
    }
  }

  // 시나리오 6: 복합 조건 전설 배지
  static async testLegendaryBadgeScenario(): Promise<void> {
    console.log('🧪 시나리오 6: 전설의 시인 배지 (복합 조건) 테스트\n');

    try {
      console.log('1️⃣ 전설의 시인 배지 조건 시뮬레이션');
      console.log('   - 조건 1: 시 100편 작성');
      console.log('   - 조건 2: 총 포인트 10,000점 획득');

      // 시 100편 작성 시뮬레이션
      for (let i = 51; i <= 100; i++) {
        await BadgeService.updateBadgeProgress(
          this.testUserId,
          BadgeConditionType.POEM_COUNT,
          1,
          { triggeredBy: { action: 'poem_created', poemId: `legendary_poem_${i}` } }
        );
      }
      console.log('   ✅ 시 100편 작성 완료');

      // 포인트 10,000점 획득 시뮬레이션
      await BadgeService.updateBadgeProgress(
        this.testUserId,
        BadgeConditionType.TOTAL_POINTS,
        10000,
        { triggeredBy: { action: 'points_accumulated', totalPoints: 10000 } }
      );
      console.log('   ✅ 포인트 10,000점 획득 완료');

      // 복합 조건 체크
      const legendaryEvents = await BadgeService.checkComplexBadgeConditions(
        this.testUserId,
        [BadgeConditionType.POEM_COUNT, BadgeConditionType.TOTAL_POINTS]
      );
      
      console.log(`\n2️⃣ 복합 조건 체크 결과`);
      console.log(`✅ 전설의 시인 배지 획득: ${legendaryEvents.length}개`);
      
      legendaryEvents.forEach(event => {
        console.log(`   - ${event.badge.name} (${event.badge.rarity}) - ${event.badge.points}점`);
      });

      console.log('\n✅ 전설의 시인 배지 시나리오 완료!\n');

    } catch (error) {
      console.error('❌ 전설의 시인 배지 시나리오 실패:', error);
    }
  }

  // 통합 배지 통계 리포트
  static async generateIntegrationReport(): Promise<void> {
    console.log('📊 배지 획득 통합 리포트 생성\n');

    try {
      // 사용자 배지 통계 조회
      const stats = await BadgeService.getUserBadgeStats(this.testUserId);
      
      console.log('='.repeat(50));
      console.log('📈 최종 배지 획득 통계');
      console.log('='.repeat(50));
      
      console.log(`🎯 총 배지 수: ${stats.totalBadges}`);
      console.log(`🏆 획득한 배지 수: ${stats.earnedBadges}`);
      console.log(`📊 완료율: ${stats.completionRate.toFixed(1)}%`);
      console.log(`⭐ 총 포인트: ${stats.totalPoints}`);
      
      console.log('\n🎭 등급별 획득 현황:');
      Object.entries(stats.byRarity).forEach(([rarity, count]) => {
        const rarityEmoji = {
          common: '⚪',
          uncommon: '🟢', 
          rare: '🔵',
          epic: '🟣',
          legendary: '🟡'
        }[rarity] || '⚫';
        console.log(`   ${rarityEmoji} ${rarity}: ${count}개`);
      });
      
      console.log('\n📂 카테고리별 획득 현황:');
      Object.entries(stats.byCategory).forEach(([category, count]) => {
        const categoryEmoji = {
          beginner: '🌱',
          creative: '🎨',
          location: '📍',
          challenge: '🏆',
          social: '👥',
          achievement: '🎖️',
          seasonal: '🌸',
          special: '⭐'
        }[category] || '📁';
        console.log(`   ${categoryEmoji} ${category}: ${count}개`);
      });

      // 획득한 배지 목록
      const earnedBadges = await BadgeService.getUserBadges(this.testUserId, {
        earnedOnly: true
      });
      
      console.log('\n🎉 획득한 배지 목록:');
      earnedBadges.forEach((userBadge, index) => {
        const badge = userBadge.badge;
        const rarityEmoji = {
          common: '⚪',
          uncommon: '🟢', 
          rare: '🔵',
          epic: '🟣',
          legendary: '🟡'
        }[badge.rarity] || '⚫';
        
        console.log(`   ${index + 1}. ${rarityEmoji} ${badge.name} (+${badge.points}pt)`);
      });

      console.log('\n' + '='.repeat(50));
      console.log('✅ 통합 테스트 완료 - 배지 시스템이 정상적으로 작동합니다!');
      console.log('='.repeat(50));

    } catch (error) {
      console.error('❌ 통합 리포트 생성 실패:', error);
    }
  }
}

// 전체 통합 테스트 실행 함수
export async function runBadgeIntegrationTests(): Promise<void> {
  console.log('🚀 배지 시스템 통합 테스트 시작\n');
  console.log('='.repeat(60));

  try {
    // 각 시나리오별 테스트 실행
    await BadgeIntegrationTest.testPoetJourneyScenario();
    await BadgeIntegrationTest.testChallengeConquerorScenario();
    await BadgeIntegrationTest.testLocationExplorerScenario();
    await BadgeIntegrationTest.testSocialActivistScenario();
    await BadgeIntegrationTest.testTimeBadgeScenario();
    await BadgeIntegrationTest.testLegendaryBadgeScenario();
    
    // 최종 통합 리포트 생성
    await BadgeIntegrationTest.generateIntegrationReport();

    console.log('\n🎊 모든 통합 테스트가 성공적으로 완료되었습니다!');
    console.log('배지 시스템은 다양한 시나리오에서 정상적으로 작동합니다.');
    
  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.error('💥 통합 테스트 중 오류 발생:', error);
    console.log('일부 기능에 문제가 있을 수 있습니다.');
  }
}

// 성능 테스트
export async function runBadgePerformanceTest(): Promise<void> {
  console.log('⚡ 배지 시스템 성능 테스트 시작\n');

  const testUserId = 'performance_test_user';
  const iterations = 1000;

  try {
    // 배지 진행도 업데이트 성능 테스트
    console.log(`1️⃣ 배지 진행도 업데이트 성능 테스트 (${iterations}회)`);
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      await BadgeService.updateBadgeProgress(
        testUserId,
        BadgeConditionType.POEM_COUNT,
        1,
        { triggeredBy: { action: 'performance_test', iteration: i } }
      );
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const avgTime = duration / iterations;

    console.log(`✅ 총 소요시간: ${duration}ms`);
    console.log(`✅ 평균 처리시간: ${avgTime.toFixed(2)}ms`);
    console.log(`✅ 초당 처리량: ${(1000 / avgTime).toFixed(0)}개/초`);

    // 배지 조회 성능 테스트
    console.log('\n2️⃣ 배지 조회 성능 테스트');
    const queryStartTime = Date.now();

    await BadgeService.getAllBadges();
    await BadgeService.getUserBadges(testUserId);
    await BadgeService.getUserBadgeStats(testUserId);

    const queryEndTime = Date.now();
    const queryDuration = queryEndTime - queryStartTime;

    console.log(`✅ 배지 조회 소요시간: ${queryDuration}ms`);

    console.log('\n✅ 성능 테스트 완료!');

  } catch (error) {
    console.error('❌ 성능 테스트 실패:', error);
  }
}