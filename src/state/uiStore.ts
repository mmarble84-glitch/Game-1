/**
 * UI store — transient interface state only (NOT game state).
 *
 * The toast is a short status message shown after a manual action (e.g. a move
 * result). Its auto-clear timer is purely cosmetic UI housekeeping; it never
 * touches nations, units, the turn, or any game data.
 */

import { create } from 'zustand';

interface UiState {
  toast: string | null;
  toastKind: 'info' | 'error';
  showToast: (msg: string, kind?: 'info' | 'error') => void;
  clearToast: () => void;
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
}));
