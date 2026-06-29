/**
 * Country geometry loader.
 * Reads the committed Natural Earth Admin-0 (110m) GeoJSON from /public/data.
 * This is a pure async fetch with no side effects on game state.
 */

import type { CountriesGeoJSON, CountryFeature } from '@/models/geo';

const COUNTRIES_URL = '/data/countries.geojson';

let cache: CountryFeature[] | null = null;

/** Load (and memoize) the country features. */
export async function loadCountries(): Promise<CountryFeature[]> {
  if (cache) return cache;
  const res = await fetch(COUNTRIES_URL);
  if (!res.ok) {
    throw new Error(`Failed to load countries geojson: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as CountriesGeoJSON;
  cache = json.features;
  return cache;
}
