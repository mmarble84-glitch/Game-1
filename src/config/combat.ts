/**
 * Combat configuration — ALL coefficients and the ratio→outcome bands.
 * The combat resolver (engine/combat.ts) reads these; no tunable number is
 * hard-coded in the logic. Combat runs ONLY on a confirmed attack order.
 */

import type { Doctrine } from '@/models/nation';
import type { UnitType } from '@/models/unit';

export type TerrainType = 'plains' | 'forest' | 'mountain' | 'urban' | 'desert' | 'tundra' | 'sea';
export type WeatherType = 'clear' | 'rain' | 'storm' | 'snow' | 'fog' | 'heat';
export type CombatOutcome = 'decisiveWin' | 'win' | 'stalemate' | 'loss' | 'decisiveLoss';

export const TERRAIN_TYPES: TerrainType[] = [
  'plains',
  'forest',
  'mountain',
  'urban',
  'desert',
  'tundra',
  'sea',
];

export const COMBAT_CONFIG = {
  /** Terrain multipliers — defenders benefit from rough ground. */
  terrain: {
    plains: { attack: 1.0, defense: 1.0, label: 'Plains' },
    forest: { attack: 0.9, defense: 1.15, label: 'Forest' },
    mountain: { attack: 0.8, defense: 1.3, label: 'Mountain' },
    urban: { attack: 0.85, defense: 1.25, label: 'Urban' },
    desert: { attack: 0.95, defense: 1.0, label: 'Desert' },
    tundra: { attack: 0.9, defense: 1.05, label: 'Tundra' },
    sea: { attack: 1.0, defense: 1.0, label: 'Open Sea' },
  } as Record<TerrainType, { attack: number; defense: number; label: string }>,

  /** Weather multipliers — air units suffer more in bad weather. */
  weather: {
    clear: { mult: 1.0, airMult: 1.0, label: 'Clear' },
    rain: { mult: 0.95, airMult: 0.85, label: 'Rain' },
    storm: { mult: 0.85, airMult: 0.6, label: 'Storm' },
    snow: { mult: 0.9, airMult: 0.8, label: 'Snow' },
    fog: { mult: 0.9, airMult: 0.7, label: 'Fog' },
    heat: { mult: 0.95, airMult: 0.95, label: 'Heat' },
  } as Record<WeatherType, { mult: number; airMult: number; label: string }>,

  /** Defender fortification: +perLevel defense per level. */
  fortification: {
    perLevel: 0.15,
    maxLevel: 3,
    /** A dug-in (fortified) defender counts as this many levels. */
    duginLevel: 2,
  },

  /** supplyMod = min + (supply/100) × (1 − min). */
  supply: { min: 0.6 },
  /** moraleMod = min + (organization/100) × (1 − min). */
  morale: { min: 0.5 },
  /** techMod = 1 + perLevel × (ownTech − enemyTech). */
  tech: { perLevel: 0.1 },
  /** experienceMod = 1 + coef × (experience/100). */
  experience: { coef: 0.25 },
  /** fatiguePenalty = 1 − coef × (fatigue/100). */
  fatigue: { coef: 0.3 },

  /** Doctrine bonuses. */
  doctrine: {
    bonus: 1.15,
    favored: {
      balanced: [],
      armor: ['armor', 'antiTank'],
      air: ['fighter', 'bomber'],
      naval: ['navy', 'carrier'],
      guerilla: ['infantry', 'special'],
    } as Record<Doctrine, UnitType[]>,
    /** Balanced doctrine: a small flat bonus to everything instead of a favoured set. */
    balancedFlat: 1.05,
    /** Guerilla synergy in rough terrain. */
    guerillaTerrainBonus: 1.1,
    guerillaRoughTerrains: ['forest', 'mountain', 'urban', 'tundra'] as TerrainType[],
  },

  /** concentrationMod = 1 + coef × (1 − 1/sqrt(count)) — DIMINISHING returns. */
  concentration: {
    coef: 0.4,
    /** Friendly units within this range of a combatant lend their weight. */
    radiusKm: 250,
    maxCount: 6,
  },

  /** Fresh fog-of-war roll per side, per engagement: lerp(min, max, rng()). */
  fog: { min: 0.8, max: 1.2 },

  /** ratio = attackerEP/defenderEP → outcome (attacker's perspective). */
  outcomeBands: {
    decisiveWin: 2.0, // ratio ≥ 2.0
    win: 1.25, // ratio ≥ 1.25
    stalemate: 0.8, // ratio ≥ 0.8
    loss: 0.5, // ratio ≥ 0.5  (below ⇒ decisiveLoss)
  },

  /** Fraction of strength lost / organization drained per outcome, per side. */
  casualties: {
    decisiveWin: { atkStr: 0.06, defStr: 0.42, atkOrg: 0.15, defOrg: 0.55 },
    win: { atkStr: 0.12, defStr: 0.26, atkOrg: 0.22, defOrg: 0.38 },
    stalemate: { atkStr: 0.16, defStr: 0.16, atkOrg: 0.3, defOrg: 0.3 },
    loss: { atkStr: 0.26, defStr: 0.12, atkOrg: 0.4, defOrg: 0.2 },
    decisiveLoss: { atkStr: 0.42, defStr: 0.06, atkOrg: 0.55, defOrg: 0.15 },
  } as Record<CombatOutcome, { atkStr: number; defStr: number; atkOrg: number; defOrg: number }>,

  /** Experience gained by the winning / losing side after a battle. */
  experienceGain: { winner: 8, loser: 4 },
  /** Fatigue both sides accrue from an engagement. */
  combatFatigue: 12,
  /** Strength at/below which a unit is destroyed after combat. */
  destroyStrengthThreshold: 5,
  /** Organization at/below which a unit routs (retreats) after combat. */
  routOrgThreshold: 25,
  /** How far a routed unit falls back toward its capital. */
  retreatDistanceKm: 400,
} as const;
