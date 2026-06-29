import { motion } from 'framer-motion';
import { useWorldStore } from '@/state/worldStore';
import { UNIT_CONFIG } from '@/config/units';
import { COMBAT_CONFIG } from '@/config/combat';
import type { CombatResult, SideBreakdown } from '@/engine/combat';
import { OUTCOME_COLOR, OUTCOME_LABEL } from '@/ui/combatFormat';

/** One modifier row: label + attacker value + defender value. */
function Row({
  label,
  a,
  d,
  fmt = (n: number) => n.toFixed(2),
  highlight,
}: {
  label: string;
  a: number;
  d: number;
  fmt?: (n: number) => string;
  highlight?: boolean;
}) {
  return (
    <tr className={highlight ? 'bg-orbis-neon/5' : ''}>
      <td className="py-0.5 pr-2 text-[10px] uppercase tracking-wider text-orbis-textDim">{label}</td>
      <td className="py-0.5 text-right tabular-nums text-orbis-text">{fmt(a)}</td>
      <td className="py-0.5 text-right tabular-nums text-orbis-text">{fmt(d)}</td>
    </tr>
  );
}

function statusOf(s: SideBreakdown): { text: string; color: string } {
  if (s.destroyed) return { text: 'Destroyed', color: '#ff4d5e' };
  if (s.retreated) return { text: 'Routed', color: '#ffb347' };
  return { text: 'Held', color: '#46e8a0' };
}

export default function CombatLogModal({ result, onClose }: { result: CombatResult; onClose: () => void }) {
  const nations = useWorldStore((s) => s.nations);
  const a = result.attacker;
  const d = result.defender;
  const aName = nations[a.ownerId]?.name ?? a.ownerId;
  const dName = nations[d.ownerId]?.name ?? d.ownerId;
  const aStatus = statusOf(a);
  const dStatus = statusOf(d);

  return (
    <motion.div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-[480px] max-h-[86vh] overflow-y-auto rounded-xl border border-orbis-edge bg-orbis-panelSolid p-4 shadow-neon-strong"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-orbis-neon text-glow">
              Combat Report
            </div>
            <div className="mt-0.5 text-[10px] uppercase tracking-widest text-orbis-textDim">
              Turn {result.turn} · {COMBAT_CONFIG.terrain[result.terrain].label} ·{' '}
              {COMBAT_CONFIG.weather[result.weather].label}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold" style={{ color: OUTCOME_COLOR[result.outcome] }}>
              {OUTCOME_LABEL[result.outcome]}
            </div>
            <div className="text-[10px] tabular-nums text-orbis-textDim">ratio ×{result.ratio.toFixed(2)}</div>
          </div>
        </div>

        {/* Combatant header row */}
        <div className="mt-3 grid grid-cols-[1fr_auto_auto] items-end gap-2 border-b border-orbis-edge/50 pb-1 text-[10px] uppercase tracking-widest text-orbis-textDim">
          <span></span>
          <span className="text-right" style={{ color: nations[a.ownerId]?.color }}>
            {aName} · {UNIT_CONFIG.stats[a.type].label}
          </span>
          <span className="text-right" style={{ color: nations[d.ownerId]?.color }}>
            {dName} · {UNIT_CONFIG.stats[d.type].label}
          </span>
        </div>

        {/* Modifier breakdown — every coefficient, both sides */}
        <table className="mt-1 w-full">
          <thead>
            <tr className="text-[9px] uppercase tracking-widest text-orbis-textDim/70">
              <th className="text-left font-normal">Modifier</th>
              <th className="text-right font-normal">Attacker</th>
              <th className="text-right font-normal">Defender</th>
            </tr>
          </thead>
          <tbody>
            <Row label="Base (atk/def)" a={a.base} d={d.base} fmt={(n) => n.toFixed(0)} />
            <Row label="Matchup" a={a.matchupMod} d={d.matchupMod} />
            <Row label="Terrain" a={a.terrainMod} d={d.terrainMod} />
            <Row label="Fortification" a={a.fortificationMod} d={d.fortificationMod} />
            <Row label="Supply" a={a.supplyMod} d={d.supplyMod} />
            <Row label="Morale" a={a.moraleMod} d={d.moraleMod} />
            <Row label="Tech" a={a.techMod} d={d.techMod} />
            <Row label="Experience" a={a.experienceMod} d={d.experienceMod} />
            <Row label="Fatigue" a={a.fatiguePenalty} d={d.fatiguePenalty} />
            <Row label="Weather" a={a.weatherMod} d={d.weatherMod} />
            <Row label="Doctrine" a={a.doctrineMod} d={d.doctrineMod} />
            <Row label="Concentration" a={a.concentrationMod} d={d.concentrationMod} />
            <Row label="Fog-of-war roll" a={a.randomRoll} d={d.randomRoll} />
            <Row
              label="Effective Power"
              a={a.effectivePower}
              d={d.effectivePower}
              fmt={(n) => n.toFixed(1)}
              highlight
            />
          </tbody>
        </table>

        {/* Results */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-md border border-orbis-edge/60 bg-black/20 p-2">
            <div className="text-[9px] uppercase tracking-widest" style={{ color: aStatus.color }}>
              Attacker · {aStatus.text}
            </div>
            <div className="mt-1 text-orbis-textDim">
              Strength <b className="text-orbis-text">{a.strengthBefore.toFixed(0)}→{a.strengthAfter.toFixed(0)}</b>{' '}
              <span className="text-orbis-danger">(-{a.strengthLoss.toFixed(0)})</span>
            </div>
            <div className="text-orbis-textDim">
              Org <b className="text-orbis-text">{a.orgBefore.toFixed(0)}→{a.orgAfter.toFixed(0)}</b>
            </div>
            <div className="text-orbis-textDim">Exp <span className="text-orbis-good">+{a.experienceGain}</span></div>
          </div>
          <div className="rounded-md border border-orbis-edge/60 bg-black/20 p-2">
            <div className="text-[9px] uppercase tracking-widest" style={{ color: dStatus.color }}>
              Defender · {dStatus.text}
            </div>
            <div className="mt-1 text-orbis-textDim">
              Strength <b className="text-orbis-text">{d.strengthBefore.toFixed(0)}→{d.strengthAfter.toFixed(0)}</b>{' '}
              <span className="text-orbis-danger">(-{d.strengthLoss.toFixed(0)})</span>
            </div>
            <div className="text-orbis-textDim">
              Org <b className="text-orbis-text">{d.orgBefore.toFixed(0)}→{d.orgAfter.toFixed(0)}</b>
            </div>
            <div className="text-orbis-textDim">Exp <span className="text-orbis-good">+{d.experienceGain}</span></div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full rounded-md border border-orbis-edge px-3 py-2 text-xs font-bold uppercase tracking-widest text-orbis-textDim hover:text-orbis-neon"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}
