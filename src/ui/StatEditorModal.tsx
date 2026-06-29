import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWorldStore } from '@/state/worldStore';
import { useUiStore } from '@/state/uiStore';
import type { Doctrine, Nation } from '@/models/nation';

const DOCTRINES: Doctrine[] = ['balanced', 'armor', 'air', 'naval', 'guerilla'];

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="text-[9px] uppercase tracking-widest text-orbis-textDim">
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-0.5 w-full rounded border border-orbis-edge/70 bg-black/40 px-1.5 py-1 text-xs tabular-nums text-orbis-text focus:border-orbis-neon focus:outline-none"
      />
    </label>
  );
}

/** God-mode editor for any of a nation's stats. */
export default function StatEditorModal({ nation, onClose }: { nation: Nation; onClose: () => void }) {
  const editNation = useWorldStore((s) => s.editNation);
  const showToast = useUiStore((s) => s.showToast);

  const [name, setName] = useState(nation.name);
  const [color, setColor] = useState(nation.color);
  const [stability, setStability] = useState(nation.stability);
  const [techLevel, setTechLevel] = useState(nation.military.techLevel);
  const [doctrine, setDoctrine] = useState<Doctrine>(nation.military.doctrine);
  const [res, setRes] = useState({ ...nation.resources });
  const [mp, setMp] = useState({ ...nation.manpower });

  const onApply = () => {
    editNation(nation.id, {
      name,
      color,
      stability,
      resources: res,
      manpower: mp,
      military: { doctrine, techLevel },
    });
    showToast(`Edited ${name}`);
    onClose();
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
        className="w-[420px] max-h-[86vh] overflow-y-auto rounded-xl border border-orbis-amber/50 bg-orbis-panelSolid p-4 shadow-neon-strong"
      >
        <div className="text-sm font-bold uppercase tracking-[0.2em] text-orbis-amber text-glow">
          Edit Stats · {nation.name}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-[9px] uppercase tracking-widest text-orbis-textDim">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-0.5 w-full rounded border border-orbis-edge/70 bg-black/40 px-1.5 py-1 text-xs text-orbis-text focus:border-orbis-neon focus:outline-none"
            />
          </label>
          <label className="text-[9px] uppercase tracking-widest text-orbis-textDim">
            Color
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="mt-0.5 h-[26px] w-full cursor-pointer rounded border border-orbis-edge/70 bg-transparent"
            />
          </label>
        </div>

        <div className="mt-3 text-[10px] uppercase tracking-[0.25em] text-orbis-neonDim">Resources</div>
        <div className="mt-1 grid grid-cols-3 gap-2">
          <NumField label="Treasury" value={res.treasury} onChange={(v) => setRes({ ...res, treasury: v })} />
          <NumField label="Industry" value={res.industry} onChange={(v) => setRes({ ...res, industry: v })} />
          <NumField label="Energy" value={res.energy} onChange={(v) => setRes({ ...res, energy: v })} />
          <NumField label="Food" value={res.food} onChange={(v) => setRes({ ...res, food: v })} />
          <NumField label="Rare" value={res.rareMaterials} onChange={(v) => setRes({ ...res, rareMaterials: v })} />
        </div>

        <div className="mt-3 text-[10px] uppercase tracking-[0.25em] text-orbis-neonDim">Manpower</div>
        <div className="mt-1 grid grid-cols-3 gap-2">
          <NumField label="Available" value={mp.available} onChange={(v) => setMp({ ...mp, available: v })} />
          <NumField label="Pool" value={mp.pool} onChange={(v) => setMp({ ...mp, pool: v })} />
          <NumField label="Recruit/Turn" value={mp.recruitRate} onChange={(v) => setMp({ ...mp, recruitRate: v })} />
        </div>

        <div className="mt-3 text-[10px] uppercase tracking-[0.25em] text-orbis-neonDim">Government & Military</div>
        <div className="mt-1 grid grid-cols-3 gap-2">
          <NumField label="Stability" value={stability} onChange={setStability} />
          <NumField label="Tech (1-10)" value={techLevel} onChange={setTechLevel} />
          <label className="text-[9px] uppercase tracking-widest text-orbis-textDim">
            Doctrine
            <select
              value={doctrine}
              onChange={(e) => setDoctrine(e.target.value as Doctrine)}
              className="mt-0.5 w-full rounded border border-orbis-edge/70 bg-black/40 px-1 py-1 text-xs text-orbis-text focus:border-orbis-neon focus:outline-none"
            >
              {DOCTRINES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-orbis-edge px-3 py-2 text-xs font-bold uppercase tracking-widest text-orbis-textDim hover:text-orbis-text"
          >
            Cancel
          </button>
          <button
            onClick={onApply}
            className="flex-1 rounded-md border border-orbis-amber bg-orbis-amber/15 px-3 py-2 text-xs font-bold uppercase tracking-widest text-orbis-amber shadow-neon hover:bg-orbis-amber/30"
          >
            Apply
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
