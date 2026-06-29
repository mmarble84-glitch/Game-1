import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWorldStore } from '@/state/worldStore';
import { useSelectionStore } from '@/state/selectionStore';
import { allianceOf } from '@/engine/diplomacy';
import OverviewTab from '@/ui/nation/OverviewTab';
import MilitaryTab from '@/ui/nation/MilitaryTab';
import DiplomacyTab from '@/ui/nation/DiplomacyTab';
import TerritoryTab from '@/ui/nation/TerritoryTab';

type TabKey = 'overview' | 'military' | 'diplomacy' | 'territory';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'military', label: 'Military' },
  { key: 'diplomacy', label: 'Diplomacy' },
  { key: 'territory', label: 'Territory' },
];

/** Right contextual panel for the selected nation, with tabs. */
export default function NationPanel() {
  const selectedId = useSelectionStore((s) => s.selectedNationId);
  const nation = useWorldStore((s) => (selectedId ? s.nations[selectedId] : undefined));
  const alliances = useWorldStore((s) => s.alliances);
  const wars = useWorldStore((s) => s.wars);
  const [tab, setTab] = useState<TabKey>('overview');

  if (!nation) {
    return (
      <div className="pointer-events-auto w-[300px] rounded-lg border border-orbis-edge bg-orbis-panel p-3 shadow-neon backdrop-blur-sm">
        <div className="mb-1 text-[10px] uppercase tracking-[0.3em] text-orbis-neon">Nation</div>
        <div className="py-6 text-center text-sm text-orbis-textDim">
          Select a nation on the globe or from the list →
        </div>
      </div>
    );
  }

  const myAlliance = allianceOf(alliances, nation.id);
  const atWar = Object.values(wars).some(
    (w) => w.sideA.includes(nation.id) || w.sideB.includes(nation.id),
  );

  return (
    <div className="pointer-events-auto w-[300px] rounded-lg border border-orbis-edge bg-orbis-panel p-3 shadow-neon backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span
          className="h-5 w-5 shrink-0 rounded-sm border border-white/20 shadow-neon"
          style={{ background: nation.color }}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-bold text-orbis-text text-glow">{nation.name}</div>
          <div className="text-[10px] uppercase tracking-widest text-orbis-textDim">
            {nation.government}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          {myAlliance && (
            <span
              className="flex items-center gap-1 text-[9px] uppercase tracking-widest"
              style={{ color: myAlliance.color }}
            >
              <span className="h-2 w-2 rounded-sm" style={{ background: myAlliance.color }} /> Allied
            </span>
          )}
          {atWar && <span className="text-[9px] uppercase tracking-widest text-orbis-danger">⚔ At War</span>}
        </div>
      </div>

      {/* Tab bar */}
      <div className="mt-2 flex gap-1 border-b border-orbis-edge/50">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative px-1.5 pb-1.5 text-[10px] uppercase tracking-wider transition-colors ${
              tab === t.key ? 'text-orbis-neon' : 'text-orbis-textDim hover:text-orbis-text'
            }`}
          >
            {t.label}
            {tab === t.key && (
              <motion.span
                layoutId="nation-tab-underline"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-orbis-neon"
              />
            )}
          </button>
        ))}
      </div>

      {/* Active tab */}
      <div className="mt-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab + nation.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {tab === 'overview' && <OverviewTab nation={nation} />}
            {tab === 'military' && <MilitaryTab nation={nation} />}
            {tab === 'diplomacy' && <DiplomacyTab nation={nation} />}
            {tab === 'territory' && <TerritoryTab nation={nation} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
