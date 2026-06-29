/**
 * Event-deck models. Events are drawn ONLY when the player clicks "Draw Event";
 * a card presents choices, and a chosen choice applies its Effect[] to the world.
 */

import type { Nation, Resources } from './nation';
import type { Unit, UnitType } from './unit';
import type { Alliance, War } from './diplomacy';
import type { WeatherType } from '@/config/combat';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

/** A tagged union of every effect an event choice can apply. */
export type Effect =
  | { kind: 'resource'; resource: keyof Resources; amount: number }
  | { kind: 'manpower'; amount: number }
  | { kind: 'stability'; amount: number }
  | { kind: 'tech'; amount: number }
  | { kind: 'relation'; amount: number; target?: 'randomOther' }
  | { kind: 'spawnUnit'; unitType: UnitType }
  | { kind: 'weather'; weather: WeatherType };

export interface EventChoice {
  label: string;
  description?: string;
  effects: Effect[];
}

/** Context handed to an event's condition + used to apply its effects. */
export interface EventContext {
  nations: Record<string, Nation>;
  units: Record<string, Unit>;
  relations: Record<string, number>;
  alliances: Record<string, Alliance>;
  wars: Record<string, War>;
  weather: WeatherType;
  turn: number;
  subjectId: string;
  subject: Nation;
}

export interface GameEvent {
  id: string;
  title: string;
  body: string;
  rarity: Rarity;
  /** Relative draw weight (higher = more common). */
  weight: number;
  /** Optional gate: the event is only eligible when this returns true. */
  condition?: (ctx: EventContext) => boolean;
  choices: EventChoice[];
}
