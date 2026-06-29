/**
 * Combat resolver — the chance engine. PURE.
 *
 * resolveCombat() runs ONLY when the player confirms an attack order. It computes
 * an Effective Power (EP) for each side from a long chain of modifiers, rolls a
 * fresh fog-of-war factor per side, maps the EP ratio to an outcome, applies
 * casualties / organization drain / experience, and flags rout & destruction.
 *
 * It returns a CombatResult that records EVERY modifier value so the combat log
 * can show exactly WHY the battle went the way it did. All coefficients and the
 * ratio→outcome bands live in /config/combat.ts.
 */

import type { LatLng } from '@/models/geo';
import type { Doctrine } from '@/models/nation';
import type { Unit, UnitType } from '@/models/unit';
import { UNIT_CONFIG } from '@/config/units';
import {
  COMBAT_CONFIG,
  type CombatOutcome,
  type TerrainType,
  type WeatherType,
} from '@/config/combat';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export interface CombatContext {
  terrain: TerrainType;
  weather: WeatherType;
  attackerTech: number; // owning nation tech level
  defenderTech: number;
  attackerDoctrine: Doctrine;
  defenderDoctrine: Doctrine;
  /** Supporting friendly units stacked with each combatant (≥1, includes self). */
  attackerCount: number;
  defenderCount: number;
  /** Explicit defender fortification level; if omitted, derived from `fortified`. */
  defenderFortLevel?: number;
  /** Injectable RNG (0..1) for deterministic tests. Defaults to Math.random. */
  rng?: () => number;
}

/** Every modifier + result for one side — drives the combat log breakdown. */
export interface SideBreakdown {
  unitId: string;
  ownerId: string;
  type: UnitType;
  base: number;
  matchupMod: number;
  terrainMod: number;
  fortificationMod: number;
  supplyMod: number;
  moraleMod: number;
  techMod: number;
  experienceMod: number;
  fatiguePenalty: number;
  weatherMod: number;
  doctrineMod: number;
  concentrationMod: number;
  randomRoll: number;
  effectivePower: number;
  // outcome on this side
  strengthBefore: number;
  strengthAfter: number;
  strengthLoss: number;
  orgBefore: number;
  orgAfter: number;
  experienceGain: number;
  retreated: boolean;
  destroyed: boolean;
}

export interface CombatResult {
  id: string;
  turn: number;
  location: LatLng;
  terrain: TerrainType;
  weather: WeatherType;
  ratio: number;
  outcome: CombatOutcome;
  attacker: SideBreakdown;
  defender: SideBreakdown;
  summary: string;
}

export interface CombatResolution {
  result: CombatResult;
  /** Post-combat unit states; null means the unit was destroyed. */
  updatedAttacker: Unit | null;
  updatedDefender: Unit | null;
}

/** Map the attacker/defender EP ratio to a discrete outcome. */
export function mapRatioToOutcome(ratio: number): CombatOutcome {
  const b = COMBAT_CONFIG.outcomeBands;
  if (ratio >= b.decisiveWin) return 'decisiveWin';
  if (ratio >= b.win) return 'win';
  if (ratio >= b.stalemate) return 'stalemate';
  if (ratio >= b.loss) return 'loss';
  return 'decisiveLoss';
}

/** Doctrine multiplier for a unit of `type` fighting on `terrain`. */
function doctrineMod(doctrine: Doctrine, type: UnitType, terrain: TerrainType): number {
  const d = COMBAT_CONFIG.doctrine;
  if (doctrine === 'balanced') return d.balancedFlat;
  let mod = 1;
  if (d.favored[doctrine]?.includes(type)) mod *= d.bonus;
  if (doctrine === 'guerilla' && d.guerillaRoughTerrains.includes(terrain)) {
    mod *= d.guerillaTerrainBonus;
  }
  return mod;
}

/** Concentration multiplier with diminishing returns on stacked numbers. */
function concentrationMod(count: number): number {
  const c = COMBAT_CONFIG.concentration;
  const n = clamp(count, 1, c.maxCount);
  return 1 + c.coef * (1 - 1 / Math.sqrt(n));
}

