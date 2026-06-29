import { motion } from 'framer-motion';
import { useWorldStore } from '@/state/worldStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useUiStore } from '@/state/uiStore';
import { UNIT_CONFIG } from '@/config/units';
import { unitMaxRangeKm } from '@/engine/units';
import type { Unit } from '@/models/unit';

/** A labelled 0..100 condition bar. */
function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[9px] uppercase tracking-widest text-orbis-textDim">
        <span>{label}</span>
        <span className="tabular-nums" style={{ color }}>
          {Math.round(value)}
        </span>
      </div>
      <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-black/40">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  tone = 'neon',
  title,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'neon' | 'amber' | 'danger';
  title?: string;
}) {
  const tones: Record<string, string> = {
    neon: 'border-orbis-neon/60 text-orbis-neon hover:bg-orbis-neon/20',
    amber: 'border-orbis-amber/60 text-orbis-amber hover:bg-orbis-amber/20',
    danger: 'border-orbis-danger/60 text-orbis-danger hover:bg-orbis-danger/20',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${tones[tone]}`}
    >
      {label}
    </button>
  );
}

function UnitDetails({ unit }: { unit: Unit }) {
  const nation = useWorldStore((s) => s.nations[unit.ownerId]);
  const fortify = useWorldStore((s) => s.fortify);
  const removeUnit = useWorldStore((s) => s.removeUnit);
  const setMoveMode = useSelectionStore((s) => s.setMoveMode);
  const moveMode = useSelectionStore((s) => s.moveMode);
  const setAttackMode = useSelectionStore((s) => s.setAttackMode);
  const attackMode = useSelectionStore((s) => s.attackMode);
  const selectUnit = useSelectionStore((s) => s.selectUnit);
  const showToast = useUiStore((s) => s.showToast);

  const stats = UNIT_CONFIG.stats[unit.type];
  const acted = unit.movedThisTurn;
  const rangeKm = Math.round(unitMaxRangeKm(unit));

  const onMove = () => {
    if (acted) return showToast('Unit has already acted this turn', 'error');
    setMoveMode(true);
    showToast('Move mode · click a destination within range', 'info');
  };
  const onFortify = () => {
    const res = fortify(unit.id);
    showToast(res.ok ? 'Unit fortified' : res.reason ?? 'Cannot fortify', res.ok ? 'info' : 'error');
  };
  const onAttack = () => {
    if (acted) return showToast('Unit has already acted this turn', 'error');
    setAttackMode(true);
    showToast('Attack mode · click an enemy unit', 'info');
  };
  const onDisband = () => {
    selectUnit(null);
    removeUnit(unit.id);
    showToast('Unit disbanded', 'info');
  };

  return (
    <motion.div key={unit.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span
          className="h-5 w-5 shrink-0 rounded-sm border border-white/20 shadow-neon"
          style={{ background: nation?.color ?? '#fff' }}
        />
        <div className="min-w-0">
          <div className="truncate text-base font-bold text-orbis-text text-glow">{stats.label}</div>
          <div className="text-[10px] uppercase tracking-widest text-orbis-textDim">
            {nation?.name ?? 'Unknown'} · {stats.domain}
          </div>
        </div>
      </div>

      {/* Base stats */}
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        <Mini label="ATK" value={String(stats.attack)} />
        <Mini label="DEF" value={String(stats.defense)} />
        <Mini label="Range" value={`${rangeKm}km`} />
        <Mini label="Upkeep" value={String(stats.upkeep)} />
      </div>

      {/* Condition bars */}
      <div className="mt-3 space-y-1.5">
        <Bar label="Strength" value={unit.strength} color="#46e8a0" />
        <Bar label="Organization" value={unit.organization} color="#36e0ff" />
        <Bar label="Supply" value={unit.supply} color="#ffb347" />
        <Bar label="Fatigue" value={unit.fatigue} color="#ff4d5e" />
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-orbis-textDim">
        <span>Experience {Math.round(unit.experience)}</span>
        <span style={{ color: acted ? '#ff4d5e' : '#46e8a0' }}>
          {acted ? '● Acted this turn' : '● Ready'}
        </span>
      </div>

      {/* Quick actions (all manual + confirmed by the click) */}
      <div className="mt-3 flex gap-1.5">
        <ActionButton label={moveMode ? 'Pick…' : 'Move'} onClick={onMove} disabled={acted} tone="neon" />
        <ActionButton label="Fortify" onClick={onFortify} disabled={acted} tone="amber" />
        <ActionButton
          label={attackMode ? 'Target…' : 'Attack'}
          onClick={onAttack}
          disabled={acted}
          tone="danger"
          title="Order an attack on an enemy unit (you'll confirm the engagement)"
        />
      </div>
      <div className="mt-1.5 flex">
        <ActionButton label="Disband" onClick={onDisband} tone="danger" />
      </div>
    </motion.div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-orbis-edge/60 bg-black/30 px-1.5 py-1 text-center">
      <div className="text-[8px] uppercase tracking-widest text-orbis-textDim">{label}</div>
      <div className="text-xs font-semibold tabular-nums text-orbis-text">{value}</div>
    </div>
  );
}

/** Right-hand panel shown when a unit is selected. */
export default function UnitPanel() {
  const selectedUnitId = useSelectionStore((s) => s.selectedUnitId);
  const unit = useWorldStore((s) => (selectedUnitId ? s.units[selectedUnitId] : undefined));
  const selectUnit = useSelectionStore((s) => s.selectUnit);

  if (!unit) return null;

  return (
    <div className="pointer-events-auto w-[300px] rounded-lg border border-orbis-edge bg-orbis-panel p-3 shadow-neon backdrop-blur-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.3em] text-orbis-neon">Unit</span>
        <button
          onClick={() => selectUnit(null)}
          className="text-[10px] uppercase tracking-widest text-orbis-textDim hover:text-orbis-neon"
        >
          ← Nation
        </button>
      </div>
      <UnitDetails unit={unit} />
    </div>
  );
}
