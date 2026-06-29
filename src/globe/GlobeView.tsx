import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';

import { GLOBE_CONFIG } from '@/config/globe';
import type { CountryFeature } from '@/models/geo';
import { featureKey } from '@/models/geo';
import { loadCountries } from '@/data/countries';
import { featureCentroid } from '@/globe/geoUtils';
import { makeHolographicEarthTexture, makeStarfieldDataUrl } from '@/globe/proceduralTexture';

interface GlobeViewProps {
  /** Cosmetic-only spin. Defaults OFF. Toggling it NEVER advances game state. */
  autoRotate: boolean;
  /** Reports the most recently clicked country up to the HUD (Phase 0 logging). */
  onCountryClick?: (feature: CountryFeature) => void;
}

/**
 * GlobeView — the living 3D Earth at the heart of ORBIS.
 *
 * Phase 0 responsibilities:
 *  - Render the planet from local Natural Earth GeoJSON with glowing borders.
 *  - Drag-rotate, scroll-zoom, smooth damping, atmosphere glow.
 *  - Auto-rotate OFF by default (cosmetic toggle only).
 *  - Clicking a country logs its name and flies the camera to it.
 *
 * IMPORTANT: react-globe.gl runs an internal requestAnimationFrame render loop.
 * That loop ONLY renders the scene and updates the camera/controls — it never
 * mutates any ORBIS game state. All cosmetic motion here is data-inert.
 */
