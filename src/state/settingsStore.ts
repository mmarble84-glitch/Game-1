/**
 * Settings store — player preferences (cosmetic / QoL only). None of these
 * advance or mutate game state.
 */

import { create } from 'zustand';

interface SettingsState {
  /** Play short synthesized cues on the player's actions. */
  soundEnabled: boolean;
  /** Master cue volume, 0..1. */
  volume: number;
  /** Cosmetic globe auto-rotate (OFF by default per the manual-control rule). */
  autoRotate: boolean;
  /** Show alliance / war arcs on the globe. */
  showArcs: boolean;
  /** Whether the settings modal is open. */
  settingsOpen: boolean;

  setSoundEnabled: (v: boolean) => void;
  setVolume: (v: number) => void;
  setAutoRotate: (v: boolean) => void;
  setShowArcs: (v: boolean) => void;
  setSettingsOpen: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  soundEnabled: true,
  volume: 0.35,
  autoRotate: false,
  showArcs: true,
  settingsOpen: false,

  setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
  setVolume: (volume) => set({ volume }),
  setAutoRotate: (autoRotate) => set({ autoRotate }),
  setShowArcs: (showArcs) => set({ showArcs }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
}));
