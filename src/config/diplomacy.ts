/**
 * Tunable diplomacy constants. Relations change ONLY via the player's actions
 * (or events) — never on a timer. These are the amounts those actions apply.
 */

export const DIPLOMACY_CONFIG = {
  relation: {
    min: -100,
    max: 100,
    /** Improve / worsen step from the Diplomacy tab buttons. */
    step: 12,
    /** Relation set between principals when war is declared. */
    onDeclareWar: -100,
    /** Relation set between principals when peace is signed. */
    onPeace: 10,
    /** Relation set between new allies. */
    onAlly: 75,
  },

  /** Display bands for a relation value. */
  bands: [
    { min: 60, label: 'Allied', color: '#46e8a0' },
    { min: 20, label: 'Friendly', color: '#9be86a' },
    { min: -19, label: 'Neutral', color: '#7d97b5' },
    { min: -59, label: 'Tense', color: '#ffb347' },
    { min: -100, label: 'Hostile', color: '#ff4d5e' },
  ],

  /** Palette cycled through when auto-coloring new alliances. */
  alliancePalette: ['#36e0ff', '#46e8a0', '#ffb347', '#c97bff', '#ff6ec7', '#7bdcff', '#a3ff6e'],

  /** War (conflict) arc color gradient. */
  warArcColor: ['#ff4d5e', '#ff8a4d'],
} as const;
