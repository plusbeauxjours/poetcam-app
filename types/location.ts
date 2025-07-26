// 위치 관련 타입 정의

// 좌표 인터페이스
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;      // 미터 단위 정확도
  altitude?: number;      // 고도 (미터)
  altitudeAccuracy?: number;
  heading?: number;       // 방향 (도)
  speed?: number;         // 속도 (m/s)
}

// 위치 타임스탬프 포함
export interface LocationData extends Coordinates {
  timestamp: number;
}

// 지오펜스 영역 정의
export interface Geofence {
  id: string;
  name: string;
  center: {
    latitude: number;
    longitude: number;
  };
  radius: number;         // 미터 단위
  type: 'circle' | 'polygon';
  polygon?: Coordinates[]; // polygon 타입일 때 사용
  metadata?: {
    description?: string;
    category?: string;
    challengeIds?: string[]; // 연관된 챌린지 ID들
  };
}

// 지오펜스 이벤트 타입
export enum GeofenceEventType {
  ENTER = 'enter',
  EXIT = 'exit',
  DWELL = 'dwell'  // 일정 시간 머무름
}

// 지오펜스 이벤트
export interface GeofenceEvent {
  type: GeofenceEventType;
  geofenceId: string;
  location: LocationData;
  timestamp: number;
  dwellTime?: number;    // dwell 이벤트일 때 머문 시간 (초)
}

// 위치 권한 상태
export enum LocationPermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  BLOCKED = 'blocked',
  UNDETERMINED = 'undetermined'
}

// 위치 정확도 레벨
export enum LocationAccuracy {
  HIGH = 'high',              // GPS 사용, 최고 정확도
  BALANCED = 'balanced',      // GPS + WiFi + 셀룰러
  LOW = 'low',                // WiFi + 셀룰러만
  NO_POWER = 'no_power'       // 전력 소비 없음
}

// 위치 추적 옵션
export interface LocationTrackingOptions {
  accuracy: LocationAccuracy;
  distanceFilter: number;     // 최소 이동 거리 (미터)
  timeInterval?: number;      // 업데이트 간격 (밀리초)
  showUserLocation?: boolean;
  enableBackgroundUpdates?: boolean;
}

// 위치 기반 챌린지 트리거 조건
export interface LocationTrigger {
  type: 'geofence' | 'distance' | 'visit_count';
  geofenceId?: string;        // geofence 타입일 때
  targetDistance?: number;    // distance 타입일 때 (미터)
  targetVisitCount?: number;  // visit_count 타입일 때
  minDwellTime?: number;      // 최소 머무름 시간 (초)
  maxRadius?: number;         // 허용 오차 범위 (미터)
}

// 방문 기록
export interface LocationVisit {
  id: string;
  userId: string;
  location: Coordinates;
  address?: string;           // 역지오코딩된 주소
  placeName?: string;         // 장소 이름
  visitedAt: Date;
  duration?: number;          // 머문 시간 (초)
  geofenceId?: string;        // 관련 지오펜스 ID
  challengeId?: string;       // 관련 챌린지 ID
}

// 위치 통계
export interface LocationStats {
  totalVisits: number;
  uniqueLocations: number;
  totalDistance: number;      // 총 이동 거리 (미터)
  favoriteLocation?: {
    coordinates: Coordinates;
    visitCount: number;
    placeName?: string;
  };
  recentVisits: LocationVisit[];
}

// 위치 서비스 에러 타입
export enum LocationErrorType {
  PERMISSION_DENIED = 'permission_denied',
  LOCATION_UNAVAILABLE = 'location_unavailable',
  TIMEOUT = 'timeout',
  PLAY_SERVICE_NOT_AVAILABLE = 'play_service_not_available',
  SETTINGS_NOT_SATISFIED = 'settings_not_satisfied',
  INTERNAL_ERROR = 'internal_error'
}

// 위치 에러
export interface LocationError {
  type: LocationErrorType;
  message: string;
  code?: number;
}