/**
 * Synthesized audio cues — short tones played on the player's explicit actions
 * (turn, event, battle, recruit, click). Web Audio only; no files, no autoplay.
 *
 * The AudioContext is created lazily on the first cue, which always originates
 * from a user click, so this satisfies browser autoplay policies. Sound is
 * gated by the settings store; nothing here touches game state.
 */

import { useSettingsStore } from '@/state/settingsStore';

export type Cue = 'turn' | 'event' | 'battle' | 'recruit' | 'click' | 'select' | 'error';

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

/** Per-cue tone: start/end frequency, waveform, duration, gain. */
const TONES: Record<Cue, { f0: number; f1: number; type: OscillatorType; dur: number; gain: number }> = {
  turn: { f0: 392, f1: 587, type: 'triangle', dur: 0.18, gain: 0.5 },
  event: { f0: 660, f1: 990, type: 'sine', dur: 0.22, gain: 0.45 },
  battle: { f0: 240, f1: 90, type: 'sawtooth', dur: 0.28, gain: 0.4 },
  recruit: { f0: 520, f1: 700, type: 'triangle', dur: 0.12, gain: 0.4 },
  click: { f0: 900, f1: 900, type: 'square', dur: 0.05, gain: 0.18 },
  select: { f0: 1040, f1: 1240, type: 'sine', dur: 0.07, gain: 0.22 },
  error: { f0: 200, f1: 160, type: 'square', dur: 0.16, gain: 0.3 },
};

/** Play a short cue, if sound is enabled in settings. */
export function playCue(cue: Cue): void {
  const { soundEnabled, volume } = useSettingsStore.getState();
  if (!soundEnabled || volume <= 0) return;
  const a = audio();
  if (!a) return;
  if (a.state === 'suspended') void a.resume();

  const t = TONES[cue];
  const now = a.currentTime;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = t.type;
  osc.frequency.setValueAtTime(t.f0, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, t.f1), now + t.dur);
  // Quick attack, smooth decay.
  const peak = t.gain * volume;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + t.dur);
  osc.connect(gain);
  gain.connect(a.destination);
  osc.start(now);
  osc.stop(now + t.dur + 0.02);
}
