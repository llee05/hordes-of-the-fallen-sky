import { GAME } from '../config';
import type { RunState } from '../types';
import { healKhan, ownsResearch } from './researchRuntime';
import { hasDevelopment } from './camp';
export function claimGhostArrow(run: RunState, index: number): boolean {
  if (
    run.phase !== 'playing' ||
    !ownsResearch(run, 'hy-ghost-fletched-arrows') ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= GAME.patrons.ancestors.maximum
  )
    return false;
  const attacks = ((run.researchRuntime ??= {}).ghostAttacks ??= []);
  while (attacks.length <= index) attacks.push(0);
  attacks[index] = (attacks[index] ?? 0) + 1;
  return attacks[index]! % GAME.research.ghostArrowEvery === 0;
}
/** Priority picks exactly one owned arrow modifier; never copies projectile count. */
export function ghostArrowModifier(run: RunState): { pierces: number; fire: boolean } {
  if (run.patrons.bow.pierce > 0) return { pierces: run.patrons.bow.pierce, fire: false };
  return { pierces: 0, fire: hasDevelopment(run, 'archery', 'fire-arrows') };
}
export function recordHybridKill(run: RunState, markedElite: boolean, nearCamp: boolean): void {
  if (run.phase !== 'playing') return;
  const r = (run.researchRuntime ??= {});
  if (ownsResearch(run, 'hy-living-waters')) {
    if (r.livingWaveKey !== run.encounters.key) {
      r.livingWaveKey = run.encounters.key;
      r.livingWaveKills = 0;
    }
    if (nearCamp) r.livingWaveKills = (r.livingWaveKills ?? 0) + 1;
  }
  if (
    markedElite &&
    ownsResearch(run, 'hy-blood-and-ember') &&
    (r.bloodEmberCooldown ?? -Infinity) <= run.elapsed &&
    run.health > 0 &&
    run.khan.successionRemaining <= 0
  ) {
    r.bloodEmberCooldown = run.elapsed + GAME.research.bloodEmberCooldown;
    healKhan(run, GAME.research.bloodEmberHeal);
  }
}
export function rewardLivingWaters(run: RunState): boolean {
  const r = run.researchRuntime;
  if (
    run.phase !== 'playing' ||
    !r ||
    !ownsResearch(run, 'hy-living-waters') ||
    r.livingWaveKey !== run.encounters.key
  )
    return false;
  const kills = r.livingWaveKills ?? 0;
  r.livingWaveKills = 0;
  if (
    kills < GAME.research.livingWatersKills ||
    (r.livingWatersCooldown ?? -Infinity) > run.elapsed
  )
    return false;
  r.livingWatersCooldown = run.elapsed + GAME.research.livingWatersCooldown;
  run.clan.pasture = Math.min(100, run.clan.pasture + GAME.research.livingWatersPasture);
  run.clan.food += GAME.research.livingWatersFood;
  return true;
}
export function claimThousandArrows(run: RunState): boolean {
  if (run.phase !== 'playing' || !ownsResearch(run, 'hy-thousand-arrows')) return false;
  const r = (run.researchRuntime ??= {});
  if ((r.thousandArrowsCooldown ?? -Infinity) > run.elapsed) return false;
  r.thousandArrowsCooldown = run.elapsed + GAME.research.thousandArrowsCooldown;
  return true;
}
export function wardRateMultiplier(run: RunState): number {
  if (run.phase !== 'playing' || !ownsResearch(run, 'hy-last-stand-of-hearth')) return 1;
  const r = (run.researchRuntime ??= {}),
    low =
      run.clan.integrity > 0 &&
      run.clan.integrity < GAME.clan.maxResolve * GAME.research.lastStandThreshold;
  if (low && !r.lastStandLow && (r.lastStandCooldown ?? -Infinity) <= run.elapsed) {
    r.lastStandUntil = run.elapsed + GAME.research.lastStandSeconds;
    r.lastStandCooldown = run.elapsed + GAME.research.lastStandCooldown;
  }
  r.lastStandLow = low;
  return (r.lastStandUntil ?? 0) > run.elapsed ? 2 : 1;
}
