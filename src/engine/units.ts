/**
 * Pure units logic: creation, great-circle movement within range, fatigue/supply,
 * turn recovery, and upkeep aggregation. No React, no I/O, no state.
 *
 * All movement and recovery happens only in response to explicit player actions
 * (recruit / move / fortify clicks, or the manual Advance-Turn).
 */

import type { LatLng } from '@/models/geo';
import type { Unit, UnitType } from '@/models/unit';
import { UNIT_CONFIG } from '@/config/units';

const EARTH_RADIUS_KM = 6371;

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

/** Great-circle (haversine) distance between two lat/lng points, in km. */
export function greatCircleDistanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Maximum move range (km) for a unit this turn. */
export function unitMaxRangeKm(unit: Unit): number {
  return UNIT_CONFIG.stats[unit.type].move * UNIT_CONFIG.movement.kmPerMovePoint;
}

/** Build a fresh unit at full condition (recruit/spawn). */
export function createUnit(id: string, ownerId: string, type: UnitType, pos: LatLng): Unit {
  const r = UNIT_CONFIG.recruit;
  return {
    id,
    ownerId,
    type,
    pos: { ...pos },
    strength: r.startStrength,
    organization: r.startOrganization,
    experience: r.startExperience,
    fatigue: r.startFatigue,
    supply: r.startSupply,
    movedThisTurn: false,
  };
}

export interface MoveAttempt {
  ok: boolean;
  reason?: string;
  distanceKm: number;
  maxRangeKm: number;
  /** The resulting unit if the move is legal; otherwise the unchanged unit. */
  unit: Unit;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Attempt to move a unit to a destination. Pure: returns a fresh unit on success.
 * Legal only if the unit hasn't acted this turn and the destination is in range.
 * Movement adds fatigue and drains supply, scaled by the fraction of range used.
 */
export function moveUnit(unit: Unit, dest: LatLng): MoveAttempt {
  const distanceKm = greatCircleDistanceKm(unit.pos, dest);
  const maxRangeKm = unitMaxRangeKm(unit);

  if (unit.movedThisTurn) {
    return { ok: false, reason: 'Already acted this turn', distanceKm, maxRangeKm, unit };
  }
  if (distanceKm > maxRangeKm) {
    return { ok: false, reason: 'Destination out of range', distanceKm, maxRangeKm, unit };
  }

  const frac = maxRangeKm > 0 ? distanceKm / maxRangeKm : 0;
  const mv = UNIT_CONFIG.movement;
  const moved: Unit = {
    ...unit,
    pos: { ...dest },
    fatigue: clamp(unit.fatigue + frac * mv.fatiguePerFullMove, 0, 100),
    supply: clamp(unit.supply - frac * mv.supplyDrainPerFullMove, 0, 100),
    movedThisTurn: true,
  };
  return { ok: true, distanceKm, maxRangeKm, unit: moved };
}

/**
 * Fortify (dig in): the unit spends its action recovering organization and
 * supply instead of moving. Pure.
 */
export function fortifyUnit(unit: Unit): { ok: boolean; reason?: string; unit: Unit } {
  if (unit.movedThisTurn) return { ok: false, reason: 'Already acted this turn', unit };
  const t = UNIT_CONFIG.turn;
  return {
    ok: true,
    unit: {
      ...unit,
      organization: clamp(unit.organization + t.organizationRecovery, 0, 100),
      supply: clamp(unit.supply + t.supplyRecovery, 0, 100),
      movedThisTurn: true,
    },
  };
}

/**
 * Resolve one unit at Advance-Turn: recover fatigue/organization/supply and
 * clear the moved flag. Pure.
 */
export function resolveUnitTurn(unit: Unit): Unit {
  const t = UNIT_CONFIG.turn;
  return {
    ...unit,
    fatigue: clamp(unit.fatigue - t.fatigueRecovery, 0, 100),
    organization: clamp(unit.organization + t.organizationRecovery, 0, 100),
    supply: clamp(unit.supply + t.supplyRecovery, 0, 100),
    movedThisTurn: false,
  };
}

/** Sum unit upkeep per owning nation (feeds the economy's upkeep term). */
export function upkeepByNation(units: Record<string, Unit>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const u of Object.values(units)) {
    out[u.ownerId] = (out[u.ownerId] ?? 0) + UNIT_CONFIG.stats[u.type].upkeep;
  }
  return out;
}
