/**
 * Globe visual configuration — ALL tunable rendering constants for the 3D Earth.
 * Nothing here is game logic; these are cosmetic/camera knobs only.
 *
 * Referenced by /src/globe/GlobeView.tsx.
 */

export const GLOBE_CONFIG = {
  /**
   * Globe surface textures.
   *
   * By default ORBIS builds a holographic dark-earth texture PROCEDURALLY in the
   * browser (see /src/globe/proceduralTexture.ts) so the app always renders with
   * zero binary assets and works fully offline.
   *
   * To use real image textures instead, drop files in /public/textures and set
   * these paths to a non-empty string (e.g. '/textures/earth-dark.jpg').
   * An empty string means "use the procedural holographic surface".
   */
  textures: {
    earth: '', // '' => procedural holographic surface
    bump: '', // '' => no bump map (flat hologram)
    /** Solid fallback color used as the base material tint. Deep space blue. */
    fallbackColor: '#0a1626',
  },

  /** Atmosphere glow around the planet (showAtmosphere). Cosmetic only. */
  atmosphere: {
    show: true,
    color: '#36e0ff', // neon cyan halo
    altitude: 0.18, // thickness of the glow shell
  },

  /** Background: a starfield is generated procedurally; set `image` to override. */
  background: {
    image: '', // '' => procedural starfield over the solid color
    color: '#05080f',
  },

  /** Country polygon styling (the glowing colored landmasses). */
  polygons: {
    /** Translucent cap fill for an unselected/unowned country. */
    capColor: 'rgba(28, 58, 94, 0.35)',
    /** Brighter glowing border stroke. */
    strokeColor: '#36e0ff',
    /** Side wall color when a polygon is lifted off the globe. */
    sideColor: 'rgba(54, 224, 255, 0.15)',
    /** Resting altitude of every country (flush-ish to the surface). */
    baseAltitude: 0.006,
    /** Hovered country lifts to this altitude. Cosmetic feedback only. */
    hoverAltitude: 0.05,
    /** Selected country lifts to this altitude. */
    selectedAltitude: 0.08,
    /** Hover highlight cap fill. */
    hoverCapColor: 'rgba(54, 224, 255, 0.45)',
    /** Selected cap fill. */
    selectedCapColor: 'rgba(255, 179, 71, 0.45)',
    /** Smooth altitude transition time (ms) — purely a visual tween. */
    transitionMs: 350,
  },

  /** OrbitControls / camera behavior. */
  controls: {
    /** AUTO-ROTATE IS OFF BY DEFAULT — manual control only. A toggle may flip it
     *  for cosmetic spin, but it never advances or mutates any game state. */
    autoRotate: false,
    autoRotateSpeed: 0.35, // used only if the user toggles rotation on
    enableDamping: true,
    dampingFactor: 0.1,
    minZoomAltitude: 0.25, // closest scroll-zoom (globe radius units)
    maxZoomAltitude: 4.0, // farthest scroll-zoom
  },

  /** Camera "fly to" behavior when a country/capital is selected. */
  flyTo: {
    altitude: 1.6, // viewing altitude after flying to a target
    durationMs: 900, // pointOfView transition time
  },

  /** Initial camera vantage point. */
  initialView: {
    lat: 20,
    lng: 0,
    altitude: 2.5,
  },
} as const;
