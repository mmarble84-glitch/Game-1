/**
 * World store — the live game state (nations, ownership, turn).
 *
 * MANUAL CONTROL: state changes ONLY from explicit user actions.
 *   - `loadWorld` is one-time scenario setup (NOT a tick).
 *   - `advanceTurn` is the ONE place the world advances, and it fires ONLY from
 *     the player's "Advance Turn" click. There is no timer anywhere.
 */

import { create } from 'zustand';
import type { ISO } from '@/models/geo';
import type { Nation } from '@/models/nation';
import { resolveEconomyTurn, type NationTurnReport } from '@/engine/economy';

interface WorldState {
  /** Current turn. Advances ONLY via advanceTurn(). */
  turn: number;
  /** All nations, keyed by nation id. */
  nations: Record<string, Nation>;
  /** Fast ownership lookup: territory ISO -> owning nation id. */
  territoryOwner: Record<ISO, string>;
  /** Whether a scenario has been loaded yet. */
  loaded: boolean;
  /** Per-nation deltas from the most recently resolved turn (empty until first). */
  lastReports: Record<string, NationTurnReport>;
  /** The turn number the lastReports describe (0 = none yet). */
  lastReportTurn: number;

  /** One-time scenario load (setup, not a tick). */
  loadWorld: (nations: Record<string, Nation>, territoryOwner: Record<ISO, string>) => void;

  /**
   * Advance the world by exactly one turn. The ONLY mutation of turn/economy.
   * Resolves every nation's economy (pure engine) and records the deltas.
   */
  advanceTurn: () => void;
}

export const useWorldStore = create<WorldState>((set, get) => ({
  turn: 1,
  nations: {},
  territoryOwner: {},
  loaded: false,
  lastReports: {},
  lastReportTurn: 0,

  loadWorld: (nations, territoryOwner) => set({ nations, territoryOwner, loaded: true }),

  advanceTurn: () => {
    const { nations, turn } = get();
    // Pure resolution — no mutation of current state.
    const { nations: nextNations, reports } = resolveEconomyTurn(nations);
    set({
      nations: nextNations,
      turn: turn + 1,
      lastReports: reports,
      lastReportTurn: turn, // the turn that was just resolved
    });
  },
}));
