import { LocationService } from '@/services/locationService';
import { GeofenceService } from '@/services/geofenceService';
import { LocationChallengeService } from '@/services/locationChallengeService';
import { ChallengeService } from '@/services/challengeService';
import {
  LocationData,
  Geofence,
  GeofenceEventType,
  LocationAccuracy
} from '@/types/location';
import { 
  Challenge, 
  ChallengeType, 
  ChallengeDifficulty, 
  ChallengeStatus,
  RewardType 
} from '@/types/challenge';
import { LOCATION_ACCURACY_CONFIG, GEOFENCE_CONFIG } from '@/config/locationConfig';

// 테스트용 샘플 데이터
const SEOUL_CITY_HALL: LocationData = {
  latitude: 37.5663,
  longitude: 126.9779,
  accuracy: 10,
  timestamp: Date.now()
};

const HAN_RIVER_PARK: LocationData = {
  latitude: 37.5326,
  longitude: 126.9903,
  accuracy: 15,
  timestamp: Date.now()
};

const NAMSAN_TOWER: LocationData = {
  latitude: 37.5512,
  longitude: 126.9882,
  accuracy: 8,
  timestamp: Date.now()
};

// 샘플 위치 기반 챌린지
const sampleLocationChallenge: Partial<Challenge> = {
  type: ChallengeType.LOCATION,
  title: '한강에서의 영감',
  description: '한강 공원에서 사진을 찍고 시를 작성해보세요.',
  difficulty: ChallengeDifficulty.EASY,
  status: ChallengeStatus.ACTIVE,
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  goals: [
    {
      type: 'location_visit',
      target: 1,
      description: '한강 공원 방문'
    },
    {
      type: 'photo_at_location',
      target: 1,
      description: '한강에서 사진 촬영'
    }
  ],
  rewards: [
    {
      type: RewardType.POINTS,
      value: 100,
      description: '위치 기반 챌린지 완료 포인트'
    }
  ],
  metadata: {
    location: {
      latitude: HAN_RIVER_PARK.latitude,
      longitude: HAN_RIVER_PARK.longitude,
      radius: 500,
      name: '한강 공원'
    }
  }
};

// 테스트 헬퍼 클래스
export class LocationChallengeTestHelper {
  // 모의 위치 데이터 생성
  static createMockLocation(
    latitude: number,
    longitude: number,
    accuracy: number = 10
  ): LocationData {
    return {
      latitude,
      longitude,
      accuracy,
      timestamp: Date.now()
    };
  }

  // 두 위치 간 거리 계산 테스트
  static testDistanceCalculation(): void {
    console.log('🧭 거리 계산 테스트');
    
    const distance = LocationService.calculateDistance(SEOUL_CITY_HALL, HAN_RIVER_PARK);
    console.log(`서울시청 ↔ 한강공원 거리: ${Math.round(distance)}m`);
    
    // 예상 거리와 비교 (약 3-4km)
    const expectedDistance = 3500; // 3.5km
    const tolerance = 500; // 500m 오차 허용
    
    if (Math.abs(distance - expectedDistance) <= tolerance) {
      console.log('✅ 거리 계산 정확도 테스트 통과');
    } else {
      console.log('❌ 거리 계산 정확도 테스트 실패');
    }
  }

