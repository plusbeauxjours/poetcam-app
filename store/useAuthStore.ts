import { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import RevenueCatService from "../services/revenueCatService";
import TokenService from "../services/tokenService";
import { supabase } from "../supabase";

interface AuthState {
  user: User | null;
  session: Session | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setInitialized: (initialized: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  initializeAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isInitialized: false,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user }),

  setSession: (session) => {
    const previousSession = get().session;
    set({ session, user: session?.user ?? null, error: null });

    // Handle RevenueCat user management
    if (session?.user?.id && session.user.id !== previousSession?.user?.id) {
      // User logged in or switched accounts
      RevenueCatService.setUserID(session.user.id).catch((error) => {
        console.error("Failed to set RevenueCat user ID:", error);
      });
    } else if (!session?.user?.id && previousSession?.user?.id) {
      // User logged out
      RevenueCatService.logOut().catch((error) => {
        console.error("Failed to log out from RevenueCat:", error);
      });
    }

    // Handle session persistence and token refresh
    if (session) {
      // 세션 저장
      TokenService.storeSession(session).catch((error) => {
        console.error("Failed to store session:", error);
      });

      // 토큰 자동 갱신 설정
      TokenService.setupTokenRefresh(session, (newSession) => {
        console.log("Token refreshed automatically");
        get().setSession(newSession);
      });
    } else {
      // 세션이 없으면 저장된 세션도 삭제하고 자동 갱신 중지
      TokenService.clearStoredSession().catch((error) => {
        console.error("Failed to clear stored session:", error);
      });
      TokenService.clearTokenRefresh();
    }
  },

  setInitialized: (initialized) => set({ isInitialized: initialized }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  initializeAuth: async () => {
    const state = get();
    if (state.isInitialized) return;

    try {
      state.setLoading(true);
      state.setError(null);

      // 1. 저장된 세션 복원 시도
      const storedSession = await TokenService.restoreSession();
      if (storedSession) {
        // 저장된 세션이 유효한 경우 Supabase에 설정
        await supabase.auth.setSession({
          access_token: storedSession.access_token,
          refresh_token: storedSession.refresh_token,
        });
      }

      // 2. 현재 세션 가져오기
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Failed to get session:", error);
        state.setError(error.message);
      }

      state.setSession(session);
    } catch (error) {
      console.error("Auth initialization failed:", error);
      state.setError(error instanceof Error ? error.message : "인증 초기화 실패");
    } finally {
      state.setLoading(false);
      state.setInitialized(true);
    }
  },

  restoreSession: async () => {
    try {
      const state = get();
      state.setLoading(true);
      state.setError(null);

      const storedSession = await TokenService.restoreSession();
      if (storedSession) {
        // Supabase에 세션 복원
        const { error } = await supabase.auth.setSession({
          access_token: storedSession.access_token,
          refresh_token: storedSession.refresh_token,
        });

        if (error) {
          console.error("Failed to restore session:", error);
          await TokenService.clearStoredSession();
          state.setError("세션 복원 실패");
        } else {
          state.setSession(storedSession);
        }
      }
    } catch (error) {
      console.error("Session restoration failed:", error);
      get().setError(error instanceof Error ? error.message : "세션 복원 실패");
    } finally {
      get().setLoading(false);
    }
  },

  signOut: async () => {
    try {
      const state = get();
      state.setLoading(true);
      state.setError(null);

      // 토큰 자동 갱신 중지
      TokenService.clearTokenRefresh();

      // 저장된 세션 삭제
      await TokenService.clearStoredSession();

      // Supabase 로그아웃
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Sign out error:", error);
        state.setError(error.message);
      }

      // 상태 초기화
      state.setSession(null);
    } catch (error) {
      console.error("Sign out failed:", error);
      get().setError(error instanceof Error ? error.message : "로그아웃 실패");
    } finally {
      get().setLoading(false);
    }
  },
}));

// Auth state change listener
supabase.auth.onAuthStateChange(async (event, session) => {
  const authStore = useAuthStore.getState();

  console.log("Auth state changed:", event, session?.user?.id);

  switch (event) {
    case "SIGNED_IN":
    case "TOKEN_REFRESHED":
      authStore.setSession(session);
      break;
    case "SIGNED_OUT":
      authStore.setSession(null);
      break;
    default:
      // 기타 이벤트에도 세션 업데이트
      authStore.setSession(session);
  }
});
