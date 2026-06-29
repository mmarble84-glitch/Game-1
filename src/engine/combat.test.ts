import { describe, it, expect } from 'vitest';
import { resolveCombat, previewCombat, mapRatioToOutcome, type CombatContext } from '@/engine/combat';
import { COMBAT_CONFIG } from '@/config/combat';
import { UNIT_CONFIG } from '@/config/units';
import type { Unit, UnitType } from '@/models/unit';

function makeUnit(type: UnitType, over: Partial<Unit> = {}): Unit {
  return {
    id: `u-${type}`,
    ownerId: 'N',
    type,
    pos: { lat: 0, lng: 0 },
    strength: 100,
    organization: 100,
    experience: 0,
    fatigue: 0,
    supply: 100,
    fortified: false,
    movedThisTurn: false,
    ...over,
  };
}

/** A neutral context (no fog: random fixed at midpoint → roll = 1.0). */
function ctx(over: Partial<CombatContext> = {}): CombatContext {
  return {
    terrain: 'plains',
    weather: 'clear',
    attackerTech: 5,
    defenderTech: 5,
    attackerDoctrine: 'balanced',
    defenderDoctrine: 'balanced',
    attackerCount: 1,
    defenderCount: 1,
    rng: () => 0.5,
    ...over,
  };
}

describe('mapRatioToOutcome', () => {
  it('maps ratios to the configured bands', () => {
    expect(mapRatioToOutcome(2.5)).toBe('decisiveWin');
    expect(mapRatioToOutcome(1.4)).toBe('win');
    expect(mapRatioToOutcome(1.0)).toBe('stalemate');
    expect(mapRatioToOutcome(0.6)).toBe('loss');
    expect(mapRatioToOutcome(0.2)).toBe('decisiveLoss');
  });
});

describe('resolveCombat', () => {
  it('armor beats infantry on open ground (matchup applied)', () => {
    const a = makeUnit('armor');
    const d = makeUnit('infantry', { ownerId: 'E' });
    const { result } = resolveCombat(a, d, ctx());
    expect(result.attacker.matchupMod).toBe(UNIT_CONFIG.matchup.armor!.infantry);
    expect(result.outcome).toBe('decisiveWin');
    // Loser takes more strength loss than the winner.
    expect(result.defender.strengthLoss).toBeGreaterThan(result.attacker.strengthLoss);
  });

  it('records every modifier in the breakdown', () => {
    const { result } = resolveCombat(makeUnit('armor'), makeUnit('infantry', { ownerId: 'E' }), ctx());
    const keys: (keyof typeof result.attacker)[] = [
      'base', 'matchupMod', 'terrainMod', 'fortificationMod', 'supplyMod', 'moraleMod',
      'techMod', 'experienceMod', 'fatiguePenalty', 'weatherMod', 'doctrineMod',
      'concentrationMod', 'randomRoll', 'effectivePower',
    ];
    for (const k of keys) expect(typeof result.attacker[k]).toBe('number');
  });

  it('does not mutate its inputs', () => {
    const a = makeUnit('armor');
    const d = makeUnit('infantry', { ownerId: 'E' });
    const sa = JSON.parse(JSON.stringify(a));
    const sd = JSON.parse(JSON.stringify(d));
    resolveCombat(a, d, ctx());
    expect(a).toEqual(sa);
    expect(d).toEqual(sd);
  });

  it('a tech advantage raises the attacker effective power', () => {
    const a = makeUnit('infantry');
    const d = makeUnit('infantry', { ownerId: 'E' });
    const even = resolveCombat(a, d, ctx({ attackerTech: 5, defenderTech: 5 })).result.attacker.effectivePower;
    const ahead = resolveCombat(a, d, ctx({ attackerTech: 10, defenderTech: 1 })).result.attacker.effectivePower;
    expect(ahead).toBeGreaterThan(even);
  });

  it('a dug-in defender gets a fortification bonus', () => {
    const a = makeUnit('armor');
    const open = resolveCombat(a, makeUnit('infantry', { ownerId: 'E' }), ctx());
    const dug = resolveCombat(a, makeUnit('infantry', { ownerId: 'E', fortified: true }), ctx());
    expect(dug.result.defender.fortificationMod).toBeGreaterThan(1);
    expect(open.result.defender.fortificationMod).toBe(1);
    // Fortified defender ends with more strength (better outcome for it).
    expect(dug.result.defender.strengthAfter).toBeGreaterThanOrEqual(open.result.defender.strengthAfter);
  });

  it('destroys a weak defender on a decisive win', () => {
    const a = makeUnit('armor');
    const d = makeUnit('infantry', { ownerId: 'E', strength: 8 });
    const res = resolveCombat(a, d, ctx());
    expect(res.result.defender.destroyed).toBe(true);
    expect(res.updatedDefender).toBeNull();
  });

  it('routs (retreats) a defender whose organization breaks', () => {
    const a = makeUnit('armor');
    const d = makeUnit('infantry', { ownerId: 'E', organization: 40, strength: 100 });
    const res = resolveCombat(a, d, ctx());
    expect(res.result.defender.orgAfter).toBeLessThanOrEqual(COMBAT_CONFIG.routOrgThreshold);
    expect(res.result.defender.retreated).toBe(true);
    expect(res.updatedDefender).not.toBeNull();
  });

  it('marks the attacker as having acted', () => {
    const res = resolveCombat(makeUnit('armor'), makeUnit('infantry', { ownerId: 'E' }), ctx());
    expect(res.updatedAttacker?.movedThisTurn).toBe(true);
  });
});

describe('previewCombat', () => {
  it('uses a neutral fog roll of 1.0', () => {
    const r = previewCombat(makeUnit('armor'), makeUnit('infantry', { ownerId: 'E' }), ctx());
    expect(r.attacker.randomRoll).toBeCloseTo(1.0);
    expect(r.defender.randomRoll).toBeCloseTo(1.0);
  });
});
