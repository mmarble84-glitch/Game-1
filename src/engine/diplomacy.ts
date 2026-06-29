/**
 * Pure diplomacy logic: relation reads/writes, alliance & war membership tests,
 * and side expansion when allies are pulled into a war. No state, no I/O.
 *
 * Relations change ONLY through these functions, which are invoked by explicit
 * player actions / events — never by a timer.
 */

import type { Alliance, War } from '@/models/diplomacy';
import { DIPLOMACY_CONFIG } from '@/config/diplomacy';

const clampRel = (v: number) =>
  Math.max(DIPLOMACY_CONFIG.relation.min, Math.min(DIPLOMACY_CONFIG.relation.max, v));

/** Canonical, order-independent key for a pair of nations. */
export function relationKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Read a relation value (0 if never set). */
export function getRelation(relations: Record<string, number>, a: string, b: string): number {
  if (a === b) return 0;
  return relations[relationKey(a, b)] ?? 0;
}

/** Return a new relations map with the pair set to an absolute value. */
export function setRelation(
  relations: Record<string, number>,
  a: string,
  b: string,
  value: number,
): Record<string, number> {
  if (a === b) return relations;
  return { ...relations, [relationKey(a, b)]: clampRel(value) };
}

/** Return a new relations map with the pair adjusted by a delta (clamped). */
export function adjustRelation(
  relations: Record<string, number>,
  a: string,
  b: string,
  delta: number,
): Record<string, number> {
  return setRelation(relations, a, b, getRelation(relations, a, b) + delta);
}

/** Human label + color for a relation value. */
export function relationBand(value: number): { label: string; color: string } {
  for (const band of DIPLOMACY_CONFIG.bands) {
    if (value >= band.min) return { label: band.label, color: band.color };
  }
  const last = DIPLOMACY_CONFIG.bands[DIPLOMACY_CONFIG.bands.length - 1];
  return { label: last.label, color: last.color };
}

/** The alliance a nation belongs to (if any). */
export function allianceOf(
  alliances: Record<string, Alliance>,
  nationId: string,
): Alliance | undefined {
  return Object.values(alliances).find((al) => al.memberIds.includes(nationId));
}

/** Whether two nations share an alliance. */
export function areAllied(alliances: Record<string, Alliance>, a: string, b: string): boolean {
  if (a === b) return false;
  return Object.values(alliances).some(
    (al) => al.memberIds.includes(a) && al.memberIds.includes(b),
  );
}

/** The war two nations are on opposite sides of (if any). */
export function warBetween(wars: Record<string, War>, a: string, b: string): War | undefined {
  return Object.values(wars).find(
    (w) =>
      (w.sideA.includes(a) && w.sideB.includes(b)) ||
      (w.sideA.includes(b) && w.sideB.includes(a)),
  );
}

/** Whether two nations are on opposite sides of any war. */
export function areAtWar(wars: Record<string, War>, a: string, b: string): boolean {
  return !!warBetween(wars, a, b);
}

/** All allies of a nation (alliance co-members), excluding itself. */
export function alliesOf(alliances: Record<string, Alliance>, nationId: string): string[] {
  const out = new Set<string>();
  for (const al of Object.values(alliances)) {
    if (al.memberIds.includes(nationId)) {
      for (const m of al.memberIds) if (m !== nationId) out.add(m);
    }
  }
  return [...out];
}

/**
 * Build the two sides of a war. When `pullAllies` is on, each principal's allies
 * join their side. A nation never ends up on both sides (sideA wins ties).
 */
export function expandSides(
  alliances: Record<string, Alliance>,
  aggressor: string,
  target: string,
  pullAllies: boolean,
): { sideA: string[]; sideB: string[] } {
  const sideA = new Set<string>([aggressor]);
  const sideB = new Set<string>([target]);
  if (pullAllies) {
    for (const ally of alliesOf(alliances, aggressor)) sideA.add(ally);
    for (const ally of alliesOf(alliances, target)) sideB.add(ally);
  }
  // Resolve any overlap in favor of the aggressor's side.
  for (const id of sideA) sideB.delete(id);
  return { sideA: [...sideA], sideB: [...sideB] };
}
