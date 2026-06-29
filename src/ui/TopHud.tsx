import { motion } from 'framer-motion';
import { useWorldStore } from '@/state/worldStore';
import { useSelectionStore } from '@/state/selectionStore';
import { compact, commas, signedCompact, signedCommas } from '@/ui/format';

interface TopHudProps {
  autoRotate: boolean;
  setAutoRotate: (v: boolean) => void;
}

/** Small inline delta tag, colored by sign. */
function Delta({ text, positive }: { text: string; positive: boolean }) {
  return (
    <span
      className="ml-1 text-[10px] font-semibold tabular-nums"
      style={{ color: positive ? '#46e8a0' : '#ff4d5e' }}
    >
      {text}
    </span>
  );
}

/**
 * Top HUD bar: identity + manual-control banner, the turn readout with the
 * ADVANCE TURN button (the only thing that ticks the world), a compact summary
 * of the selected nation with last-turn deltas, and the cosmetic spin toggle.
 */
export default function TopHud({ autoRotate, setAutoRotate }: TopHudProps) {
  const turn = useWorldStore((s) => s.turn);
  const advanceTurn = useWorldStore((s) => s.advanceTurn);
  const loaded = useWorldStore((s) => s.loaded);
  const lastReportTurn = useWorldStore((s) => s.lastReportTurn);

  const selectedId = useSelectionStore((s) => s.selectedNationId);
  const nation = useWorldStore((s) => (selectedId ? s.nations[selectedId] : undefined));
  const report = useWorldStore((s) => (selectedId ? s.lastReports[selectedId] : undefined));

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

      {/* Turn readout + ADVANCE TURN (the only world-ticker) */}
      <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-orbis-edge bg-orbis-panel px-4 py-2 shadow-neon backdrop-blur-sm">
        <div className="text-center">
          <div className="text-[9px] uppercase tracking-widest text-orbis-textDim">Turn</div>
          <div className="text-xl font-bold tabular-nums text-orbis-text text-glow">{turn}</div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          disabled={!loaded}
          onClick={advanceTurn}
          title="Resolve one turn of economy for every nation. This is the ONLY thing that advances the world."
          className="rounded-md border border-orbis-neon/70 bg-orbis-neon/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-orbis-neon shadow-neon transition-colors hover:bg-orbis-neon/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Advance Turn ▸
        </motion.button>
      </div>

      {/* Selected-nation summary with last-turn deltas */}
      <div className="pointer-events-auto min-w-[280px] flex-1 rounded-lg border border-orbis-edge bg-orbis-panel px-4 py-2 shadow-neon backdrop-blur-sm">
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
                  {report && <Delta text={signedCommas(report.netTreasury)} positive={report.netTreasury >= 0} />}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-orbis-textDim">Manpower</div>
                <div className="text-sm font-semibold tabular-nums text-orbis-good">
                  {compact(nation.manpower.available)}
                  {report && report.manpowerGain > 0 && (
                    <Delta text={signedCompact(report.manpowerGain)} positive />
                  )}
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
          <div className="py-1 text-center text-xs text-orbis-textDim">
            {lastReportTurn > 0
              ? `Turn ${lastReportTurn} resolved · select a nation to see its economy`
              : 'No nation selected'}
          </div>
        )}
      </div>

      {/* Cosmetic spin toggle (off by default) */}
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
