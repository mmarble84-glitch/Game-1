/**
 * World store — the live game state (nations, units, ownership, turn).
 *
 * MANUAL CONTROL: state changes ONLY from explicit user actions.
 *   - `loadWorld` is one-time scenario setup (NOT a tick).
 *   - `advanceTurn` is the ONE place the world advances (economy + unit recovery),
 *     and it fires ONLY from the player's "Advance Turn" click.
 *   - recruit / move / fortify / remove are individual manual unit actions.
 * There is no timer anywhere.
 */

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { ISO } from '@/models/geo';
import type { Nation } from '@/models/nation';
import type { Unit, UnitType } from '@/models/unit';
import { resolveEconomyTurn, type NationTurnReport } from '@/engine/economy';
import {
  createUnit,
  fortifyUnit,
  greatCircleDistanceKm,
  intermediatePoint,
  moveUnit as engineMoveUnit,
  resolveUnitTurn,
  upkeepByNation,
} from '@/engine/units';
import {
  resolveCombat,
  previewCombat,
  type CombatContext,
  type CombatResult,
} from '@/engine/combat';
import { recruitManpowerCost, recruitTreasuryCost } from '@/config/units';
import { COMBAT_CONFIG, type TerrainType, type WeatherType } from '@/config/combat';

/**
 * Build the combat context for an engagement: doctrines, tech levels, and the
 * concentration counts (same-owner units stacked within range of each side).
 * Shared by the live resolve and the deterministic preview so they always agree.
 */
function buildCombatContext(
  units: Record<string, Unit>,
  nations: Record<string, Nation>,
  weather: WeatherType,
  attacker: Unit,
  defender: Unit,
  terrain: TerrainType,
): CombatContext {
  const atkNation = nations[attacker.ownerId];
  const defNation = nations[defender.ownerId];
  const radius = COMBAT_CONFIG.concentration.radiusKm;
  const countNear = (u: Unit) =>
    Object.values(units).filter(
      (o) => o.ownerId === u.ownerId && greatCircleDistanceKm(o.pos, u.pos) <= radius,
    ).length;
  return {
    terrain,
    weather,
    attackerTech: atkNation?.military.techLevel ?? 1,
    defenderTech: defNation?.military.techLevel ?? 1,
    attackerDoctrine: atkNation?.military.doctrine ?? 'balanced',
    defenderDoctrine: defNation?.military.doctrine ?? 'balanced',
    attackerCount: countNear(attacker),
    defenderCount: countNear(defender),
  };
}

/** Result of a manual unit action, for HUD feedback. */
export interface ActionResult {
  ok: boolean;
  reason?: string;
}

interface WorldState {
  turn: number;
  nations: Record<string, Nation>;
  units: Record<string, Unit>;
  territoryOwner: Record<ISO, string>;
  loaded: boolean;
  lastReports: Record<string, NationTurnReport>;
  lastReportTurn: number;
  /** Global weather, feeding combat. Changed by events / god-tools (later phases). */
  weather: WeatherType;

  loadWorld: (nations: Record<string, Nation>, territoryOwner: Record<ISO, string>) => void;
  setWeather: (w: WeatherType) => void;

  /** Advance the world by one turn: resolve economy (with unit upkeep) + recover units. */
  advanceTurn: () => void;

  /** Raise a unit of `type` for a nation at its capital (costs manpower + treasury). */
  recruitUnit: (nationId: string, type: UnitType) => ActionResult;
  /** Move a unit to a destination if legal (in range, hasn't acted this turn). */
  moveUnitTo: (unitId: string, dest: { lat: number; lng: number }) => ActionResult & {
    distanceKm?: number;
    maxRangeKm?: number;
  };
  /** Fortify (dig in) a unit: recover organization/supply, spends its action. */
  fortify: (unitId: string) => ActionResult;
  /** Remove a unit entirely (god-tool / disband). */
  removeUnit: (unitId: string) => void;

  /**
   * Resolve a CONFIRMED attack order. The only place combat happens. Applies
   * casualties / rout (relocating routed units toward their capital) / deaths,
   * and returns the full CombatResult for the log + battle ring.
   */
  orderAttack: (
    attackerId: string,
    defenderId: string,
    terrain: TerrainType,
  ) => { ok: boolean; reason?: string; result?: CombatResult };

  /** Deterministic, no-fog preview for the confirm dialog. Mutates nothing. */
  previewAttack: (
    attackerId: string,
    defenderId: string,
    terrain: TerrainType,
  ) => CombatResult | null;
}

