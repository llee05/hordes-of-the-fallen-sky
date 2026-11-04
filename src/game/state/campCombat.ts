import { GAME } from '../config';
import type { RunState } from '../types';
import { hasDevelopment } from './camp';
import { isKhanActive } from './khan';

export function gallopCooldown(run: RunState): number {
  return GAME.dash.cooldown * run.clan.campEffects.multipliers.gallopCooldown;
}
export function healKhan(run: RunState, amount: number): number {
  if (run.phase !== 'playing' || !isKhanActive(run) || !Number.isFinite(amount) || amount <= 0)
    return 0;
  run.health = Math.min(run.stats.maxHealth, run.health + amount);
  return amount;
}
export function advanceCampRecovery(run: RunState, dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return;
  healKhan(run, run.clan.campEffects.bonuses.commanderRecovery * dt);
}
export function wagonDefence(run: RunState) {
  return {
    active: !!run.clan.buildings.wagon,
    damage:
      (run.clan.stage === 'migration' && !hasDevelopment(run, 'wagon', 'war-carts') ? 0.7 : 1.5) *
      run.clan.campEffects.multipliers.wagonDamage,
    range: 520,
  };
}