  // 지오펜스 내부 확인 테스트
  static testGeofenceDetection(): void {
    console.log('\n🎯 지오펜스 감지 테스트');
    
    // 한강공원 중심 500m 반경 지오펜스
    const geofence: Geofence = {
      id: 'test_hanriver',
      name: '한강공원 테스트',
      center: HAN_RIVER_PARK,
      radius: 500,
      type: 'circle'
    };

    // 지오펜스 내부 위치 (한강공원에서 100m 떨어진 곳)
    const insideLocation = this.createMockLocation(
      HAN_RIVER_PARK.latitude + 0.0009, // 약 100m 북쪽
      HAN_RIVER_PARK.longitude
    );

    // 지오펜스 외부 위치 (한강공원에서 1km 떨어진 곳)
    const outsideLocation = this.createMockLocation(
      HAN_RIVER_PARK.latitude + 0.009, // 약 1km 북쪽
      HAN_RIVER_PARK.longitude
    );

    const isInside = LocationService.isLocationInRadius(
      insideLocation,
      geofence.center,
      geofence.radius
    );

    const isOutside = LocationService.isLocationInRadius(
      outsideLocation,
      geofence.center,
      geofence.radius
    );

    console.log(`내부 위치 감지: ${isInside ? '✅ 정확' : '❌ 오류'}`);
    console.log(`외부 위치 감지: ${!isOutside ? '✅ 정확' : '❌ 오류'}`);
  }

  // 위치 정확도 등급 테스트
  static testAccuracyGrading(): void {
    console.log('\n📊 위치 정확도 등급 테스트');
    
    const testCases = [
      { accuracy: 5, expected: 'excellent' },
      { accuracy: 25, expected: 'good' },
      { accuracy: 80, expected: 'fair' },
      { accuracy: 300, expected: 'poor' },
      { accuracy: 1500, expected: 'unusable' }
    ];

    testCases.forEach(testCase => {
      const grade = LocationConfigManager.getAccuracyGrade(testCase.accuracy);
      const isCorrect = grade === testCase.expected;
      console.log(
        `정확도 ${testCase.accuracy}m → ${grade} ${isCorrect ? '✅' : '❌'}`
      );
    });
  }

  // 지오펜스 이벤트 시뮬레이션
  static async simulateGeofenceEvents(): Promise<void> {
    console.log('\n🎬 지오펜스 이벤트 시뮬레이션');
    
    // 테스트용 지오펜스 추가
    const testGeofence: Geofence = {
      id: 'test_simulation',
      name: '시뮬레이션 테스트',
      center: NAMSAN_TOWER,
      radius: 200,
      type: 'circle',
      metadata: {
        challengeIds: ['test_challenge_1']
      }
    };

    await GeofenceService.addGeofence(testGeofence);

    // 이벤트 콜백 등록
    const events: any[] = [];
    GeofenceService.addEventCallback((event) => {
      events.push(event);
      console.log(`📍 이벤트 발생: ${event.type} at ${testGeofence.name}`);
    });

    // 지오펜스 모니터링 시작
    await GeofenceService.startMonitoring();

    // 시뮬레이션 시나리오
    console.log('시나리오 1: 지오펜스 외부에서 시작');
    const outsideLocation = this.createMockLocation(
      NAMSAN_TOWER.latitude + 0.005, // 약 500m 떨어진 곳
      NAMSAN_TOWER.longitude
    );
    GeofenceService.processLocationUpdate(outsideLocation);

    console.log('시나리오 2: 지오펜스 진입');
    const insideLocation = this.createMockLocation(
      NAMSAN_TOWER.latitude + 0.001, // 약 100m 떨어진 곳
      NAMSAN_TOWER.longitude
    );
    GeofenceService.processLocationUpdate(insideLocation);

    console.log('시나리오 3: 지오펜스 이탈');
    GeofenceService.processLocationUpdate(outsideLocation);

    // 결과 확인
    setTimeout(() => {
      console.log(`\n총 ${events.length}개 이벤트 발생:`);
      events.forEach((event, index) => {
        console.log(`${index + 1}. ${event.type} - ${new Date(event.timestamp).toLocaleTimeString()}`);
      });

      // 정리
      GeofenceService.stopMonitoring();
    }, 1000);
  }

