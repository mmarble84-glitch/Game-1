import { AnimatePresence, motion } from 'framer-motion';
import { useSettingsStore } from '@/state/settingsStore';
import { playCue } from '@/audio/cues';

function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-1.5">
      <span className="text-sm text-orbis-text">
        {label}
        {hint && <span className="ml-2 text-[10px] text-orbis-textDim">{hint}</span>}
      </span>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-5 w-9 rounded-full border transition-colors ${
          value ? 'border-orbis-neon bg-orbis-neon/30' : 'border-orbis-edge bg-black/40'
        }`}
      >
        <span
          className="absolute top-0.5 h-3.5 w-3.5 rounded-full bg-orbis-neon transition-all"
          style={{ left: value ? '18px' : '2px' }}
        />
      </button>
    </label>
  );
}

/** Settings modal: sound, motion, and globe display preferences. */
export default function SettingsModal() {
  const open = useSettingsStore((s) => s.settingsOpen);
  const setOpen = useSettingsStore((s) => s.setSettingsOpen);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const volume = useSettingsStore((s) => s.volume);
  const setVolume = useSettingsStore((s) => s.setVolume);
  const autoRotate = useSettingsStore((s) => s.autoRotate);
  const setAutoRotate = useSettingsStore((s) => s.setAutoRotate);
  const showArcs = useSettingsStore((s) => s.showArcs);
  const setShowArcs = useSettingsStore((s) => s.setShowArcs);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[380px] rounded-xl border border-orbis-edge bg-orbis-panelSolid p-4 shadow-neon-strong"
          >
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-orbis-neon text-glow">
              Settings
            </div>

            <div className="mt-3 divide-y divide-orbis-edge/40">
              <Toggle
                label="Sound cues"
                value={soundEnabled}
                onChange={(v) => {
                  setSoundEnabled(v);
                  if (v) playCue('select');
                }}
                hint="on your actions"
              />
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-orbis-text">Volume</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  onMouseUp={() => playCue('click')}
                  className="w-40 accent-orbis-neon"
                />
              </div>
              <Toggle label="Globe auto-rotate" value={autoRotate} onChange={setAutoRotate} hint="cosmetic" />
              <Toggle label="Diplomacy arcs" value={showArcs} onChange={setShowArcs} />
            </div>

            <div className="mt-3 rounded-md border border-orbis-good/30 bg-orbis-good/5 px-3 py-2 text-[10px] uppercase tracking-widest text-orbis-good">
              ● Manual control · the world only changes on your clicks
            </div>

            <div className="mt-3 text-[10px] uppercase tracking-widest text-orbis-textDim">
              Shortcuts: Esc — step back / cancel
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-3 w-full rounded-md border border-orbis-edge px-3 py-2 text-xs font-bold uppercase tracking-widest text-orbis-textDim hover:text-orbis-neon"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
