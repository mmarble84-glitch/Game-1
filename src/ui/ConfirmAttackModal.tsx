import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWorldStore } from '@/state/worldStore';
import { useCombatStore } from '@/state/combatStore';
import { useLogStore } from '@/state/logStore';
import { useUiStore } from '@/state/uiStore';
import { useSelectionStore } from '@/state/selectionStore';
import { UNIT_CONFIG } from '@/config/units';
import { COMBAT_CONFIG, TERRAIN_TYPES, type TerrainType } from '@/config/combat';
import type { Unit } from '@/models/unit';
import type { Nation } from '@/models/nation';
import { OUTCOME_COLOR, OUTCOME_LABEL, winnerColor } from '@/ui/combatFormat';

/** Compact combatant summary card. */
function SideCard({ unit, nation, role }: { unit: Unit; nation?: Nation; role: string }) {
  const s = UNIT_CONFIG.stats[unit.type];
  return (
    <div className="flex-1 rounded-md border border-orbis-edge/70 bg-black/30 p-2.5">
      <div className="text-[9px] uppercase tracking-widest text-orbis-textDim">{role}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="h-4 w-4 rounded-sm border border-white/20" style={{ background: nation?.color ?? '#fff' }} />
        <span className="truncate text-sm font-bold text-orbis-text">{nation?.name ?? '—'}</span>
      </div>
      <div className="mt-0.5 text-[11px] text-orbis-neon">{s.label}</div>
      <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-orbis-textDim">
        <span>Str <b className="text-orbis-good">{Math.round(unit.strength)}</b></span>
        <span>Org <b className="text-orbis-neon">{Math.round(unit.organization)}</b></span>
        <span>Sup <b className="text-orbis-amber">{Math.round(unit.supply)}</b></span>
        <span>Fat <b className="text-orbis-danger">{Math.round(unit.fatigue)}</b></span>
        {unit.fortified && <span className="col-span-2 text-orbis-neon">● dug in</span>}
      </div>
    </div>
  );
}

