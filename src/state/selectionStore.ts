/**
 * Selection store — what the player currently has selected, plus move-mode.
 * Shared between the globe, the nation list, and the contextual panels.
 *
 * `moveMode` is set when the player clicks "Move" on a selected unit; while it
 * is true, the next click on the globe is interpreted as the move destination.
 */

import { create } from 'zustand';

interface SelectionState {
  selectedNationId: string | null;
  selectedUnitId: string | null;
  /** When true, the next globe/country click is the selected unit's destination. */
  moveMode: boolean;
  /** When true, the next clicked enemy unit becomes an attack target (then confirm). */
  attackMode: boolean;

  /** Select a nation (clears any selected unit + exits move/attack mode). */
  selectNation: (id: string | null) => void;
  /** Select (or clear) a unit; optionally also set the owning nation as context. */
  selectUnit: (id: string | null, ownerId?: string) => void;
  setMoveMode: (v: boolean) => void;
  setAttackMode: (v: boolean) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedNationId: null,
  selectedUnitId: null,
  moveMode: false,
  attackMode: false,

  selectNation: (id) =>
    set({ selectedNationId: id, selectedUnitId: null, moveMode: false, attackMode: false }),
  selectUnit: (id, ownerId) =>
    set((s) => ({
      selectedUnitId: id,
      selectedNationId: ownerId ?? s.selectedNationId,
      moveMode: false,
      attackMode: false,
    })),
  setMoveMode: (v) => set({ moveMode: v, attackMode: false }),
  setAttackMode: (v) => set({ attackMode: v, moveMode: false }),
  clearSelection: () =>
    set({ selectedNationId: null, selectedUnitId: null, moveMode: false, attackMode: false }),
}));
