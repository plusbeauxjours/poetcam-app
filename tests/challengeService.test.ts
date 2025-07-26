import { ChallengeService } from '@/services/challengeService';
import {
  Challenge,
  ChallengeType,
  ChallengeDifficulty,
  ChallengeStatus,
  RewardType,
  UserChallengeStatus
} from '@/types/challenge';

// 샘플 챌린지 데이터
const sampleChallenges: Partial<Challenge>[] = [
  {
    type: ChallengeType.DAILY,
    title: '오늘의 시작',
    description: '오늘 하루 3장의 사진을 찍고 각각에 시를 작성해보세요.',
    difficulty: ChallengeDifficulty.EASY,
    status: ChallengeStatus.ACTIVE,
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24시간 후
    goals: [
      {
        type: 'photo_count',
        target: 3,
        description: '사진 3장 촬영'
      },
      {
        type: 'poem_create',
        target: 3,
        description: '시 3편 작성'
      }
    ],
    rewards: [
      {
        type: RewardType.POINTS,
        value: 50,
        description: '일일 챌린지 완료 포인트'
      },
      {
        type: RewardType.EXPERIENCE,
        value: 10,
        description: '경험치 +10'
      }
    ]
  },
  {
    type: ChallengeType.WEEKLY,
    title: '주간 시인의 길',
    description: '이번 주 동안 다양한 장소에서 10편의 시를 작성해보세요.',
    difficulty: ChallengeDifficulty.MEDIUM,
    status: ChallengeStatus.ACTIVE,
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일 후
    goals: [
      {
        type: 'poem_create',
        target: 10,
        description: '시 10편 작성'
      },
      {
        type: 'unique_locations',
        target: 5,
        description: '서로 다른 5곳에서 작성'
      }
    ],
    rewards: [
      {
        type: RewardType.POINTS,
        value: 200,
        description: '주간 챌린지 완료 포인트'
      },
      {
        type: RewardType.BADGE,
        value: 'weekly_poet',
        description: '주간 시인 배지'
      }
    ]
  },
  {
    type: ChallengeType.LOCATION,
    title: '한강에서의 영감',
    description: '한강 공원에서 사진을 찍고 시를 작성해보세요.',
    difficulty: ChallengeDifficulty.EASY,
    status: ChallengeStatus.ACTIVE,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30일 후
    goals: [
      {
        type: 'location_visit',
        target: 1,
        description: '한강 공원 방문'
      },
      {
        type: 'poem_create',
        target: 1,
        description: '한강에서 시 1편 작성'
      }
    ],
    rewards: [
      {
        type: RewardType.POINTS,
        value: 100,
        description: '위치 기반 챌린지 완료 포인트'
      },
      {
        type: RewardType.TITLE,
        value: 'river_poet',
        description: '강변 시인 칭호'
      }
    ],
    metadata: {
      location: {
        latitude: 37.5326,
        longitude: 126.9903,
        radius: 2000, // 2km 반경
        name: '한강 공원'
      }
    }
  },
  {
    type: ChallengeType.ACHIEVEMENT,
    title: '시작하는 시인',
    description: '첫 번째 시를 작성하고 포에캠의 세계로 들어오세요.',
    difficulty: ChallengeDifficulty.EASY,
    status: ChallengeStatus.ACTIVE,
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1년 후
    goals: [
      {
        type: 'poem_create',
        target: 1,
        description: '첫 시 작성'
      }
    ],
    rewards: [
      {
        type: RewardType.BADGE,
        value: 'first_poem',
        description: '첫 시 배지'
      },
      {
        type: RewardType.POINTS,
        value: 30,
        description: '시작 보너스 포인트'
      }
    ]
  },
  {
    type: ChallengeType.SPECIAL,
    title: '봄의 서정',
    description: '봄을 주제로 한 시를 5편 작성해보세요.',
    difficulty: ChallengeDifficulty.HARD,
    status: ChallengeStatus.UPCOMING,
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일 후 시작
    endDate: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000), // 30일간 진행
    goals: [
      {
        type: 'themed_poem',
        target: 5,
        description: '봄 주제 시 5편'
      }
    ],
    rewards: [
      {
        type: RewardType.BADGE,
        value: 'spring_poet_2024',
        description: '2024 봄의 시인 한정판 배지'
      },
      {
        type: RewardType.POINTS,
        value: 500,
        description: '특별 챌린지 완료 포인트'
      }
    ],
    requirements: {
      minLevel: 5
    }
  }
];

