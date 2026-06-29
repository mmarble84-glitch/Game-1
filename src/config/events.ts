/**
 * The event deck — ~30 starter cards. Drawn ONLY on a "Draw Event" click,
 * weighted by `weight` and filtered by each card's optional condition.
 * Every coefficient here is tunable data, not logic.
 */

import type { GameEvent, Rarity } from '@/models/event';

/** Rarity → accent color + relative weight hint. */
export const RARITY_META: Record<Rarity, { color: string; label: string }> = {
  common: { color: '#7d97b5', label: 'Common' },
  uncommon: { color: '#46e8a0', label: 'Uncommon' },
  rare: { color: '#36e0ff', label: 'Rare' },
  legendary: { color: '#ffb347', label: 'Legendary' },
};

export const EVENT_DECK: GameEvent[] = [
  // ---- Economy --------------------------------------------------------------
  {
    id: 'economic-boom',
    title: 'Economic Boom',
    body: 'Markets surge across the nation as exports climb to record highs.',
    rarity: 'common',
    weight: 10,
    choices: [
      { label: 'Reinvest in industry', effects: [{ kind: 'resource', resource: 'industry', amount: 120 }] },
      { label: 'Fill the treasury', effects: [{ kind: 'resource', resource: 'treasury', amount: 220 }] },
    ],
  },
  {
    id: 'recession',
    title: 'Recession',
    body: 'A downturn ripples through the economy; revenues fall and unrest stirs.',
    rarity: 'common',
    weight: 9,
    choices: [
      { label: 'Austerity budget', effects: [{ kind: 'resource', resource: 'treasury', amount: -180 }, { kind: 'stability', amount: -4 }] },
      { label: 'Stimulus spending', effects: [{ kind: 'resource', resource: 'treasury', amount: -300 }, { kind: 'stability', amount: 4 }] },
    ],
  },
  {
    id: 'foreign-aid',
    title: 'Foreign Aid Package',
    body: 'A wealthy partner offers a generous aid package — with strings attached.',
    rarity: 'common',
    weight: 7,
    choices: [
      { label: 'Accept gratefully', effects: [{ kind: 'resource', resource: 'treasury', amount: 260 }, { kind: 'relation', amount: 10, target: 'randomOther' }] },
      { label: 'Decline proudly', effects: [{ kind: 'stability', amount: 5 }] },
    ],
  },
  {
    id: 'market-crash',
    title: 'Market Crash',
    body: 'Speculative bubbles burst and the treasury hemorrhages overnight.',
    rarity: 'rare',
    weight: 2,
    choices: [
      { label: 'Bail out the banks', effects: [{ kind: 'resource', resource: 'treasury', amount: -500 }, { kind: 'stability', amount: 3 }] },
      { label: 'Let them fail', effects: [{ kind: 'resource', resource: 'treasury', amount: -200 }, { kind: 'stability', amount: -8 }] },
    ],
  },

  // ---- Resources ------------------------------------------------------------
  {
    id: 'bumper-harvest',
    title: 'Bumper Harvest',
    body: 'Ideal weather delivers an exceptional harvest across the heartland.',
    rarity: 'common',
    weight: 9,
    choices: [
      { label: 'Stockpile grain', effects: [{ kind: 'resource', resource: 'food', amount: 160 }] },
      { label: 'Export the surplus', effects: [{ kind: 'resource', resource: 'food', amount: 60 }, { kind: 'resource', resource: 'treasury', amount: 120 }] },
    ],
  },
  {
    id: 'energy-discovery',
    title: 'Energy Discovery',
    body: 'Prospectors strike a major new energy field.',
    rarity: 'uncommon',
    weight: 5,
    choices: [
      { label: 'Develop rapidly', effects: [{ kind: 'resource', resource: 'energy', amount: 200 }] },
      { label: 'Sell drilling rights', effects: [{ kind: 'resource', resource: 'energy', amount: 80 }, { kind: 'resource', resource: 'treasury', amount: 160 }] },
    ],
  },
  {
    id: 'rare-mineral-find',
    title: 'Rare Mineral Vein',
    body: 'Surveyors uncover a vein of strategically vital rare materials.',
    rarity: 'uncommon',
    weight: 4,
    choices: [
      { label: 'Nationalize the mine', effects: [{ kind: 'resource', resource: 'rareMaterials', amount: 120 }] },
      { label: 'Auction the concession', effects: [{ kind: 'resource', resource: 'rareMaterials', amount: 40 }, { kind: 'resource', resource: 'treasury', amount: 180 }] },
    ],
  },
  {
    id: 'industrial-accident',
    title: 'Industrial Accident',
    body: 'A catastrophic failure shutters a major industrial complex.',
    rarity: 'common',
    weight: 7,
    choices: [
      { label: 'Rebuild quickly', effects: [{ kind: 'resource', resource: 'industry', amount: -90 }, { kind: 'resource', resource: 'treasury', amount: -120 }] },
      { label: 'Absorb the loss', effects: [{ kind: 'resource', resource: 'industry', amount: -150 }, { kind: 'stability', amount: -3 }] },
    ],
  },

  // ---- Stability & politics -------------------------------------------------
  {
    id: 'coup-attempt',
    title: 'Coup Attempt',
    body: 'Discontented officers move against the government in the dead of night.',
    rarity: 'uncommon',
    weight: 6,
    condition: (c) => c.subject.stability < 55,
    choices: [
      { label: 'Crush the plotters', effects: [{ kind: 'stability', amount: 10 }, { kind: 'resource', resource: 'treasury', amount: -150 }] },
      { label: 'Negotiate concessions', effects: [{ kind: 'stability', amount: -6 }, { kind: 'manpower', amount: 200 }] },
    ],
  },
  {
    id: 'popular-uprising',
    title: 'Popular Uprising',
    body: 'Crowds fill the streets demanding sweeping reforms.',
    rarity: 'common',
    weight: 7,
    condition: (c) => c.subject.stability < 60,
    choices: [
      { label: 'Enact reforms', effects: [{ kind: 'stability', amount: 8 }, { kind: 'resource', resource: 'treasury', amount: -200 }] },
      { label: 'Impose order', effects: [{ kind: 'stability', amount: -4 }] },
    ],
  },
  {
    id: 'military-parade',
    title: 'Grand Military Parade',
    body: 'A show of force lifts national spirits — at a cost.',
    rarity: 'common',
    weight: 6,
    choices: [
      { label: 'Spare no expense', effects: [{ kind: 'stability', amount: 6 }, { kind: 'resource', resource: 'treasury', amount: -140 }] },
      { label: 'Keep it modest', effects: [{ kind: 'stability', amount: 2 }] },
    ],
  },
  {
    id: 'reform-movement',
    title: 'Reform Movement',
    body: 'Progressive reformers push an ambitious agenda through the assembly.',
    rarity: 'common',
    weight: 6,
    choices: [
      { label: 'Champion reform', effects: [{ kind: 'stability', amount: 7 }, { kind: 'resource', resource: 'industry', amount: -60 }] },
      { label: 'Block it', effects: [{ kind: 'stability', amount: -5 }, { kind: 'resource', resource: 'treasury', amount: 100 }] },
    ],
  },
  {
    id: 'golden-age',
    title: 'A Golden Age',
    body: 'Art, science, and commerce flourish in a once-in-a-generation renaissance.',
    rarity: 'legendary',
    weight: 1,
    choices: [
      {
        label: 'Seize the moment',
        effects: [
          { kind: 'stability', amount: 12 },
          { kind: 'resource', resource: 'treasury', amount: 300 },
          { kind: 'resource', resource: 'industry', amount: 150 },
          { kind: 'tech', amount: 1 },
        ],
      },
    ],
  },

  // ---- Manpower & population ------------------------------------------------
  {
    id: 'volunteer-surge',
    title: 'Volunteer Surge',
    body: 'A wave of patriotism sends recruits flooding to the colors.',
    rarity: 'common',
    weight: 7,
    choices: [{ label: 'Welcome them', effects: [{ kind: 'manpower', amount: 400 }] }],
  },
  {
    id: 'migration-wave',
    title: 'Migration Wave',
    body: 'A large influx of migrants arrives at the borders.',
    rarity: 'common',
    weight: 6,
    choices: [
      { label: 'Integrate them', effects: [{ kind: 'manpower', amount: 300 }, { kind: 'resource', resource: 'food', amount: -50 }] },
      { label: 'Turn them away', effects: [{ kind: 'stability', amount: -3 }, { kind: 'relation', amount: -8, target: 'randomOther' }] },
    ],
  },
  {
    id: 'pandemic',
    title: 'Pandemic Outbreak',
    body: 'A virulent disease sweeps through the population.',
    rarity: 'uncommon',
    weight: 4,
    choices: [
      { label: 'Lockdown', effects: [{ kind: 'manpower', amount: -150 }, { kind: 'resource', resource: 'treasury', amount: -120 }, { kind: 'stability', amount: -2 }] },
      { label: 'Stay open', effects: [{ kind: 'manpower', amount: -350 }, { kind: 'stability', amount: -6 }] },
    ],
  },

  // ---- Technology -----------------------------------------------------------
  {
    id: 'tech-breakthrough',
    title: 'Technological Breakthrough',
    body: 'National laboratories achieve a stunning scientific advance.',
    rarity: 'rare',
    weight: 3,
    choices: [
      { label: 'Militarize it', effects: [{ kind: 'tech', amount: 1 }] },
      { label: 'Commercialize it', effects: [{ kind: 'resource', resource: 'industry', amount: 140 }, { kind: 'resource', resource: 'treasury', amount: 120 }] },
    ],
  },
  {
    id: 'scientific-grant',
    title: 'Scientific Grant',
    body: 'A landmark research initiative seeks government backing.',
    rarity: 'common',
    weight: 6,
    choices: [
      { label: 'Fund it generously', effects: [{ kind: 'resource', resource: 'treasury', amount: -160 }, { kind: 'resource', resource: 'industry', amount: 130 }] },
      { label: 'Modest support', effects: [{ kind: 'resource', resource: 'industry', amount: 50 }] },
    ],
  },

  // ---- Diplomacy ------------------------------------------------------------
  {
    id: 'diplomatic-summit',
    title: 'Diplomatic Summit',
    body: 'Envoys gather for a high-profile summit of goodwill.',
    rarity: 'common',
    weight: 7,
    choices: [
      { label: 'Extend a hand', effects: [{ kind: 'relation', amount: 18, target: 'randomOther' }] },
      { label: 'Drive a hard bargain', effects: [{ kind: 'relation', amount: 6, target: 'randomOther' }, { kind: 'resource', resource: 'treasury', amount: 120 }] },
    ],
  },
  {
    id: 'border-incident',
    title: 'Border Incident',
    body: 'Shots are exchanged at a contested frontier post.',
    rarity: 'uncommon',
    weight: 6,
    choices: [
      { label: 'Lodge a protest', effects: [{ kind: 'relation', amount: -12, target: 'randomOther' }] },
      { label: 'Mobilize the frontier', effects: [{ kind: 'relation', amount: -25, target: 'randomOther' }, { kind: 'spawnUnit', unitType: 'infantry' }] },
    ],
  },
  {
    id: 'espionage-exposed',
    title: 'Espionage Exposed',
    body: 'A foreign spy ring is uncovered in the capital.',
    rarity: 'uncommon',
    weight: 5,
    choices: [
      { label: 'Expel the diplomats', effects: [{ kind: 'relation', amount: -20, target: 'randomOther' }, { kind: 'stability', amount: 3 }] },
      { label: 'Turn them quietly', effects: [{ kind: 'resource', resource: 'treasury', amount: 100 }] },
    ],
  },

  // ---- Military -------------------------------------------------------------
  {
    id: 'veteran-cadre',
    title: 'Veteran Cadre Forms',
    body: 'Retired officers rally to train a new formation at the capital.',
    rarity: 'uncommon',
    weight: 5,
    choices: [
      { label: 'Raise armor', effects: [{ kind: 'spawnUnit', unitType: 'armor' }] },
      { label: 'Raise infantry', effects: [{ kind: 'spawnUnit', unitType: 'infantry' }, { kind: 'manpower', amount: 100 }] },
    ],
  },
  {
    id: 'arms-windfall',
    title: 'Arms Windfall',
    body: 'A surplus of materiel becomes available on favorable terms.',
    rarity: 'uncommon',
    weight: 4,
    choices: [
      { label: 'Field artillery', effects: [{ kind: 'spawnUnit', unitType: 'artillery' }] },
      { label: 'Bank the savings', effects: [{ kind: 'resource', resource: 'treasury', amount: 140 }] },
    ],
  },

  // ---- Disasters ------------------------------------------------------------
  {
    id: 'earthquake',
    title: 'Earthquake',
    body: 'A powerful earthquake devastates an industrial region.',
    rarity: 'uncommon',
    weight: 5,
    choices: [
      { label: 'Mobilize relief', effects: [{ kind: 'resource', resource: 'treasury', amount: -160 }, { kind: 'resource', resource: 'industry', amount: -80 }, { kind: 'stability', amount: 2 }] },
      { label: 'Leave it to locals', effects: [{ kind: 'resource', resource: 'industry', amount: -120 }, { kind: 'stability', amount: -6 }] },
    ],
  },
  {
    id: 'flood',
    title: 'Great Flood',
    body: 'Rivers burst their banks, drowning farmland.',
    rarity: 'common',
    weight: 6,
    choices: [
      { label: 'Build levees', effects: [{ kind: 'resource', resource: 'food', amount: -90 }, { kind: 'resource', resource: 'treasury', amount: -120 }] },
      { label: 'Evacuate only', effects: [{ kind: 'resource', resource: 'food', amount: -160 }, { kind: 'stability', amount: -3 }] },
    ],
  },
  {
    id: 'wildfire',
    title: 'Wildfires',
    body: 'Vast wildfires consume forests and threaten towns.',
    rarity: 'common',
    weight: 5,
    choices: [
      { label: 'Deploy everything', effects: [{ kind: 'resource', resource: 'energy', amount: -70 }, { kind: 'resource', resource: 'treasury', amount: -100 }] },
      { label: 'Contain the perimeter', effects: [{ kind: 'resource', resource: 'food', amount: -80 }, { kind: 'stability', amount: -2 }] },
    ],
  },

  // ---- Weather fronts (feed combat weatherMod) ------------------------------
  {
    id: 'storm-front',
    title: 'Storm Front Moves In',
    body: 'A violent storm system sweeps across the theater, grounding aircraft.',
    rarity: 'common',
    weight: 6,
    choices: [{ label: 'Batten down', effects: [{ kind: 'weather', weather: 'storm' }] }],
  },
  {
    id: 'heavy-fog',
    title: 'Heavy Fog',
    body: 'A thick fog blankets the land, cloaking movements.',
    rarity: 'common',
    weight: 6,
    choices: [{ label: 'Acknowledge', effects: [{ kind: 'weather', weather: 'fog' }] }],
  },
  {
    id: 'monsoon',
    title: 'Monsoon Rains',
    body: 'Relentless rains turn roads to mud.',
    rarity: 'common',
    weight: 5,
    choices: [{ label: 'Acknowledge', effects: [{ kind: 'weather', weather: 'rain' }] }],
  },
  {
    id: 'blizzard',
    title: 'Blizzard',
    body: 'A brutal blizzard freezes the front and the factories alike.',
    rarity: 'uncommon',
    weight: 4,
    choices: [
      { label: 'Endure it', effects: [{ kind: 'weather', weather: 'snow' }, { kind: 'resource', resource: 'industry', amount: -50 }] },
    ],
  },
  {
    id: 'heatwave',
    title: 'Heatwave',
    body: 'A scorching heatwave withers crops and saps strength.',
    rarity: 'common',
    weight: 5,
    choices: [{ label: 'Ration water', effects: [{ kind: 'weather', weather: 'heat' }, { kind: 'resource', resource: 'food', amount: -60 }] }],
  },
  {
    id: 'clear-skies',
    title: 'Clear Skies Return',
    body: 'The weather breaks; calm, clear conditions return to the theater.',
    rarity: 'common',
    weight: 6,
    condition: (c) => c.weather !== 'clear',
    choices: [{ label: 'Resume operations', effects: [{ kind: 'weather', weather: 'clear' }] }],
  },
];
