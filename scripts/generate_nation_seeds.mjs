/**
 * Generates /public/data/nation_seeds.json — rough-but-plausible starting stats
 * for every country in the Natural Earth 110m dataset.
 *
 * Stats are DERIVED from real fields in the GeoJSON (population, GDP, income
 * group, continent) plus deterministic per-ISO variation, so the output is
 * stable and reproducible. Exact realism is not the goal — it's a sandbox seed.
 *
 * Run:  node scripts/generate_nation_seeds.mjs
 *
 * The same derivation weights are mirrored conceptually in /src/config/nations.ts
 * for the runtime-derived military rating; everything here is editable.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const geo = JSON.parse(readFileSync(resolve(ROOT, 'public/data/countries.geojson'), 'utf8'));

// ---- helpers ---------------------------------------------------------------

/** featureKey mirrors src/models/geo.ts: ISO_A3 unless "-99", else ADMIN. */
function featureKey(props) {
  const iso = props.ISO_A3;
  if (iso && iso !== '-99') return iso;
  return props.ADMIN;
}

/** Stable 32-bit string hash (FNV-1a) for deterministic per-nation variation. */
function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Centroid = average of the vertices of the largest ring (matches geoUtils.ts). */
function centroid(geometry) {
  const rings = [];
  if (geometry.type === 'Polygon') rings.push(...geometry.coordinates);
  else for (const poly of geometry.coordinates) rings.push(...poly);
  let biggest = [];
  for (const r of rings) if (r.length > biggest.length) biggest = r;
  if (!biggest.length) return { lat: 0, lng: 0 };
  let sLat = 0, sLng = 0;
  for (const [lng, lat] of biggest) { sLng += lng; sLat += lat; }
  return {
    lat: +(sLat / biggest.length).toFixed(3),
    lng: +(sLng / biggest.length).toFixed(3),
  };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/** HSL (h 0..360, s/l 0..1) -> #rrggbb */
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

// ---- derivation tables (tunable) -------------------------------------------

// Continent base hue: nations cluster into color families by continent, while
// MAPCOLOR13 + jitter keep neighbouring countries visually distinct.
const CONTINENT_HUE = {
  'Asia': 30,
  'Africa': 130,
  'Europe': 210,
  'North America': 275,
  'South America': 55,
  'Oceania': 320,
  'Antarctica': 185,
  'Seven seas (open ocean)': 0,
};

// Income group -> base techLevel (1..10) and base stability (0..100).
const INCOME = {
  '1. High income: OECD':     { tech: 8, stab: 80 },
  '2. High income: nonOECD':  { tech: 7, stab: 72 },
  '3. Upper middle income':   { tech: 5, stab: 62 },
  '4. Lower middle income':   { tech: 4, stab: 52 },
  '5. Low income':            { tech: 2, stab: 42 },
};

const DOCTRINES = ['balanced', 'armor', 'air', 'naval', 'guerilla'];
const GOVERNMENTS = [
  'Republic', 'Federal Republic', 'Constitutional Monarchy',
  'Parliamentary Republic', 'Presidential Republic', 'Federation', 'Sovereign State',
];

// ---- build seeds -----------------------------------------------------------

const seeds = {};

for (const feat of geo.features) {
  const p = feat.properties;
  const key = featureKey(p);
  const h = hash32(key);

  // Real-world inputs (guard missing/odd values).
  const pop = Math.max(0, Number(p.POP_EST) || 0);
  const gdp = Math.max(0, Number(p.GDP_MD_EST) || 0); // GDP in millions USD
  const popM = pop / 1_000_000;
  const income = INCOME[p.INCOME_GRP] || { tech: 3, stab: 50 };

  // --- color (continent family + neighbour-distinct via MAPCOLOR13 + jitter) ---
  const baseHue = CONTINENT_HUE[p.CONTINENT] ?? 200;
  const mc = p.MAPCOLOR13 && p.MAPCOLOR13 > 0 ? p.MAPCOLOR13 : (h % 13) + 1;
  const hue = baseHue + ((mc - 1) / 12 - 0.5) * 64 + ((h % 10) - 5);
  const color = hslToHex(hue, 0.68, 0.56);

  // --- resources (starting stockpiles) ---
  const resources = {
    treasury: Math.round(gdp / 1000),                 // GDP-scaled funds
    industry: Math.max(1, Math.round(gdp / 2500)),    // industrial base
    energy: Math.max(1, Math.round(popM * 2 + gdp / 8000)),
    food: Math.max(1, Math.round(popM * 2.5 + 2)),
    rareMaterials: Math.max(0, Math.round(popM * 0.3 + (h % 40))),
  };

  // --- manpower (population-scaled, abstract pools) ---
  const pool = Math.max(1, Math.round(pop / 100_000));
  const manpower = {
    pool,
    available: Math.max(0, Math.round(pool * 0.3)),
    recruitRate: Math.max(1, Math.round(pool * 0.01)),
  };

  // --- military doctrine + tech (rating is DERIVED at runtime, not stored) ---
  // Doctrine: weighted deterministic pick (balanced most common).
  const dRoll = h % 100;
  const doctrine =
    dRoll < 42 ? 'balanced' :
    dRoll < 62 ? 'armor' :
    dRoll < 77 ? 'air' :
    dRoll < 92 ? 'naval' : 'guerilla';
  // Use UNSIGNED shifts (>>>): a signed >> on a hash above 2^31 goes negative,
  // and `negative % n` stays negative, which would skew jitter and could even
  // produce a negative array index for government.
  const techLevel = clamp(income.tech + ((h >>> 3) % 3) - 1, 1, 10);

  // --- stability + government ---
  const stability = clamp(income.stab + ((h >>> 5) % 21) - 10, 0, 100);
  const government = GOVERNMENTS[(h >>> 7) % GOVERNMENTS.length];

  seeds[key] = {
    name: p.ADMIN,
    color,
    capital: centroid(feat.geometry),
    resources,
    manpower,
    military: { doctrine, techLevel },
    stability,
    government,
  };
}

const out = resolve(ROOT, 'public/data/nation_seeds.json');
writeFileSync(out, JSON.stringify(seeds, null, 2) + '\n');
console.log(`Wrote ${Object.keys(seeds).length} nation seeds -> ${out}`);
