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
import type { Alliance, War } from '@/models/diplomacy';
import type { Effect } from '@/models/event';
import { resolveEconomyTurn, type NationTurnReport } from '@/engine/economy';
import { computeMilitaryRating } from '@/engine/nations';
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
import { UNIT_CONFIG, recruitManpowerCost, recruitTreasuryCost } from '@/config/units';
import { COMBAT_CONFIG, type TerrainType, type WeatherType } from '@/config/combat';
import {
  adjustRelation as engineAdjustRelation,
  setRelation as engineSetRelation,
  allianceOf,
  areAllied,
  areAtWar,
  expandSides,
} from '@/engine/diplomacy';
import { DIPLOMACY_CONFIG } from '@/config/diplomacy';

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

  // ---- Diplomacy ----
  /** Bilateral relations, keyed by canonical pair key. -100..100. */
  relations: Record<string, number>;
  alliances: Record<string, Alliance>;
  wars: Record<string, War>;
  /** When on, declaring war pulls each side's allies in. Player-controlled. */
  pullAlliesIntoWar: boolean;

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

  // ---- Diplomacy actions (all manual) ----
  adjustRelationBetween: (a: string, b: string, delta: number) => void;
  /** Ally two nations: join an existing alliance or form a new bilateral one. */
  allyNations: (a: string, b: string) => { ok: boolean; reason?: string; alliance?: Alliance };
  /** Break the alliance tie between two nations. */
  breakAllianceBetween: (a: string, b: string) => { ok: boolean; reason?: string };
  /** Declare war (pulls allies if the toggle is on). */
  declareWar: (aggressor: string, target: string) => { ok: boolean; reason?: string; war?: War };
  /** Sign peace, ending a war. */
  makePeace: (warId: string) => { ok: boolean; reason?: string; war?: War };
  setPullAlliesIntoWar: (v: boolean) => void;

  /** Apply an event choice's effects to a subject nation. Returns a summary. */
  applyEventEffects: (subjectId: string, effects: Effect[]) => { summary: string };

  // ---- Sandbox / god-tools (all manual) ----
  /** Carve a brand-new nation out of a set of territories. */
  formNation: (params: {
    name: string;
    color: string;
    government: string;
    territory: string[];
  }) => { ok: boolean; reason?: string; nationId?: string };
  /** Transfer one territory to another nation. */
  transferTerritory: (iso: string, toNationId: string) => { ok: boolean; reason?: string };
  /** Spawn a unit anywhere for any owner (free, god-mode). */
  spawnUnitAt: (ownerId: string, type: UnitType, pos: { lat: number; lng: number }) => string | null;
  /** Edit any of a nation's stats live. */
  editNation: (nationId: string, patch: NationPatch) => void;
}

/** Editable fields for the god-mode stat editor. */
export interface NationPatch {
  name?: string;
  color?: string;
  government?: string;
  stability?: number;
  resources?: Partial<Nation['resources']>;
  manpower?: Partial<Nation['manpower']>;
  military?: { doctrine?: Nation['military']['doctrine']; techLevel?: number };
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
  relations: {},
  alliances: {},
  wars: {},
  pullAlliesIntoWar: false,

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

  // ---- Diplomacy ---------------------------------------------------------
  setPullAlliesIntoWar: (v) => set({ pullAlliesIntoWar: v }),

  adjustRelationBetween: (a, b, delta) =>
    set((s) => ({ relations: engineAdjustRelation(s.relations, a, b, delta) })),

  allyNations: (a, b) => {
    const { alliances, nations, relations } = get();
    if (a === b) return { ok: false, reason: 'A nation cannot ally itself' };
    if (areAllied(alliances, a, b)) return { ok: false, reason: 'Already allied' };

    const next = { ...alliances };
    // Enforce single-alliance membership: drop each nation from any prior pact.
    const dropFrom = (id: string) => {
      for (const al of Object.values(next)) {
        if (al.memberIds.includes(id)) {
          const members = al.memberIds.filter((m) => m !== id);
          if (members.length < 2) delete next[al.id];
          else next[al.id] = { ...al, memberIds: members };
        }
      }
    };

    const allianceA = allianceOf(alliances, a);
    let alliance: Alliance;
    if (allianceA) {
      dropFrom(b);
      alliance = { ...allianceA, memberIds: [...allianceA.memberIds, b] };
      next[alliance.id] = alliance;
    } else {
      const allianceB = allianceOf(alliances, b);
      if (allianceB) {
        dropFrom(a);
        alliance = { ...allianceB, memberIds: [...allianceB.memberIds, a] };
        next[alliance.id] = alliance;
      } else {
        // Form a fresh bilateral pact.
        const palette = DIPLOMACY_CONFIG.alliancePalette;
        const color = palette[Object.keys(alliances).length % palette.length];
        const nameA = nations[a]?.name ?? a;
        const nameB = nations[b]?.name ?? b;
        alliance = { id: `al-${nanoid(6)}`, name: `${nameA}–${nameB} Pact`, color, memberIds: [a, b] };
        next[alliance.id] = alliance;
      }
    }

    set({
      alliances: next,
      relations: engineSetRelation(relations, a, b, DIPLOMACY_CONFIG.relation.onAlly),
    });
    return { ok: true, alliance };
  },

