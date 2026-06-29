import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';

import { GLOBE_CONFIG } from '@/config/globe';
import { NATION_CONFIG } from '@/config/nations';
import { UNIT_CONFIG } from '@/config/units';
import type { CountryFeature } from '@/models/geo';
import { featureKey } from '@/models/geo';
import type { Nation } from '@/models/nation';
import type { Unit } from '@/models/unit';
import { loadCountries } from '@/data/countries';
import { makeHolographicEarthTexture, makeStarfieldDataUrl } from '@/globe/proceduralTexture';
import { hexToRgba, brighten } from '@/globe/colorUtils';
import { buildUnitObject } from '@/globe/unitMesh';
import { useWorldStore } from '@/state/worldStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useUiStore, type BattleRing } from '@/state/uiStore';
import { useCombatStore } from '@/state/combatStore';
import { DIPLOMACY_CONFIG } from '@/config/diplomacy';
import { compact, commas } from '@/ui/format';

/** A unit decorated with render-time owner color + selection flag. */
type RenderUnit = Unit & { __color: string; __selected: boolean };

/** A diplomacy arc between two capitals (alliance or war front). */
interface DiploArc {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string | string[];
  animateTime: number;
}

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
  const units = useWorldStore((s) => s.units);
  const alliances = useWorldStore((s) => s.alliances);
  const wars = useWorldStore((s) => s.wars);
  const moveUnitTo = useWorldStore((s) => s.moveUnitTo);
  const selectedNationId = useSelectionStore((s) => s.selectedNationId);
  const selectNation = useSelectionStore((s) => s.selectNation);
  const selectedUnitId = useSelectionStore((s) => s.selectedUnitId);
  const selectUnit = useSelectionStore((s) => s.selectUnit);
  const moveMode = useSelectionStore((s) => s.moveMode);
  const setMoveMode = useSelectionStore((s) => s.setMoveMode);
  const attackMode = useSelectionStore((s) => s.attackMode);
  const setAttackMode = useSelectionStore((s) => s.setAttackMode);
  const showToast = useUiStore((s) => s.showToast);
  const battleRings = useUiStore((s) => s.battleRings);
  const openAttack = useCombatStore((s) => s.openAttack);

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

  // ---- Unit markers -------------------------------------------------------
  // Decorate units with owner color + selection so a changed array forces the
  // object layer to rebuild markers when selection changes.
  const renderUnits = useMemo<RenderUnit[]>(
    () =>
      Object.values(units).map((u) => ({
        ...u,
        __color: nations[u.ownerId]?.color ?? '#ffffff',
        __selected: u.id === selectedUnitId,
      })),
    [units, nations, selectedUnitId],
  );

  const objectThreeObject = useCallback((d: object) => {
    const u = d as RenderUnit;
    return buildUnitObject(u.type, u.__color, u.__selected);
  }, []);

  const objectAltitude = useCallback((d: object) => UNIT_CONFIG.visual[(d as Unit).type].altitude, []);
  const objectLat = useCallback((d: object) => (d as Unit).pos.lat, []);
  const objectLng = useCallback((d: object) => (d as Unit).pos.lng, []);

  const handleObjectClick = useCallback(
    (obj: object) => {
      const u = obj as Unit;
      // In attack mode, the clicked enemy unit becomes the target (then confirm).
      if (attackMode && selectedUnitId) {
        const attacker = units[selectedUnitId];
        if (attacker && u.ownerId === attacker.ownerId) {
          showToast('Cannot attack your own unit', 'error');
        } else if (attacker) {
          openAttack(selectedUnitId, u.id);
        }
        setAttackMode(false);
        return;
      }
      selectUnit(u.id, u.ownerId);
    },
    [attackMode, selectedUnitId, units, openAttack, setAttackMode, showToast, selectUnit],
  );

  // ---- Battle rings (cosmetic, colored by winner) -------------------------
  const ringLat = useCallback((d: object) => (d as BattleRing).lat, []);
  const ringLng = useCallback((d: object) => (d as BattleRing).lng, []);
  const ringColor = useCallback((d: object) => {
    const c = (d as BattleRing).color;
    // Fade alpha out as each ring expands (t: 0 → 1). Purely cosmetic.
    return (t: number) => hexToRgba(c, 1 - t);
  }, []);

  // ---- Diplomacy arcs (alliances = colored, wars = red & faster) ----------
  const arcsData = useMemo<DiploArc[]>(() => {
    const arcs: DiploArc[] = [];
    // Alliance arcs between every pair of member capitals.
    for (const al of Object.values(alliances)) {
      const ms = al.memberIds;
      for (let i = 0; i < ms.length; i++) {
        for (let j = i + 1; j < ms.length; j++) {
          const a = nations[ms[i]]?.capital;
          const b = nations[ms[j]]?.capital;
          if (!a || !b) continue;
          arcs.push({
            id: `al-${al.id}-${ms[i]}-${ms[j]}`,
            startLat: a.lat,
            startLng: a.lng,
            endLat: b.lat,
            endLng: b.lng,
            color: al.color,
            animateTime: 4500, // slow, calm pulse for alliances
          });
        }
      }
    }
    // War (conflict) arcs between every opposing capital pair.
    for (const w of Object.values(wars)) {
      for (const x of w.sideA) {
        for (const y of w.sideB) {
          const a = nations[x]?.capital;
          const b = nations[y]?.capital;
          if (!a || !b) continue;
          arcs.push({
            id: `war-${w.id}-${x}-${y}`,
            startLat: a.lat,
            startLng: a.lng,
            endLat: b.lat,
            endLng: b.lng,
            color: DIPLOMACY_CONFIG.warArcColor as unknown as string[],
            animateTime: 1100, // fast, urgent flicker for war fronts
          });
        }
      }
    }
    return arcs;
  }, [alliances, wars, nations]);

  // ---- Move-mode: interpret the next globe/country click as a destination --
  const tryMove = useCallback(
    (coords: { lat: number; lng: number }): boolean => {
      if (!moveMode || !selectedUnitId) return false;
      const res = moveUnitTo(selectedUnitId, { lat: coords.lat, lng: coords.lng });
      if (res.ok) {
        showToast(`Moved · ${Math.round(res.distanceKm ?? 0)} km`, 'info');
      } else {
        showToast(res.reason ?? 'Cannot move there', 'error');
      }
      setMoveMode(false);
      return true;
    },
    [moveMode, selectedUnitId, moveUnitTo, showToast, setMoveMode],
  );

  // ---- Click: move (if in move mode) else select the owning nation --------
  const handlePolygonClick = useCallback(
    (polygon: object, _event: MouseEvent, coords: { lat: number; lng: number }) => {
      if (tryMove(coords)) return;
      const owner = territoryOwner[featureKey(polygon as CountryFeature)];
      if (owner) selectNation(owner);
    },
    [tryMove, territoryOwner, selectNation],
  );

  const handleGlobeClick = useCallback(
    (coords: { lat: number; lng: number }) => {
      // Lets units move to open sea / any point; otherwise a no-op.
      tryMove(coords);
    },
    [tryMove],
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
      onGlobeClick={handleGlobeClick}
      // --- Unit markers (custom 3D objects layer) ---
      objectsData={renderUnits}
      objectLat={objectLat}
      objectLng={objectLng}
      objectAltitude={objectAltitude}
      objectFacesSurfaces={true}
      objectThreeObject={objectThreeObject}
      onObjectClick={handleObjectClick}
      // --- Battle rings (RINGS layer) ---
      ringsData={battleRings}
      ringLat={ringLat}
      ringLng={ringLng}
      ringColor={ringColor}
      ringMaxRadius={6}
      ringPropagationSpeed={4}
      ringRepeatPeriod={750}
      ringAltitude={0.011}
      // --- Diplomacy arcs (ARCS layer): alliances + war fronts ---
      arcsData={arcsData}
      arcStartLat={(d: object) => (d as DiploArc).startLat}
      arcStartLng={(d: object) => (d as DiploArc).startLng}
      arcEndLat={(d: object) => (d as DiploArc).endLat}
      arcEndLng={(d: object) => (d as DiploArc).endLng}
      arcColor={(d: object) => (d as DiploArc).color}
      arcStroke={0.6}
      arcDashLength={0.45}
      arcDashGap={0.25}
      arcDashAnimateTime={(d: object) => (d as DiploArc).animateTime}
    />
  );
}
