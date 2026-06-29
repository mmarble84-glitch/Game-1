import type { Nation } from '@/models/nation';
import { SectionTitle } from '@/ui/nation/StatBits';

/** Territory tab: the ISO territories this nation owns. */
export default function TerritoryTab({ nation }: { nation: Nation }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-orbis-neonDim">
        <span>Territories</span>
        <span className="tabular-nums text-orbis-textDim">{nation.territory.length}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {nation.territory.map((iso) => (
          <span
            key={iso}
            className="rounded border border-orbis-edge/70 bg-black/30 px-1.5 py-0.5 text-[10px] tabular-nums text-orbis-text"
          >
            {iso}
          </span>
        ))}
      </div>
      <SectionTitle>Capital</SectionTitle>
      <div className="text-[11px] tabular-nums text-orbis-textDim">
        {nation.capital.lat.toFixed(2)}°, {nation.capital.lng.toFixed(2)}°
      </div>
    </div>
  );
}
