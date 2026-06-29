/**
 * Combat store — the pending attack order awaiting the player's confirmation,
 * and the battlefield terrain chosen for it. The actual resolution lives in the
 * world store's orderAttack action; nothing resolves until the player confirms.
 */

import { create } from 'zustand';
import type { TerrainType } from '@/config/combat';

interface CombatState {
  /** The attack the player has lined up but not yet confirmed. */
  pending: { attackerId: string; defenderId: string } | null;
  /** Terrain chosen for the engagement. */
  terrain: TerrainType;

  openAttack: (attackerId: string, defenderId: string) => void;
  setTerrain: (t: TerrainType) => void;
  cancel: () => void;
}

export const useCombatStore = create<CombatState>((set) => ({
  pending: null,
  terrain: 'plains',
  openAttack: (attackerId, defenderId) => set({ pending: { attackerId, defenderId } }),
  setTerrain: (terrain) => set({ terrain }),
  cancel: () => set({ pending: null }),
}));
