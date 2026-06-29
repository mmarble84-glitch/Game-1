/**
 * Sandbox store — which god-tool is active and its working selection.
 * The tool decides what a click on the globe does; nothing here mutates the
 * world on its own.
 */

import { create } from 'zustand';
import type { UnitType } from '@/models/unit';

export type SandboxTool = 'none' | 'formNation' | 'transfer' | 'spawnUnit';

interface SandboxState {
  tool: SandboxTool;
  /** ISO keys gathered while forming a new nation. */
  formSelection: string[];
  /** Unit type to drop with the spawn tool. */
  spawnType: UnitType;

  setTool: (tool: SandboxTool) => void;
  toggleFormISO: (iso: string) => void;
  clearForm: () => void;
  setSpawnType: (t: UnitType) => void;
}

export const useSandboxStore = create<SandboxState>((set) => ({
  tool: 'none',
  formSelection: [],
  spawnType: 'infantry',

  setTool: (tool) => set((s) => ({ tool, formSelection: tool === 'formNation' ? s.formSelection : [] })),
  toggleFormISO: (iso) =>
    set((s) => ({
      formSelection: s.formSelection.includes(iso)
        ? s.formSelection.filter((x) => x !== iso)
        : [...s.formSelection, iso],
    })),
  clearForm: () => set({ formSelection: [] }),
  setSpawnType: (spawnType) => set({ spawnType }),
}));
