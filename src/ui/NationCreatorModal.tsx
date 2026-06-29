import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useWorldStore } from '@/state/worldStore';
import { useSandboxStore } from '@/state/sandboxStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useUiStore } from '@/state/uiStore';
import { useLogStore } from '@/state/logStore';

const GOVERNMENTS = [
  'Republic',
  'Federal Republic',
  'Constitutional Monarchy',
  'Parliamentary Republic',
  'Presidential Republic',
  'Federation',
  'Provisional Government',
];

const SWATCHES = ['#36e0ff', '#46e8a0', '#ffb347', '#c97bff', '#ff6ec7', '#ff4d5e', '#9be86a', '#7bdcff'];

/** Nation Creator: name a new nation carved from the gathered territories. */
export default function NationCreatorModal({ onClose }: { onClose: () => void }) {
  const territory = useSandboxStore((s) => s.formSelection);
  const setTool = useSandboxStore((s) => s.setTool);
  const clearForm = useSandboxStore((s) => s.clearForm);
  const formNation = useWorldStore((s) => s.formNation);
  const selectNation = useSelectionStore((s) => s.selectNation);
  const showToast = useUiStore((s) => s.showToast);
  const addLog = useLogStore((s) => s.add);
  const turn = useWorldStore((s) => s.turn);

  const [name, setName] = useState('New Republic');
  const [color, setColor] = useState(SWATCHES[Math.floor(Math.random() * SWATCHES.length)]);
  const [government, setGovernment] = useState(GOVERNMENTS[0]);

  const canCreate = useMemo(() => territory.length > 0 && name.trim().length > 0, [territory, name]);

  const onCreate = () => {
    const res = formNation({ name: name.trim(), color, government, territory });
    if (res.ok && res.nationId) {
      addLog({ turn, kind: 'system', text: `Nation formed: ${name.trim()} (${territory.length} territories)`, color });
      showToast(`Formed ${name.trim()}`);
      clearForm();
      setTool('none');
      selectNation(res.nationId);
      onClose();
    } else {
      showToast(res.reason ?? 'Cannot form nation', 'error');
    }
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
        className="w-[400px] rounded-xl border border-orbis-neon/50 bg-orbis-panelSolid p-4 shadow-neon-strong"
      >
        <div className="text-sm font-bold uppercase tracking-[0.2em] text-orbis-neon text-glow">
          Form Nation
        </div>
        <div className="mt-0.5 text-[10px] uppercase tracking-widest text-orbis-textDim">
          {territory.length} territor{territory.length === 1 ? 'y' : 'ies'} selected
        </div>

        <label className="mt-3 block text-[10px] uppercase tracking-widest text-orbis-textDim">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-orbis-edge/70 bg-black/40 px-2 py-1.5 text-sm text-orbis-text focus:border-orbis-neon focus:outline-none"
          />
        </label>

        <div className="mt-3 text-[10px] uppercase tracking-widest text-orbis-textDim">Color</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {SWATCHES.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-6 w-6 rounded-sm border-2 ${color === c ? 'border-white' : 'border-transparent'}`}
              style={{ background: c }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-6 w-8 cursor-pointer rounded-sm border border-orbis-edge bg-transparent"
          />
        </div>

        <label className="mt-3 block text-[10px] uppercase tracking-widest text-orbis-textDim">
          Government
          <select
            value={government}
            onChange={(e) => setGovernment(e.target.value)}
            className="mt-1 w-full rounded-md border border-orbis-edge/70 bg-black/40 px-2 py-1.5 text-sm text-orbis-text focus:border-orbis-neon focus:outline-none"
          >
            {GOVERNMENTS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-orbis-edge px-3 py-2 text-xs font-bold uppercase tracking-widest text-orbis-textDim hover:text-orbis-text"
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={!canCreate}
            className="flex-1 rounded-md border border-orbis-neon bg-orbis-neon/15 px-3 py-2 text-xs font-bold uppercase tracking-widest text-orbis-neon shadow-neon hover:bg-orbis-neon/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Create Nation
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
