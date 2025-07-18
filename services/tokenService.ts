import AsyncStorage from "@react-native-async-storage/async-storage";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";

export interface DecodedToken {
  sub: string; // user id
  email?: string;
  role?: string;
  exp: number; // expiration time
  iat: number; // issued at time
}

class TokenService {
  private static instance: TokenService | null = null;
  private refreshTimer: number | null = null;

  private constructor() {}

  public static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  /**
   * JWT 토큰 디코딩 (간단한 base64 디코딩)
   * 참고: 실제 프로덕션에서는 서명 검증이 필요하지만,
   * Supabase에서 이미 검증된 토큰을 받으므로 페이로드만 디코딩
   */
  public decodeToken(token: string): DecodedToken | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      const payload = parts[1];
      // Base64 URL 디코딩
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
      const decoded = JSON.parse(atob(padded));

      return decoded as DecodedToken;
    } catch (error) {
      console.error("Token decoding failed:", error);
      return null;
    }
  }

  /**
   * 토큰 만료 시간 확인
   */
  public isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded) return true;

    const now = Math.floor(Date.now() / 1000);
    return decoded.exp <= now;
  }

  /**
   * 토큰이 곧 만료되는지 확인 (5분 전)
   */
  public isTokenExpiringSoon(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded) return true;

    const now = Math.floor(Date.now() / 1000);
    const fiveMinutesFromNow = now + 300; // 5분 = 300초
    return decoded.exp <= fiveMinutesFromNow;
  }

  /**
   * 세션을 AsyncStorage에 저장
   */
  public async storeSession(session: Session): Promise<void> {
    try {
      await AsyncStorage.setItem("@poetcam_session", JSON.stringify(session));
    } catch (error) {
      console.error("Failed to store session:", error);
    }
  }

  /**
   * AsyncStorage에서 세션 복원
   */
  public async restoreSession(): Promise<Session | null> {
    try {
      const storedSession = await AsyncStorage.getItem("@poetcam_session");
      if (!storedSession) return null;

      const session: Session = JSON.parse(storedSession);

      // 토큰이 만료되었는지 확인
      if (this.isTokenExpired(session.access_token)) {
        await this.clearStoredSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error("Failed to restore session:", error);
      return null;
    }
  }

  /**
   * 저장된 세션 삭제
   */
  public async clearStoredSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem("@poetcam_session");
    } catch (error) {
      console.error("Failed to clear stored session:", error);
    }
  }

  /**
   * 토큰 자동 갱신 설정
   */
  public setupTokenRefresh(session: Session, onRefresh?: (newSession: Session) => void): void {
    // 기존 타이머 클리어
    this.clearTokenRefresh();

    const decoded = this.decodeToken(session.access_token);
    if (!decoded) return;

    // 만료 5분 전에 갱신 시도
    const now = Date.now();
    const expirationTime = decoded.exp * 1000;
    const refreshTime = expirationTime - now - 300000; // 5분 전

    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(async () => {
        try {
          const { data, error } = await supabase.auth.refreshSession({
            refresh_token: session.refresh_token,
          });

          if (error) throw error;

          if (data.session) {
            await this.storeSession(data.session);
            if (onRefresh) {
              onRefresh(data.session);
            }
            // 다음 갱신 설정
            this.setupTokenRefresh(data.session, onRefresh);
          }
        } catch (error) {
          console.error("Token refresh failed:", error);
          // 갱신 실패 시 로그아웃 처리
          await this.clearStoredSession();
          await supabase.auth.signOut();
        }
      }, refreshTime);
    }
  }

  /**
   * 토큰 자동 갱신 중지
   */
  public clearTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * 수동 토큰 갱신
   */
  public async refreshToken(): Promise<Session | null> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) throw error;

      if (data.session) {
        await this.storeSession(data.session);
        return data.session;
      }

      return null;
    } catch (error) {
      console.error("Manual token refresh failed:", error);
      return null;
    }
  }

  /**
   * 현재 세션의 유효성 검사
   */
  public async validateCurrentSession(): Promise<boolean> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) return false;

      // 토큰 만료 확인
      if (this.isTokenExpired(session.access_token)) {
        // 자동 갱신 시도
        const refreshedSession = await this.refreshToken();
        return refreshedSession !== null;
      }

      return true;
    } catch (error) {
      console.error("Session validation failed:", error);
      return false;
    }
  }
}

export default TokenService.getInstance();
