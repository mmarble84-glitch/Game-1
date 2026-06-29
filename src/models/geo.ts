/**
 * Geographic model types shared across ORBIS.
 * Full game-entity models (Nation, Unit, Alliance, …) arrive in later phases.
 */

/** ISO_A3 country code — the stable key for every landmass. */
export type ISO = string;

export type LatLng = { lat: number; lng: number };

/**
 * A single Natural Earth Admin-0 country feature.
 * We only type the properties we actually read; the geometry is passed
 * straight through to react-globe.gl.
 */
export interface CountryFeature {
  type: 'Feature';
  properties: {
    /** Display name, e.g. "France". */
    ADMIN: string;
    /** Stable ISO_A3 key, e.g. "FRA". May be "-99" for disputed/odd entries. */
    ISO_A3: string;
    /** Allow other Natural Earth fields without typing them all. */
    [key: string]: unknown;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface CountriesGeoJSON {
  type: 'FeatureCollection';
  features: CountryFeature[];
}

/** Safely read the stable key for a feature, falling back to ADMIN when ISO is unusable. */
export function featureKey(f: CountryFeature): ISO {
  const iso = f.properties.ISO_A3;
  if (iso && iso !== '-99') return iso;
  return f.properties.ADMIN;
}