export default function GlobeView({ autoRotate, onCountryClick }: GlobeViewProps) {
  // react-globe.gl instance handle (camera, controls, scene access).
  const globeRef = useRef<GlobeMethods | undefined>(undefined);

  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  // ---- Load country geometry once (pure fetch, no state mutation) ----------
  useEffect(() => {
    let alive = true;
    loadCountries()
      .then((feats) => {
        if (alive) setCountries(feats);
      })
      .catch((err) => console.error('[ORBIS] Failed to load countries:', err));
    return () => {
      alive = false;
    };
  }, []);

  // ---- Keep the canvas full-bleed on resize -------------------------------
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ---- Holographic globe material (built once) ----------------------------
  const globeMaterial = useMemo(() => {
    const mat = new THREE.MeshPhongMaterial();
    // Procedural holographic surface unless a real texture path is configured.
    mat.map = GLOBE_CONFIG.textures.earth
      ? new THREE.TextureLoader().load(GLOBE_CONFIG.textures.earth)
      : makeHolographicEarthTexture();
    if (GLOBE_CONFIG.textures.bump) {
      mat.bumpMap = new THREE.TextureLoader().load(GLOBE_CONFIG.textures.bump);
      mat.bumpScale = 4;
    }
    mat.color = new THREE.Color(GLOBE_CONFIG.textures.fallbackColor);
    mat.emissive = new THREE.Color('#04101e'); // faint self-glow so it never goes pitch black
    mat.shininess = 6;
    return mat;
  }, []);

  // ---- Procedural starfield background (built once) ------------------------
  const starfield = useMemo(
    () => (GLOBE_CONFIG.background.image ? GLOBE_CONFIG.background.image : makeStarfieldDataUrl()),
    [],
  );

  // ---- One-time globe setup when react-globe.gl is ready -------------------
  const handleGlobeReady = useCallback(() => {
    const g = globeRef.current;
    if (!g) return;

    // Initial vantage point.
    g.pointOfView(GLOBE_CONFIG.initialView, 0);

    // Configure OrbitControls: smooth damping, zoom limits, AUTO-ROTATE OFF.
    const controls = g.controls();
    controls.enableDamping = GLOBE_CONFIG.controls.enableDamping;
    controls.dampingFactor = GLOBE_CONFIG.controls.dampingFactor;
    controls.autoRotate = GLOBE_CONFIG.controls.autoRotate; // false by default
    controls.autoRotateSpeed = GLOBE_CONFIG.controls.autoRotateSpeed;
    // Globe radius in react-globe.gl is 100 units; distance = radius * (1 + altitude).
    controls.minDistance = 100 * (1 + GLOBE_CONFIG.controls.minZoomAltitude);
    controls.maxDistance = 100 * (1 + GLOBE_CONFIG.controls.maxZoomAltitude);
  }, []);

  // ---- Apply the cosmetic auto-rotate toggle ------------------------------
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.autoRotate = autoRotate;
  }, [autoRotate]);

  // ---- Polygon accessors (recomputed on hover/selection for visual feedback)
  const polyAltitude = useCallback(
    (d: object) => {
      const key = featureKey(d as CountryFeature);
      if (key === selectedKey) return GLOBE_CONFIG.polygons.selectedAltitude;
      if (key === hoverKey) return GLOBE_CONFIG.polygons.hoverAltitude;
      return GLOBE_CONFIG.polygons.baseAltitude;
    },
    [hoverKey, selectedKey],
  );

  const polyCapColor = useCallback(
    (d: object) => {
      const key = featureKey(d as CountryFeature);
      if (key === selectedKey) return GLOBE_CONFIG.polygons.selectedCapColor;
      if (key === hoverKey) return GLOBE_CONFIG.polygons.hoverCapColor;
      return GLOBE_CONFIG.polygons.capColor;
    },
    [hoverKey, selectedKey],
  );

  const polyStrokeColor = useCallback(() => GLOBE_CONFIG.polygons.strokeColor, []);
  const polySideColor = useCallback(() => GLOBE_CONFIG.polygons.sideColor, []);

  // Hover tooltip: country name (Phase 1 will add live stats here).
  const polyLabel = useCallback((d: object) => {
    const f = d as CountryFeature;
    return `
      <div style="
        font-family: 'JetBrains Mono', monospace;
        background: rgba(10,16,28,0.92);
        border: 1px solid #1c3a5e;
        border-radius: 6px;
        padding: 6px 10px;
        color: #cfe8ff;
        box-shadow: 0 0 12px rgba(54,224,255,0.35);
        font-size: 12px;">
        <span style="color:#36e0ff; letter-spacing:1px;">${f.properties.ADMIN}</span>
      </div>`;
  }, []);

  // ---- Click: log + fly camera to the country -----------------------------
  const handlePolygonClick = useCallback(
    (polygon: object) => {
      const f = polygon as CountryFeature;
      const key = featureKey(f);
      setSelectedKey(key);

      // Phase 0 requirement: log the country name.
      console.log(`[ORBIS] Selected country: ${f.properties.ADMIN} (${key})`);
      onCountryClick?.(f);

      // Fly the camera to the country's centroid.
      const c = featureCentroid(f);
      globeRef.current?.pointOfView(
        { lat: c.lat, lng: c.lng, altitude: GLOBE_CONFIG.flyTo.altitude },
        GLOBE_CONFIG.flyTo.durationMs,
      );
    },
    [onCountryClick],
  );

  const handlePolygonHover = useCallback((polygon: object | null) => {
    setHoverKey(polygon ? featureKey(polygon as CountryFeature) : null);
  }, []);

  return (
    <Globe
      ref={globeRef}
      width={size.w}
      height={size.h}
      onGlobeReady={handleGlobeReady}
      // --- Surface & sky ---
      globeMaterial={globeMaterial}
      backgroundImageUrl={starfield}
      backgroundColor={GLOBE_CONFIG.background.color}
      showAtmosphere={GLOBE_CONFIG.atmosphere.show}
      atmosphereColor={GLOBE_CONFIG.atmosphere.color}
      atmosphereAltitude={GLOBE_CONFIG.atmosphere.altitude}
      // --- Country polygons (glowing landmasses) ---
      polygonsData={countries}
      polygonAltitude={polyAltitude}
      polygonCapColor={polyCapColor}
      polygonSideColor={polySideColor}
      polygonStrokeColor={polyStrokeColor}
      polygonLabel={polyLabel}
      polygonsTransitionDuration={GLOBE_CONFIG.polygons.transitionMs}
      onPolygonClick={handlePolygonClick}
      onPolygonHover={handlePolygonHover}
    />
  );
}
