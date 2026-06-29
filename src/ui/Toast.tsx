import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '@/state/uiStore';

/** Transient status message (cosmetic UI; not game state). */
export default function Toast() {
  const toast = useUiStore((s) => s.toast);
  const kind = useUiStore((s) => s.toastKind);
  const color = kind === 'error' ? '#ff4d5e' : '#36e0ff';

  return (
    <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="rounded-md border bg-orbis-panel px-4 py-2 text-xs font-semibold uppercase tracking-widest shadow-neon backdrop-blur-sm"
            style={{ borderColor: color, color }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
