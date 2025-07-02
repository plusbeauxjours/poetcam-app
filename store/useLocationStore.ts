import { LocationObject } from "expo-location";
import { create } from "zustand";

interface LocationState {
  location: LocationObject | null;
  setLocation: (loc: LocationObject) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  location: null,
  setLocation: (loc) => set({ location: loc }),
}));

