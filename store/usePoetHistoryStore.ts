import { create } from "zustand";

export interface Poet {
  id: string;
  text: string;
  lat: number;
  lng: number;
  createdAt: string;
}

interface PoetHistoryState {
  history: Poet[];
  addPoet: (poet: Poet) => void;
}

export const usePoetHistoryStore = create<PoetHistoryState>((set) => ({
  history: [],
  addPoet: (poet) =>
    set((state) => ({
      history: [...state.history, poet],
    })),
}));
