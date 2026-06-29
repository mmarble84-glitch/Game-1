import { useState } from 'react';
import { motion } from 'framer-motion';
import { useEventStore } from '@/state/eventStore';
import { useUiStore } from '@/state/uiStore';
import { EVENT_DECK, RARITY_META } from '@/config/events';
import type { Nation } from '@/models/nation';

/** God-tool: force any specific event card onto the selected nation. */
export default function ForceEventModal({ subject, onClose }: { subject: Nation; onClose: () => void }) {
  const forceEvent = useEventStore((s) => s.forceEvent);
  const showToast = useUiStore((s) => s.showToast);
  const [query, setQuery] = useState('');

  const list = EVENT_DECK.filter((e) => e.title.toLowerCase().includes(query.trim().toLowerCase()));

  const onPick = (id: string) => {
    if (forceEvent(id, subject.id)) onClose();
    else showToast('Could not force event', 'error');
  };

  return (
    <motion.div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-[400px] flex-col rounded-xl border border-orbis-edge bg-orbis-panelSolid p-4 shadow-neon-strong"
      >
        <div className="text-sm font-bold uppercase tracking-[0.2em] text-orbis-neon text-glow">
          Force Event
        </div>
        <div className="mt-0.5 text-[10px] uppercase tracking-widest text-orbis-textDim">
          Applies to {subject.name}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events…"
          className="mt-2 w-full rounded-md border border-orbis-edge/70 bg-black/40 px-2 py-1 text-xs text-orbis-text focus:border-orbis-neon focus:outline-none"
        />
        <div className="mt-2 flex-1 overflow-y-auto">
          {list.map((e) => (
            <button
              key={e.id}
              onClick={() => onPick(e.id)}
              className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-white/5"
            >
              <span className="h-2 w-2 rounded-sm" style={{ background: RARITY_META[e.rarity].color }} />
              <span className="flex-1 text-orbis-text">{e.title}</span>
              <span className="text-[9px] uppercase tracking-widest" style={{ color: RARITY_META[e.rarity].color }}>
                {e.rarity}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-2 rounded-md border border-orbis-edge px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-orbis-textDim hover:text-orbis-text"
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}
