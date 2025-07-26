import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Geofence,
  GeofenceEvent,
  GeofenceEventType,
  LocationData,
  Coordinates
} from '@/types/location';
import { LocationService } from './locationService';

const GEOFENCES_STORAGE_KEY = '@poetcam_geofences';
const GEOFENCE_EVENTS_STORAGE_KEY = '@poetcam_geofence_events';

export class GeofenceService {
  private static activeGeofences: Map<string, Geofence> = new Map();
  private static userLastLocation: LocationData | null = null;
  private static insideGeofences: Set<string> = new Set();
  private static dwellTimers: Map<string, NodeJS.Timeout> = new Map();
  private static eventCallbacks: Array<(event: GeofenceEvent) => void> = [];

  // 지오펜스 추가
  static async addGeofence(geofence: Geofence): Promise<void> {
    try {
      this.activeGeofences.set(geofence.id, geofence);
      await this.saveGeofencesToStorage();
      console.log(`Geofence added: ${geofence.name} (${geofence.id})`);
    } catch (error) {
      console.error('Error adding geofence:', error);
      throw error;
    }
  }

  // 지오펜스 제거
  static async removeGeofence(geofenceId: string): Promise<void> {
    try {
      this.activeGeofences.delete(geofenceId);
      this.insideGeofences.delete(geofenceId);
      
      // 대기 중인 dwell 타이머 취소
      const timer = this.dwellTimers.get(geofenceId);
      if (timer) {
        clearTimeout(timer);
        this.dwellTimers.delete(geofenceId);
      }
      
      await this.saveGeofencesToStorage();
      console.log(`Geofence removed: ${geofenceId}`);
    } catch (error) {
      console.error('Error removing geofence:', error);
      throw error;
    }
  }

  // 모든 지오펜스 조회
  static getGeofences(): Geofence[] {
    return Array.from(this.activeGeofences.values());
  }

  // 특정 지오펜스 조회
  static getGeofence(geofenceId: string): Geofence | undefined {
    return this.activeGeofences.get(geofenceId);
  }

  // 지오펜스 모니터링 시작
  static async startMonitoring(): Promise<void> {
    try {
      // 저장된 지오펜스 로드
      await this.loadGeofencesFromStorage();
      
      console.log(`Started monitoring ${this.activeGeofences.size} geofences`);
    } catch (error) {
      console.error('Error starting geofence monitoring:', error);
      throw error;
    }
  }

  // 지오펜스 모니터링 중지
  static stopMonitoring(): void {
    // 모든 dwell 타이머 정리
    this.dwellTimers.forEach(timer => clearTimeout(timer));
    this.dwellTimers.clear();
    this.insideGeofences.clear();
    this.eventCallbacks = [];
    
    console.log('Stopped geofence monitoring');
  }

  // 위치 업데이트 처리
  static processLocationUpdate(location: LocationData): void {
    const previousLocation = this.userLastLocation;
    this.userLastLocation = location;

    // 각 지오펜스에 대해 진입/이탈 확인
    this.activeGeofences.forEach((geofence, geofenceId) => {
      const isInside = this.isLocationInsideGeofence(location, geofence);
      const wasInside = this.insideGeofences.has(geofenceId);

      if (isInside && !wasInside) {
        // 진입 이벤트
        this.handleGeofenceEnter(geofence, location);
      } else if (!isInside && wasInside) {
        // 이탈 이벤트
        this.handleGeofenceExit(geofence, location);
      } else if (isInside && wasInside) {
        // 지속적으로 내부에 있음 - dwell 체크
        this.checkDwellEvent(geofence, location);
      }
    });
  }

