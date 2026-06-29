import { AnimatePresence, motion } from 'framer-motion';
import { useEventStore } from '@/state/eventStore';
import { useWorldStore } from '@/state/worldStore';
import { RARITY_META } from '@/config/events';
import type { Effect } from '@/models/event';
import { UNIT_CONFIG } from '@/config/units';
import { COMBAT_CONFIG } from '@/config/combat';

/** Short human description of a single effect, for the choice preview. */
function describeEffect(eff: Effect): { text: string; positive: boolean } {
  const sgn = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  switch (eff.kind) {
    case 'resource':
      return { text: `${cap(eff.resource)} ${sgn(eff.amount)}`, positive: eff.amount >= 0 };
    case 'manpower':
      return { text: `Manpower ${sgn(eff.amount)}`, positive: eff.amount >= 0 };
    case 'stability':
      return { text: `Stability ${sgn(eff.amount)}`, positive: eff.amount >= 0 };
    case 'tech':
      return { text: `Tech ${sgn(eff.amount)}`, positive: eff.amount >= 0 };
    case 'relation':
      return { text: `Relations ${sgn(eff.amount)}`, positive: eff.amount >= 0 };
    case 'spawnUnit':
      return { text: `+${UNIT_CONFIG.stats[eff.unitType].label}`, positive: true };
    case 'weather':
      return { text: `Weather → ${COMBAT_CONFIG.weather[eff.weather].label}`, positive: true };
  }
}

export default function EventCardModal() {
  const current = useEventStore((s) => s.current);
  const chooseOption = useEventStore((s) => s.chooseOption);
  const dismiss = useEventStore((s) => s.dismiss);
  const subjectName = useWorldStore((s) =>
    current ? s.nations[current.subjectId]?.name : undefined,
  );

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, rotateX: -8 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[420px] overflow-hidden rounded-xl border bg-orbis-panelSolid shadow-neon-strong"
            style={{ borderColor: RARITY_META[current.event.rarity].color }}
          >
            {/* Rarity banner */}
            <div
              className="flex items-center justify-between px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.3em]"
              style={{
                color: RARITY_META[current.event.rarity].color,
                background: `${RARITY_META[current.event.rarity].color}1a`,
              }}
            >
              <span>{RARITY_META[current.event.rarity].label} Event</span>
              <span className="text-orbis-textDim">{subjectName}</span>
            </div>

            <div className="p-4">
              <div className="text-lg font-bold text-orbis-text text-glow">{current.event.title}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-orbis-textDim">{current.event.body}</p>

              <div className="mt-4 space-y-2">
                {current.event.choices.map((choice, i) => (
                  <button
                    key={i}
                    onClick={() => chooseOption(i)}
                    className="group w-full rounded-md border border-orbis-edge bg-black/30 px-3 py-2 text-left transition-colors hover:border-orbis-neon hover:bg-orbis-neon/10"
                  >
                    <div className="text-sm font-semibold text-orbis-text group-hover:text-orbis-neon">
                      {choice.label}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                      {choice.effects.map((eff, j) => {
                        const d = describeEffect(eff);
                        return (
                          <span
                            key={j}
                            className="text-[10px] font-semibold tabular-nums"
                            style={{ color: d.positive ? '#46e8a0' : '#ff4d5e' }}
                          >
                            {d.text}
                          </span>
                        );
                      })}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={dismiss}
                className="mt-3 w-full text-center text-[10px] uppercase tracking-widest text-orbis-textDim/70 hover:text-orbis-textDim"
              >
                Ignore this event
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
