/**
 * Pure color helpers for the globe rendering layer.
 */

/** Parse "#rrggbb" -> {r,g,b} (0..255). Falls back to mid-grey on bad input. */
function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  if (h.length < 6) return { r: 128, g: 128, b: 128 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** "#rrggbb" + alpha -> "rgba(r,g,b,a)" for translucent polygon fills. */
export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Brighten a hex color toward white by t (0..1). Used to make selected borders pop. */
export function brighten(hex: string, t: number): string {
  const { r, g, b } = parseHex(hex);
  const mix = (c: number) => Math.round(c + (255 - c) * t);
  const to = (c: number) => mix(c).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}
