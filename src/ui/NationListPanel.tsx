import { useMemo, useState } from 'react';
import { useWorldStore } from '@/state/worldStore';
import { useSelectionStore } from '@/state/selectionStore';

/**
 * Left panel: searchable list of all nations.
 * Clicking a nation selects it (which flies the camera to its capital — handled
 * by GlobeView reacting to the selection store).
 */
export default function NationListPanel() {
  const nations = useWorldStore((s) => s.nations);
  const selectedId = useSelectionStore((s) => s.selectedNationId);
  const selectNation = useSelectionStore((s) => s.selectNation);

  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const all = Object.values(nations).sort((a, b) => a.name.localeCompare(b.name));
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((n) => n.name.toLowerCase().includes(q));
  }, [nations, query]);

  return (
    <div className="pointer-events-auto flex w-[240px] flex-col rounded-lg border border-orbis-edge bg-orbis-panel shadow-neon backdrop-blur-sm">
      {/* Header + search */}
      <div className="border-b border-orbis-edge/60 p-2.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.3em] text-orbis-neon">Nations</span>
          <span className="text-[9px] tabular-nums text-orbis-textDim">{list.length}</span>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="w-full rounded-md border border-orbis-edge/70 bg-black/40 px-2 py-1 text-xs text-orbis-text placeholder:text-orbis-textDim/60 focus:border-orbis-neon focus:outline-none focus:shadow-neon"
        />
      </div>

      {/* List */}
      <div className="max-h-[46vh] overflow-y-auto py-1">
        {list.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-orbis-textDim">No matches</div>
        ) : (
          list.map((n) => {
            const active = n.id === selectedId;
            return (
              <button
                key={n.id}
                onClick={() => selectNation(n.id)}
                className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors ${
                  active ? 'bg-orbis-neon/15' : 'hover:bg-white/5'
                }`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-sm border border-white/20"
                  style={{ background: n.color }}
                />
                <span
                  className={`flex-1 truncate text-xs ${
                    active ? 'font-semibold text-orbis-neon' : 'text-orbis-text'
                  }`}
                >
                  {n.name}
                </span>
                <span className="text-[10px] tabular-nums text-orbis-textDim">
                  {n.military.rating}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
