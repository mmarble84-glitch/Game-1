/**
 * Log store — the running combat / event / diplomacy / system log shown in the
 * bottom ticker. Entries are appended only by explicit player actions and the
 * manual turn resolution. Combat entries carry the full CombatResult so the log
 * can expand the entire modifier breakdown on click.
 */

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { CombatResult } from '@/engine/combat';

export type LogKind = 'combat' | 'event' | 'diplomacy' | 'system';

export interface LogEntry {
  id: string;
  turn: number;
  kind: LogKind;
  text: string;
  /** Accent color (e.g. winner's nation color for combat). */
  color?: string;
  /** Full combat detail for the expandable breakdown (combat entries only). */
  combat?: CombatResult;
}

interface LogState {
  entries: LogEntry[];
  add: (entry: Omit<LogEntry, 'id'>) => void;
  clear: () => void;
}

const MAX_ENTRIES = 200;

export const useLogStore = create<LogState>((set) => ({
  entries: [],
  add: (entry) =>
    set((s) => ({
      entries: [{ id: nanoid(6), ...entry }, ...s.entries].slice(0, MAX_ENTRIES),
    })),
  clear: () => set({ entries: [] }),
}));
