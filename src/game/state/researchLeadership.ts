import { GAME } from '../config';
import type { RunState } from '../types';
import { ownsResearch, riderFiringInterval } from './researchRuntime';
import { restoreResolve } from './clan';

export function recordEliteAppearance(run: RunState): void {
  if (run.phase !== 'playing' || !ownsResearch(run, 'su-horn-of-the-host')) return;
  const r = (run.researchRuntime ??= {});
  if ((r.hornCooldown ?? -Infinity) > run.elapsed) return;
  r.hornCooldown = run.elapsed + GAME.research.hornCooldown;
  r.hornUntil = run.elapsed + GAME.research.hornSeconds;
}
export function leadershipAttackSpeed(run: RunState): number {
  return (
    (ownsResearch(run, 'su-horn-of-the-host') && (run.researchRuntime?.hornUntil ?? 0) > run.elapsed
      ? GAME.research.hornSpeed
      : 0) +
    (ownsResearch(run, 'su-great-kurultai') && (run.researchRuntime?.rallyUntil ?? 0) > run.elapsed
      ? GAME.research.kurultaiSpeed
      : 0)
  );
}
/** Each rider owns an active-time release clock. Attack speed changes cadence, never damage. */
export function claimRiderVolley(run: RunState, index: number, nearest = false): boolean {
  if (run.phase !== 'playing' || !Number.isInteger(index) || index < 0 || index >= 16) return false;
  const times = ((run.researchRuntime ??= {}).riderFireAt ??= []);
  if ((times[index] ?? 0) > run.elapsed) return false;
  times[index] = run.elapsed + riderFiringInterval(run, nearest);
  return true;
}
export function kurultaiAvailable(run: RunState): boolean {
  return (
    run.phase === 'playing' &&
    ownsResearch(run, 'su-great-kurultai') &&
    run.researchRuntime?.rallyCrossing !== run.story.crossings.length
  );
}
export function issueKurultai(run: RunState): boolean {
  if (!kurultaiAvailable(run)) return false;
  const r = (run.researchRuntime ??= {});
  r.rallyCrossing = run.story.crossings.length;
  r.rallyUntil = run.elapsed + GAME.research.kurultaiSeconds;
  restoreResolve(run, GAME.research.kurultaiResolve);
  return true;
}
export function bannerFormation(run: RunState): 'Wedge' | 'Ring' | 'Column' {
  return run.clan.formation === 'guard'
    ? 'Ring'
    : run.clan.formation === 'retreat'
      ? 'Column'
      : 'Wedge';
}
export function bannerDamage(run: RunState): number {
  return ownsResearch(run, 'su-banner-formation') && bannerFormation(run) === 'Wedge'
    ? GAME.research.bannerWedgeDamage
    : 1;
}
export function lastWagonActive(run: RunState): boolean {
  return (
    ownsResearch(run, 'su-last-wagon') &&
    run.clan.integrity < GAME.clan.maxResolve * GAME.research.lastWagonThreshold
  );
}
export function lastWagonSpeed(run: RunState): number {
  return lastWagonActive(run) ? GAME.research.lastWagonSpeed : 1;
}
export function leadershipProtection(run: RunState): number {
  return (
    (lastWagonActive(run) ? GAME.research.lastWagonProtection : 1) *
    (ownsResearch(run, 'su-banner-formation') && bannerFormation(run) === 'Ring'
      ? GAME.research.bannerRingProtection
      : 1)
  );
}
export function leadershipMobility(run: RunState): number {
  return (
    lastWagonSpeed(run) *
    (ownsResearch(run, 'su-banner-formation') && bannerFormation(run) === 'Column'
      ? GAME.research.bannerColumnMobility
      : 1)
  );
}
