import { useMemo, useState } from 'react';
import { useWorldStore } from '@/state/worldStore';
import { useLogStore } from '@/state/logStore';
import { useUiStore } from '@/state/uiStore';
import type { Nation } from '@/models/nation';
import {
  allianceOf,
  areAllied,
  areAtWar,
  getRelation,
  relationBand,
  warBetween,
} from '@/engine/diplomacy';
import { DIPLOMACY_CONFIG } from '@/config/diplomacy';

/** Diplomacy tab: alliances, relations, and war/peace — all player-driven. */
export default function DiplomacyTab({ nation }: { nation: Nation }) {
  const nations = useWorldStore((s) => s.nations);
  const relations = useWorldStore((s) => s.relations);
  const alliances = useWorldStore((s) => s.alliances);
  const wars = useWorldStore((s) => s.wars);
  const pullAllies = useWorldStore((s) => s.pullAlliesIntoWar);
  const setPullAllies = useWorldStore((s) => s.setPullAlliesIntoWar);
  const adjustRelationBetween = useWorldStore((s) => s.adjustRelationBetween);
  const allyNations = useWorldStore((s) => s.allyNations);
  const breakAllianceBetween = useWorldStore((s) => s.breakAllianceBetween);
  const declareWar = useWorldStore((s) => s.declareWar);
  const makePeace = useWorldStore((s) => s.makePeace);
  const addLog = useLogStore((s) => s.add);
  const showToast = useUiStore((s) => s.showToast);
  const turn = useWorldStore((s) => s.turn);

  const [query, setQuery] = useState('');
  const [targetId, setTargetId] = useState<string | null>(null);

  const myAlliance = allianceOf(alliances, nation.id);

  const others = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(nations)
      .filter((n) => n.id !== nation.id && (!q || n.name.toLowerCase().includes(q)))
      .sort((a, b) => getRelation(relations, nation.id, b.id) - getRelation(relations, nation.id, a.id));
  }, [nations, nation.id, query, relations]);

  const target = targetId ? nations[targetId] : undefined;

  const log = (text: string, color?: string) =>
    addLog({ turn, kind: 'diplomacy', text, color });

  const onImprove = () => {
    if (!target) return;
    adjustRelationBetween(nation.id, target.id, DIPLOMACY_CONFIG.relation.step);
    log(`${nation.name} improved relations with ${target.name}`, '#9be86a');
  };
  const onWorsen = () => {
    if (!target) return;
    adjustRelationBetween(nation.id, target.id, -DIPLOMACY_CONFIG.relation.step);
    log(`${nation.name} worsened relations with ${target.name}`, '#ffb347');
  };
  const onAlly = () => {
    if (!target) return;
    const res = allyNations(nation.id, target.id);
    if (res.ok) {
      log(`Alliance: ${nation.name} & ${target.name}`, res.alliance?.color ?? '#46e8a0');
      showToast(`Allied with ${target.name}`);
    } else showToast(res.reason ?? 'Cannot ally', 'error');
  };
  const onBreak = () => {
    if (!target) return;
    const res = breakAllianceBetween(nation.id, target.id);
    if (res.ok) {
      log(`Alliance broken: ${nation.name} ✕ ${target.name}`, '#ffb347');
      showToast(`Alliance with ${target.name} broken`);
    } else showToast(res.reason ?? 'Not allied', 'error');
  };
  const onWar = () => {
    if (!target) return;
    const res = declareWar(nation.id, target.id);
    if (res.ok && res.war) {
      const pulled = res.war.sideA.length + res.war.sideB.length > 2;
      log(`⚔ ${nation.name} declared war on ${target.name}${pulled ? ' (allies pulled in)' : ''}`, '#ff4d5e');
      showToast(`War declared on ${target.name}`, 'error');
    } else showToast(res.reason ?? 'Cannot declare war', 'error');
  };
  const onPeace = () => {
    if (!target) return;
    const w = warBetween(wars, nation.id, target.id);
    if (!w) return;
    const res = makePeace(w.id);
    if (res.ok) {
      log(`☮ Peace: ${nation.name} & ${target.name}`, '#46e8a0');
      showToast(`Peace signed with ${target.name}`);
    } else showToast(res.reason ?? 'Cannot make peace', 'error');
  };

  const allied = target ? areAllied(alliances, nation.id, target.id) : false;
  const atWar = target ? areAtWar(wars, nation.id, target.id) : false;
  const relVal = target ? getRelation(relations, nation.id, target.id) : 0;
  const band = relationBand(relVal);

  return (
    <div>
      {/* My alliance + the pull-allies toggle */}
      <div className="mb-2 flex items-center justify-between rounded-md border border-orbis-edge/60 bg-black/20 px-2.5 py-1.5">
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-widest text-orbis-textDim">Alliance</div>
          {myAlliance ? (
            <div className="flex items-center gap-1.5 truncate text-xs">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: myAlliance.color }} />
              <span className="truncate text-orbis-text">{myAlliance.name}</span>
              <span className="text-orbis-textDim">({myAlliance.memberIds.length})</span>
            </div>
          ) : (
            <div className="text-xs text-orbis-textDim">Unaligned</div>
          )}
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[9px] uppercase tracking-widest text-orbis-textDim">
          <input
            type="checkbox"
            checked={pullAllies}
            onChange={(e) => setPullAllies(e.target.checked)}
            className="h-3 w-3 accent-orbis-danger"
          />
          Pull allies
        </label>
      </div>

      {/* Counterpart picker */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find a nation…"
        className="mb-1 w-full rounded-md border border-orbis-edge/70 bg-black/40 px-2 py-1 text-xs text-orbis-text placeholder:text-orbis-textDim/60 focus:border-orbis-neon focus:outline-none"
      />
      <div className="max-h-[150px] overflow-y-auto rounded-md border border-orbis-edge/40">
        {others.slice(0, 60).map((n) => {
          const v = getRelation(relations, nation.id, n.id);
          const b = relationBand(v);
          const isAlly = areAllied(alliances, nation.id, n.id);
          const isWar = areAtWar(wars, nation.id, n.id);
          return (
            <button
              key={n.id}
              onClick={() => setTargetId(n.id)}
              className={`flex w-full items-center gap-2 px-2 py-1 text-left text-[11px] ${
                targetId === n.id ? 'bg-orbis-neon/15' : 'hover:bg-white/5'
              }`}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: n.color }} />
              <span className="flex-1 truncate text-orbis-text">{n.name}</span>
              {isAlly && <span className="text-[9px] text-orbis-good">ALLY</span>}
              {isWar && <span className="text-[9px] text-orbis-danger">WAR</span>}
              <span className="w-7 text-right tabular-nums" style={{ color: b.color }}>
                {v}
              </span>
            </button>
          );
        })}
      </div>

      {/* Actions for the chosen counterpart */}
      {target && (
        <div className="mt-2 rounded-md border border-orbis-edge/60 bg-black/20 p-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-orbis-text">
              <span className="h-3 w-3 rounded-sm" style={{ background: target.color }} />
              {target.name}
            </span>
            <span className="text-[10px] uppercase tracking-widest" style={{ color: band.color }}>
              {band.label} · {relVal}
            </span>
          </div>

          {/* Relation bar (-100..100) */}
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full"
              style={{ width: `${((relVal + 100) / 200) * 100}%`, background: band.color }}
            />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <DipBtn label="Improve +" onClick={onImprove} tone="good" />
            <DipBtn label="Worsen −" onClick={onWorsen} tone="amber" />
            {allied ? (
              <DipBtn label="Break Alliance" onClick={onBreak} tone="amber" />
            ) : (
              <DipBtn label="Form Alliance" onClick={onAlly} tone="neon" disabled={atWar} />
            )}
            {atWar ? (
              <DipBtn label="Make Peace" onClick={onPeace} tone="good" />
            ) : (
              <DipBtn label="Declare War" onClick={onWar} tone="danger" disabled={allied} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DipBtn({
  label,
  onClick,
  tone,
  disabled,
}: {
  label: string;
  onClick: () => void;
  tone: 'neon' | 'good' | 'amber' | 'danger';
  disabled?: boolean;
}) {
  const tones: Record<string, string> = {
    neon: 'border-orbis-neon/60 text-orbis-neon hover:bg-orbis-neon/20',
    good: 'border-orbis-good/60 text-orbis-good hover:bg-orbis-good/20',
    amber: 'border-orbis-amber/60 text-orbis-amber hover:bg-orbis-amber/20',
    danger: 'border-orbis-danger/60 text-orbis-danger hover:bg-orbis-danger/20',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md border px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${tones[tone]}`}
    >
      {label}
    </button>
  );
}
