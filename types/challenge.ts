// 챌린지 타입 정의
export enum ChallengeType {
  DAILY = 'daily',           // 일일 챌린지
  WEEKLY = 'weekly',         // 주간 챌린지
  LOCATION = 'location',     // 위치 기반 챌린지
  ACHIEVEMENT = 'achievement', // 업적 챌린지
  SPECIAL = 'special'        // 특별 이벤트 챌린지
}

// 챌린지 난이도
export enum ChallengeDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert'
}

// 챌린지 상태
export enum ChallengeStatus {
  ACTIVE = 'active',         // 활성화된 챌린지
  UPCOMING = 'upcoming',     // 예정된 챌린지
  EXPIRED = 'expired',       // 만료된 챌린지
  COMPLETED = 'completed'    // 완료된 챌린지
}

// 사용자의 챌린지 진행 상태
export enum UserChallengeStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// 보상 타입
export enum RewardType {
  POINTS = 'points',         // 포인트
  BADGE = 'badge',           // 배지
  TITLE = 'title',           // 칭호
  ITEM = 'item',             // 아이템
  EXPERIENCE = 'experience'  // 경험치
}

// 보상 인터페이스
export interface Reward {
  type: RewardType;
  value: number | string;    // 포인트의 경우 숫자, 배지/칭호의 경우 문자열
  description?: string;
}

// 챌린지 목표 인터페이스
export interface ChallengeGoal {
  type: string;              // 'photo_count', 'location_visit', 'poem_create' 등
  target: number;            // 목표 수치
  current?: number;          // 현재 진행도
  description: string;       // 목표 설명
}

// 챌린지 인터페이스
export interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  status: ChallengeStatus;
  startDate: Date;
  endDate: Date;
  goals: ChallengeGoal[];    // 챌린지 목표들
  rewards: Reward[];         // 보상 목록
  requirements?: {           // 참가 조건
    minLevel?: number;
    requiredChallenges?: string[];  // 선행 챌린지 ID
  };
  metadata?: {               // 추가 메타데이터
    location?: {             // 위치 기반 챌린지용
      latitude: number;
      longitude: number;
      radius: number;        // 반경 (미터)
      name: string;
    };
    recurring?: {            // 반복 챌린지용
      frequency: 'daily' | 'weekly' | 'monthly';
      resetTime: string;     // HH:mm 형식
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// 사용자-챌린지 관계 인터페이스
export interface UserChallenge {
  id: string;
  userId: string;
  challengeId: string;
  status: UserChallengeStatus;
  progress: ChallengeGoal[];  // 사용자별 진행도
  startedAt: Date;
  completedAt?: Date;
  claimedRewards: boolean;    // 보상 수령 여부
  attempts: number;           // 시도 횟수
  metadata?: {
    lastActivityAt?: Date;    // 마지막 활동 시간
    notes?: string;           // 사용자 메모
  };
}

// 챌린지 통계 인터페이스
export interface ChallengeStats {
  totalChallenges: number;
  completedChallenges: number;
  failedChallenges: number;
  inProgressChallenges: number;
  totalPoints: number;
  totalBadges: number;
  completionRate: number;     // 완료율 (0-100)
  currentStreak: number;      // 현재 연속 완료 일수
  longestStreak: number;      // 최장 연속 완료 일수
}

// 챌린지 필터 옵션
export interface ChallengeFilterOptions {
  type?: ChallengeType[];
  difficulty?: ChallengeDifficulty[];
  status?: ChallengeStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}