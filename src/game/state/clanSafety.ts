import type { RunState } from '../types';
import { markExpedition, metricCasualties, metricStage } from './expeditionMetrics';
export type ClanDamageCause = 'attack' | 'starvation' | 'eruption' | 'seer' | 'area';
export interface ClanDamageObservation {
  cause: ClanDamageCause;
  at: number;
  amount: number;
  people: number;
  source?: string;
}
export interface ClanSafety {
  combatLosses: number;
  starvationLosses: number;
  protectedCrossings: number;
  lastDamage?: ClanDamageObservation;
  lastMajorLoss?: ClanDamageObservation;
}
export function createClanSafety(): ClanSafety {
  return { combatLosses: 0, starvationLosses: 0, protectedCrossings: 0 };
}
export function recordClanDamage(
  run: RunState,
  cause: ClanDamageCause,
  amount: number,
  people: number,
  source?: string,
): void {
  if (!Number.isFinite(amount) || amount <= 0) return;
  const observation = { cause, at: run.elapsed, amount, people, ...(source ? { source } : {}) };
  run.safety.lastDamage = observation;
  if (people > 0 || amount >= 12) run.safety.lastMajorLoss = { ...observation };
  markExpedition(run, 'camp-damage');
  metricStage(run).damage += amount;
  metricCasualties(run, people);
  if (cause === 'starvation') run.safety.starvationLosses += people;
  else run.safety.combatLosses += people;
}
