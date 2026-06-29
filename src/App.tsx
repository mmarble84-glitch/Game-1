import { useEffect, useState } from 'react';
import GlobeView from '@/globe/GlobeView';
import TopHud from '@/ui/TopHud';
import NationListPanel from '@/ui/NationListPanel';
import OverviewPanel from '@/ui/OverviewPanel';
import UnitPanel from '@/ui/UnitPanel';
import Toast from '@/ui/Toast';
import MoveBanner from '@/ui/MoveBanner';
import { loadNationSeeds, buildModernWorld } from '@/data/nationSeeds';
import { useWorldStore } from '@/state/worldStore';
import { useSelectionStore } from '@/state/selectionStore';

/**
 * App — Phase 3 shell.
 *
 * The globe is a full-bleed living background; the HUD + panels float over it.
 * Everything is manual: the Modern World loads once at startup (setup, NOT a
 * tick), and nothing advances, fights, or mutates on its own. Units are raised,
 * moved, and fortified only on explicit clicks.
 */
export default function App() {
  // Cosmetic-only auto-rotate. Defaults OFF per the MANUAL CONTROL rule.
  const [autoRotate, setAutoRotate] = useState(false);

  const loaded = useWorldStore((s) => s.loaded);
  const loadWorld = useWorldStore((s) => s.loadWorld);

  const selectedUnitId = useSelectionStore((s) => s.selectedUnitId);
  const moveMode = useSelectionStore((s) => s.moveMode);
  const setMoveMode = useSelectionStore((s) => s.setMoveMode);
  const selectUnit = useSelectionStore((s) => s.selectUnit);
  const selectNation = useSelectionStore((s) => s.selectNation);

  // ---- One-time scenario load (setup, not a tick) -------------------------
  useEffect(() => {
    if (loaded) return;
    let alive = true;
    loadNationSeeds()
      .then((seeds) => {
        if (!alive) return;
        const { nations, territoryOwner } = buildModernWorld(seeds);
        loadWorld(nations, territoryOwner);
      })
      .catch((err) => console.error('[ORBIS] Failed to load nation seeds:', err));
    return () => {
      alive = false;
    };
  }, [loaded, loadWorld]);

  // ---- Esc = step back: cancel move → deselect unit → deselect nation -----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (moveMode) setMoveMode(false);
      else if (selectedUnitId) selectUnit(null);
      else selectNation(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moveMode, selectedUnitId, setMoveMode, selectUnit, selectNation]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-orbis-bg">
      {/* The 3D Earth */}
      <GlobeView autoRotate={autoRotate} />

      {/* Top HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 p-4">
        <TopHud autoRotate={autoRotate} setAutoRotate={setAutoRotate} />
      </div>

      {/* Move-mode banner (top center, below HUD) */}
      <div className="pointer-events-none absolute inset-x-0 top-[88px] flex justify-center">
        <MoveBanner />
      </div>

      {/* Left: searchable nation list */}
      <div className="pointer-events-none absolute left-4 top-[104px]">
        <NationListPanel />
      </div>

      {/* Right: unit panel when a unit is selected, else nation Overview */}
      <div className="pointer-events-none absolute right-4 top-[104px]">
        {selectedUnitId ? <UnitPanel /> : <OverviewPanel />}
      </div>

      {/* Transient status toast */}
      <Toast />

      {/* Controls hint */}
      <div className="pointer-events-none absolute bottom-4 right-4">
        <div className="rounded-lg border border-orbis-edge bg-orbis-panel px-3 py-2 text-[10px] uppercase tracking-widest text-orbis-textDim shadow-neon backdrop-blur-sm">
          Drag · rotate &nbsp;|&nbsp; Scroll · zoom &nbsp;|&nbsp; Click · select &nbsp;|&nbsp; Esc · back
        </div>
      </div>
    </div>
  );
}
