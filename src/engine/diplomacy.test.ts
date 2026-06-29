import { describe, it, expect } from 'vitest';
import {
  relationKey,
  getRelation,
  setRelation,
  adjustRelation,
  relationBand,
  areAllied,
  areAtWar,
  warBetween,
  alliesOf,
  expandSides,
} from '@/engine/diplomacy';
import { DIPLOMACY_CONFIG } from '@/config/diplomacy';
import type { Alliance, War } from '@/models/diplomacy';

describe('relations', () => {
  it('uses an order-independent key', () => {
    expect(relationKey('A', 'B')).toBe(relationKey('B', 'A'));
  });
  it('defaults to 0 and reads symmetrically', () => {
    const r = setRelation({}, 'A', 'B', 40);
    expect(getRelation(r, 'A', 'B')).toBe(40);
    expect(getRelation(r, 'B', 'A')).toBe(40);
    expect(getRelation(r, 'A', 'C')).toBe(0);
  });
  it('adjust clamps to [-100, 100] and does not mutate input', () => {
    const r0 = setRelation({}, 'A', 'B', 95);
    const r1 = adjustRelation(r0, 'A', 'B', 50);
    expect(getRelation(r1, 'A', 'B')).toBe(DIPLOMACY_CONFIG.relation.max);
    expect(getRelation(r0, 'A', 'B')).toBe(95); // original untouched
  });
  it('bands map values to labels', () => {
    expect(relationBand(80).label).toBe('Allied');
    expect(relationBand(0).label).toBe('Neutral');
    expect(relationBand(-80).label).toBe('Hostile');
  });
});

describe('alliances & wars', () => {
  const alliances: Record<string, Alliance> = {
    al1: { id: 'al1', name: 'Pact', color: '#fff', memberIds: ['A', 'B'] },
  };
  it('detects shared alliance membership', () => {
    expect(areAllied(alliances, 'A', 'B')).toBe(true);
    expect(areAllied(alliances, 'A', 'C')).toBe(false);
    expect(alliesOf(alliances, 'A')).toEqual(['B']);
  });

  const wars: Record<string, War> = {
    w1: { id: 'w1', sideA: ['A'], sideB: ['C'], startedTurn: 1 },
  };
  it('detects war membership from either side', () => {
    expect(areAtWar(wars, 'A', 'C')).toBe(true);
    expect(areAtWar(wars, 'C', 'A')).toBe(true);
    expect(areAtWar(wars, 'A', 'B')).toBe(false);
    expect(warBetween(wars, 'C', 'A')?.id).toBe('w1');
  });
});

describe('expandSides', () => {
  const alliances: Record<string, Alliance> = {
    al1: { id: 'al1', name: 'A-Bloc', color: '#fff', memberIds: ['A', 'A2'] },
    al2: { id: 'al2', name: 'B-Bloc', color: '#000', memberIds: ['B', 'B2'] },
  };
  it('keeps the war bilateral when allies are not pulled', () => {
    const { sideA, sideB } = expandSides(alliances, 'A', 'B', false);
    expect(sideA).toEqual(['A']);
    expect(sideB).toEqual(['B']);
  });
  it('pulls each side’s allies in when toggled', () => {
    const { sideA, sideB } = expandSides(alliances, 'A', 'B', true);
    expect(sideA.sort()).toEqual(['A', 'A2']);
    expect(sideB.sort()).toEqual(['B', 'B2']);
  });
  it('never places a nation on both sides', () => {
    const shared: Record<string, Alliance> = {
      al: { id: 'al', name: 'X', color: '#fff', memberIds: ['A', 'B', 'X'] },
    };
    const { sideA, sideB } = expandSides(shared, 'A', 'B', true);
    const overlap = sideA.filter((n) => sideB.includes(n));
    expect(overlap).toHaveLength(0);
  });
});
