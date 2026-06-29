import { describe, it, expect } from 'vitest';
import { eligibleEvents, weightedPick, drawEvent } from '@/engine/events';
import { EVENT_DECK } from '@/config/events';
import type { EventContext, GameEvent } from '@/models/event';
import type { Nation } from '@/models/nation';

function makeNation(over: Partial<Nation> = {}): Nation {
  return {
    id: 'nation-X',
    name: 'Xland',
    color: '#fff',
    capital: { lat: 0, lng: 0 },
    territory: ['X'],
    resources: { treasury: 1000, industry: 500, energy: 100, food: 100, rareMaterials: 50 },
    manpower: { available: 100, pool: 1000, recruitRate: 10 },
    military: { rating: 50, doctrine: 'balanced', techLevel: 5 },
    stability: 80,
    government: 'Republic',
    unitIds: [],
    ...over,
  };
}

function ctx(over: Partial<EventContext> = {}): EventContext {
  const subject = over.subject ?? makeNation();
  return {
    nations: { [subject.id]: subject },
    units: {},
    relations: {},
    alliances: {},
    wars: {},
    weather: 'clear',
    turn: 1,
    subjectId: subject.id,
    subject,
    ...over,
  };
}

const deck: GameEvent[] = [
  { id: 'a', title: 'A', body: '', rarity: 'common', weight: 1, choices: [{ label: 'ok', effects: [] }] },
  { id: 'b', title: 'B', body: '', rarity: 'common', weight: 99, choices: [{ label: 'ok', effects: [] }] },
  {
    id: 'gated',
    title: 'Gated',
    body: '',
    rarity: 'rare',
    weight: 50,
    condition: (c) => c.subject.stability < 30,
    choices: [{ label: 'ok', effects: [] }],
  },
];

describe('eligibleEvents', () => {
  it('includes conditionless cards and excludes failed conditions', () => {
    const stable = eligibleEvents(deck, ctx({ subject: makeNation({ stability: 80 }) } as Partial<EventContext>));
    expect(stable.map((e) => e.id).sort()).toEqual(['a', 'b']);
    const shaky = makeNation({ stability: 10 });
    const unstable = eligibleEvents(deck, ctx({ nations: { [shaky.id]: shaky }, subject: shaky, subjectId: shaky.id }));
    expect(unstable.map((e) => e.id)).toContain('gated');
  });
});

describe('weightedPick', () => {
  it('returns null for an empty list', () => {
    expect(weightedPick([])).toBeNull();
  });
  it('respects weights (a low roll hits the first card, a high roll the heavy one)', () => {
    expect(weightedPick(deck.slice(0, 2), () => 0.0)?.id).toBe('a');
    expect(weightedPick(deck.slice(0, 2), () => 0.99)?.id).toBe('b');
  });
});

describe('drawEvent', () => {
  it('draws an eligible card deterministically with a fixed rng', () => {
    const ev = drawEvent(deck, ctx(), () => 0.0);
    expect(ev?.id).toBe('a');
  });
});

describe('shipped deck', () => {
  it('has ~30 well-formed cards', () => {
    expect(EVENT_DECK.length).toBeGreaterThanOrEqual(30);
    for (const e of EVENT_DECK) {
      expect(e.choices.length).toBeGreaterThan(0);
      expect(e.weight).toBeGreaterThan(0);
      for (const ch of e.choices) expect(Array.isArray(ch.effects)).toBe(true);
    }
  });
});
