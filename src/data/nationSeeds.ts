/**
 * Nation seed loader + Modern World builder.
 * Pure async fetch + pure transform; no game state mutation here.
 */

import type { ISO } from '@/models/geo';
import type { Nation, NationSeeds } from '@/models/nation';
import { buildNationFromSeed } from '@/engine/nations';

// Respect the Vite base path so it works on a GitHub Pages subpath too.
const SEEDS_URL = `${import.meta.env.BASE_URL}data/nation_seeds.json`;

let cache: NationSeeds | null = null;

/** Load (and memoize) the authored nation seeds. */
export async function loadNationSeeds(): Promise<NationSeeds> {
  if (cache) return cache;
  const res = await fetch(SEEDS_URL);
  if (!res.ok) {
    throw new Error(`Failed to load nation seeds: ${res.status} ${res.statusText}`);
  }
  cache = (await res.json()) as NationSeeds;
  return cache;
}

export interface BuiltWorld {
  nations: Record<string, Nation>;
  /** Fast lookup: territory ISO -> owning nation id. */
  territoryOwner: Record<ISO, string>;
}

/**
 * Build the "Modern World": one nation per seeded country.
 * (Other scenarios — Blank Earth, custom — arrive in the Scenarios phase.)
 */
export function buildModernWorld(seeds: NationSeeds): BuiltWorld {
  const nations: Record<string, Nation> = {};
  const territoryOwner: Record<ISO, string> = {};

  for (const [iso, seed] of Object.entries(seeds)) {
    const nation = buildNationFromSeed(iso, seed);
    nations[nation.id] = nation;
    territoryOwner[iso] = nation.id;
  }

  return { nations, territoryOwner };
}
