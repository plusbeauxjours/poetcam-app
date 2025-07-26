import { ChallengeService } from './challengeService';
import { LocationService } from './locationService';
import { GeofenceService } from './geofenceService';
import { 
  Challenge, 
  ChallengeType, 
  UserChallengeStatus 
} from '@/types/challenge';
import {
  GeofenceEvent,
  GeofenceEventType,
  LocationData,
  LocationTrigger,
  Geofence
} from '@/types/location';

export class LocationChallengeService {
  private static isInitialized = false;
  private static activeChallenges: Map<string, Challenge> = new Map();
  private static userId: string | null = null;

  // 서비스 초기화
  static async initialize(userId: string): Promise<void> {
    if (this.isInitialized) return;

    this.userId = userId;

    try {
      // 위치 기반 챌린지 로드
      await this.loadLocationChallenges();
      
      // 지오펜스 모니터링 시작
      await GeofenceService.startMonitoring();
      
      // 지오펜스 이벤트 콜백 등록
      GeofenceService.addEventCallback(this.handleGeofenceEvent.bind(this));
      
      // 위치 추적 시작
      await LocationService.startLocationTracking(
        {
          accuracy: 'balanced' as any,
          distanceFilter: 10, // 10미터마다 업데이트
          timeInterval: 30000, // 30초마다 업데이트
          enableBackgroundUpdates: false
        },
        this.handleLocationUpdate.bind(this)
      );

      this.isInitialized = true;
      console.log('Location challenge service initialized');
    } catch (error) {
      console.error('Error initializing location challenge service:', error);
      throw error;
    }
  }

  // 서비스 종료
  static cleanup(): void {
    if (!this.isInitialized) return;

    LocationService.stopLocationTracking();
    GeofenceService.stopMonitoring();
    this.activeChallenges.clear();
    this.isInitialized = false;
    this.userId = null;

    console.log('Location challenge service cleaned up');
  }

  // 위치 기반 챌린지 로드
  private static async loadLocationChallenges(): Promise<void> {
    try {
      // 위치 기반 활성 챌린지 조회
      const challenges = await ChallengeService.getChallenges({
        type: [ChallengeType.LOCATION],
        status: ['active' as any]
      });

      this.activeChallenges.clear();

      for (const challenge of challenges) {
        this.activeChallenges.set(challenge.id, challenge);
        
        // 챌린지에 해당하는 지오펜스 생성
        if (challenge.metadata?.location) {
          await this.createGeofenceForChallenge(challenge);
        }
      }

      console.log(`Loaded ${challenges.length} location-based challenges`);
    } catch (error) {
      console.error('Error loading location challenges:', error);
      throw error;
    }
  }

  // 챌린지용 지오펜스 생성
  private static async createGeofenceForChallenge(challenge: Challenge): Promise<void> {
    if (!challenge.metadata?.location) return;

    const geofence: Geofence = {
      id: `challenge_${challenge.id}`,
      name: challenge.title,
      center: {
        latitude: challenge.metadata.location.latitude,
        longitude: challenge.metadata.location.longitude
      },
      radius: challenge.metadata.location.radius,
      type: 'circle',
      metadata: {
        description: challenge.description,
        category: 'challenge',
        challengeIds: [challenge.id]
      }
    };

    await GeofenceService.addGeofence(geofence);
  }

  // 지오펜스 이벤트 처리
  private static async handleGeofenceEvent(event: GeofenceEvent): Promise<void> {
    if (!this.userId) return;

    try {
      const geofence = GeofenceService.getGeofence(event.geofenceId);
      if (!geofence?.metadata?.challengeIds) return;

      for (const challengeId of geofence.metadata.challengeIds) {
        const challenge = this.activeChallenges.get(challengeId);
        if (!challenge) continue;

        // 사용자의 챌린지 진행 상황 확인
        const userChallenge = await ChallengeService.getUserChallengeProgress(
          this.userId,
          challengeId
        );

        // 챌린지를 시작하지 않았다면 자동 시작
        if (!userChallenge) {
          await this.autoStartChallenge(challengeId, event);
          continue;
        }

        // 이미 완료된 챌린지는 스킵
        if (userChallenge.status === UserChallengeStatus.COMPLETED) {
          continue;
        }

        // 이벤트 타입에 따른 처리
        await this.processLocationTrigger(challenge, userChallenge, event);
      }
    } catch (error) {
      console.error('Error handling geofence event:', error);
    }
  }