export default function ConfirmAttackModal() {
  const pending = useCombatStore((s) => s.pending);
  const terrain = useCombatStore((s) => s.terrain);
  const setTerrain = useCombatStore((s) => s.setTerrain);
  const cancel = useCombatStore((s) => s.cancel);

  const units = useWorldStore((s) => s.units);
  const nations = useWorldStore((s) => s.nations);
  const weather = useWorldStore((s) => s.weather);
  const previewAttack = useWorldStore((s) => s.previewAttack);
  const orderAttack = useWorldStore((s) => s.orderAttack);

  const addLog = useLogStore((s) => s.add);
  const addBattleRing = useUiStore((s) => s.addBattleRing);
  const showToast = useUiStore((s) => s.showToast);
  const selectedUnitId = useSelectionStore((s) => s.selectedUnitId);
  const selectUnit = useSelectionStore((s) => s.selectUnit);

  const attacker = pending ? units[pending.attackerId] : undefined;
  const defender = pending ? units[pending.defenderId] : undefined;

  // Deterministic (no-fog) preview of the engagement.
  const preview = useMemo(() => {
    if (!pending) return null;
    return previewAttack(pending.attackerId, pending.defenderId, terrain);
  }, [pending, terrain, previewAttack]);

  if (!pending || !attacker || !defender || !preview) return null;

  const atkNation = nations[attacker.ownerId];
  const defNation = nations[defender.ownerId];
  const wx = COMBAT_CONFIG.weather[weather];

  const epA = preview.attacker.effectivePower;
  const epD = preview.defender.effectivePower;
  const total = epA + epD || 1;

  const onConfirm = () => {
    const res = orderAttack(pending.attackerId, pending.defenderId, terrain);
    if (!res.ok || !res.result) {
      showToast(res.reason ?? 'Attack failed', 'error');
      cancel();
      return;
    }
    const r = res.result;
    const color = winnerColor(r, nations);
    const text = `${atkNation?.name ?? '?'} ${UNIT_CONFIG.stats[r.attacker.type].label} → ${defNation?.name ?? '?'} ${UNIT_CONFIG.stats[r.defender.type].label}: ${OUTCOME_LABEL[r.outcome]} (×${r.ratio.toFixed(2)})`;
    addLog({ turn: r.turn, kind: 'combat', text, color, combat: r });
    addBattleRing(r.location.lat, r.location.lng, color);
    showToast(`${OUTCOME_LABEL[r.outcome]} · ${r.summary.split(':')[0]}`);

    // If the selected unit died in the exchange, drop the selection.
    if (selectedUnitId === pending.attackerId && r.attacker.destroyed) selectUnit(null);
    cancel();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={cancel}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.94, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-[440px] rounded-xl border border-orbis-danger/60 bg-orbis-panelSolid p-4 shadow-neon-strong"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-[0.25em] text-orbis-danger text-glow">
              ⚔ Confirm Attack
            </span>
            <span className="text-[10px] uppercase tracking-widest text-orbis-textDim">
              Turn-based · one engagement
            </span>
          </div>

          <div className="flex gap-2">
            <SideCard unit={attacker} nation={atkNation} role="Attacker" />
            <div className="flex items-center text-orbis-danger">VS</div>
            <SideCard unit={defender} nation={defNation} role="Defender" />
          </div>

          {/* Battlefield conditions */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-[10px] uppercase tracking-widest text-orbis-textDim">
              Terrain
              <select
                value={terrain}
                onChange={(e) => setTerrain(e.target.value as TerrainType)}
                className="mt-1 w-full rounded-md border border-orbis-edge/70 bg-black/40 px-2 py-1 text-xs text-orbis-text focus:border-orbis-neon focus:outline-none"
              >
                {TERRAIN_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {COMBAT_CONFIG.terrain[t].label}
                  </option>
                ))}
              </select>
            </label>
            <div className="text-[10px] uppercase tracking-widest text-orbis-textDim">
              Weather
              <div className="mt-1 rounded-md border border-orbis-edge/70 bg-black/40 px-2 py-1 text-xs text-orbis-text">
                {wx.label}
              </div>
            </div>
          </div>

          {/* Preview (no fog) */}
          <div className="mt-3 rounded-md border border-orbis-edge/60 bg-black/20 p-2.5">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-orbis-textDim">
              <span>Projected (before fog-of-war roll)</span>
              <span
                className="rounded px-2 py-0.5 font-bold"
                style={{ color: OUTCOME_COLOR[preview.outcome], borderColor: OUTCOME_COLOR[preview.outcome] }}
              >
                {OUTCOME_LABEL[preview.outcome]}
              </span>
            </div>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-black/40">
              <div style={{ width: `${(epA / total) * 100}%`, background: atkNation?.color ?? '#36e0ff' }} />
              <div style={{ width: `${(epD / total) * 100}%`, background: defNation?.color ?? '#ff4d5e' }} />
            </div>
            <div className="mt-1 flex justify-between text-[10px] tabular-nums text-orbis-textDim">
              <span>Power {epA.toFixed(1)}</span>
              <span>ratio ×{preview.ratio.toFixed(2)}</span>
              <span>{epD.toFixed(1)} Power</span>
            </div>
            <div className="mt-1 text-center text-[9px] uppercase tracking-widest text-orbis-textDim/70">
              The real engagement rolls a fresh fog-of-war factor — the result may differ
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={cancel}
              className="flex-1 rounded-md border border-orbis-edge px-3 py-2 text-xs font-bold uppercase tracking-widest text-orbis-textDim hover:text-orbis-text"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded-md border border-orbis-danger bg-orbis-danger/15 px-3 py-2 text-xs font-bold uppercase tracking-widest text-orbis-danger shadow-neon hover:bg-orbis-danger/30"
            >
              Confirm Attack ⚔
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
