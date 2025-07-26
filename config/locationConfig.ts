// 위치 관련 설정 및 상수

import { LocationAccuracy, LocationTrackingOptions } from '@/types/location';

// 위치 정확도 설정
export const LOCATION_ACCURACY_CONFIG = {
  // GPS 기반 고정밀도 (배터리 소모 높음)
  HIGH_ACCURACY: {
    accuracy: LocationAccuracy.HIGH,
    distanceFilter: 5, // 5미터 이동 시 업데이트
    timeInterval: 15000, // 15초마다 업데이트
    enableBackgroundUpdates: false,
    description: '최고 정확도 (GPS 사용, 배터리 소모 높음)'
  },

  // 균형 모드 (권장 설정)
  BALANCED: {
    accuracy: LocationAccuracy.BALANCED,
    distanceFilter: 10, // 10미터 이동 시 업데이트
    timeInterval: 30000, // 30초마다 업데이트
    enableBackgroundUpdates: false,
    description: '균형 모드 (GPS + WiFi + 셀룰러, 권장)'
  },

  // 저전력 모드
  LOW_POWER: {
    accuracy: LocationAccuracy.LOW,
    distanceFilter: 50, // 50미터 이동 시 업데이트
    timeInterval: 60000, // 1분마다 업데이트
    enableBackgroundUpdates: false,
    description: '저전력 모드 (WiFi + 셀룰러만)'
  },

  // 최저 전력 모드
  MINIMAL: {
    accuracy: LocationAccuracy.NO_POWER,
    distanceFilter: 100, // 100미터 이동 시 업데이트
    timeInterval: 300000, // 5분마다 업데이트
    enableBackgroundUpdates: false,
    description: '최저 전력 모드 (전력 소비 없음)'
  }
} as const;

// 지오펜스 관련 설정
export const GEOFENCE_CONFIG = {
  // 기본 지오펜스 반경 (미터)
  DEFAULT_RADIUS: 100,
  
  // 최소/최대 지오펜스 반경
  MIN_RADIUS: 10,
  MAX_RADIUS: 10000, // 10km
  
  // Dwell 시간 설정 (초)
  DEFAULT_DWELL_TIME: 300, // 5분
  MIN_DWELL_TIME: 60, // 1분
  MAX_DWELL_TIME: 3600, // 1시간
  
  // 지오펜스 모니터링 설정
  MAX_MONITORED_GEOFENCES: 100, // 최대 모니터링 가능 지오펜스 수
  GEOFENCE_EXPIRY_TIME: 30 * 24 * 60 * 60 * 1000, // 30일 후 만료
  
  // 정확도 허용 오차
  ACCURACY_THRESHOLD: 50 // 50미터 이상 오차 발생 시 무시
} as const;

// 챌린지 관련 위치 설정
export const CHALLENGE_LOCATION_CONFIG = {
  // 위치 기반 챌린지 기본 설정
  DEFAULT_CHALLENGE_RADIUS: 200, // 200미터
  MIN_CHALLENGE_RADIUS: 50, // 50미터
  MAX_CHALLENGE_RADIUS: 2000, // 2km
  
  // 자동 챌린지 시작 설정
  AUTO_START_ENABLED: true,
  AUTO_START_RADIUS_BUFFER: 50, // 지오펜스 경계에서 50미터 여유
  
  // 위치 검증 설정
  LOCATION_VERIFICATION_ATTEMPTS: 3, // 위치 검증 시도 횟수
  LOCATION_VERIFICATION_INTERVAL: 10000, // 10초 간격으로 재시도
  
  // 사진 촬영 위치 검증
  PHOTO_LOCATION_TOLERANCE: 100, // 100미터 이내에서 촬영한 사진만 인정
  LOCATION_STALENESS_THRESHOLD: 300000, // 5분 이상 된 위치 정보는 무시
  
  // 방문 인정 기준
  VISIT_MIN_ACCURACY: 100, // 100미터 이내 정확도 필요
  VISIT_MIN_DURATION: 30, // 최소 30초 머무름 필요
  VISIT_MAX_SPEED: 5, // 시속 5km 이하일 때만 방문으로 인정 (m/s로 환산하면 약 1.4m/s)
} as const;

// 오차 범위 및 정확도 임계값
export const ACCURACY_THRESHOLDS = {
  // 정확도 등급별 임계값 (미터)
  EXCELLENT: 10, // 10미터 이내 - 우수
  GOOD: 30, // 30미터 이내 - 양호
  FAIR: 100, // 100미터 이내 - 보통
  POOR: 500, // 500미터 이내 - 나쁨
  UNUSABLE: 1000, // 1km 이상 - 사용 불가
  
  // 사용 목적별 권장 정확도
  NAVIGATION: 10, // 내비게이션용
  GEOFENCING: 50, // 지오펜싱용
  GENERAL: 100, // 일반적인 위치 서비스
  APPROXIMATE: 500, // 대략적인 위치
} as const;

