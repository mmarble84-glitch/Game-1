import { useMemo, useState } from 'react';
import { useWorldStore } from '@/state/worldStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useUiStore } from '@/state/uiStore';
import type { Nation } from '@/models/nation';
import type { UnitType } from '@/models/unit';
import { UNIT_CONFIG, UNIT_ORDER, recruitManpowerCost, recruitTreasuryCost } from '@/config/units';
import { SectionTitle, Stat } from '@/ui/nation/StatBits';
import { playCue } from '@/audio/cues';

/** Military tab: doctrine/tech/rating + the unit roster and recruitment. */
export default function MilitaryTab({ nation }: { nation: Nation }) {
  const units = useWorldStore((s) => s.units);
  const recruitUnit = useWorldStore((s) => s.recruitUnit);
  const selectUnit = useSelectionStore((s) => s.selectUnit);
  const showToast = useUiStore((s) => s.showToast);

  const [type, setType] = useState<UnitType>('infantry');

  const owned = useMemo(
    () => Object.values(units).filter((u) => u.ownerId === nation.id),
    [units, nation.id],
  );

  const mpCost = recruitManpowerCost(type);
  const trCost = recruitTreasuryCost(type);
  const affordable = nation.manpower.available >= mpCost && nation.resources.treasury >= trCost;

  const onRecruit = () => {
    const res = recruitUnit(nation.id, type);
    if (res.ok) playCue('recruit');
    showToast(
      res.ok ? `Recruited ${UNIT_CONFIG.stats[type].label}` : res.reason ?? 'Cannot recruit',
      res.ok ? 'info' : 'error',
    );
  };

  return (
    <div>
      <SectionTitle>Command</SectionTitle>
      <div className="grid grid-cols-3 gap-1.5">
        <Stat label="Rating" value={String(nation.military.rating)} accent="#36e0ff" />
        <Stat label="Doctrine" value={nation.military.doctrine} />
        <Stat label="Tech" value={`${nation.military.techLevel}/10`} />
      </div>

      <div className="mb-1.5 mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-orbis-neonDim">
        <span>Forces</span>
        <span className="tabular-nums text-orbis-textDim">{owned.length}</span>
      </div>

      {owned.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1">
          {owned.map((u) => (
            <button
              key={u.id}
              onClick={() => selectUnit(u.id, nation.id)}
              title={`${UNIT_CONFIG.stats[u.type].label} · str ${Math.round(u.strength)}`}
              className="rounded border border-orbis-edge/70 bg-black/30 px-1.5 py-0.5 text-[10px] text-orbis-text hover:border-orbis-neon hover:text-orbis-neon"
            >
              {UNIT_CONFIG.stats[u.type].label}
              {u.movedThisTurn ? ' ·' : ''}
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-2 text-[11px] text-orbis-textDim">No units raised yet</div>
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
    </div>
  );
}
