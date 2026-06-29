import { useWorldStore } from '@/state/worldStore';
import type { Nation } from '@/models/nation';
import { commas, compact } from '@/ui/format';
import { Meter, SectionTitle, Stat, stabilityColor } from '@/ui/nation/StatBits';

/** Overview tab: stability, military summary, manpower, resources (with deltas). */
export default function OverviewTab({ nation }: { nation: Nation }) {
  const report = useWorldStore((s) => s.lastReports[nation.id]);
  const r = nation.resources;
  const m = nation.manpower;
  const inc = report?.income;

  return (
    <div>
      {/* Stability */}
      <SectionTitle>Stability</SectionTitle>
      <div className="flex items-center gap-2">
        <Meter value={nation.stability} color={stabilityColor(nation.stability)} />
        <span
          className="w-9 text-right text-xs font-semibold tabular-nums"
          style={{ color: stabilityColor(nation.stability) }}
        >
          {nation.stability}
        </span>
        {report && report.stabilityChange !== 0 && (
          <span
            className="text-[10px] font-semibold tabular-nums"
            style={{ color: report.stabilityChange >= 0 ? '#46e8a0' : '#ff4d5e' }}
          >
            {report.stabilityChange > 0 ? '+' : ''}
            {report.stabilityChange}
          </span>
        )}
      </div>

      {/* Military summary */}
      <SectionTitle>Military</SectionTitle>
      <div className="grid grid-cols-3 gap-1.5">
        <Stat label="Rating" value={String(nation.military.rating)} accent="#36e0ff" />
        <Stat label="Doctrine" value={nation.military.doctrine} />
        <Stat label="Tech" value={`${nation.military.techLevel}/10`} />
      </div>

      {/* Manpower */}
      <SectionTitle>Manpower</SectionTitle>
      <div className="grid grid-cols-3 gap-1.5">
        <Stat label="Available" value={compact(m.available)} accent="#46e8a0" delta={report?.manpowerGain} />
        <Stat label="Pool" value={compact(m.pool)} />
        <Stat label="Recruit / turn" value={compact(m.recruitRate)} />
      </div>

      {/* Resources */}
      <SectionTitle>Resources</SectionTitle>
      <div className="grid grid-cols-2 gap-1.5">
        <Stat label="Treasury" value={commas(r.treasury)} accent="#ffb347" delta={report?.netTreasury} />
        <Stat label="Industry" value={commas(r.industry)} delta={inc?.industry} />
        <Stat label="Energy" value={commas(r.energy)} delta={inc?.energy} />
        <Stat label="Food" value={commas(r.food)} delta={inc?.food} />
        <Stat label="Rare Materials" value={commas(r.rareMaterials)} delta={inc?.rareMaterials} />
      </div>
    </div>
  );
}
