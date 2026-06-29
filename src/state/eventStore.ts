/**
 * Event store — holds the currently drawn event card and resolves the player's
 * choice. A card is created ONLY when the player clicks "Draw Event"; nothing
 * here fires on a timer.
 */

import { create } from 'zustand';
import type { GameEvent, EventContext } from '@/models/event';
import { EVENT_DECK, RARITY_META } from '@/config/events';
import { drawEvent as engineDraw } from '@/engine/events';
import { useWorldStore } from '@/state/worldStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useLogStore } from '@/state/logStore';
import { useUiStore } from '@/state/uiStore';

interface EventState {
  current: { event: GameEvent; subjectId: string } | null;
  /** Draw a weighted, eligible card for the focus nation. Returns true on a draw. */
  drawEvent: () => boolean;
  /** Resolve the chosen option: apply its effects, log, and clear the card. */
  chooseOption: (index: number) => void;
  /** God-tool: force a specific event onto a subject nation. */
  forceEvent: (eventId: string, subjectId: string) => boolean;
  /** Dismiss the card without applying any effect. */
  dismiss: () => void;
}

export const useEventStore = create<EventState>((set, get) => ({
  current: null,

  drawEvent: () => {
    const w = useWorldStore.getState();
    const nationIds = Object.keys(w.nations);
    if (nationIds.length === 0) return false;

    // Focus the selected nation, or a random one if none is selected.
    const selected = useSelectionStore.getState().selectedNationId;
    const subjectId =
      selected && w.nations[selected]
        ? selected
        : nationIds[Math.floor(Math.random() * nationIds.length)];

    const ctx: EventContext = {
      nations: w.nations,
      units: w.units,
      relations: w.relations,
      alliances: w.alliances,
      wars: w.wars,
      weather: w.weather,
      turn: w.turn,
      subjectId,
      subject: w.nations[subjectId],
    };

    const event = engineDraw(EVENT_DECK, ctx);
    if (!event) return false;
    set({ current: { event, subjectId } });
    return true;
  },

  chooseOption: (index) => {
    const cur = get().current;
    if (!cur) return;
    const choice = cur.event.choices[index];
    if (!choice) return;

    const { summary } = useWorldStore.getState().applyEventEffects(cur.subjectId, choice.effects);
    const subject = useWorldStore.getState().nations[cur.subjectId];
    const color = RARITY_META[cur.event.rarity].color;

    useLogStore.getState().add({
      turn: useWorldStore.getState().turn,
      kind: 'event',
      text: `${subject?.name ?? 'A nation'} — ${cur.event.title}: ${summary}`,
      color,
    });
    // Pulse a ring at the subject's capital where the event fired (cosmetic).
    if (subject) useUiStore.getState().addBattleRing(subject.capital.lat, subject.capital.lng, color);
    useUiStore.getState().showToast(`${cur.event.title} · ${summary}`);

    set({ current: null });
  },

  forceEvent: (eventId, subjectId) => {
    const event = EVENT_DECK.find((e) => e.id === eventId);
    const subject = useWorldStore.getState().nations[subjectId];
    if (!event || !subject) return false;
    set({ current: { event, subjectId } });
    return true;
  },

  dismiss: () => set({ current: null }),
}));
