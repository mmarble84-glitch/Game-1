import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLogStore, type LogKind } from '@/state/logStore';
import type { CombatResult } from '@/engine/combat';
import CombatLogModal from '@/ui/CombatLogModal';

const KIND_ICON: Record<LogKind, string> = {
  combat: '⚔',
  event: '◆',
  diplomacy: '⟡',
  system: '•',
};

/** Bottom log ticker: recent combat/event/diplomacy entries; click a combat
 *  entry to expand its full modifier breakdown. */
export default function LogTicker() {
  const entries = useLogStore((s) => s.entries);
  const [open, setOpen] = useState<CombatResult | null>(null);

  return (
    <>
      <div className="pointer-events-auto w-[420px] rounded-lg border border-orbis-edge bg-orbis-panel shadow-neon backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-orbis-edge/50 px-3 py-1.5">
          <span className="text-[10px] uppercase tracking-[0.3em] text-orbis-neon">Log</span>
          <span className="text-[9px] tabular-nums text-orbis-textDim">{entries.length}</span>
        </div>
        <div className="max-h-[150px] overflow-y-auto py-1">
          {entries.length === 0 ? (
            <div className="px-3 py-3 text-center text-[11px] text-orbis-textDim">
              No activity yet — orders, battles, and events appear here
            </div>
          ) : (
            entries.slice(0, 40).map((e) => {
              const clickable = e.kind === 'combat' && e.combat;
              return (
                <button
                  key={e.id}
                  disabled={!clickable}
                  onClick={() => clickable && setOpen(e.combat!)}
                  className={`flex w-full items-start gap-2 px-3 py-1 text-left text-[11px] ${
                    clickable ? 'hover:bg-white/5' : 'cursor-default'
                  }`}
                >
                  <span className="tabular-nums text-orbis-textDim/70">T{e.turn}</span>
                  <span style={{ color: e.color ?? '#7d97b5' }}>{KIND_ICON[e.kind]}</span>
                  <span className="flex-1 text-orbis-text">{e.text}</span>
                  {clickable && <span className="text-orbis-neon">▸</span>}
                </button>
              );
            })
          )}
        </div>
      </div>

      <AnimatePresence>
        {open && <CombatLogModal result={open} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </>
  );
}