interface SideInputs {
  unit: Unit;
  isAttacker: boolean;
  selfType: UnitType;
  enemyType: UnitType;
  selfTech: number;
  enemyTech: number;
  doctrine: Doctrine;
  count: number;
  fortLevel: number;
  terrain: TerrainType;
  weather: WeatherType;
  rng: () => number;
}

/** Compute one side's full modifier breakdown + effective power. */
function computeSide(inp: SideInputs): Omit<
  SideBreakdown,
  'strengthBefore' | 'strengthAfter' | 'strengthLoss' | 'orgBefore' | 'orgAfter' | 'experienceGain' | 'retreated' | 'destroyed'
> {
  const C = COMBAT_CONFIG;
  const stats = UNIT_CONFIG.stats[inp.selfType];
  const isAir = stats.domain === 'air';

  // base: attacker uses attack, defender uses defense.
  const base = inp.isAttacker ? stats.attack : stats.defense;

  // rock-paper-scissors matchup of self vs enemy.
  const matchupMod = UNIT_CONFIG.matchup[inp.selfType]?.[inp.enemyType] ?? 1;

  // terrain: attackers vs defenders differ.
  const terrainCfg = C.terrain[inp.terrain];
  const terrainMod = inp.isAttacker ? terrainCfg.attack : terrainCfg.defense;

  // fortification: defender only.
  const fortificationMod = inp.isAttacker ? 1 : 1 + inp.fortLevel * C.fortification.perLevel;

  // supply / morale / experience / fatigue from the unit's own condition.
  const supplyMod = C.supply.min + (inp.unit.supply / 100) * (1 - C.supply.min);
  const moraleMod = C.morale.min + (inp.unit.organization / 100) * (1 - C.morale.min);
  const experienceMod = 1 + C.experience.coef * (inp.unit.experience / 100);
  const fatiguePenalty = 1 - C.fatigue.coef * (inp.unit.fatigue / 100);

  // tech edge over the enemy.
  const techMod = 1 + C.tech.perLevel * (inp.selfTech - inp.enemyTech);

  // weather (air units suffer more).
  const wx = C.weather[inp.weather];
  const weatherMod = wx.mult * (isAir ? wx.airMult : 1);

  const dMod = doctrineMod(inp.doctrine, inp.selfType, inp.terrain);
  const concMod = concentrationMod(inp.count);

  // fresh fog-of-war roll, fresh EVERY engagement.
  const randomRoll = C.fog.min + (C.fog.max - C.fog.min) * inp.rng();

  const effectivePower =
    base *
    matchupMod *
    terrainMod *
    fortificationMod *
    supplyMod *
    moraleMod *
    techMod *
    experienceMod *
    fatiguePenalty *
    weatherMod *
    dMod *
    concMod *
    randomRoll;

  return {
    unitId: inp.unit.id,
    ownerId: inp.unit.ownerId,
    type: inp.selfType,
    base,
    matchupMod,
    terrainMod,
    fortificationMod,
    supplyMod,
    moraleMod,
    techMod,
    experienceMod,
    fatiguePenalty,
    weatherMod,
    doctrineMod: dMod,
    concentrationMod: concMod,
    randomRoll,
    effectivePower: Math.max(0.0001, effectivePower),
  };
}

/**
 * Resolve a single confirmed engagement. Pure: does not mutate its inputs.
 */
