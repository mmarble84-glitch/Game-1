/** Shared labels/colors for combat outcomes (modal, log, ticker). */

import type { CombatOutcome } from '@/config/combat';
import type { CombatResult } from '@/engine/combat';
import type { Nation } from '@/models/nation';

export const OUTCOME_LABEL: Record<CombatOutcome, string> = {
  decisiveWin: 'Decisive Win',
  win: 'Win',
  stalemate: 'Stalemate',
  loss: 'Loss',
  decisiveLoss: 'Decisive Loss',
};

export const OUTCOME_COLOR: Record<CombatOutcome, string> = {
  decisiveWin: '#46e8a0',
  win: '#9be86a',
  stalemate: '#ffb347',
  loss: '#ff8a4d',
  decisiveLoss: '#ff4d5e',
};

export function attackerWon(o: CombatOutcome): boolean {
  return o === 'decisiveWin' || o === 'win';
}
export function defenderWon(o: CombatOutcome): boolean {
  return o === 'loss' || o === 'decisiveLoss';
}

/** Color of the victor's nation (amber for a stalemate). */
export function winnerColor(result: CombatResult, nations: Record<string, Nation>): string {
  if (attackerWon(result.outcome)) return nations[result.attacker.ownerId]?.color ?? '#46e8a0';
  if (defenderWon(result.outcome)) return nations[result.defender.ownerId]?.color ?? '#ff4d5e';
  return '#ffb347';
}
