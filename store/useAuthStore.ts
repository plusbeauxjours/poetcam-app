import { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import RevenueCatService from "../services/revenueCatService";
import { supabase } from "../supabase";

interface AuthState {
  user: User | null;
  session: Session | null;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isInitialized: false,
  setUser: (user) => set({ user }),
  setSession: (session) => {
    const previousSession = get().session;
    set({ session, user: session?.user ?? null });

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
  },
  setInitialized: (initialized) => set({ isInitialized: initialized }),
}));

// 세션 구독 코드도 포함
supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.getState().setSession(session);
});
supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setSession(session);
});
