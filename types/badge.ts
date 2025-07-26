// 뱃지 시스템 타입 정의

// 뱃지 카테고리
export enum BadgeCategory {
  BEGINNER = 'beginner',           // 초보자 뱃지
  CREATIVE = 'creative',           // 창작 활동 뱃지
  LOCATION = 'location',           // 위치 기반 뱃지
  CHALLENGE = 'challenge',         // 챌린지 완료 뱃지
  SOCIAL = 'social',               // 소셜 활동 뱃지
  ACHIEVEMENT = 'achievement',     // 업적 뱃지
  SEASONAL = 'seasonal',           // 계절/이벤트 뱃지
  SPECIAL = 'special'              // 특별 뱃지
}

// 뱃지 등급
export enum BadgeRarity {
  COMMON = 'common',               // 일반 (회색)
  UNCOMMON = 'uncommon',           // 고급 (초록)
  RARE = 'rare',                   // 희귀 (파랑)
  EPIC = 'epic',                   // 영웅 (보라)
  LEGENDARY = 'legendary'          // 전설 (금색)
}

// 뱃지 획득 조건 타입
export enum BadgeConditionType {
  POEM_COUNT = 'poem_count',               // 시 작성 개수
  PHOTO_COUNT = 'photo_count',             // 사진 촬영 개수
  CHALLENGE_COMPLETE = 'challenge_complete', // 챌린지 완료 개수
  LOCATION_VISIT = 'location_visit',       // 위치 방문 개수
  CONSECUTIVE_DAYS = 'consecutive_days',   // 연속 접속 일수
  TOTAL_POINTS = 'total_points',           // 총 획득 포인트
  SHARE_COUNT = 'share_count',             // 공유 횟수
  LIKE_RECEIVED = 'like_received',         // 받은 좋아요 수
  COMMENT_COUNT = 'comment_count',         // 댓글 작성 수
  SPECIFIC_CHALLENGE = 'specific_challenge', // 특정 챌린지 완료
  TIME_BASED = 'time_based',               // 시간 기반 (특정 시간대)
  SEASONAL_EVENT = 'seasonal_event'        // 계절 이벤트 참여
}

// 뱃지 획득 조건
export interface BadgeCondition {
  type: BadgeConditionType;
  target: number;                          // 목표 수치
  period?: 'all_time' | 'daily' | 'weekly' | 'monthly'; // 기간 제한
  specificValue?: string;                  // 특정 값 (예: 챌린지 ID)
  timeConstraint?: {                       // 시간 제약 조건
    startTime?: string;                    // HH:mm 형식
    endTime?: string;
    dayOfWeek?: number[];                  // 0(일) ~ 6(토)
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

// 뱃지 인터페이스
export interface Badge {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  iconName: string;                        // 아이콘 이름 또는 이미지 URL
  iconColor: string;                       // 뱃지 주 색상
  conditions: BadgeCondition[];            // 획득 조건들
  points: number;                          // 뱃지 획득 시 부여 포인트
  isSecret: boolean;                       // 숨겨진 뱃지 여부
  isLimited: boolean;                      // 한정 뱃지 여부
  unlockHint?: string;                     // 잠긴 뱃지의 힌트
  prerequisites?: string[];                // 선행 뱃지 ID들
  metadata?: {
    createdDate?: Date;                    // 뱃지 생성 날짜
    expiryDate?: Date;                     // 만료 날짜 (한정 뱃지)
    version?: string;                      // 뱃지 버전
    artist?: string;                       // 디자이너 정보
  };
}

// 사용자 뱃지 획득 기록
export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: Date;
  progress?: BadgeProgress[];              // 진행도 (복합 조건 뱃지용)
  notificationSent: boolean;               // 알림 발송 여부
  metadata?: {
    challengeId?: string;                  // 관련 챌린지 ID
    location?: {                           // 획득 위치
      latitude: number;
      longitude: number;
      placeName?: string;
    };
    triggerData?: any;                     // 트리거 데이터
  };
}

// 뱃지 진행도 (복합 조건용)  
export interface BadgeProgress {
  conditionIndex: number;                  // 조건 인덱스
  current: number;                         // 현재 진행도
  target: number;                          // 목표치
  completed: boolean;                      // 완료 여부
  lastUpdated: Date;                       // 마지막 업데이트
}

// 뱃지 통계
export interface BadgeStats {
  totalBadges: number;                     // 총 뱃지 수
  earnedBadges: number;                    // 획득한 뱃지 수
  completionRate: number;                  // 완료율 (0-100)
  byRarity: {
    [key in BadgeRarity]: number;
  };
  byCategory: {
    [key in BadgeCategory]: number;
  };
  recentEarned: UserBadge[];               // 최근 획득 뱃지들
  nextAvailable: Badge[];                  // 다음 획득 가능한 뱃지들
}

// 뱃지 컬렉션 표시 옵션
export interface BadgeDisplayOptions {
  showLocked: boolean;                     // 잠긴 뱃지 표시 여부
  sortBy: 'rarity' | 'category' | 'earnedDate' | 'name';
  filterBy?: {
    category?: BadgeCategory[];
    rarity?: BadgeRarity[];
    earned?: boolean;
  };
  groupBy?: 'category' | 'rarity' | 'none';
}

// 뱃지 알림 설정
export interface BadgeNotificationSettings {
  enabled: boolean;                        // 뱃지 알림 활성화
  showProgress: boolean;                   // 진행도 알림 표시
  progressThreshold: number;               // 진행도 알림 임계값 (%)
  soundEnabled: boolean;                   // 소리 알림
  vibrationEnabled: boolean;               // 진동 알림
  showInApp: boolean;                      // 앱 내 알림
  showPush: boolean;                       // 푸시 알림
}

// 뱃지 획득 이벤트
export interface BadgeEarnedEvent {
  badge: Badge;
  userBadge: UserBadge;
  isFirstTime: boolean;                    // 최초 획득 여부
  triggeredBy: {                           // 트리거 정보
    action: string;                        // 액션 타입
    challengeId?: string;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
}

// 뱃지 필터 옵션
export interface BadgeFilterOptions {
  category?: BadgeCategory[];
  rarity?: BadgeRarity[];
  earned?: boolean;
  available?: boolean;                     // 획득 가능한 뱃지만
  secret?: boolean;                        // 숨겨진 뱃지 포함 여부
}

// 뱃지 검색 결과
export interface BadgeSearchResult {
  badges: Badge[];
  userBadges: UserBadge[];
  totalCount: number;
  hasMore: boolean;
}