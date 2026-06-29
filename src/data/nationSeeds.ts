/**
 * Nation seed loader + Modern World builder.
 * Seeds are BUNDLED (imported as a raw string) rather than fetched, so the app
 * works fully offline — including as a single self-contained HTML file opened
 * from the filesystem (file://), where fetch() of local files is blocked.
 */

import type { ISO } from '@/models/geo';
import type { Nation, NationSeeds } from '@/models/nation';
import { buildNationFromSeed } from '@/engine/nations';
// eslint-disable-next-line import/no-unresolved -- Vite ?raw import
import seedsRaw from './nation_seeds.json?raw';

let cache: NationSeeds | null = null;

/** Load (and memoize) the authored nation seeds from the bundled JSON. */
export async function loadNationSeeds(): Promise<NationSeeds> {
  if (cache) return cache;
  cache = JSON.parse(seedsRaw) as NationSeeds;
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
