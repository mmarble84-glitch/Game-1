/**
 * Pure geometry helpers for the globe layer (no game state).
 */

import type { CountryFeature, LatLng } from '@/models/geo';

/**
 * Compute a rough centroid (lat/lng) for a country feature by averaging the
 * vertices of its largest ring. Good enough to fly the camera toward a country;
 * exact pole-of-inaccessibility is overkill for a sandbox.
 */
export function featureCentroid(feature: CountryFeature): LatLng {
  const { geometry } = feature;

  // Collect candidate rings from Polygon or MultiPolygon.
  const rings: number[][][] = [];
  if (geometry.type === 'Polygon') {
    rings.push(...(geometry.coordinates as number[][][]));
  } else {
    // MultiPolygon: coordinates is number[][][][]
    for (const poly of geometry.coordinates as number[][][][]) {
      rings.push(...poly);
    }
  }

  // Pick the ring with the most vertices (a decent proxy for the biggest landmass).
  let biggest: number[][] = [];
  for (const ring of rings) {
    if (ring.length > biggest.length) biggest = ring;
  }
  if (biggest.length === 0) return { lat: 0, lng: 0 };

  let sumLat = 0;
  let sumLng = 0;
  for (const [lng, lat] of biggest) {
    sumLng += lng;
    sumLat += lat;
  }
  return {
    lat: sumLat / biggest.length,
    lng: sumLng / biggest.length,
  };
}
