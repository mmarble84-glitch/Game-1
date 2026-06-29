/**
 * Tunable constants for nation derivation and on-globe nation visuals.
 * No logic here — just numbers the engine/rendering read.
 */

export const NATION_CONFIG = {
  /**
   * Military rating is DERIVED (engine/nations.ts) as a weighted blend of
   * tech, mobilisable manpower, industrial base, and stability. Result 1..100.
   */
  rating: {
    techWeight: 4, // techLevel(1..10) * 4  => up to 40
    manpowerWeight: 0.004, // manpower.pool * 0.004
    industryWeight: 0.002, // resources.industry * 0.002
    stabilityWeight: 0.2, // stability(0..100) * 0.2 => up to 20
    min: 1,
    max: 100,
  },

  /** Translucency of the country fill on the globe, by selection state. */
  fill: {
    /** Owned, not selected/hovered. */
    base: 0.5,
    /** Hovered country. */
    hover: 0.62,
    /** A country belonging to the selected nation. */
    selected: 0.78,
    /** Lifted-polygon side walls. */
    side: 0.25,
  },

  /** How far to brighten the selected nation's glowing borders toward white. */
  selectedBorderBrighten: 0.5,
} as const;
