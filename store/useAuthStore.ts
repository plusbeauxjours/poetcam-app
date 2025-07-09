import { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase } from "../supabase";

interface AuthState {
  user: User | null;
  session: Session | null;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
    }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));

// 세션 구독 코드도 포함
supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.getState().setSession(session);
});
supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setSession(session);
});