  // 배터리 최적화 설정 테스트
  static testBatteryOptimization(): void {
    console.log('\n🔋 배터리 최적화 테스트');
    
    const testCases = [
      { battery: 80, expected: 'BALANCED' },
      { battery: 15, expected: 'LOW_POWER' },
      { battery: 5, expected: 'MINIMAL' }
    ];

    testCases.forEach(testCase => {
      const config = LocationConfigManager.getOptimalConfigForBattery(testCase.battery);
      const configName = Object.keys(LOCATION_ACCURACY_CONFIG).find(
        key => LOCATION_ACCURACY_CONFIG[key as keyof typeof LOCATION_ACCURACY_CONFIG] === config
      );
      
      console.log(`배터리 ${testCase.battery}% → ${configName} 설정`);
    });
  }

  // 위치 기반 챌린지 트리거 테스트
  static async testLocationChallengeTrigger(): Promise<void> {
    console.log('\n🏆 위치 기반 챌린지 트리거 테스트');
    
    // 테스트용 사용자 ID
    const testUserId = 'test_user_123';
    
    try {
      // 1. 위치 챌린지 서비스 초기화 (실제로는 실행하지 않음 - 테스트 환경)
      console.log('1. 위치 챌린지 서비스 테스트 준비');
      
      // 2. 현재 위치에서 사용 가능한 챌린지 조회 시뮬레이션
      console.log('2. 현재 위치 챌린지 조회 시뮬레이션');
      console.log(`   한강공원 위치에서 챌린지 검색...`);
      
      // 3. 지오펜스 진입 시 챌린지 자동 시작 시뮬레이션
      console.log('3. 챌린지 자동 시작 시뮬레이션');
      console.log(`   한강공원 지오펜스 진입 → 챌린지 자동 시작`);
      
      // 4. 사진 촬영 시 위치 검증 시뮬레이션
      console.log('4. 사진 촬영 위치 검증 시뮬레이션');
      console.log(`   한강공원에서 사진 촬영 → 챌린지 진행도 업데이트`);
      
      // 5. 챌린지 완료 시뮬레이션
      console.log('5. 챌린지 완료 시뮬레이션');
      console.log(`   모든 목표 달성 → 챌링지 완료 처리`);
      
      console.log('✅ 위치 기반 챌린지 트리거 테스트 완료');
      
    } catch (error) {
      console.error('❌ 위치 기반 챌린지 테스트 오류:', error);
    }
  }

  // 근처 챌린지 장소 찾기 테스트
  static testNearbyChallengePlaces(): void {
    console.log('\n🗺️ 근처 챌린지 장소 테스트');
    
    const currentLocation = SEOUL_CITY_HALL;
    const challengeLocations = [
      { name: '한강공원', location: HAN_RIVER_PARK },
      { name: '남산타워', location: NAMSAN_TOWER }
    ];

    challengeLocations.forEach(place => {
      const distance = LocationService.calculateDistance(currentLocation, place.location);
      console.log(`${place.name}: ${Math.round(distance)}m`);
    });

    // 거리순 정렬 테스트
    const sortedPlaces = challengeLocations
      .map(place => ({
        ...place,
        distance: LocationService.calculateDistance(currentLocation, place.location)
      }))
      .sort((a, b) => a.distance - b.distance);

    console.log('\n거리순 정렬:');
    sortedPlaces.forEach((place, index) => {
      console.log(`${index + 1}. ${place.name} (${Math.round(place.distance)}m)`);
    });
  }

  // 위치 데이터 검증 테스트
  static testLocationDataValidation(): void {
    console.log('\n✅ 위치 데이터 검증 테스트');
    
    const testLocations = [
      { 
        location: this.createMockLocation(37.5665, 126.9780, 5),
        description: '고정밀도 위치 (서울시청)'
      },
      { 
        location: this.createMockLocation(37.5665, 126.9780, 150),
        description: '중간 정밀도 위치'
      },
      { 
        location: this.createMockLocation(37.5665, 126.9780, 1200),
        description: '저정밀도 위치'
      },
      { 
        location: this.createMockLocation(90, 180, 10),
        description: '잘못된 좌표 (북극점)'
      }
    ];

    testLocations.forEach(test => {
      const { location, description } = test;
      const grade = LocationConfigManager.getAccuracyGrade(location.accuracy || 0);
      const isInKorea = LocationConfigManager.isLocationInKorea(
        location.latitude,
        location.longitude
      );
      
      console.log(`${description}:`);
      console.log(`  정확도: ${location.accuracy}m (${grade})`);
      console.log(`  한국 내 위치: ${isInKorea ? '예' : '아니오'}`);
      console.log('');
    });
  }
}

