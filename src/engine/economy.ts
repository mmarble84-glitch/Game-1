/**
 * Economy resolver — PURE. Resolves exactly one turn for every nation.
 *
 * This is invoked ONLY by the world store's advanceTurn action, which fires
 * ONLY when the player clicks "Advance Turn". Nothing here runs on a timer.
 *
 * resolveEconomyTurn does not mutate its input; it returns a fresh nations map
 * plus a per-nation report of the deltas (for HUD display / the log).
 */

import type { Nation, Resources } from '@/models/nation';
import { ECONOMY_CONFIG } from '@/config/economy';
import { computeMilitaryRating } from '@/engine/nations';

/** Gross production of each resource in a single turn. */
export type ResourceProduction = Resources;

export interface NationTurnReport {
  nationId: string;
  /** Gross production this turn (before upkeep). */
  income: ResourceProduction;
  /** Treasury upkeep paid this turn (unit upkeep arrives in the Units phase). */
  upkeep: number;
  /** Net treasury change = income.treasury - upkeep. */
  netTreasury: number;
  /** Manpower actually added to `available` (capped at pool). */
  manpowerGain: number;
  /** Stability change this turn (e.g. deficit penalty). */
  stabilityChange: number;
}

export interface TurnResult {
  nations: Record<string, Nation>;
  reports: Record<string, NationTurnReport>;
}

/** factor = clamp(stability / reference, min, max). */
export function stabilityFactor(stability: number): number {
  const s = ECONOMY_CONFIG.stability;
  return Math.max(s.minFactor, Math.min(s.maxFactor, stability / s.reference));
}

/**
 * Compute one nation's production + resulting state for a single turn.
 * Optional `upkeep` lets later phases pass in unit upkeep; defaults to 0.
 */
export function resolveNationTurn(nation: Nation, upkeep = 0): {
  nation: Nation;
  report: NationTurnReport;
} {
  const c = ECONOMY_CONFIG;
  const territoryCount = Math.max(1, nation.territory.length);
  const sf = stabilityFactor(nation.stability);

  // Production = base × territoryCount × stabilityFactor.
  // Treasury additionally taxes the industrial base (config.taxRate).
  const income: ResourceProduction = {
    treasury: Math.round(
      (c.base.treasury * territoryCount + nation.resources.industry * c.taxRate) * sf,
    ),
    industry: Math.round(c.base.industry * territoryCount * sf),
    energy: Math.round(c.base.energy * territoryCount * sf),
    food: Math.round(c.base.food * territoryCount * sf),
    rareMaterials: Math.round(c.base.rareMaterials * territoryCount * sf),
  };

  const netTreasury = income.treasury - upkeep;

  const newResources: Resources = {
    treasury: nation.resources.treasury + netTreasury,
    industry: nation.resources.industry + income.industry,
    energy: nation.resources.energy + income.energy,
    food: nation.resources.food + income.food,
    rareMaterials: nation.resources.rareMaterials + income.rareMaterials,
  };

  // Manpower grows by recruitRate, capped at the pool.
  const manpowerGain = Math.max(
    0,
    Math.min(nation.manpower.recruitRate, nation.manpower.pool - nation.manpower.available),
  );
  const newAvailable = nation.manpower.available + manpowerGain;

  // Negative treasury (debt) erodes stability. This is the only stability change
  // the economy applies, and it happens on the manual turn click, not a timer.
  let stabilityChange = 0;
  if (newResources.treasury < 0) stabilityChange -= c.deficit.stabilityPenalty;
  const newStability = Math.max(0, Math.min(100, nation.stability + stabilityChange));

  // Re-derive the military rating from the updated industry + stability.
  const rating = computeMilitaryRating({
    techLevel: nation.military.techLevel,
    manpowerPool: nation.manpower.pool,
    industry: newResources.industry,
    stability: newStability,
  });

  const updated: Nation = {
    ...nation,
    resources: newResources,
    manpower: { ...nation.manpower, available: newAvailable },
    stability: newStability,
    military: { ...nation.military, rating },
  };

  return {
    nation: updated,
    report: { nationId: nation.id, income, upkeep, netTreasury, manpowerGain, stabilityChange },
  };
}

/**
 * Resolve a full turn for every nation. Pure: returns new maps, mutates nothing.
 * `upkeepByNation` is optional (units phase will supply it).
 */
export function resolveEconomyTurn(
  nations: Record<string, Nation>,
  upkeepByNation: Record<string, number> = {},
): TurnResult {
  const nextNations: Record<string, Nation> = {};
  const reports: Record<string, NationTurnReport> = {};

  for (const [id, nation] of Object.entries(nations)) {
    const { nation: updated, report } = resolveNationTurn(nation, upkeepByNation[id] ?? 0);
    nextNations[id] = updated;
    reports[id] = report;
  }

  return { nations: nextNations, reports };
}
