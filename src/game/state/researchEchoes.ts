import { GAME } from '../config';
import type { RunState } from '../types';
import { ownsResearch } from './researchRuntime';

/** A duplicate shard is collected through the same XP path but never duplicates again. */
export function recordShardGathering(
  run: RunState,
  value: number,
  secondary = false,
  roll = Math.random(),
): number {
  if (run.phase !== 'playing' || !Number.isFinite(value) || value <= 0) return 0;
  const r = (run.researchRuntime ??= {});
  r.shardsGathered = (r.shardsGathered ?? 0) + 1;
  if (ownsResearch(run, 'on-infinite-remembrance')) {
    r.shardStreak = ((r.shardStreakUntil ?? 0) > run.elapsed ? (r.shardStreak ?? 0) : 0) + 1;
    r.shardStreakUntil = run.elapsed + GAME.research.remembranceWindow;
    if (r.shardStreak >= GAME.research.remembranceStreak) {
      r.shardStreak = 0;
      r.spiritBurstUntil = run.elapsed + GAME.research.remembranceBurstSeconds;
    }
  }
  return !secondary &&
    ownsResearch(run, 'on-reverent-gathering') &&
    roll < GAME.research.reverentChance
    ? value * GAME.research.reverentValue
    : 0;
}
export function researchSpiritYield(run: RunState): number {
  return ownsResearch(run, 'on-names-in-stone')
    ? 1 +
        Math.min(
          GAME.research.namesMaxYield,
          Math.floor(
            (run.researchRuntime?.shardsGathered ?? 0) / GAME.research.namesShardsPerStep,
          ) * GAME.research.namesYieldStep,
        )
    : 1;
}
export function remembranceMagnetRadius(run: RunState): number {
  return ownsResearch(run, 'on-infinite-remembrance') &&
    (run.researchRuntime?.spiritBurstUntil ?? 0) > run.elapsed
    ? GAME.research.remembranceMagnetRadius
    : 0;
}
export function remembranceEchoDamage(run: RunState): number {
  return remembranceMagnetRadius(run) > 0 ? GAME.research.remembranceEchoDamage : 1;
}
/** Individual echo identities, rather than three hits by the same echo. */
export function recordEchoHit(run: RunState, slot: number, spawn: number, index: number): void {
  if (
    run.phase !== 'playing' ||
    !ownsResearch(run, 'on-line-of-forebears') ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= GAME.patrons.ancestors.maximum
  )
    return;
  const r = (run.researchRuntime ??= {}),
    hits = (r.echoHits ??= {}),
    key = `${slot}:${spawn}`;
  for (const k of Object.keys(hits)) if (hits[k]! <= run.elapsed) delete hits[k];
  for (const k of Object.keys(r.vulnerabilityUntil ?? {}))
    if (r.vulnerabilityUntil![k]! <= run.elapsed) delete r.vulnerabilityUntil![k];
  hits[`${key}:${index}`] = run.elapsed + GAME.research.forebearsWindow;
  let count = 0;
  for (let i = 0; i < GAME.patrons.ancestors.maximum; i++)
    if ((hits[`${key}:${i}`] ?? 0) > run.elapsed) count++;
  if (count >= GAME.research.forebearsEchoes)
    (r.vulnerabilityUntil ??= {})[key] = run.elapsed + GAME.research.forebearsDuration;
}
export function echoVulnerability(run: RunState, slot: number, spawn: number): number {
  return ownsResearch(run, 'on-line-of-forebears') &&
    (run.researchRuntime?.vulnerabilityUntil?.[`${slot}:${spawn}`] ?? 0) > run.elapsed
    ? GAME.research.forebearsDamage
    : 1;
}
