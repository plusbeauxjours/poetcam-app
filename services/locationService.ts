import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Coordinates,
  LocationData,
  LocationPermissionStatus,
  LocationAccuracy,
  LocationTrackingOptions,
  LocationError,
  LocationErrorType,
  LocationVisit
} from '@/types/location';

const LOCATION_STORAGE_KEY = '@poetcam_location_visits';
const LOCATION_PERMISSION_KEY = '@poetcam_location_permission';

export class LocationService {
  private static watchId: Location.LocationSubscription | null = null;
  private static locationCallback: ((location: LocationData) => void) | null = null;

  // 위치 권한 요청
  static async requestPermission(): Promise<LocationPermissionStatus> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      // 권한 상태 저장
      await AsyncStorage.setItem(LOCATION_PERMISSION_KEY, status);
      
      switch (status) {
        case Location.PermissionStatus.GRANTED:
          return LocationPermissionStatus.GRANTED;
        case Location.PermissionStatus.DENIED:
          return LocationPermissionStatus.DENIED;
        case Location.PermissionStatus.UNDETERMINED:
          return LocationPermissionStatus.UNDETERMINED;
        default:
          return LocationPermissionStatus.BLOCKED;
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      throw this.createLocationError(
        LocationErrorType.PERMISSION_DENIED,
        'Failed to request location permission'
      );
    }
  }

  // 백그라운드 위치 권한 요청
  static async requestBackgroundPermission(): Promise<LocationPermissionStatus> {
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      
      switch (status) {
        case Location.PermissionStatus.GRANTED:
          return LocationPermissionStatus.GRANTED;
        case Location.PermissionStatus.DENIED:
          return LocationPermissionStatus.DENIED;
        default:
          return LocationPermissionStatus.BLOCKED;
      }
    } catch (error) {
      console.error('Error requesting background location permission:', error);
      throw this.createLocationError(
        LocationErrorType.PERMISSION_DENIED,
        'Failed to request background location permission'
      );
    }
  }

  // 현재 위치 가져오기
  static async getCurrentLocation(
    accuracy: LocationAccuracy = LocationAccuracy.BALANCED
  ): Promise<LocationData> {
    try {
      // 권한 확인
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        throw this.createLocationError(
          LocationErrorType.PERMISSION_DENIED,
          'Location permission not granted'
        );
      }

      // 위치 정확도 매핑
      const locationAccuracy = this.mapLocationAccuracy(accuracy);

      // 현재 위치 가져오기
      const location = await Location.getCurrentPositionAsync({
        accuracy: locationAccuracy
      });

      return this.convertToLocationData(location);
    } catch (error) {
      console.error('Error getting current location:', error);
      throw this.createLocationError(
        LocationErrorType.LOCATION_UNAVAILABLE,
        'Failed to get current location'
      );
    }
  }

  // 위치 추적 시작
  static async startLocationTracking(
    options: LocationTrackingOptions,
    callback: (location: LocationData) => void
  ): Promise<void> {
    try {
      // 이전 추적 중지
      await this.stopLocationTracking();

      // 권한 확인
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        throw this.createLocationError(
          LocationErrorType.PERMISSION_DENIED,
          'Location permission not granted'
        );
      }

      // 백그라운드 업데이트가 필요한 경우
      if (options.enableBackgroundUpdates) {
        const bgStatus = await Location.getBackgroundPermissionsAsync();
        if (bgStatus.status !== Location.PermissionStatus.GRANTED) {
          console.warn('Background location permission not granted');
        }
      }

      this.locationCallback = callback;

      // 위치 추적 시작
      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: this.mapLocationAccuracy(options.accuracy),
          distanceInterval: options.distanceFilter,
          timeInterval: options.timeInterval,
          mayShowUserSettingsDialog: true
        },
        (location) => {
          const locationData = this.convertToLocationData(location);
          this.locationCallback?.(locationData);
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw this.createLocationError(
        LocationErrorType.INTERNAL_ERROR,
        'Failed to start location tracking'
      );
    }
  }

  // 위치 추적 중지
  static async stopLocationTracking(): Promise<void> {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
      this.locationCallback = null;
    }
  }

  // 두 좌표 간 거리 계산 (Haversine formula)
  static calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371e3; // 지구 반경 (미터)
    const φ1 = coord1.latitude * Math.PI / 180;
    const φ2 = coord2.latitude * Math.PI / 180;
    const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // 미터 단위
  }

  // 좌표가 특정 영역 내에 있는지 확인
  static isLocationInRadius(
    location: Coordinates,
    center: Coordinates,
    radius: number
  ): boolean {
    const distance = this.calculateDistance(location, center);
    return distance <= radius;
  }

  // 방문 기록 저장
  static async saveLocationVisit(visit: Omit<LocationVisit, 'id'>): Promise<void> {
    try {
      const visits = await this.getLocationVisits();
      const newVisit: LocationVisit = {
        ...visit,
        id: `visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      visits.push(newVisit);
      
      // 최대 1000개까지만 저장
      const recentVisits = visits.slice(-1000);
      
      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(recentVisits));
    } catch (error) {
      console.error('Error saving location visit:', error);
    }
  }

  // 방문 기록 조회
  static async getLocationVisits(): Promise<LocationVisit[]> {
    try {
      const visitsJson = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      return visitsJson ? JSON.parse(visitsJson) : [];
    } catch (error) {
      console.error('Error getting location visits:', error);
      return [];
    }
  }

  // 특정 위치 주변 방문 기록 조회
  static async getVisitsNearLocation(
    center: Coordinates,
    radius: number
  ): Promise<LocationVisit[]> {
    const visits = await this.getLocationVisits();
    return visits.filter(visit =>
      this.isLocationInRadius(visit.location, center, radius)
    );
  }

  // 역지오코딩 (좌표 -> 주소)
  static async reverseGeocode(coordinates: Coordinates): Promise<string | null> {
    try {
      const [result] = await Location.reverseGeocodeAsync({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      });

      if (result) {
        const parts = [];
        if (result.street) parts.push(result.street);
        if (result.city) parts.push(result.city);
        if (result.region) parts.push(result.region);
        if (result.country) parts.push(result.country);
        
        return parts.join(', ');
      }
      
      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  // 지오코딩 (주소 -> 좌표)
  static async geocode(address: string): Promise<Coordinates | null> {
    try {
      const [result] = await Location.geocodeAsync(address);
      
      if (result) {
        return {
          latitude: result.latitude,
          longitude: result.longitude
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error geocoding:', error);
      return null;
    }
  }

  // 위치 정확도 매핑
  private static mapLocationAccuracy(accuracy: LocationAccuracy): Location.LocationAccuracy {
    switch (accuracy) {
      case LocationAccuracy.HIGH:
        return Location.LocationAccuracy.Highest;
      case LocationAccuracy.BALANCED:
        return Location.LocationAccuracy.Balanced;
      case LocationAccuracy.LOW:
        return Location.LocationAccuracy.Low;
      case LocationAccuracy.NO_POWER:
        return Location.LocationAccuracy.Lowest;
      default:
        return Location.LocationAccuracy.Balanced;
    }
  }

  // Location 객체를 LocationData로 변환
  private static convertToLocationData(location: Location.LocationObject): LocationData {
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy || undefined,
      altitude: location.coords.altitude || undefined,
      altitudeAccuracy: location.coords.altitudeAccuracy || undefined,
      heading: location.coords.heading || undefined,
      speed: location.coords.speed || undefined,
      timestamp: location.timestamp
    };
  }

  // 위치 에러 생성
  private static createLocationError(
    type: LocationErrorType,
    message: string,
    code?: number
  ): LocationError {
    return {
      type,
      message,
      code
    };
  }
}