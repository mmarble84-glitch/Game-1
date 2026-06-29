import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSandboxStore, type SandboxTool } from '@/state/sandboxStore';
import { useWorldStore } from '@/state/worldStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useUiStore } from '@/state/uiStore';
import { UNIT_CONFIG, UNIT_ORDER } from '@/config/units';
import { COMBAT_CONFIG, type WeatherType } from '@/config/combat';
import type { UnitType } from '@/models/unit';
import NationCreatorModal from '@/ui/NationCreatorModal';
import StatEditorModal from '@/ui/StatEditorModal';
import ForceEventModal from '@/ui/ForceEventModal';

const WEATHER_TYPES = Object.keys(COMBAT_CONFIG.weather) as WeatherType[];

function ToolButton({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-md border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
        active
          ? 'border-orbis-amber bg-orbis-amber/20 text-orbis-amber shadow-neon'
          : 'border-orbis-edge text-orbis-textDim hover:border-orbis-neon hover:text-orbis-neon'
      }`}
    >
      {children}
    </button>
  );
}

/** Bottom god-mode toolbar: form nations, transfer land, spawn units, edit
 *  stats, force events, and set the weather — all manual. */
export default function SandboxToolbar() {
  const tool = useSandboxStore((s) => s.tool);
  const setTool = useSandboxStore((s) => s.setTool);
  const formSelection = useSandboxStore((s) => s.formSelection);
  const spawnType = useSandboxStore((s) => s.spawnType);
  const setSpawnType = useSandboxStore((s) => s.setSpawnType);

  const weather = useWorldStore((s) => s.weather);
  const setWeather = useWorldStore((s) => s.setWeather);
  const selectedId = useSelectionStore((s) => s.selectedNationId);
  const nation = useWorldStore((s) => (selectedId ? s.nations[selectedId] : undefined));
  const showToast = useUiStore((s) => s.showToast);

  const [modal, setModal] = useState<null | 'create' | 'stats' | 'force'>(null);

  const toggle = (t: SandboxTool) => setTool(tool === t ? 'none' : t);

  return (
    <>
      <div className="pointer-events-auto flex max-w-[96vw] flex-wrap items-center justify-center gap-1.5 rounded-lg border border-orbis-amber/40 bg-orbis-panel px-2.5 py-1.5 shadow-neon backdrop-blur-sm">
        <span className="mr-1 text-[9px] font-bold uppercase tracking-[0.25em] text-orbis-amber">God</span>

        <ToolButton active={tool === 'formNation'} onClick={() => toggle('formNation')} title="Click countries to gather them into a new nation">
          Form Nation
        </ToolButton>

        {tool === 'formNation' && (
          <button
            onClick={() => (formSelection.length ? setModal('create') : showToast('Click some countries first', 'error'))}
            className="rounded-md border border-orbis-neon bg-orbis-neon/15 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-orbis-neon hover:bg-orbis-neon/30"
          >
            Create ({formSelection.length})
          </button>
        )}

        <ToolButton active={tool === 'transfer'} onClick={() => toggle('transfer')} title="Click a country to give it to the selected nation">
          Transfer
        </ToolButton>

        <ToolButton active={tool === 'spawnUnit'} onClick={() => toggle('spawnUnit')} title="Click anywhere to spawn a unit for the selected nation">
          Spawn
        </ToolButton>
        {tool === 'spawnUnit' && (
          <select
            value={spawnType}
            onChange={(e) => setSpawnType(e.target.value as UnitType)}
            className="rounded border border-orbis-edge/70 bg-black/40 px-1 py-1 text-[10px] text-orbis-text focus:border-orbis-neon focus:outline-none"
          >
            {UNIT_ORDER.map((t) => (
              <option key={t} value={t}>
                {UNIT_CONFIG.stats[t].label}
              </option>
            ))}
          </select>
        )}

        <div className="mx-0.5 h-5 w-px bg-orbis-edge/60" />

        <ToolButton
          active={false}
          onClick={() => (nation ? setModal('stats') : showToast('Select a nation first', 'error'))}
          title="Edit any of the selected nation's stats"
        >
          Edit Stats
        </ToolButton>
        <ToolButton
          active={false}
          onClick={() => (nation ? setModal('force') : showToast('Select a nation first', 'error'))}
          title="Force a specific event onto the selected nation"
        >
          Force Event
        </ToolButton>

        <div className="mx-0.5 h-5 w-px bg-orbis-edge/60" />

        <label className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-orbis-textDim">
          Weather
          <select
            value={weather}
            onChange={(e) => setWeather(e.target.value as WeatherType)}
            className="rounded border border-orbis-edge/70 bg-black/40 px-1 py-1 text-[10px] text-orbis-text focus:border-orbis-neon focus:outline-none"
          >
            {WEATHER_TYPES.map((w) => (
              <option key={w} value={w}>
                {COMBAT_CONFIG.weather[w].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <AnimatePresence>
        {modal === 'create' && <NationCreatorModal onClose={() => setModal(null)} />}
        {modal === 'stats' && nation && <StatEditorModal nation={nation} onClose={() => setModal(null)} />}
        {modal === 'force' && nation && <ForceEventModal subject={nation} onClose={() => setModal(null)} />}
      </AnimatePresence>
    </>
  );
}
