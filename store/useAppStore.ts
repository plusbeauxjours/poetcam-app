import { create } from "zustand";

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

interface AppState {
  language: string;
  agentId: string | null;
  user: User | null;
  isDarkMode: boolean;
  setLanguage: (language: "en" | "ko" | "es") => void;
  setAgentId: (agentId: string | null) => void;
  setUser: (user: User | null) => void;
  setIsDarkMode: (isDark: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  language: "en",
  agentId: null,
  user: null,
  isDarkMode: false,
  setLanguage: (language) => set({ language }),
  setAgentId: (agentId) => set({ agentId }),
  setUser: (user) => set({ user }),
  setIsDarkMode: (isDarkMode) => set({ isDarkMode }),
}));
