/**
 * Nation model + supporting types.
 * A Nation is the core sovereign entity the player commands/edits.
 */

import type { ISO, LatLng } from './geo';

/** Military doctrine — feeds combat modifiers in later phases. */
export type Doctrine = 'balanced' | 'armor' | 'air' | 'naval' | 'guerilla';

export interface Resources {
  treasury: number;
  industry: number;
  energy: number;
  food: number;
  rareMaterials: number;
}

export interface Manpower {
  /** Mobilised manpower ready to recruit into units. */
  available: number;
  /** Maximum mobilisable manpower (population-scaled cap). */
  pool: number;
  /** Manpower added to `available` per Advance-Turn (manual). */
  recruitRate: number;
}

export interface Military {
  /** DERIVED each time stats change (see engine/nations.ts). Not authored. */
  rating: number;
  doctrine: Doctrine;
  /** 1..10. */
  techLevel: number;
}

export interface Nation {
  id: string;
  name: string;
  /** Hex color; drives polygon fill + glowing borders on the globe. */
  color: string;
  emblem?: string;
  capital: LatLng;
  /** ISO keys of every country this nation owns (Modern World: one each). */
  territory: ISO[];
  resources: Resources;
  manpower: Manpower;
  military: Military;
  /** 0..100. */
  stability: number;
  government: string;
  /** Ids of units this nation fields (populated in the Units phase). */
  unitIds: string[];
}

/**
 * The authored seed for one country, stored in nation_seeds.json.
 * Excludes derived/runtime fields (id, territory, unitIds, military.rating).
 */
export interface NationSeed {
  name: string;
  color: string;
  capital: LatLng;
  resources: Resources;
  manpower: Manpower;
  military: { doctrine: Doctrine; techLevel: number };
  stability: number;
  government: string;
}

/** nation_seeds.json shape: keyed by the same featureKey the globe uses. */
export type NationSeeds = Record<ISO, NationSeed>;
