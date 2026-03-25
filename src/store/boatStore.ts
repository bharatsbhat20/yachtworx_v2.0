import { create } from 'zustand';
import type { Boat } from '../types';
import { mockBoats } from '../data/mockData';

interface BoatState {
  boats: Boat[];
  selectedBoat: Boat | null;
  selectBoat: (id: string) => void;
  clearSelection: () => void;
}

export const useBoatStore = create<BoatState>((set) => ({
  boats: mockBoats,
  selectedBoat: null,
  selectBoat: (id) =>
    set((state) => ({
      selectedBoat: state.boats.find((b) => b.id === id) || null,
    })),
  clearSelection: () => set({ selectedBoat: null }),
}));
