/**
 * Diplomacy models: relations, alliances, wars.
 * Relations live in a flat map keyed by a canonical (sorted) pair key.
 */

export interface Alliance {
  id: string;
  name: string;
  /** Hex color; drives the glowing alliance arcs between member capitals. */
  color: string;
  memberIds: string[];
}

export interface War {
  id: string;
  sideA: string[];
  sideB: string[];
  startedTurn: number;
}

/** A single bilateral relation value, -100..100. */
export interface Relation {
  a: string;
  b: string;
  value: number;
}
