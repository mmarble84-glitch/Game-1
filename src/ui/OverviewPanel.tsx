import { AnimatePresence, motion } from 'framer-motion';
import { useWorldStore } from '@/state/worldStore';
import { useSelectionStore } from '@/state/selectionStore';
import type { Nation } from '@/models/nation';
import type { NationTurnReport } from '@/engine/economy';
import { commas, compact, signedCommas } from '@/ui/format';

/** A labelled value tile, optionally with a last-turn delta. */
function Stat({
  label,
  value,
  accent,
  delta,
}: {
  label: string;
  value: string;
  accent?: string;
  delta?: number;
}) {
  return (
    <div className="rounded-md border border-orbis-edge/60 bg-black/30 px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-widest text-orbis-textDim">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-sm font-semibold tabular-nums" style={{ color: accent ?? '#cfe8ff' }}>
          {value}
        </span>
        {delta !== undefined && delta !== 0 && (
          <span
            className="text-[10px] font-semibold tabular-nums"
            style={{ color: delta >= 0 ? '#46e8a0' : '#ff4d5e' }}
          >
            {signedCommas(delta)}
          </span>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 mt-3 text-[10px] uppercase tracking-[0.25em] text-orbis-neonDim">
      {children}
    </div>
  );
}

/** 0..100 meter (e.g. stability). Cosmetic bar, no animation loop. */
function Meter({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/40">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
      />
    </div>
  );
}

function stabilityColor(s: number): string {
  if (s >= 70) return '#46e8a0';
  if (s >= 45) return '#ffb347';
  return '#ff4d5e';
}

function NationOverview({ nation, report }: { nation: Nation; report?: NationTurnReport }) {
  const r = nation.resources;
  const m = nation.manpower;
  const inc = report?.income;
  return (
    <motion.div
      key={nation.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span
          className="h-5 w-5 shrink-0 rounded-sm border border-white/20 shadow-neon"
          style={{ background: nation.color }}
        />
        <div className="min-w-0">
          <div className="truncate text-base font-bold text-orbis-text text-glow">
            {nation.name}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-orbis-textDim">
            {nation.government} · {nation.territory.length} territor
            {nation.territory.length === 1 ? 'y' : 'ies'}
          </div>
        </div>
      </div>

      {/* Stability */}
      <SectionTitle>Stability</SectionTitle>
      <div className="flex items-center gap-2">
        <Meter value={nation.stability} color={stabilityColor(nation.stability)} />
        <span
          className="w-9 text-right text-xs font-semibold tabular-nums"
          style={{ color: stabilityColor(nation.stability) }}
        >
          {nation.stability}
        </span>
        {report && report.stabilityChange !== 0 && (
          <span
            className="text-[10px] font-semibold tabular-nums"
            style={{ color: report.stabilityChange >= 0 ? '#46e8a0' : '#ff4d5e' }}
          >
            {report.stabilityChange > 0 ? '+' : ''}
            {report.stabilityChange}
          </span>
        )}
      </div>

      {/* Military */}
      <SectionTitle>Military</SectionTitle>
      <div className="grid grid-cols-3 gap-1.5">
        <Stat label="Rating" value={String(nation.military.rating)} accent="#36e0ff" />
        <Stat label="Doctrine" value={nation.military.doctrine} />
        <Stat label="Tech" value={`${nation.military.techLevel}/10`} />
      </div>

      {/* Manpower */}
      <SectionTitle>Manpower</SectionTitle>
      <div className="grid grid-cols-3 gap-1.5">
        <Stat label="Available" value={compact(m.available)} accent="#46e8a0" delta={report?.manpowerGain} />
        <Stat label="Pool" value={compact(m.pool)} />
        <Stat label="Recruit / turn" value={compact(m.recruitRate)} />
      </div>

      {/* Resources (deltas = last turn's production / net) */}
      <SectionTitle>Resources</SectionTitle>
      <div className="grid grid-cols-2 gap-1.5">
        <Stat label="Treasury" value={commas(r.treasury)} accent="#ffb347" delta={report?.netTreasury} />
        <Stat label="Industry" value={commas(r.industry)} delta={inc?.industry} />
        <Stat label="Energy" value={commas(r.energy)} delta={inc?.energy} />
        <Stat label="Food" value={commas(r.food)} delta={inc?.food} />
        <Stat label="Rare Materials" value={commas(r.rareMaterials)} delta={inc?.rareMaterials} />
      </div>
    </motion.div>
  );
}

/** Right-hand contextual panel: Overview of the selected nation. */
export default function OverviewPanel() {
  const selectedId = useSelectionStore((s) => s.selectedNationId);
  const nation = useWorldStore((s) => (selectedId ? s.nations[selectedId] : undefined));
  const report = useWorldStore((s) => (selectedId ? s.lastReports[selectedId] : undefined));

  return (
    <div className="pointer-events-auto w-[300px] rounded-lg border border-orbis-edge bg-orbis-panel p-3 shadow-neon backdrop-blur-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.3em] text-orbis-neon">Overview</span>
        <span className="text-[9px] uppercase tracking-widest text-orbis-textDim">Nation</span>
      </div>
      <AnimatePresence mode="wait">
        {nation ? (
          <NationOverview nation={nation} report={report} />
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-6 text-center text-sm text-orbis-textDim"
          >
            Select a nation on the globe
            <br />
            or from the list →
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