export function resolveCombat(
  attacker: Unit,
  defender: Unit,
  ctx: CombatContext,
  turn = 0,
  id = 'combat',
): CombatResolution {
  const C = COMBAT_CONFIG;
  const rng = ctx.rng ?? Math.random;

  const fortLevel = clamp(
    ctx.defenderFortLevel ?? (defender.fortified ? C.fortification.duginLevel : 0),
    0,
    C.fortification.maxLevel,
  );

  const atk = computeSide({
    unit: attacker,
    isAttacker: true,
    selfType: attacker.type,
    enemyType: defender.type,
    selfTech: ctx.attackerTech,
    enemyTech: ctx.defenderTech,
    doctrine: ctx.attackerDoctrine,
    count: ctx.attackerCount,
    fortLevel: 0,
    terrain: ctx.terrain,
    weather: ctx.weather,
    rng,
  });

  const def = computeSide({
    unit: defender,
    isAttacker: false,
    selfType: defender.type,
    enemyType: attacker.type,
    selfTech: ctx.defenderTech,
    enemyTech: ctx.attackerTech,
    doctrine: ctx.defenderDoctrine,
    count: ctx.defenderCount,
    fortLevel,
    terrain: ctx.terrain,
    weather: ctx.weather,
    rng,
  });

  const ratio = atk.effectivePower / def.effectivePower;
  const outcome = mapRatioToOutcome(ratio);
  const cas = C.casualties[outcome];

  const attackerWon = outcome === 'decisiveWin' || outcome === 'win';
  const defenderWon = outcome === 'loss' || outcome === 'decisiveLoss';

  // Apply casualties + organization drain.
  const aStrAfter = clamp(attacker.strength * (1 - cas.atkStr), 0, 100);
  const dStrAfter = clamp(defender.strength * (1 - cas.defStr), 0, 100);
  const aOrgAfter = clamp(attacker.organization * (1 - cas.atkOrg), 0, 100);
  const dOrgAfter = clamp(defender.organization * (1 - cas.defOrg), 0, 100);

  const aExpGain = attackerWon ? C.experienceGain.winner : C.experienceGain.loser;
  const dExpGain = defenderWon ? C.experienceGain.winner : C.experienceGain.loser;

  const aDestroyed = aStrAfter <= C.destroyStrengthThreshold;
  const dDestroyed = dStrAfter <= C.destroyStrengthThreshold;
  const aRetreated = !aDestroyed && aOrgAfter <= C.routOrgThreshold;
  const dRetreated = !dDestroyed && dOrgAfter <= C.routOrgThreshold;

  const attackerBreakdown: SideBreakdown = {
    ...atk,
    strengthBefore: attacker.strength,
    strengthAfter: aStrAfter,
    strengthLoss: attacker.strength - aStrAfter,
    orgBefore: attacker.organization,
    orgAfter: aOrgAfter,
    experienceGain: aExpGain,
    retreated: aRetreated,
    destroyed: aDestroyed,
  };
  const defenderBreakdown: SideBreakdown = {
    ...def,
    strengthBefore: defender.strength,
    strengthAfter: dStrAfter,
    strengthLoss: defender.strength - dStrAfter,
    orgBefore: defender.organization,
    orgAfter: dOrgAfter,
    experienceGain: dExpGain,
    retreated: dRetreated,
    destroyed: dDestroyed,
  };

  const updatedAttacker: Unit | null = aDestroyed
    ? null
    : {
        ...attacker,
        strength: aStrAfter,
        organization: aOrgAfter,
        experience: clamp(attacker.experience + aExpGain, 0, 100),
        fatigue: clamp(attacker.fatigue + C.combatFatigue, 0, 100),
        movedThisTurn: true, // attacking spends the action
      };
  const updatedDefender: Unit | null = dDestroyed
    ? null
    : {
        ...defender,
        strength: dStrAfter,
        organization: dOrgAfter,
        experience: clamp(defender.experience + dExpGain, 0, 100),
        fatigue: clamp(defender.fatigue + C.combatFatigue, 0, 100),
      };

  const outcomeLabel: Record<CombatOutcome, string> = {
    decisiveWin: 'Decisive Win',
    win: 'Win',
    stalemate: 'Stalemate',
    loss: 'Loss',
    decisiveLoss: 'Decisive Loss',
  };

  const result: CombatResult = {
    id,
    turn,
    location: { ...defender.pos },
    terrain: ctx.terrain,
    weather: ctx.weather,
    ratio,
    outcome,
    attacker: attackerBreakdown,
    defender: defenderBreakdown,
    summary: `${UNIT_CONFIG.stats[attacker.type].label} → ${UNIT_CONFIG.stats[defender.type].label}: ${outcomeLabel[outcome]} (ratio ${ratio.toFixed(2)})`,
  };

  return { result, updatedAttacker, updatedDefender };
}

/**
 * Deterministic preview (no fog-of-war): same modifier chain with the random
 * roll fixed to its midpoint, so the confirm dialog can show expected odds
 * without removing the actual chance from the real engagement.
 */
export function previewCombat(attacker: Unit, defender: Unit, ctx: CombatContext): CombatResult {
  return resolveCombat(attacker, defender, { ...ctx, rng: () => 0.5 }, 0, 'preview').result;
}
