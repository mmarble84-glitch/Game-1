import { describe, it, expect } from 'vitest';
import {
  createUnit,
  greatCircleDistanceKm,
  moveUnit,
  fortifyUnit,
  resolveUnitTurn,
  unitMaxRangeKm,
  upkeepByNation,
} from '@/engine/units';
import { UNIT_CONFIG } from '@/config/units';
import type { Unit } from '@/models/unit';

describe('greatCircleDistanceKm', () => {
  it('is ~0 for identical points and positive otherwise', () => {
    expect(greatCircleDistanceKm({ lat: 10, lng: 20 }, { lat: 10, lng: 20 })).toBeCloseTo(0);
    // London -> Paris is ~340 km.
    const d = greatCircleDistanceKm({ lat: 51.5, lng: -0.13 }, { lat: 48.85, lng: 2.35 });
    expect(d).toBeGreaterThan(300);
    expect(d).toBeLessThan(400);
  });
});

describe('moveUnit', () => {
  const base = (): Unit => createUnit('u1', 'nation-A', 'armor', { lat: 0, lng: 0 });

  it('allows a move within range and adds fatigue / drains supply', () => {
    const u = base();
    // 1 degree of longitude at the equator ~ 111 km, well within armor range.
    const res = moveUnit(u, { lat: 0, lng: 1 });
    expect(res.ok).toBe(true);
    expect(res.unit.movedThisTurn).toBe(true);
    expect(res.unit.fatigue).toBeGreaterThan(u.fatigue);
    expect(res.unit.supply).toBeLessThan(u.supply);
    expect(res.unit.pos).toEqual({ lat: 0, lng: 1 });
  });

  it('rejects a destination beyond range', () => {
    const u = base();
    const res = moveUnit(u, { lat: 0, lng: 170 }); // far side of the planet
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/range/i);
    expect(res.distanceKm).toBeGreaterThan(res.maxRangeKm);
  });

  it('rejects a move when the unit already acted', () => {
    const u = { ...base(), movedThisTurn: true };
    const res = moveUnit(u, { lat: 0, lng: 1 });
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/already/i);
  });

  it('does not mutate the input unit', () => {
    const u = base();
    const snap = JSON.parse(JSON.stringify(u));
    moveUnit(u, { lat: 0, lng: 1 });
    expect(u).toEqual(snap);
  });

  it('max range matches config (move × kmPerMovePoint)', () => {
    const u = base(); // armor
    expect(unitMaxRangeKm(u)).toBe(
      UNIT_CONFIG.stats.armor.move * UNIT_CONFIG.movement.kmPerMovePoint,
    );
  });
});

describe('fortifyUnit', () => {
  it('recovers organization/supply and spends the action', () => {
    const u = { ...createUnit('u1', 'A', 'infantry', { lat: 0, lng: 0 }), organization: 40, supply: 50 };
    const res = fortifyUnit(u);
    expect(res.ok).toBe(true);
    expect(res.unit.organization).toBeGreaterThan(40);
    expect(res.unit.supply).toBeGreaterThan(50);
    expect(res.unit.movedThisTurn).toBe(true);
  });
  it('refuses if already acted', () => {
    const u = { ...createUnit('u1', 'A', 'infantry', { lat: 0, lng: 0 }), movedThisTurn: true };
    expect(fortifyUnit(u).ok).toBe(false);
  });
});

describe('resolveUnitTurn', () => {
  it('recovers fatigue/org/supply and clears the moved flag', () => {
    const u: Unit = {
      ...createUnit('u1', 'A', 'infantry', { lat: 0, lng: 0 }),
      fatigue: 50,
      organization: 50,
      supply: 50,
      movedThisTurn: true,
    };
    const next = resolveUnitTurn(u);
    expect(next.fatigue).toBeLessThan(50);
    expect(next.organization).toBeGreaterThan(50);
    expect(next.supply).toBeGreaterThan(50);
    expect(next.movedThisTurn).toBe(false);
  });
});

describe('upkeepByNation', () => {
  it('sums unit upkeep per owner', () => {
    const units: Record<string, Unit> = {
      a: createUnit('a', 'N1', 'infantry', { lat: 0, lng: 0 }), // upkeep 1
      b: createUnit('b', 'N1', 'armor', { lat: 0, lng: 0 }), // upkeep 3
      c: createUnit('c', 'N2', 'carrier', { lat: 0, lng: 0 }), // upkeep 7
    };
    const up = upkeepByNation(units);
    expect(up['N1']).toBe(UNIT_CONFIG.stats.infantry.upkeep + UNIT_CONFIG.stats.armor.upkeep);
    expect(up['N2']).toBe(UNIT_CONFIG.stats.carrier.upkeep);
  });
});
