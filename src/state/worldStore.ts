/**
 * World store — the live game state (nations, ownership, turn).
 *
 * MANUAL CONTROL: state changes ONLY from explicit user actions. `loadWorld`
 * is one-time scenario setup (equivalent to "start a new game"), NOT a turn
 * tick — it does not advance economy, combat, or events. Nothing in this store
 * runs on a timer.
 */

import { create } from 'zustand';
import type { ISO } from '@/models/geo';
import type { Nation } from '@/models/nation';

interface WorldState {
  /** Current turn. Advances ONLY via the Advance-Turn action (Phase 2). */
  turn: number;
  /** All nations, keyed by nation id. */
  nations: Record<string, Nation>;
  /** Fast ownership lookup: territory ISO -> owning nation id. */
  territoryOwner: Record<ISO, string>;
  /** Whether a scenario has been loaded yet. */
  loaded: boolean;

  /** One-time scenario load (setup, not a tick). */
  loadWorld: (nations: Record<string, Nation>, territoryOwner: Record<ISO, string>) => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  turn: 1,
  nations: {},
  territoryOwner: {},
  loaded: false,

  loadWorld: (nations, territoryOwner) => set({ nations, territoryOwner, loaded: true }),
}));
