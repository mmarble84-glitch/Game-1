/**
 * Tunable unit configuration: base stats, the rock-paper-scissors matchup table,
 * recruitment costs, movement, turn recovery, and on-globe marker visuals.
 *
 * Pure data — the units engine (engine/units.ts) and combat engine (Phase 4)
 * read these; no tunable number is hard-coded in logic.
 */

import type { UnitDomain, UnitType } from '@/models/unit';

export interface UnitStats {
  label: string;
  domain: UnitDomain;
  /** Base offensive power. */
  attack: number;
  /** Base defensive power. */
  defense: number;
  /** Movement points (× movement.kmPerMovePoint = max range in km). */
  move: number;
  /** Treasury paid per unit, per turn. */
  upkeep: number;
}

/** Marker geometry per type (NO pixel art — clean glowing primitives). */
export interface UnitVisual {
  geom: 'octahedron' | 'box' | 'cone' | 'cylinder' | 'tetra' | 'icosahedron';
  /** Mesh scale in globe units (globe radius = 100). */
  scale: number;
  /** Altitude above the surface (air units float higher). */
  altitude: number;
}

export const UNIT_ORDER: UnitType[] = [
  'infantry',
  'armor',
  'artillery',
  'antiTank',
  'antiAir',
  'fighter',
  'bomber',
  'navy',
  'carrier',
  'special',
];

export const UNIT_CONFIG = {
  stats: {
    infantry: { label: 'Infantry', domain: 'land', attack: 8, defense: 10, move: 3, upkeep: 1 },
    armor: { label: 'Armor', domain: 'land', attack: 14, defense: 8, move: 5, upkeep: 3 },
    artillery: { label: 'Artillery', domain: 'land', attack: 16, defense: 5, move: 2, upkeep: 3 },
    antiTank: { label: 'Anti-Tank', domain: 'land', attack: 12, defense: 11, move: 3, upkeep: 2 },
    antiAir: { label: 'Anti-Air', domain: 'land', attack: 6, defense: 9, move: 3, upkeep: 2 },
    fighter: { label: 'Fighter', domain: 'air', attack: 12, defense: 8, move: 12, upkeep: 4 },
    bomber: { label: 'Bomber', domain: 'air', attack: 18, defense: 4, move: 10, upkeep: 5 },
    navy: { label: 'Navy', domain: 'sea', attack: 14, defense: 14, move: 8, upkeep: 5 },
    carrier: { label: 'Carrier', domain: 'sea', attack: 8, defense: 10, move: 6, upkeep: 7 },
    special: { label: 'Special', domain: 'land', attack: 13, defense: 13, move: 4, upkeep: 4 },
  } as Record<UnitType, UnitStats>,

  /**
   * Rock-paper-scissors multipliers applied to the ATTACKER's power, by
   * attacker→defender type. Missing pairs default to 1.0. Used by combat (Phase 4).
   *   armor > infantry, armor < antiTank
   *   fighter > bomber, fighter < antiAir
   *   bomber > ground, bomber < fighter
   *   navy controls sea, carrier projects air
   */
  matchup: {
    armor: { infantry: 1.5, antiTank: 0.6 },
    antiTank: { armor: 1.6 },
    fighter: { bomber: 1.6, antiAir: 0.6 },
    antiAir: { fighter: 1.5, bomber: 1.4 },
    bomber: {
      infantry: 1.4,
      armor: 1.4,
      artillery: 1.4,
      antiTank: 1.4,
      antiAir: 1.4,
      fighter: 0.5,
    },
    artillery: { infantry: 1.3, antiAir: 1.2 },
    navy: { carrier: 1.3 },
    carrier: { fighter: 1.2, bomber: 1.2 },
  } as Partial<Record<UnitType, Partial<Record<UnitType, number>>>>,

  /** Recruitment cost = base + upkeep × perUpkeep, for manpower and treasury. */
  recruit: {
    manpowerBase: 40,
    manpowerPerUpkeep: 10,
    treasuryBase: 50,
    treasuryPerUpkeep: 30,
    /** Starting unit condition. */
    startStrength: 100,
    startOrganization: 100,
    startExperience: 0,
    startFatigue: 0,
    startSupply: 100,
  },

  /** Movement model. */
  movement: {
    /** Max range (km) = stats.move × this. */
    kmPerMovePoint: 350,
    /** Fatigue added for a full-range move (scaled by the fraction actually moved). */
    fatiguePerFullMove: 25,
    /** Supply drained for a full-range move. */
    supplyDrainPerFullMove: 18,
  },

  /** Recovery applied on each Advance-Turn (manual). */
  turn: {
    fatigueRecovery: 20, // fatigue removed
    organizationRecovery: 15, // organization restored toward 100
    supplyRecovery: 25, // supply restored toward 100
  },

  /** Marker geometry per type for the globe. */
  visual: {
    infantry: { geom: 'octahedron', scale: 1.6, altitude: 0.012 },
    armor: { geom: 'box', scale: 1.7, altitude: 0.012 },
    artillery: { geom: 'cylinder', scale: 1.6, altitude: 0.012 },
    antiTank: { geom: 'tetra', scale: 1.7, altitude: 0.012 },
    antiAir: { geom: 'cone', scale: 1.7, altitude: 0.012 },
    fighter: { geom: 'cone', scale: 1.7, altitude: 0.06 },
    bomber: { geom: 'box', scale: 2.0, altitude: 0.06 },
    navy: { geom: 'box', scale: 1.9, altitude: 0.008 },
    carrier: { geom: 'box', scale: 2.3, altitude: 0.008 },
    special: { geom: 'icosahedron', scale: 1.8, altitude: 0.02 },
  } as Record<UnitType, UnitVisual>,
} as const;

/** Manpower cost to recruit one unit of a type. */
export function recruitManpowerCost(type: UnitType): number {
  const r = UNIT_CONFIG.recruit;
  return r.manpowerBase + UNIT_CONFIG.stats[type].upkeep * r.manpowerPerUpkeep;
}

/** Treasury cost to recruit one unit of a type. */
export function recruitTreasuryCost(type: UnitType): number {
  const r = UNIT_CONFIG.recruit;
  return r.treasuryBase + UNIT_CONFIG.stats[type].upkeep * r.treasuryPerUpkeep;
}
