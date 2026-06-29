/**
 * Country geometry loader.
 * The Natural Earth Admin-0 (110m) GeoJSON is BUNDLED (imported as a raw string)
 * rather than fetched, so the app works fully offline — including as a single
 * self-contained HTML file opened from the filesystem (file://), where fetch()
 * of local files is blocked by the browser.
 */

import type { CountryFeature, CountriesGeoJSON } from '@/models/geo';
// eslint-disable-next-line import/no-unresolved -- Vite ?raw import
import countriesRaw from './countries.geojson?raw';

let cache: CountryFeature[] | null = null;

/** Load (and memoize) the country features from the bundled GeoJSON. */
export async function loadCountries(): Promise<CountryFeature[]> {
  if (cache) return cache;
  const json = JSON.parse(countriesRaw) as CountriesGeoJSON;
  cache = json.features;
  return cache;
}
