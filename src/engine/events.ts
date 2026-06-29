/**
 * Pure event-deck logic: filter the deck by each card's condition, then draw
 * one card weighted by its `weight`. No state, no I/O. The draw only happens
 * when the player clicks "Draw Event"; this module never fires on its own.
 */

import type { EventContext, GameEvent } from '@/models/event';

/** Cards eligible to be drawn given the current world context. */
export function eligibleEvents(deck: GameEvent[], ctx: EventContext): GameEvent[] {
  return deck.filter((e) => !e.condition || e.condition(ctx));
}

/**
 * Weighted random pick from a list of events. `rng` defaults to Math.random and
 * is injectable for deterministic tests.
 */
export function weightedPick(events: GameEvent[], rng: () => number = Math.random): GameEvent | null {
  if (events.length === 0) return null;
  const total = events.reduce((s, e) => s + Math.max(0, e.weight), 0);
  if (total <= 0) return events[Math.floor(rng() * events.length)] ?? null;
  let roll = rng() * total;
  for (const e of events) {
    roll -= Math.max(0, e.weight);
    if (roll <= 0) return e;
  }
  return events[events.length - 1];
}

/** Draw one eligible, weighted card (or null if none qualify). */
export function drawEvent(
  deck: GameEvent[],
  ctx: EventContext,
  rng: () => number = Math.random,
): GameEvent | null {
  return weightedPick(eligibleEvents(deck, ctx), rng);
}
