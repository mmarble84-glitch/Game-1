/**
 * UI store — transient interface state only (NOT game state).
 *
 * The toast is a short status message shown after a manual action (e.g. a move
 * result). Its auto-clear timer is purely cosmetic UI housekeeping; it never
 * touches nations, units, the turn, or any game data.
 */

import { create } from 'zustand';
import { nanoid } from 'nanoid';

/** A transient expanding ring drawn at a battle site (purely cosmetic). */
export interface BattleRing {
  id: string;
  lat: number;
  lng: number;
  color: string;
}

interface UiState {
  toast: string | null;
  toastKind: 'info' | 'error';
  showToast: (msg: string, kind?: 'info' | 'error') => void;
  clearToast: () => void;

  /** Cosmetic battle rings; they animate via the globe's render loop and expire. */
  battleRings: BattleRing[];
  addBattleRing: (lat: number, lng: number, color: string) => void;
}

// Module-scoped handle so a new toast cancels the previous cosmetic clear timer.
let clearTimer: ReturnType<typeof setTimeout> | null = null;

export const useUiStore = create<UiState>((set) => ({
  toast: null,
  toastKind: 'info',
  showToast: (msg, kind = 'info') => {
    set({ toast: msg, toastKind: kind });
    if (clearTimer) clearTimeout(clearTimer);
    // Cosmetic only: clears the message string after a few seconds. No game state.
    clearTimer = setTimeout(() => set({ toast: null }), 3200);
  },
  clearToast: () => {
    if (clearTimer) clearTimeout(clearTimer);
    set({ toast: null });
  },

  battleRings: [],
  addBattleRing: (lat, lng, color) => {
    const id = nanoid(6);
    set((s) => ({ battleRings: [...s.battleRings, { id, lat, lng, color }] }));
    // Cosmetic only: remove the ring after its expansion finishes. No game state.
    setTimeout(() => {
      set((s) => ({ battleRings: s.battleRings.filter((r) => r.id !== id) }));
    }, 4200);
  },
}));