// 테스트 실행
export async function testChallengeService() {
  console.log('🧪 챌린지 서비스 테스트 시작...\n');

  try {
    // 1. 챌린지 목록 조회 테스트
    console.log('1️⃣ 챌린지 목록 조회 테스트');
    const allChallenges = await ChallengeService.getChallenges();
    console.log(`✅ 전체 챌린지 수: ${allChallenges.length}`);

    // 2. 활성 챌린지 조회 테스트
    console.log('\n2️⃣ 활성 챌린지 조회 테스트');
    const activeChallenges = await ChallengeService.getActiveChallenges();
    console.log(`✅ 활성 챌린지 수: ${activeChallenges.length}`);

    // 3. 필터링 테스트
    console.log('\n3️⃣ 챌린지 필터링 테스트');
    const filteredChallenges = await ChallengeService.getChallenges({
      type: [ChallengeType.DAILY, ChallengeType.WEEKLY],
      difficulty: [ChallengeDifficulty.EASY, ChallengeDifficulty.MEDIUM]
    });
    console.log(`✅ 필터링된 챌린지 수: ${filteredChallenges.length}`);

    // 4. 특정 챌린지 조회 테스트
    if (allChallenges.length > 0) {
      console.log('\n4️⃣ 특정 챌린지 조회 테스트');
      const challengeId = allChallenges[0].id;
      const challenge = await ChallengeService.getChallengeById(challengeId);
      console.log(`✅ 챌린지 조회 성공: ${challenge?.title}`);
    }

    // 5. 사용자 챌린지 시작 테스트 (실제 사용자 ID 필요)
    console.log('\n5️⃣ 챌린지 시작 테스트');
    console.log('⚠️  실제 사용자 ID가 필요하여 스킵합니다.');

    // 6. 진행도 업데이트 테스트
    console.log('\n6️⃣ 챌린지 진행도 업데이트 테스트');
    console.log('⚠️  실제 사용자 챌린지가 필요하여 스킵합니다.');

    // 7. 통계 조회 테스트
    console.log('\n7️⃣ 사용자 챌린지 통계 조회 테스트');
    console.log('⚠️  실제 사용자 ID가 필요하여 스킵합니다.');

    console.log('\n✅ 모든 테스트 완료!');
  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
  }
}

// 샘플 데이터 삽입 함수 (관리자 권한 필요)
export async function insertSampleChallenges() {
  console.log('📝 샘플 챌린지 데이터 삽입 중...\n');
  
  // 주의: 이 함수는 관리자 권한이 있는 사용자로 로그인한 상태에서만 작동합니다.
  // Supabase 대시보드에서 직접 데이터를 삽입하는 것을 권장합니다.
  
  console.log('샘플 데이터:');
  sampleChallenges.forEach((challenge, index) => {
    console.log(`\n챌린지 ${index + 1}: ${challenge.title}`);
    console.log(`- 타입: ${challenge.type}`);
    console.log(`- 난이도: ${challenge.difficulty}`);
    console.log(`- 상태: ${challenge.status}`);
    console.log(`- 목표: ${challenge.goals?.map(g => g.description).join(', ')}`);
    console.log(`- 보상: ${challenge.rewards?.map(r => r.description).join(', ')}`);
  });
}

// 테스트 헬퍼 함수들
export const ChallengeTestHelpers = {
  // 챌린지 생성 (관리자용)
  async createChallenge(challengeData: Partial<Challenge>) {
    // Supabase에 직접 삽입하는 로직
    console.log('Creating challenge:', challengeData.title);
  },

  // 사용자의 챌린지 시뮬레이션
  async simulateUserChallenge(userId: string, challengeId: string) {
    console.log(`Simulating challenge ${challengeId} for user ${userId}`);
    
    // 1. 챌린지 시작
    const userChallenge = await ChallengeService.startChallenge(userId, challengeId);
    console.log('Started challenge:', userChallenge.id);

    // 2. 진행도 업데이트
    const updated = await ChallengeService.updateChallengeProgress(
      userId,
      challengeId,
      'photo_count',
      1
    );
    console.log('Updated progress:', updated.progress);

    // 3. 완료 확인
    if (updated.status === UserChallengeStatus.COMPLETED) {
      console.log('Challenge completed!');
      
      // 4. 보상 수령
      const claimed = await ChallengeService.claimRewards(userId, challengeId);
      console.log('Rewards claimed:', claimed.claimedRewards);
    }
  }
};