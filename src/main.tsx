import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useWorldStore } from '@/state/worldStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useCombatStore } from '@/state/combatStore';
import { useLogStore } from '@/state/logStore';
import { useUiStore } from '@/state/uiStore';
import { useEventStore } from '@/state/eventStore';

// Dev-only: expose the stores for debugging / automated checks. Stripped from
// production builds (import.meta.env.DEV is false there). Never used by game logic.
if (import.meta.env.DEV) {
  (window as unknown as { __ORBIS__: unknown }).__ORBIS__ = {
    world: useWorldStore,
    selection: useSelectionStore,
    combat: useCombatStore,
    log: useLogStore,
    ui: useUiStore,
    event: useEventStore,
  };
}

// ORBIS entry point. Pure rendering bootstrap — no game state is mutated here.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