  // 이벤트 콜백 등록
  static addEventCallback(callback: (event: GeofenceEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  // 이벤트 콜백 제거
  static removeEventCallback(callback: (event: GeofenceEvent) => void): void {
    const index = this.eventCallbacks.indexOf(callback);
    if (index > -1) {
      this.eventCallbacks.splice(index, 1);
    }
  }

  // 지오펜스 내부 확인
  private static isLocationInsideGeofence(
    location: LocationData,
    geofence: Geofence
  ): boolean {
    if (geofence.type === 'circle') {
      return LocationService.isLocationInRadius(
        location,
        geofence.center,
        geofence.radius
      );
    } else if (geofence.type === 'polygon' && geofence.polygon) {
      return this.isLocationInsidePolygon(location, geofence.polygon);
    }
    
    return false;
  }

  // 다각형 내부 점 확인 (Ray casting algorithm)
  private static isLocationInsidePolygon(
    location: Coordinates,
    polygon: Coordinates[]
  ): boolean {
    const { latitude: x, longitude: y } = location;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].latitude;
      const yi = polygon[i].longitude;
      const xj = polygon[j].latitude;
      const yj = polygon[j].longitude;

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  // 지오펜스 진입 처리
  private static handleGeofenceEnter(geofence: Geofence, location: LocationData): void {
    this.insideGeofences.add(geofence.id);
    
    const event: GeofenceEvent = {
      type: GeofenceEventType.ENTER,
      geofenceId: geofence.id,
      location,
      timestamp: Date.now()
    };

    this.triggerEvent(event);
    console.log(`Entered geofence: ${geofence.name}`);
  }

  // 지오펜스 이탈 처리
  private static handleGeofenceExit(geofence: Geofence, location: LocationData): void {
    this.insideGeofences.delete(geofence.id);
    
    // dwell 타이머가 있다면 취소
    const timer = this.dwellTimers.get(geofence.id);
    if (timer) {
      clearTimeout(timer);
      this.dwellTimers.delete(geofence.id);
    }

    const event: GeofenceEvent = {
      type: GeofenceEventType.EXIT,
      geofenceId: geofence.id,
      location,
      timestamp: Date.now()
    };

    this.triggerEvent(event);
    console.log(`Exited geofence: ${geofence.name}`);
  }

  // Dwell 이벤트 확인
  private static checkDwellEvent(geofence: Geofence, location: LocationData): void {
    // 이미 dwell 타이머가 설정되어 있다면 스킵
    if (this.dwellTimers.has(geofence.id)) {
      return;
    }

    // 기본 dwell 시간 (5분)
    const dwellTime = 5 * 60 * 1000; // 5분

    const timer = setTimeout(() => {
      // 여전히 지오펜스 내부에 있는지 확인
      if (this.insideGeofences.has(geofence.id)) {
        const event: GeofenceEvent = {
          type: GeofenceEventType.DWELL,
          geofenceId: geofence.id,
          location,
          timestamp: Date.now(),
          dwellTime: dwellTime / 1000 // 초 단위
        };

        this.triggerEvent(event);
        console.log(`Dwelling in geofence: ${geofence.name}`);
      }
      
      this.dwellTimers.delete(geofence.id);
    }, dwellTime);

    this.dwellTimers.set(geofence.id, timer);
  }

  // 이벤트 발생
  private static triggerEvent(event: GeofenceEvent): void {
    // 이벤트 저장
    this.saveGeofenceEvent(event);
    
    // 콜백 실행
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in geofence event callback:', error);
      }
    });
  }

  // 지오펜스 이벤트 저장
  private static async saveGeofenceEvent(event: GeofenceEvent): Promise<void> {
    try {
      const events = await this.getGeofenceEvents();
      events.push(event);
      
      // 최대 500개까지만 저장
      const recentEvents = events.slice(-500);
      
      await AsyncStorage.setItem(
        GEOFENCE_EVENTS_STORAGE_KEY,
        JSON.stringify(recentEvents)
      );
    } catch (error) {
      console.error('Error saving geofence event:', error);
    }
  }

  // 지오펜스 이벤트 조회
  static async getGeofenceEvents(): Promise<GeofenceEvent[]> {
    try {
      const eventsJson = await AsyncStorage.getItem(GEOFENCE_EVENTS_STORAGE_KEY);
      return eventsJson ? JSON.parse(eventsJson) : [];
    } catch (error) {
      console.error('Error getting geofence events:', error);
      return [];
    }
  }

  // 특정 지오펜스의 이벤트 조회
  static async getGeofenceEventsById(geofenceId: string): Promise<GeofenceEvent[]> {
    const events = await this.getGeofenceEvents();
    return events.filter(event => event.geofenceId === geofenceId);
  }

  // 지오펜스를 스토리지에 저장
  private static async saveGeofencesToStorage(): Promise<void> {
    try {
      const geofences = Array.from(this.activeGeofences.values());
      await AsyncStorage.setItem(GEOFENCES_STORAGE_KEY, JSON.stringify(geofences));
    } catch (error) {
      console.error('Error saving geofences to storage:', error);
    }
  }

  // 스토리지에서 지오펜스 로드
  private static async loadGeofencesFromStorage(): Promise<void> {
    try {
      const geofencesJson = await AsyncStorage.getItem(GEOFENCES_STORAGE_KEY);
      if (geofencesJson) {
        const geofences: Geofence[] = JSON.parse(geofencesJson);
        this.activeGeofences.clear();
        geofences.forEach(geofence => {
          this.activeGeofences.set(geofence.id, geofence);
        });
      }
    } catch (error) {
      console.error('Error loading geofences from storage:', error);
    }
  }

  // 현재 사용자가 내부에 있는 지오펜스들
  static getCurrentGeofences(): Geofence[] {
    return Array.from(this.insideGeofences)
      .map(id => this.activeGeofences.get(id))
      .filter((geofence): geofence is Geofence => geofence !== undefined);
  }

  // 지오펜스 통계
  static async getGeofenceStats(geofenceId: string): Promise<{
    totalEvents: number;
    enterEvents: number;
    exitEvents: number;
    dwellEvents: number;
    lastVisit?: Date;
  }> {
    const events = await this.getGeofenceEventsById(geofenceId);
    
    const stats = {
      totalEvents: events.length,
      enterEvents: events.filter(e => e.type === GeofenceEventType.ENTER).length,
      exitEvents: events.filter(e => e.type === GeofenceEventType.EXIT).length,
      dwellEvents: events.filter(e => e.type === GeofenceEventType.DWELL).length,
      lastVisit: events.length > 0 ? new Date(Math.max(...events.map(e => e.timestamp))) : undefined
    };

    return stats;
  }
}