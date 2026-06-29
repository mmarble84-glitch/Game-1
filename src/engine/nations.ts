/**
 * Pure nation logic: derive the military rating and build Nation objects
 * from authored seeds. No React, no I/O, no state.
 */

import type { ISO } from '@/models/geo';
import type { Nation, NationSeed } from '@/models/nation';
import { NATION_CONFIG } from '@/config/nations';

/**
 * Derive a nation's military rating (1..100) from its tech, mobilisable
 * manpower, industrial base, and stability.
 *
 * Weights come from NATION_CONFIG.rating — never hard-coded here.
 *   rating = tech*techW + pool*manpowerW + industry*industryW + stability*stabW
 */
export function computeMilitaryRating(input: {
  techLevel: number;
  manpowerPool: number;
  industry: number;
  stability: number;
}): number {
  const c = NATION_CONFIG.rating;
  const raw =
    input.techLevel * c.techWeight + // technological edge
    input.manpowerPool * c.manpowerWeight + // sheer numbers (diminished by weight)
    input.industry * c.industryWeight + // ability to equip forces
    input.stability * c.stabilityWeight; // cohesion / will to fight
  return Math.max(c.min, Math.min(c.max, Math.round(raw)));
}

/**
 * Build a full Nation from a seed. In the Modern World scenario each seeded
 * country becomes its own nation owning exactly that one territory.
 */
export function buildNationFromSeed(iso: ISO, seed: NationSeed): Nation {
  const rating = computeMilitaryRating({
    techLevel: seed.military.techLevel,
    manpowerPool: seed.manpower.pool,
    industry: seed.resources.industry,
    stability: seed.stability,
  });

  return {
    id: `nation-${iso}`,
    name: seed.name,
    color: seed.color,
    capital: { ...seed.capital },
    territory: [iso],
    resources: { ...seed.resources },
    manpower: { ...seed.manpower },
    military: { rating, doctrine: seed.military.doctrine, techLevel: seed.military.techLevel },
    stability: seed.stability,
    government: seed.government,
    unitIds: [],
  };
}