  // 위치 업데이트 처리
  private static async handleLocationUpdate(location: LocationData): Promise<void> {
    // 지오펜스 서비스에 위치 업데이트 전달
    GeofenceService.processLocationUpdate(location);

    // 위치 방문 기록 저장
    if (this.userId) {
      await LocationService.saveLocationVisit({
        userId: this.userId,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        },
        visitedAt: new Date(location.timestamp)
      });
    }
  }

  // 챌린지 자동 시작
  private static async autoStartChallenge(
    challengeId: string,
    event: GeofenceEvent
  ): Promise<void> {
    if (!this.userId) return;

    try {
      await ChallengeService.startChallenge(this.userId, challengeId);
      console.log(`Auto-started location challenge: ${challengeId}`);
      
      // 시작 후 바로 트리거 처리
      const challenge = this.activeChallenges.get(challengeId);
      if (challenge) {
        const userChallenge = await ChallengeService.getUserChallengeProgress(
          this.userId,
          challengeId
        );
        if (userChallenge) {
          await this.processLocationTrigger(challenge, userChallenge, event);
        }
      }
    } catch (error) {
      console.error('Error auto-starting challenge:', error);
    }
  }

  // 위치 트리거 처리
  private static async processLocationTrigger(
    challenge: Challenge,
    userChallenge: any,
    event: GeofenceEvent
  ): Promise<void> {
    if (!this.userId) return;

    try {
      // 챌린지 목표 확인
      for (const goal of challenge.goals) {
        let shouldUpdate = false;
        let increment = 0;

        switch (goal.type) {
          case 'location_visit':
            // 지오펜스 진입 시 방문 카운트 증가
            if (event.type === GeofenceEventType.ENTER) {
              shouldUpdate = true;
              increment = 1;
            }
            break;

          case 'location_dwell':
            // 지정된 시간 머무름
            if (event.type === GeofenceEventType.DWELL) {
              shouldUpdate = true;
              increment = 1;
            }
            break;

          case 'poem_at_location':
            // 위치에서 시 작성 (별도 처리 필요)
            // 실제로는 사진/시 작성 시 위치 확인하여 처리
            break;

          default:
            continue;
        }

        if (shouldUpdate) {
          await ChallengeService.updateChallengeProgress(
            this.userId,
            challenge.id,
            goal.type,
            increment
          );

          console.log(`Updated challenge progress: ${challenge.title} - ${goal.type} +${increment}`);
        }
      }
    } catch (error) {
      console.error('Error processing location trigger:', error);
    }
  }

  // 현재 위치에서 사용 가능한 챌린지 조회
  static async getChallengesAtCurrentLocation(): Promise<Challenge[]> {
    if (!this.userId) return [];

    try {
      const currentLocation = await LocationService.getCurrentLocation();
      return this.getChallengesAtLocation(currentLocation);
    } catch (error) {
      console.error('Error getting challenges at current location:', error);
      return [];
    }
  }

  // 특정 위치에서 사용 가능한 챌린지 조회
  static getChallengesAtLocation(location: LocationData): Challenge[] {
    const availableChallenges: Challenge[] = [];

    this.activeChallenges.forEach(challenge => {
      if (challenge.metadata?.location) {
        const distance = LocationService.calculateDistance(
          location,
          challenge.metadata.location
        );

        if (distance <= challenge.metadata.location.radius) {
          availableChallenges.push(challenge);
        }
      }
    });

    return availableChallenges;
  }

  // 사진 촬영 시 위치 확인 및 챌린지 업데이트
  static async onPhotoTaken(photoLocation: LocationData, photoId: string): Promise<void> {
    if (!this.userId) return;

    try {
      const challengesAtLocation = this.getChallengesAtLocation(photoLocation);

      for (const challenge of challengesAtLocation) {
        const userChallenge = await ChallengeService.getUserChallengeProgress(
          this.userId,
          challenge.id
        );

        if (!userChallenge || userChallenge.status !== UserChallengeStatus.IN_PROGRESS) {
          continue;
        }

        // 위치에서 사진 촬영 목표 업데이트
        for (const goal of challenge.goals) {
          if (goal.type === 'photo_at_location' || goal.type === 'poem_at_location') {
            await ChallengeService.updateChallengeProgress(
              this.userId,
              challenge.id,
              goal.type,
              1
            );

            console.log(`Photo taken at challenge location: ${challenge.title}`);
          }
        }
      }
    } catch (error) {
      console.error('Error processing photo at location:', error);
    }
  }

  // 근처 챌린지 위치 조회
  static async getNearbyChallengePlaces(radius: number = 5000): Promise<{
    challenge: Challenge;
    distance: number;
    direction?: string;
  }[]> {
    if (!this.userId) return [];

    try {
      const currentLocation = await LocationService.getCurrentLocation();
      const nearbyPlaces: {
        challenge: Challenge;
        distance: number;
        direction?: string;
      }[] = [];

      this.activeChallenges.forEach(challenge => {
        if (challenge.metadata?.location) {
          const distance = LocationService.calculateDistance(
            currentLocation,
            challenge.metadata.location
          );

          if (distance <= radius) {
            // 방향 계산 (간단한 방위각)
            const bearing = this.calculateBearing(
              currentLocation,
              challenge.metadata.location
            );
            const direction = this.bearingToDirection(bearing);

            nearbyPlaces.push({
              challenge,
              distance: Math.round(distance),
              direction
            });
          }
        }
      });

      // 거리순 정렬
      return nearbyPlaces.sort((a, b) => a.distance - b.distance);
    } catch (error) {
      console.error('Error getting nearby challenge places:', error);
      return [];
    }
  }

  // 방위각 계산
  private static calculateBearing(from: LocationData, to: { latitude: number; longitude: number }): number {
    const dLon = (to.longitude - from.longitude) * Math.PI / 180;
    const lat1 = from.latitude * Math.PI / 180;
    const lat2 = to.latitude * Math.PI / 180;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  }

  // 방위각을 방향으로 변환
  private static bearingToDirection(bearing: number): string {
    const directions = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  // 위치 기반 챌린지 통계
  static async getLocationChallengeStats(): Promise<{
    totalLocationChallenges: number;
    completedLocationChallenges: number;
    uniqueLocationsVisited: number;
    totalDistanceTraveled: number;
  }> {
    if (!this.userId) {
      return {
        totalLocationChallenges: 0,
        completedLocationChallenges: 0,
        uniqueLocationsVisited: 0,
        totalDistanceTraveled: 0
      };
    }

    try {
      const userChallenges = await ChallengeService.getUserChallenges(this.userId);
      const locationChallenges = userChallenges.filter(uc => {
        const challenge = this.activeChallenges.get(uc.challengeId);
        return challenge?.type === ChallengeType.LOCATION;
      });

      const visits = await LocationService.getLocationVisits();
      const uniqueLocations = new Set();
      let totalDistance = 0;

      // 고유 위치 계산 및 총 이동 거리 계산
      for (let i = 0; i < visits.length; i++) {
        const visit = visits[i];
        const locationKey = `${Math.round(visit.location.latitude * 1000)},${Math.round(visit.location.longitude * 1000)}`;
        uniqueLocations.add(locationKey);

        if (i > 0) {
          const distance = LocationService.calculateDistance(
            visits[i - 1].location,
            visit.location
          );
          totalDistance += distance;
        }
      }

      return {
        totalLocationChallenges: locationChallenges.length,
        completedLocationChallenges: locationChallenges.filter(
          uc => uc.status === UserChallengeStatus.COMPLETED
        ).length,
        uniqueLocationsVisited: uniqueLocations.size,
        totalDistanceTraveled: Math.round(totalDistance)
      };
    } catch (error) {
      console.error('Error getting location challenge stats:', error);
      return {
        totalLocationChallenges: 0,
        completedLocationChallenges: 0,
        uniqueLocationsVisited: 0,
        totalDistanceTraveled: 0
      };
    }
  }
}