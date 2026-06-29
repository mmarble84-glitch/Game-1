/** Small display formatters for the HUD/panels. Pure. */

/** Compact number: 1530000 -> "1.53M", 18560 -> "18.6K", 342 -> "342". */
export function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(Math.round(n));
}

/** Thousands-separated integer: 18560 -> "18,560". */
export function commas(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** Signed compact delta: 120 -> "+120", -5 -> "-5", 0 -> "+0". */
export function signedCompact(n: number): string {
  return (n >= 0 ? '+' : '') + compact(n);
}

/** Signed thousands delta: 1530 -> "+1,530", -42 -> "-42". */
export function signedCommas(n: number): string {
  return (n >= 0 ? '+' : '') + commas(n);
}
