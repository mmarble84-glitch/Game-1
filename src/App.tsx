import { useState } from 'react';
import GlobeView from '@/globe/GlobeView';
import type { CountryFeature } from '@/models/geo';

/**
 * App — Phase 0 shell.
 *
 * The globe is a full-bleed living background; the HUD floats over it as a
 * translucent holographic console. Everything here is manual: nothing ticks,
 * advances, or mutates on its own.
 */
export default function App() {
  // Cosmetic-only auto-rotate. Defaults OFF per the MANUAL CONTROL rule.
  const [autoRotate, setAutoRotate] = useState(false);
  // Last clicked country (Phase 0 "logging" surfaced in the HUD).
  const [lastClicked, setLastClicked] = useState<CountryFeature | null>(null);

  return (
    <div className="relative h-full w-full overflow-hidden bg-orbis-bg">
      {/* ---- The 3D Earth ---- */}
      <GlobeView autoRotate={autoRotate} onCountryClick={setLastClicked} />

      {/* ---- Top HUD bar ---- */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
        <div className="pointer-events-auto rounded-lg border border-orbis-edge bg-orbis-panel px-4 py-2 shadow-neon backdrop-blur-sm">
          <div className="flex items-baseline gap-3">
            <span className="text-lg font-bold tracking-[0.3em] text-orbis-neon text-glow">
              ORBIS
            </span>
            <span className="text-[10px] uppercase tracking-widest text-orbis-textDim">
              Holographic War-Room
            </span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-widest text-orbis-good">
            ● Manual control · nothing runs by itself
          </div>
        </div>

        {/* Cosmetic auto-rotate toggle (off by default). */}
        <div className="pointer-events-auto rounded-lg border border-orbis-edge bg-orbis-panel px-3 py-2 shadow-neon backdrop-blur-sm">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-orbis-text">
            <input
              type="checkbox"
              checked={autoRotate}
              onChange={(e) => setAutoRotate(e.target.checked)}
              className="h-3 w-3 accent-orbis-neon"
            />
            <span className="uppercase tracking-wider">Auto-rotate (cosmetic)</span>
          </label>
        </div>
      </div>

      {/* ---- Selected-country readout (bottom-left) ---- */}
      <div className="pointer-events-none absolute bottom-4 left-4">
        <div className="pointer-events-auto min-w-[220px] rounded-lg border border-orbis-edge bg-orbis-panel px-4 py-3 shadow-neon backdrop-blur-sm">
          <div className="text-[10px] uppercase tracking-widest text-orbis-textDim">
            Selected
          </div>
          {lastClicked ? (
            <div className="mt-1">
              <div className="text-base font-semibold text-orbis-neon text-glow">
                {lastClicked.properties.ADMIN}
              </div>
              <div className="text-[11px] tracking-wider text-orbis-textDim">
                {lastClicked.properties.ISO_A3}
              </div>
            </div>
          ) : (
            <div className="mt-1 text-sm text-orbis-textDim">
              Click a landmass to select it
            </div>
          )}
        </div>
      </div>

      {/* ---- Controls hint (bottom-right) ---- */}
      <div className="pointer-events-none absolute bottom-4 right-4">
        <div className="rounded-lg border border-orbis-edge bg-orbis-panel px-3 py-2 text-[10px] uppercase tracking-widest text-orbis-textDim shadow-neon backdrop-blur-sm">
          Drag · rotate &nbsp;|&nbsp; Scroll · zoom &nbsp;|&nbsp; Click · select + fly
        </div>
      </div>
    </div>
  );
}