  breakAllianceBetween: (a, b) => {
    const { alliances } = get();
    const shared = Object.values(alliances).find(
      (al) => al.memberIds.includes(a) && al.memberIds.includes(b),
    );
    if (!shared) return { ok: false, reason: 'Not allied' };
    const next = { ...alliances };
    if (shared.memberIds.length <= 2) {
      delete next[shared.id];
    } else {
      // Remove the partner from the bloc.
      next[shared.id] = { ...shared, memberIds: shared.memberIds.filter((m) => m !== b) };
    }
    set({ alliances: next });
    return { ok: true };
  },

  declareWar: (aggressor, target) => {
    const { alliances, wars, relations, turn, pullAlliesIntoWar } = get();
    if (aggressor === target) return { ok: false, reason: 'Cannot declare war on yourself' };
    if (areAllied(alliances, aggressor, target))
      return { ok: false, reason: 'Allies cannot declare war — break the alliance first' };
    if (areAtWar(wars, aggressor, target)) return { ok: false, reason: 'Already at war' };

    const { sideA, sideB } = expandSides(alliances, aggressor, target, pullAlliesIntoWar);
    const war: War = { id: `war-${nanoid(6)}`, sideA, sideB, startedTurn: turn };

    // Set every cross-pair to hostile.
    let nextRel = relations;
    for (const x of sideA) for (const y of sideB) {
      nextRel = engineSetRelation(nextRel, x, y, DIPLOMACY_CONFIG.relation.onDeclareWar);
    }
    set({ wars: { ...wars, [war.id]: war }, relations: nextRel });
    return { ok: true, war };
  },

  makePeace: (warId) => {
    const { wars, relations } = get();
    const war = wars[warId];
    if (!war) return { ok: false, reason: 'No such war' };
    const next = { ...wars };
    delete next[warId];
    // Thaw cross-pair relations toward neutral.
    let nextRel = relations;
    for (const x of war.sideA) for (const y of war.sideB) {
      nextRel = engineSetRelation(nextRel, x, y, DIPLOMACY_CONFIG.relation.onPeace);
    }
    set({ wars: next, relations: nextRel });
    return { ok: true, war };
  },

  // ---- Events ------------------------------------------------------------
  applyEventEffects: (subjectId, effects) => {
    const { nations, units, relations } = get();
    const subject = nations[subjectId];
    if (!subject) return { summary: 'No subject nation' };

    let nextNation: Nation = {
      ...subject,
      resources: { ...subject.resources },
      manpower: { ...subject.manpower },
      military: { ...subject.military },
      unitIds: [...subject.unitIds],
    };
    const nextUnits = { ...units };
    let nextRelations = relations;
    let nextWeather: WeatherType | null = null;
    const parts: string[] = [];
    const sgn = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    for (const eff of effects) {
      switch (eff.kind) {
        case 'resource': {
          const cur = nextNation.resources[eff.resource];
          // Treasury may go negative (debt); other stockpiles floor at 0.
          const v = eff.resource === 'treasury' ? cur + eff.amount : Math.max(0, cur + eff.amount);
          nextNation.resources[eff.resource] = v;
          parts.push(`${cap(eff.resource)} ${sgn(eff.amount)}`);
          break;
        }
        case 'manpower': {
          const v = Math.max(0, Math.min(nextNation.manpower.pool, nextNation.manpower.available + eff.amount));
          nextNation.manpower.available = v;
          parts.push(`Manpower ${sgn(eff.amount)}`);
          break;
        }
        case 'stability': {
          nextNation.stability = Math.max(0, Math.min(100, nextNation.stability + eff.amount));
          parts.push(`Stability ${sgn(eff.amount)}`);
          break;
        }
        case 'tech': {
          nextNation.military.techLevel = Math.max(1, Math.min(10, nextNation.military.techLevel + eff.amount));
          parts.push(`Tech ${sgn(eff.amount)}`);
          break;
        }
        case 'relation': {
          const others = Object.keys(nations).filter((id) => id !== subjectId);
          const other = others[Math.floor(Math.random() * others.length)];
          if (other) {
            nextRelations = engineAdjustRelation(nextRelations, subjectId, other, eff.amount);
            parts.push(`Relations w/ ${nations[other]?.name ?? other} ${sgn(eff.amount)}`);
          }
          break;
        }
        case 'spawnUnit': {
          const id = `unit-${nanoid(8)}`;
          nextUnits[id] = createUnit(id, subjectId, eff.unitType, nextNation.capital);
          nextNation.unitIds.push(id);
          parts.push(`+${UNIT_CONFIG.stats[eff.unitType].label}`);
          break;
        }
        case 'weather': {
          nextWeather = eff.weather;
          parts.push(`Weather → ${COMBAT_CONFIG.weather[eff.weather].label}`);
          break;
        }
      }
    }

    // Re-derive the rating after any stat change.
    nextNation.military.rating = computeMilitaryRating({
      techLevel: nextNation.military.techLevel,
      manpowerPool: nextNation.manpower.pool,
      industry: nextNation.resources.industry,
      stability: nextNation.stability,
    });

    set({
      nations: { ...nations, [subjectId]: nextNation },
      units: nextUnits,
      relations: nextRelations,
      ...(nextWeather ? { weather: nextWeather } : {}),
    });
    return { summary: parts.join(' · ') || 'No effect' };
  },

