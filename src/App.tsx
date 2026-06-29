import { useEffect, useState } from 'react';
import GlobeView from '@/globe/GlobeView';
import TopHud from '@/ui/TopHud';
import NationListPanel from '@/ui/NationListPanel';
import NationPanel from '@/ui/NationPanel';
import UnitPanel from '@/ui/UnitPanel';
import Toast from '@/ui/Toast';
import MoveBanner from '@/ui/MoveBanner';
import LogTicker from '@/ui/LogTicker';
import ConfirmAttackModal from '@/ui/ConfirmAttackModal';
import EventCardModal from '@/ui/EventCardModal';
import SandboxToolbar from '@/ui/SandboxToolbar';
import { loadNationSeeds, buildModernWorld } from '@/data/nationSeeds';
import { useWorldStore } from '@/state/worldStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useCombatStore } from '@/state/combatStore';
import { useSandboxStore } from '@/state/sandboxStore';

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
  const attackMode = useSelectionStore((s) => s.attackMode);
  const setAttackMode = useSelectionStore((s) => s.setAttackMode);
  const selectUnit = useSelectionStore((s) => s.selectUnit);
  const selectNation = useSelectionStore((s) => s.selectNation);
  const pendingAttack = useCombatStore((s) => s.pending);
  const cancelAttack = useCombatStore((s) => s.cancel);
  const sandboxTool = useSandboxStore((s) => s.tool);
  const setSandboxTool = useSandboxStore((s) => s.setTool);

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

  // ---- Esc = step back: cancel order → exit modes → deselect unit → nation -
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (pendingAttack) cancelAttack();
      else if (attackMode) setAttackMode(false);
      else if (moveMode) setMoveMode(false);
      else if (sandboxTool !== 'none') setSandboxTool('none');
      else if (selectedUnitId) selectUnit(null);
      else selectNation(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    pendingAttack,
    cancelAttack,
    attackMode,
    setAttackMode,
    moveMode,
    setMoveMode,
    sandboxTool,
    setSandboxTool,
    selectedUnitId,
    selectUnit,
    selectNation,
  ]);

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

      {/* Right: unit panel when a unit is selected, else the nation panel */}
      <div className="pointer-events-none absolute right-4 top-[104px]">
        {selectedUnitId ? <UnitPanel /> : <NationPanel />}
      </div>

      {/* Bottom-left: combat / event / diplomacy log ticker */}
      <div className="pointer-events-none absolute bottom-4 left-4">
        <LogTicker />
      </div>

      {/* Bottom-center: god-mode sandbox toolbar */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
        <SandboxToolbar />
      </div>

      {/* Confirm-attack modal (self-gates on a pending order) */}
      <ConfirmAttackModal />

      {/* Event card modal (self-gates on a drawn card) */}
      <EventCardModal />

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