// 위치 서비스 성능 최적화 설정
export const PERFORMANCE_CONFIG = {
  // 위치 캐싱 설정
  LOCATION_CACHE_DURATION: 30000, // 30초간 캐싱
  LOCATION_CACHE_DISTANCE_THRESHOLD: 20, // 20미터 이상 이동 시 캐시 무효화
  
  // 배터리 최적화
  BATTERY_OPTIMIZATION: {
    // 배터리 레벨에 따른 자동 조정
    LOW_BATTERY_THRESHOLD: 20, // 20% 이하 시 저전력 모드 자동 전환
    CRITICAL_BATTERY_THRESHOLD: 10, // 10% 이하 시 위치 서비스 일시 중단
    
    // 화면 상태에 따른 조정
    BACKGROUND_UPDATE_INTERVAL: 120000, // 백그라운드에서 2분마다 업데이트
    FOREGROUND_UPDATE_INTERVAL: 30000, // 포그라운드에서 30초마다 업데이트
  },
  
  // 네트워크 최적화
  NETWORK_OPTIMIZATION: {
    WIFI_PREFERRED: true, // WiFi 우선 사용
    CELLULAR_FALLBACK: true, // 셀룰러 네트워크 대체 사용
    OFFLINE_MODE_ENABLED: true, // 오프라인 모드 지원
  }
} as const;

// 디버깅 및 로깅 설정
export const DEBUG_CONFIG = {
  ENABLE_LOCATION_LOGGING: __DEV__, // 개발 모드에서만 로깅
  LOG_ACCURACY_WARNINGS: true, // 정확도 경고 로깅
  LOG_GEOFENCE_EVENTS: __DEV__, // 지오펜스 이벤트 로깅
  MOCK_LOCATION_DETECTION: __DEV__, // 모의 위치 감지 (개발용)
} as const;

// 지역별 설정 (한국 기준)
export const REGIONAL_CONFIG = {
  // 한국의 위치 좌표 범위
  KOREA_BOUNDS: {
    north: 38.612446,
    south: 33.190945,
    east: 131.872742,
    west: 124.609375
  },
  
  // 주요 도시 중심점
  MAJOR_CITIES: {
    SEOUL: { latitude: 37.5665, longitude: 126.9780 },
    BUSAN: { latitude: 35.1796, longitude: 129.0756 },
    INCHEON: { latitude: 37.4563, longitude: 126.7052 },
    DAEGU: { latitude: 35.8714, longitude: 128.6014 },
    DAEJEON: { latitude: 36.3504, longitude: 127.3845 },
    GWANGJU: { latitude: 35.1595, longitude: 126.8526 }
  },
  
  // 한국 시간대
  TIMEZONE: 'Asia/Seoul',
  
  // 기본 언어
  DEFAULT_LANGUAGE: 'ko'
} as const;

// 보안 및 개인정보 설정
export const PRIVACY_CONFIG = {
  // 위치 데이터 보관 기간
  LOCATION_DATA_RETENTION_DAYS: 90, // 90일
  
  // 정밀 위치 사용 여부
  PRECISE_LOCATION_REQUIRED: false,
  
  // 위치 데이터 암호화
  ENCRYPT_LOCATION_DATA: true,
  
  // 위치 데이터 익명화
  ANONYMIZE_LOCATION_DATA: false, // 챌린지 기능상 필요하므로 false
  
  // 외부 서비스 공유 제한
  THIRD_PARTY_SHARING_ENABLED: false
} as const;

// 설정 유틸리티 함수들
export class LocationConfigManager {
  // 배터리 레벨에 따른 최적 설정 반환
  static getOptimalConfigForBattery(batteryLevel: number): LocationTrackingOptions {
    if (batteryLevel <= PERFORMANCE_CONFIG.BATTERY_OPTIMIZATION.CRITICAL_BATTERY_THRESHOLD) {
      return LOCATION_ACCURACY_CONFIG.MINIMAL;
    } else if (batteryLevel <= PERFORMANCE_CONFIG.BATTERY_OPTIMIZATION.LOW_BATTERY_THRESHOLD) {
      return LOCATION_ACCURACY_CONFIG.LOW_POWER;
    } else {
      return LOCATION_ACCURACY_CONFIG.BALANCED;
    }
  }
  
  // 정확도 등급 반환
  static getAccuracyGrade(accuracy: number): string {
    if (accuracy <= ACCURACY_THRESHOLDS.EXCELLENT) return 'excellent';
    if (accuracy <= ACCURACY_THRESHOLDS.GOOD) return 'good';
    if (accuracy <= ACCURACY_THRESHOLDS.FAIR) return 'fair';
    if (accuracy <= ACCURACY_THRESHOLDS.POOR) return 'poor';
    return 'unusable';
  }
  
  // 위치가 한국 내부인지 확인
  static isLocationInKorea(latitude: number, longitude: number): boolean {
    const bounds = REGIONAL_CONFIG.KOREA_BOUNDS;
    return latitude >= bounds.south && 
           latitude <= bounds.north && 
           longitude >= bounds.west && 
           longitude <= bounds.east;
  }
  
  // 사용자 설정에 따른 개인화된 설정 반환
  static getPersonalizedConfig(userPreferences: {
    batteryOptimization?: boolean;
    highAccuracy?: boolean;
    backgroundUpdates?: boolean;
  }): LocationTrackingOptions {
    let config = { ...LOCATION_ACCURACY_CONFIG.BALANCED };
    
    if (userPreferences.batteryOptimization) {
      config = { ...LOCATION_ACCURACY_CONFIG.LOW_POWER };
    }
    
    if (userPreferences.highAccuracy) {
      config = { ...LOCATION_ACCURACY_CONFIG.HIGH_ACCURACY };
    }
    
    if (userPreferences.backgroundUpdates !== undefined) {
      config.enableBackgroundUpdates = userPreferences.backgroundUpdates;
    }
    
    return config;
  }
}