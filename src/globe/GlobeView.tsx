import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';

import { GLOBE_CONFIG } from '@/config/globe';
import { NATION_CONFIG } from '@/config/nations';
import type { CountryFeature } from '@/models/geo';
import { featureKey } from '@/models/geo';
import type { Nation } from '@/models/nation';
import { loadCountries } from '@/data/countries';
import { makeHolographicEarthTexture, makeStarfieldDataUrl } from '@/globe/proceduralTexture';
import { hexToRgba, brighten } from '@/globe/colorUtils';
import { useWorldStore } from '@/state/worldStore';
import { useSelectionStore } from '@/state/selectionStore';
import { compact, commas } from '@/ui/format';

interface GlobeViewProps {
  /** Cosmetic-only spin. Defaults OFF. Toggling it NEVER advances game state. */
  autoRotate: boolean;
}

/**
 * GlobeView — the living 3D Earth.
 *
 * Phase 1: each country is colored by its owning nation. Clicking a country
 * selects that NATION; the selected nation's whole territory brightens and lifts,
 * and the camera flies to its capital.
 *
 * IMPORTANT: react-globe.gl's internal requestAnimationFrame loop ONLY renders
 * the scene and updates the camera — it never mutates ORBIS game state. All
 * motion here is cosmetic.
 */
