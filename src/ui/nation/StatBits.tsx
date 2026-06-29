import { signedCommas } from '@/ui/format';

/** A labelled value tile, optionally with a last-turn delta. */
export function Stat({
  label,
  value,
  accent,
  delta,
}: {
  label: string;
  value: string;
  accent?: string;
  delta?: number;
}) {
  return (
    <div className="rounded-md border border-orbis-edge/60 bg-black/30 px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-widest text-orbis-textDim">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-sm font-semibold tabular-nums" style={{ color: accent ?? '#cfe8ff' }}>
          {value}
        </span>
        {delta !== undefined && delta !== 0 && (
          <span
            className="text-[10px] font-semibold tabular-nums"
            style={{ color: delta >= 0 ? '#46e8a0' : '#ff4d5e' }}
          >
            {signedCommas(delta)}
          </span>
        )}
      </div>
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 mt-3 text-[10px] uppercase tracking-[0.25em] text-orbis-neonDim">
      {children}
    </div>
  );
}

/** 0..100 meter (e.g. stability). Cosmetic bar, no animation loop. */
export function Meter({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/40">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
      />
    </div>
  );
}

export function stabilityColor(s: number): string {
  if (s >= 70) return '#46e8a0';
  if (s >= 45) return '#ffb347';
  return '#ff4d5e';
}
