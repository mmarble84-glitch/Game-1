import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWorldStore } from '@/state/worldStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useUiStore } from '@/state/uiStore';
import type { Nation } from '@/models/nation';
import type { UnitType } from '@/models/unit';
import type { NationTurnReport } from '@/engine/economy';
import { UNIT_CONFIG, UNIT_ORDER, recruitManpowerCost, recruitTreasuryCost } from '@/config/units';
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

      {/* Forces (recruit + roster) */}
      <ForcesSection nationId={nation.id} />
    </motion.div>
  );
}

/** Lists the nation's units and offers manual recruitment at the capital. */
function ForcesSection({ nationId }: { nationId: string }) {
  const nation = useWorldStore((s) => s.nations[nationId]);
  const units = useWorldStore((s) => s.units);
  const recruitUnit = useWorldStore((s) => s.recruitUnit);
  const selectUnit = useSelectionStore((s) => s.selectUnit);
  const showToast = useUiStore((s) => s.showToast);

  const [type, setType] = useState<UnitType>('infantry');

  const owned = useMemo(
    () => Object.values(units).filter((u) => u.ownerId === nationId),
    [units, nationId],
  );

  const mpCost = recruitManpowerCost(type);
  const trCost = recruitTreasuryCost(type);
  const affordable = !!nation && nation.manpower.available >= mpCost && nation.resources.treasury >= trCost;

  const onRecruit = () => {
    const res = recruitUnit(nationId, type);
    showToast(
      res.ok ? `Recruited ${UNIT_CONFIG.stats[type].label}` : res.reason ?? 'Cannot recruit',
      res.ok ? 'info' : 'error',
    );
  };

  return (
    <>
      <div className="mb-1.5 mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-orbis-neonDim">
        <span>Forces</span>
        <span className="tabular-nums text-orbis-textDim">{owned.length}</span>
      </div>

      {owned.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {owned.map((u) => (
            <button
              key={u.id}
              onClick={() => selectUnit(u.id, nationId)}
              title={`${UNIT_CONFIG.stats[u.type].label} · str ${Math.round(u.strength)}`}
              className="rounded border border-orbis-edge/70 bg-black/30 px-1.5 py-0.5 text-[10px] text-orbis-text hover:border-orbis-neon hover:text-orbis-neon"
            >
              {UNIT_CONFIG.stats[u.type].label}
              {u.movedThisTurn ? ' ·' : ''}
            </button>
          ))}
        </div>
      )}

      {/* Recruit control */}
      <div className="flex items-center gap-1.5">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as UnitType)}
          className="min-w-0 flex-1 rounded-md border border-orbis-edge/70 bg-black/40 px-2 py-1 text-xs text-orbis-text focus:border-orbis-neon focus:outline-none"
        >
          {UNIT_ORDER.map((t) => (
            <option key={t} value={t}>
              {UNIT_CONFIG.stats[t].label}
            </option>
          ))}
        </select>
        <button
          onClick={onRecruit}
          disabled={!affordable}
          title={`Cost: ${mpCost} manpower · ${trCost} treasury`}
          className="rounded-md border border-orbis-good/60 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-orbis-good transition-colors hover:bg-orbis-good/20 disabled:cursor-not-allowed disabled:opacity-35"
        >
          Recruit
        </button>
      </div>
      <div className="mt-1 text-[9px] uppercase tracking-widest text-orbis-textDim">
        Cost: <span className="text-orbis-good">{mpCost} MP</span> ·{' '}
        <span className="text-orbis-amber">{trCost} treasury</span>
      </div>
    </>
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