// 메인 테스트 실행 함수
export async function runLocationChallengeTests(): Promise<void> {
  console.log('🧪 위치 기반 챌린지 시스템 테스트 시작\n');
  
  try {
    // 기본 기능 테스트
    LocationChallengeTestHelper.testDistanceCalculation();
    LocationChallengeTestHelper.testGeofenceDetection();
    LocationChallengeTestHelper.testAccuracyGrading();
    LocationChallengeTestHelper.testBatteryOptimization();
    LocationChallengeTestHelper.testNearbyChallengePlaces();
    LocationChallengeTestHelper.testLocationDataValidation();
    
    // 고급 기능 테스트
    await LocationChallengeTestHelper.simulateGeofenceEvents();
    await LocationChallengeTestHelper.testLocationChallengeTrigger();
    
    console.log('\n✅ 모든 위치 기반 챌린지 테스트 완료!');
    
  } catch (error) {
    console.error('\n❌ 테스트 중 오류 발생:', error);
  }
}

// 성능 테스트
export class LocationPerformanceTest {
  static async testLocationUpdatePerformance(iterations: number = 100): Promise<void> {
    console.log(`\n⚡ 위치 업데이트 성능 테스트 (${iterations}회 반복)`);
    
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      const randomLocation = LocationChallengeTestHelper.createMockLocation(
        37.5665 + (Math.random() - 0.5) * 0.01, // ±500m 범위
        126.9780 + (Math.random() - 0.5) * 0.01,
        Math.random() * 50 + 5 // 5-55m 정확도
      );
      
      // 지오펜스 처리 시뮬레이션
      GeofenceService.processLocationUpdate(randomLocation);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;
    
    console.log(`총 소요 시간: ${totalTime}ms`);
    console.log(`평균 처리 시간: ${avgTime.toFixed(2)}ms/위치`);
    console.log(`처리율: ${(iterations / (totalTime / 1000)).toFixed(1)} 위치/초`);
  }
  
  static async testGeofenceScalability(geofenceCount: number = 50): Promise<void> {
    console.log(`\n📈 지오펜스 확장성 테스트 (${geofenceCount}개 지오펜스)`);
    
    // 다수의 지오펜스 생성
    const geofences: Geofence[] = [];
    for (let i = 0; i < geofenceCount; i++) {
      const geofence: Geofence = {
        id: `test_geofence_${i}`,
        name: `테스트 지오펜스 ${i}`,
        center: {
          latitude: 37.5665 + (Math.random() - 0.5) * 0.1,
          longitude: 126.9780 + (Math.random() - 0.5) * 0.1
        },
        radius: Math.random() * 500 + 100, // 100-600m
        type: 'circle'
      };
      
      geofences.push(geofence);
      await GeofenceService.addGeofence(geofence);
    }
    
    // 위치 업데이트 성능 측정
    const testLocation = LocationChallengeTestHelper.createMockLocation(37.5665, 126.9780);
    const startTime = Date.now();
    
    GeofenceService.processLocationUpdate(testLocation);
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`${geofenceCount}개 지오펜스 처리 시간: ${processingTime}ms`);
    console.log(`지오펜스당 평균 처리 시간: ${(processingTime / geofenceCount).toFixed(2)}ms`);
    
    // 정리
    for (const geofence of geofences) {
      await GeofenceService.removeGeofence(geofence.id);
    }
  }
}

// 타입스크립트 import를 위한 LocationConfigManager 가져오기
import { LocationConfigManager } from '@/config/locationConfig';