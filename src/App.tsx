import { useEffect, useState } from 'react';
import GlobeView from '@/globe/GlobeView';
import TopHud from '@/ui/TopHud';
import NationListPanel from '@/ui/NationListPanel';
import OverviewPanel from '@/ui/OverviewPanel';
import { loadNationSeeds, buildModernWorld } from '@/data/nationSeeds';
import { useWorldStore } from '@/state/worldStore';
import { useSelectionStore } from '@/state/selectionStore';

/**
 * App — Phase 1 shell.
 *
 * The globe is a full-bleed living background; the HUD + panels float over it.
 * Everything is manual: the Modern World is loaded once at startup (scenario
 * setup, NOT a turn tick) and nothing advances, ticks, or mutates on its own.
 */
export default function App() {
  // Cosmetic-only auto-rotate. Defaults OFF per the MANUAL CONTROL rule.
  const [autoRotate, setAutoRotate] = useState(false);

  const loaded = useWorldStore((s) => s.loaded);
  const loadWorld = useWorldStore((s) => s.loadWorld);
  const clearSelection = useSelectionStore((s) => s.clearSelection);

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

  // ---- Esc = deselect ------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearSelection]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-orbis-bg">
      {/* The 3D Earth */}
      <GlobeView autoRotate={autoRotate} />

      {/* Top HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 p-4">
        <TopHud autoRotate={autoRotate} setAutoRotate={setAutoRotate} />
      </div>

      {/* Left: searchable nation list */}
      <div className="pointer-events-none absolute left-4 top-[104px]">
        <NationListPanel />
      </div>

      {/* Right: contextual Overview panel */}
      <div className="pointer-events-none absolute right-4 top-[104px]">
        <OverviewPanel />
      </div>

      {/* Controls hint */}
      <div className="pointer-events-none absolute bottom-4 right-4">
        <div className="rounded-lg border border-orbis-edge bg-orbis-panel px-3 py-2 text-[10px] uppercase tracking-widest text-orbis-textDim shadow-neon backdrop-blur-sm">
          Drag · rotate &nbsp;|&nbsp; Scroll · zoom &nbsp;|&nbsp; Click · select &nbsp;|&nbsp; Esc · deselect
        </div>
      </div>
    </div>
  );
}
