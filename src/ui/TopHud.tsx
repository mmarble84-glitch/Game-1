import { useWorldStore } from '@/state/worldStore';
import { useSelectionStore } from '@/state/selectionStore';
import { compact, commas } from '@/ui/format';

interface TopHudProps {
  autoRotate: boolean;
  setAutoRotate: (v: boolean) => void;
}

/**
 * Top HUD bar: identity + manual-control banner, turn readout, a compact
 * summary of the selected nation, and the cosmetic auto-rotate toggle.
 *
 * The "Advance Turn" / "Draw Event" / "Save" buttons arrive in their phases.
 * Turn is shown here but only advances on the (future) manual Advance-Turn click.
 */
export default function TopHud({ autoRotate, setAutoRotate }: TopHudProps) {
  const turn = useWorldStore((s) => s.turn);
  const selectedId = useSelectionStore((s) => s.selectedNationId);
  const nation = useWorldStore((s) => (selectedId ? s.nations[selectedId] : undefined));

  return (
    <div className="pointer-events-none flex items-start justify-between gap-3">
      {/* Identity + manual-control banner */}
      <div className="pointer-events-auto rounded-lg border border-orbis-edge bg-orbis-panel px-4 py-2 shadow-neon backdrop-blur-sm">
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-bold tracking-[0.3em] text-orbis-neon text-glow">ORBIS</span>
          <span className="text-[10px] uppercase tracking-widest text-orbis-textDim">
            Holographic War-Room
          </span>
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-widest text-orbis-good">
          ● Manual control · nothing runs by itself
        </div>
      </div>

      {/* Turn readout */}
      <div className="pointer-events-auto rounded-lg border border-orbis-edge bg-orbis-panel px-4 py-2 text-center shadow-neon backdrop-blur-sm">
        <div className="text-[9px] uppercase tracking-widest text-orbis-textDim">Turn</div>
        <div className="text-xl font-bold tabular-nums text-orbis-text text-glow">{turn}</div>
      </div>

      {/* Selected-nation summary (fills as you select) */}
      <div className="pointer-events-auto min-w-[260px] flex-1 rounded-lg border border-orbis-edge bg-orbis-panel px-4 py-2 shadow-neon backdrop-blur-sm">
        {nation ? (
          <div className="flex items-center gap-3">
            <span
              className="h-6 w-6 shrink-0 rounded-sm border border-white/20 shadow-neon"
              style={{ background: nation.color }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-orbis-text">{nation.name}</div>
              <div className="text-[10px] uppercase tracking-widest text-orbis-textDim">
                {nation.government}
              </div>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <div className="text-[9px] uppercase tracking-widest text-orbis-textDim">Treasury</div>
                <div className="text-sm font-semibold tabular-nums text-orbis-amber">
                  {commas(nation.resources.treasury)}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-orbis-textDim">Manpower</div>
                <div className="text-sm font-semibold tabular-nums text-orbis-good">
                  {compact(nation.manpower.available)}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-orbis-textDim">Military</div>
                <div className="text-sm font-semibold tabular-nums text-orbis-neon">
                  {nation.military.rating}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-1 text-center text-xs text-orbis-textDim">No nation selected</div>
        )}
      </div>

      {/* Cosmetic auto-rotate toggle (off by default) */}
      <div className="pointer-events-auto rounded-lg border border-orbis-edge bg-orbis-panel px-3 py-2 shadow-neon backdrop-blur-sm">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-orbis-text">
          <input
            type="checkbox"
            checked={autoRotate}
            onChange={(e) => setAutoRotate(e.target.checked)}
            className="h-3 w-3 accent-orbis-neon"
          />
          <span className="uppercase tracking-wider">Spin</span>
        </label>
      </div>
    </div>
  );
}
