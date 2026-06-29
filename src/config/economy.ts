/**
 * Tunable economy constants. The economy resolver (engine/economy.ts) reads
 * these; no tunable number is hard-coded in logic.
 *
 * The whole economy advances ONLY when the player clicks "Advance Turn".
 */

export const ECONOMY_CONFIG = {
  /** Base production per territory, per turn, before the stability factor. */
  base: {
    treasury: 8,
    industry: 4,
    energy: 5,
    food: 6,
    rareMaterials: 2,
  },

  /**
   * Fraction of a nation's industrial base converted to treasury income each
   * turn (taxation). Makes industrialised nations richer than the flat base.
   */
  taxRate: 0.02,

  /**
   * Stability factor: production = base × territoryCount × stabilityFactor.
   * factor = clamp(stability / reference, min, max).
   * At `reference` stability the factor is exactly 1.0.
   */
  stability: {
    reference: 70,
    minFactor: 0.25,
    maxFactor: 1.6,
  },

  /** Consequences of running a negative treasury (debt). */
  deficit: {
    /** Stability points lost per turn while treasury is below zero. */
    stabilityPenalty: 5,
  },
} as const;