export const useWorldStore = create<WorldState>((set, get) => ({
  turn: 1,
  nations: {},
  units: {},
  territoryOwner: {},
  loaded: false,
  lastReports: {},
  lastReportTurn: 0,
  weather: 'clear',

  loadWorld: (nations, territoryOwner) => set({ nations, territoryOwner, loaded: true }),
  setWeather: (weather) => set({ weather }),

  advanceTurn: () => {
    const { nations, units, turn } = get();
    // Unit upkeep feeds the economy resolver as the per-nation treasury upkeep.
    const upkeep = upkeepByNation(units);
    const { nations: nextNations, reports } = resolveEconomyTurn(nations, upkeep);
    // Recover every unit (fatigue/organization/supply) and clear moved flags.
    const nextUnits: Record<string, Unit> = {};
    for (const [id, u] of Object.entries(units)) nextUnits[id] = resolveUnitTurn(u);
    set({
      nations: nextNations,
      units: nextUnits,
      turn: turn + 1,
      lastReports: reports,
      lastReportTurn: turn,
    });
  },

  recruitUnit: (nationId, type) => {
    const { nations, units } = get();
    const nation = nations[nationId];
    if (!nation) return { ok: false, reason: 'No such nation' };

    const mpCost = recruitManpowerCost(type);
    const trCost = recruitTreasuryCost(type);
    if (nation.manpower.available < mpCost) return { ok: false, reason: 'Not enough manpower' };
    if (nation.resources.treasury < trCost) return { ok: false, reason: 'Not enough treasury' };

    const id = `unit-${nanoid(8)}`;
    const unit = createUnit(id, nationId, type, nation.capital);

    const updatedNation: Nation = {
      ...nation,
      manpower: { ...nation.manpower, available: nation.manpower.available - mpCost },
      resources: { ...nation.resources, treasury: nation.resources.treasury - trCost },
      unitIds: [...nation.unitIds, id],
    };

    set({
      nations: { ...nations, [nationId]: updatedNation },
      units: { ...units, [id]: unit },
    });
    return { ok: true };
  },

  moveUnitTo: (unitId, dest) => {
    const { units } = get();
    const unit = units[unitId];
    if (!unit) return { ok: false, reason: 'No such unit' };
    const res = engineMoveUnit(unit, dest);
    if (res.ok) {
      set({ units: { ...units, [unitId]: res.unit } });
    }
    return {
      ok: res.ok,
      reason: res.reason,
      distanceKm: res.distanceKm,
      maxRangeKm: res.maxRangeKm,
    };
  },

  fortify: (unitId) => {
    const { units } = get();
    const unit = units[unitId];
    if (!unit) return { ok: false, reason: 'No such unit' };
    const res = fortifyUnit(unit);
    if (res.ok) set({ units: { ...units, [unitId]: res.unit } });
    return { ok: res.ok, reason: res.reason };
  },

  removeUnit: (unitId) => {
    const { units, nations } = get();
    const unit = units[unitId];
    if (!unit) return;
    const rest = { ...units };
    delete rest[unitId];
    const owner = nations[unit.ownerId];
    const nextNations = owner
      ? {
          ...nations,
          [owner.id]: { ...owner, unitIds: owner.unitIds.filter((id) => id !== unitId) },
        }
      : nations;
    set({ units: rest, nations: nextNations });
  },

  orderAttack: (attackerId, defenderId, terrain) => {
    const { units, nations, weather, turn } = get();
    const attacker = units[attackerId];
    const defender = units[defenderId];
    if (!attacker || !defender) return { ok: false, reason: 'Unit missing' };
    if (attacker.ownerId === defender.ownerId) return { ok: false, reason: 'Cannot attack your own unit' };
    if (attacker.movedThisTurn) return { ok: false, reason: 'Attacker already acted this turn' };

    const ctx = buildCombatContext(units, nations, weather, attacker, defender, terrain);
    const { result, updatedAttacker, updatedDefender } = resolveCombat(
      attacker,
      defender,
      ctx,
      turn,
      nanoid(6),
    );

    const nextUnits = { ...units };
    let nextNations = nations;

    const applySide = (orig: Unit, updated: Unit | null, retreated: boolean) => {
      if (updated === null) {
        delete nextUnits[orig.id];
        const owner = nextNations[orig.ownerId];
        if (owner) {
          nextNations = {
            ...nextNations,
            [owner.id]: { ...owner, unitIds: owner.unitIds.filter((id) => id !== orig.id) },
          };
        }
        return;
      }
      let u = updated;
      if (retreated) {
        // Fall back toward the owner's capital (toward "adjacent friendly area").
        const cap = nextNations[u.ownerId]?.capital;
        if (cap) {
          const dist = greatCircleDistanceKm(u.pos, cap);
          const t = dist > 0 ? Math.min(1, COMBAT_CONFIG.retreatDistanceKm / dist) : 0;
          u = { ...u, pos: intermediatePoint(u.pos, cap, t) };
        }
      }
      nextUnits[u.id] = u;
    };

    applySide(attacker, updatedAttacker, result.attacker.retreated);
    applySide(defender, updatedDefender, result.defender.retreated);

    set({ units: nextUnits, nations: nextNations });
    return { ok: true, result };
  },

  previewAttack: (attackerId, defenderId, terrain) => {
    const { units, nations, weather } = get();
    const attacker = units[attackerId];
    const defender = units[defenderId];
    if (!attacker || !defender) return null;
    const ctx = buildCombatContext(units, nations, weather, attacker, defender, terrain);
    return previewCombat(attacker, defender, ctx);
  },
}));