export default function GlobeView({ autoRotate }: GlobeViewProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);

  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  // World + selection state.
  const nations = useWorldStore((s) => s.nations);
  const territoryOwner = useWorldStore((s) => s.territoryOwner);
  const selectedNationId = useSelectionStore((s) => s.selectedNationId);
  const selectNation = useSelectionStore((s) => s.selectNation);

  // ---- Load country geometry once -----------------------------------------
  useEffect(() => {
    let alive = true;
    loadCountries()
      .then((feats) => alive && setCountries(feats))
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
    mat.map = GLOBE_CONFIG.textures.earth
      ? new THREE.TextureLoader().load(GLOBE_CONFIG.textures.earth)
      : makeHolographicEarthTexture();
    if (GLOBE_CONFIG.textures.bump) {
      mat.bumpMap = new THREE.TextureLoader().load(GLOBE_CONFIG.textures.bump);
      mat.bumpScale = 4;
    }
    mat.color = new THREE.Color(GLOBE_CONFIG.textures.fallbackColor);
    mat.emissive = new THREE.Color('#04101e');
    mat.shininess = 6;
    return mat;
  }, []);

  const starfield = useMemo(
    () => (GLOBE_CONFIG.background.image ? GLOBE_CONFIG.background.image : makeStarfieldDataUrl()),
    [],
  );

  // ---- One-time globe setup -----------------------------------------------
  const handleGlobeReady = useCallback(() => {
    const g = globeRef.current;
    if (!g) return;
    g.pointOfView(GLOBE_CONFIG.initialView, 0);
    const controls = g.controls();
    controls.enableDamping = GLOBE_CONFIG.controls.enableDamping;
    controls.dampingFactor = GLOBE_CONFIG.controls.dampingFactor;
    controls.autoRotate = GLOBE_CONFIG.controls.autoRotate; // false by default
    controls.autoRotateSpeed = GLOBE_CONFIG.controls.autoRotateSpeed;
    controls.minDistance = 100 * (1 + GLOBE_CONFIG.controls.minZoomAltitude);
    controls.maxDistance = 100 * (1 + GLOBE_CONFIG.controls.maxZoomAltitude);
  }, []);

  // ---- Cosmetic auto-rotate toggle ----------------------------------------
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    g.controls().autoRotate = autoRotate;
  }, [autoRotate]);

  // ---- Fly to the selected nation's capital -------------------------------
  useEffect(() => {
    if (!selectedNationId) return;
    const n = nations[selectedNationId];
    if (!n) return;
    globeRef.current?.pointOfView(
      { lat: n.capital.lat, lng: n.capital.lng, altitude: GLOBE_CONFIG.flyTo.altitude },
      GLOBE_CONFIG.flyTo.durationMs,
    );
  }, [selectedNationId, nations]);

  // ---- Lookups ------------------------------------------------------------
  const nationForFeature = useCallback(
    (f: CountryFeature): Nation | undefined => {
      const owner = territoryOwner[featureKey(f)];
      return owner ? nations[owner] : undefined;
    },
    [territoryOwner, nations],
  );

  // ---- Polygon accessors (recomputed on hover/selection) ------------------
  const polyAltitude = useCallback(
    (d: object) => {
      const f = d as CountryFeature;
      const n = nationForFeature(f);
      if (n && n.id === selectedNationId) return GLOBE_CONFIG.polygons.selectedAltitude;
      if (featureKey(f) === hoverKey) return GLOBE_CONFIG.polygons.hoverAltitude;
      return GLOBE_CONFIG.polygons.baseAltitude;
    },
    [nationForFeature, selectedNationId, hoverKey],
  );

  const polyCapColor = useCallback(
    (d: object) => {
      const f = d as CountryFeature;
      const n = nationForFeature(f);
      if (!n) return GLOBE_CONFIG.polygons.capColor; // unowned fallback
      const isSelected = n.id === selectedNationId;
      const isHover = featureKey(f) === hoverKey;
      const alpha = isSelected
        ? NATION_CONFIG.fill.selected
        : isHover
          ? NATION_CONFIG.fill.hover
          : NATION_CONFIG.fill.base;
      return hexToRgba(n.color, alpha);
    },
    [nationForFeature, selectedNationId, hoverKey],
  );

  const polyStrokeColor = useCallback(
    (d: object) => {
      const n = nationForFeature(d as CountryFeature);
      if (!n) return GLOBE_CONFIG.polygons.strokeColor;
      return n.id === selectedNationId
        ? brighten(n.color, NATION_CONFIG.selectedBorderBrighten)
        : n.color;
    },
    [nationForFeature, selectedNationId],
  );

  const polySideColor = useCallback(
    (d: object) => {
      const n = nationForFeature(d as CountryFeature);
      return n ? hexToRgba(n.color, NATION_CONFIG.fill.side) : GLOBE_CONFIG.polygons.sideColor;
    },
    [nationForFeature],
  );

  // Hover tooltip: owning nation + key stats.
  const polyLabel = useCallback(
    (d: object) => {
      const f = d as CountryFeature;
      const n = nationForFeature(f);
      const title = n ? n.name : f.properties.ADMIN;
      const stats = n
        ? `<div style="display:flex; gap:12px; margin-top:4px; font-size:11px; color:#7d97b5;">
             <span>Treasury <b style="color:#ffb347;">${commas(n.resources.treasury)}</b></span>
             <span>Manpower <b style="color:#46e8a0;">${compact(n.manpower.available)}</b></span>
             <span>Rating <b style="color:#36e0ff;">${n.military.rating}</b></span>
           </div>`
        : '';
      return `
        <div style="
          font-family:'JetBrains Mono', monospace;
          background:rgba(10,16,28,0.94);
          border:1px solid ${n ? n.color : '#1c3a5e'};
          border-radius:6px; padding:7px 11px; color:#cfe8ff;
          box-shadow:0 0 14px rgba(54,224,255,0.3); font-size:12px;">
          <span style="color:#36e0ff; letter-spacing:1px;">${title}</span>
          ${stats}
        </div>`;
    },
    [nationForFeature],
  );

  // ---- Click: select the nation owning the clicked country ----------------
  const handlePolygonClick = useCallback(
    (polygon: object) => {
      const owner = territoryOwner[featureKey(polygon as CountryFeature)];
      if (owner) selectNation(owner);
    },
    [territoryOwner, selectNation],
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
      globeMaterial={globeMaterial}
      backgroundImageUrl={starfield}
      backgroundColor={GLOBE_CONFIG.background.color}
      showAtmosphere={GLOBE_CONFIG.atmosphere.show}
      atmosphereColor={GLOBE_CONFIG.atmosphere.color}
      atmosphereAltitude={GLOBE_CONFIG.atmosphere.altitude}
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
