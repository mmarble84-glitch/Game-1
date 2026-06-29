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
  moveUnit as engineMoveUnit,
  resolveUnitTurn,
  upkeepByNation,
} from '@/engine/units';
import { recruitManpowerCost, recruitTreasuryCost } from '@/config/units';

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

  loadWorld: (nations: Record<string, Nation>, territoryOwner: Record<ISO, string>) => void;

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
}

export const useWorldStore = create<WorldState>((set, get) => ({
  turn: 1,
  nations: {},
  units: {},
  territoryOwner: {},
  loaded: false,
  lastReports: {},
  lastReportTurn: 0,

  loadWorld: (nations, territoryOwner) => set({ nations, territoryOwner, loaded: true }),

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
}));