  // ---- Sandbox / god-tools ----------------------------------------------
  formNation: ({ name, color, government, territory }) => {
    const { nations, territoryOwner } = get();
    if (territory.length === 0) return { ok: false, reason: 'Select at least one territory' };

    // Capital = average of the current owners' capitals.
    const caps = territory
      .map((iso) => nations[territoryOwner[iso]]?.capital)
      .filter((c): c is { lat: number; lng: number } => !!c);
    const capital = caps.length
      ? {
          lat: caps.reduce((s, c) => s + c.lat, 0) / caps.length,
          lng: caps.reduce((s, c) => s + c.lng, 0) / caps.length,
        }
      : { lat: 0, lng: 0 };

    const newId = `nation-custom-${nanoid(6)}`;
    const nextNations: Record<string, Nation> = { ...nations };
    const nextOwner = { ...territoryOwner };
    for (const iso of territory) {
      const oldId = nextOwner[iso];
      if (oldId && nextNations[oldId]) {
        nextNations[oldId] = {
          ...nextNations[oldId],
          territory: nextNations[oldId].territory.filter((t) => t !== iso),
        };
      }
      nextOwner[iso] = newId;
    }

    const count = territory.length;
    const nation: Nation = {
      id: newId,
      name,
      color,
      capital,
      territory: [...territory],
      resources: {
        treasury: 200 * count,
        industry: 120 * count,
        energy: 100 * count,
        food: 120 * count,
        rareMaterials: 30 * count,
      },
      manpower: { available: 200 * count, pool: 600 * count, recruitRate: 6 * count },
      military: { rating: 0, doctrine: 'balanced', techLevel: 5 },
      stability: 60,
      government,
      unitIds: [],
    };
    nation.military.rating = computeMilitaryRating({
      techLevel: nation.military.techLevel,
      manpowerPool: nation.manpower.pool,
      industry: nation.resources.industry,
      stability: nation.stability,
    });
    nextNations[newId] = nation;

    set({ nations: nextNations, territoryOwner: nextOwner });
    return { ok: true, nationId: newId };
  },

  transferTerritory: (iso, toNationId) => {
    const { nations, territoryOwner } = get();
    if (!nations[toNationId]) return { ok: false, reason: 'No recipient nation' };
    const fromId = territoryOwner[iso];
    if (fromId === toNationId) return { ok: false, reason: 'Already owned by that nation' };

    const nextNations = { ...nations };
    if (fromId && nextNations[fromId]) {
      nextNations[fromId] = {
        ...nextNations[fromId],
        territory: nextNations[fromId].territory.filter((t) => t !== iso),
      };
    }
    nextNations[toNationId] = {
      ...nextNations[toNationId],
      territory: [...nextNations[toNationId].territory, iso],
    };
    set({ nations: nextNations, territoryOwner: { ...territoryOwner, [iso]: toNationId } });
    return { ok: true };
  },

  spawnUnitAt: (ownerId, type, pos) => {
    const { nations, units } = get();
    const owner = nations[ownerId];
    if (!owner) return null;
    const id = `unit-${nanoid(8)}`;
    const unit = createUnit(id, ownerId, type, pos);
    set({
      units: { ...units, [id]: unit },
      nations: { ...nations, [ownerId]: { ...owner, unitIds: [...owner.unitIds, id] } },
    });
    return id;
  },

  editNation: (nationId, patch) => {
    const { nations } = get();
    const n = nations[nationId];
    if (!n) return;
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    const updated: Nation = {
      ...n,
      name: patch.name ?? n.name,
      color: patch.color ?? n.color,
      government: patch.government ?? n.government,
      stability: patch.stability !== undefined ? clamp(patch.stability, 0, 100) : n.stability,
      resources: { ...n.resources, ...patch.resources },
      manpower: { ...n.manpower, ...patch.manpower },
      military: {
        ...n.military,
        doctrine: patch.military?.doctrine ?? n.military.doctrine,
        techLevel:
          patch.military?.techLevel !== undefined
            ? clamp(patch.military.techLevel, 1, 10)
            : n.military.techLevel,
      },
    };
    updated.military.rating = computeMilitaryRating({
      techLevel: updated.military.techLevel,
      manpowerPool: updated.manpower.pool,
      industry: updated.resources.industry,
      stability: updated.stability,
    });
    set({ nations: { ...nations, [nationId]: updated } });
  },
}));
