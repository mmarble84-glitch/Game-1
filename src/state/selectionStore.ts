/**
 * Selection store — which nation the player currently has selected.
 * Shared between the globe, the nation list, and the contextual panels.
 */

import { create } from 'zustand';

interface SelectionState {
  selectedNationId: string | null;
  selectNation: (id: string | null) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedNationId: null,
  selectNation: (id) => set({ selectedNationId: id }),
  clearSelection: () => set({ selectedNationId: null }),
}));
