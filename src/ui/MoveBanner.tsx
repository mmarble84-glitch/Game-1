import { AnimatePresence, motion } from 'framer-motion';
import { useSelectionStore } from '@/state/selectionStore';

/** Banner shown while a unit is in move mode, prompting for a destination. */
export default function MoveBanner() {
  const moveMode = useSelectionStore((s) => s.moveMode);
  const setMoveMode = useSelectionStore((s) => s.setMoveMode);

  return (
    <AnimatePresence>
      {moveMode && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="pointer-events-auto flex items-center gap-3 rounded-lg border border-orbis-neon bg-orbis-panel px-4 py-2 text-xs uppercase tracking-widest text-orbis-neon shadow-neon-strong backdrop-blur-sm"
        >
          <span className="animate-orbis-pulse">◎ Move mode</span>
          <span className="text-orbis-textDim">click a destination within range</span>
          <button
            onClick={() => setMoveMode(false)}
            className="rounded border border-orbis-edge px-2 py-0.5 text-orbis-textDim hover:text-orbis-danger"
          >
            Esc · cancel
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
