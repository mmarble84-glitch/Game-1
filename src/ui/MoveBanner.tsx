import { AnimatePresence, motion } from 'framer-motion';
import { useSelectionStore } from '@/state/selectionStore';

/** Banner shown while a unit is in move or attack targeting mode. */
export default function MoveBanner() {
  const moveMode = useSelectionStore((s) => s.moveMode);
  const attackMode = useSelectionStore((s) => s.attackMode);
  const setMoveMode = useSelectionStore((s) => s.setMoveMode);
  const setAttackMode = useSelectionStore((s) => s.setAttackMode);

  const active = moveMode || attackMode;
  const isAttack = attackMode;
  const color = isAttack ? '#ff4d5e' : '#36e0ff';

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="pointer-events-auto flex items-center gap-3 rounded-lg border bg-orbis-panel px-4 py-2 text-xs uppercase tracking-widest shadow-neon-strong backdrop-blur-sm"
          style={{ borderColor: color, color }}
        >
          <span className="animate-orbis-pulse">{isAttack ? '⚔ Attack mode' : '◎ Move mode'}</span>
          <span className="text-orbis-textDim">
            {isAttack ? 'click an enemy unit' : 'click a destination within range'}
          </span>
          <button
            onClick={() => (isAttack ? setAttackMode(false) : setMoveMode(false))}
            className="rounded border border-orbis-edge px-2 py-0.5 text-orbis-textDim hover:text-orbis-danger"
          >
            Esc · cancel
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
