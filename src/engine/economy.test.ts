import { describe, it, expect } from 'vitest';
import { resolveEconomyTurn, resolveNationTurn, stabilityFactor } from '@/engine/economy';
import { ECONOMY_CONFIG } from '@/config/economy';
import type { Nation } from '@/models/nation';

/** A small helper to build a test nation with sane defaults. */
function makeNation(overrides: Partial<Nation> = {}): Nation {
  return {
    id: 'nation-TST',
    name: 'Testland',
    color: '#36e0ff',
    capital: { lat: 0, lng: 0 },
    territory: ['TST'],
    resources: { treasury: 1000, industry: 500, energy: 100, food: 100, rareMaterials: 50 },
    manpower: { available: 100, pool: 1000, recruitRate: 10 },
    military: { rating: 50, doctrine: 'balanced', techLevel: 5 },
    stability: 70,
    government: 'Republic',
    unitIds: [],
    ...overrides,
  };
}

describe('stabilityFactor', () => {
  it('equals 1.0 at the reference stability', () => {
    expect(stabilityFactor(ECONOMY_CONFIG.stability.reference)).toBeCloseTo(1.0);
  });
  it('clamps to the configured min/max', () => {
    expect(stabilityFactor(0)).toBe(ECONOMY_CONFIG.stability.minFactor);
    expect(stabilityFactor(1000)).toBe(ECONOMY_CONFIG.stability.maxFactor);
  });
});

describe('resolveNationTurn', () => {
  it('adds production to resources and grows treasury by net income', () => {
    const n = makeNation({ stability: 70 }); // factor = 1.0
    const { nation, report } = resolveNationTurn(n);
    // At factor 1.0, treasury income = base.treasury + industry*taxRate.
    const expectedTreasuryIncome = Math.round(
      ECONOMY_CONFIG.base.treasury * 1 + 500 * ECONOMY_CONFIG.taxRate,
    );
    expect(report.income.treasury).toBe(expectedTreasuryIncome);
    expect(nation.resources.treasury).toBe(1000 + expectedTreasuryIncome);
    expect(nation.resources.industry).toBe(500 + report.income.industry);
  });

  it('grows manpower by recruitRate, capped at pool', () => {
    const n = makeNation({ manpower: { available: 100, pool: 1000, recruitRate: 10 } });
    const { nation, report } = resolveNationTurn(n);
    expect(report.manpowerGain).toBe(10);
    expect(nation.manpower.available).toBe(110);

    const nearCap = makeNation({ manpower: { available: 995, pool: 1000, recruitRate: 10 } });
    const res2 = resolveNationTurn(nearCap);
    expect(res2.report.manpowerGain).toBe(5); // only 5 room left
    expect(res2.nation.manpower.available).toBe(1000);
  });

  it('penalises stability when treasury goes negative', () => {
    const n = makeNation({ resources: { treasury: -50, industry: 0, energy: 0, food: 0, rareMaterials: 0 }, stability: 50 });
    const { nation, report } = resolveNationTurn(n, /* upkeep */ 1000);
    expect(nation.resources.treasury).toBeLessThan(0);
    expect(report.stabilityChange).toBe(-ECONOMY_CONFIG.deficit.stabilityPenalty);
    expect(nation.stability).toBe(50 - ECONOMY_CONFIG.deficit.stabilityPenalty);
  });

  it('does NOT penalise stability when solvent', () => {
    const n = makeNation({ stability: 60 });
    const { nation, report } = resolveNationTurn(n);
    expect(report.stabilityChange).toBe(0);
    expect(nation.stability).toBe(60);
  });

  it('re-derives the military rating after stats change', () => {
    const n = makeNation({ stability: 0, resources: { treasury: -1, industry: 0, energy: 0, food: 0, rareMaterials: 0 } });
    const { nation } = resolveNationTurn(n, 100);
    // rating is recomputed; with near-zero everything it should be the floor.
    expect(nation.military.rating).toBeGreaterThanOrEqual(1);
  });

  it('does not mutate its input', () => {
    const n = makeNation();
    const snapshot = JSON.parse(JSON.stringify(n));
    resolveNationTurn(n);
    expect(n).toEqual(snapshot);
  });
});

describe('resolveEconomyTurn', () => {
  it('resolves every nation and returns a report for each', () => {
    const nations = {
      'nation-A': makeNation({ id: 'nation-A', territory: ['A'] }),
      'nation-B': makeNation({ id: 'nation-B', territory: ['B', 'B2'] }), // 2 territories
    };
    const { nations: next, reports } = resolveEconomyTurn(nations);
    expect(Object.keys(next)).toHaveLength(2);
    expect(Object.keys(reports)).toHaveLength(2);
    // The 2-territory nation produces more industry than the 1-territory one.
    expect(reports['nation-B'].income.industry).toBeGreaterThan(reports['nation-A'].income.industry);
  });

  it('applies provided per-nation upkeep to the net treasury', () => {
    const nations = { 'nation-A': makeNation({ id: 'nation-A' }) };
    const { reports } = resolveEconomyTurn(nations, { 'nation-A': 5 });
    expect(reports['nation-A'].upkeep).toBe(5);
    expect(reports['nation-A'].netTreasury).toBe(reports['nation-A'].income.treasury - 5);
  });
});
