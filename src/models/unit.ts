/**
 * Unit model + the unit-type enum.
 * A Unit is a stack of forces the player raises, moves, and (later) fights with.
 */

import type { LatLng } from './geo';

export type UnitType =
  | 'infantry'
  | 'armor'
  | 'artillery'
  | 'antiAir'
  | 'antiTank'
  | 'fighter'
  | 'bomber'
  | 'navy'
  | 'carrier'
  | 'special';

/** Broad domain a unit operates in (drives terrain/combat rules later). */
export type UnitDomain = 'land' | 'air' | 'sea';

export interface Unit {
  id: string;
  ownerId: string;
  type: UnitType;
  pos: LatLng;
  /** 0..100 — HP of the stack. */
  strength: number;
  /** 0..100 — morale/cohesion; when it breaks the stack retreats/routs. */
  organization: number;
  /** 0..100 — combat experience, grows with battles. */
  experience: number;
  /** 0..100 — tiredness; rises with movement, recovers on turn advance. */
  fatigue: number;
  /** 0..100 — logistics; drained by movement, replenished when resting. */
  supply: number;
  /** Dug-in: set by Fortify, cleared by moving. Grants a defensive combat bonus. */
  fortified: boolean;
  /** Whether this unit has already used its action this turn. */
  movedThisTurn: boolean;
}
