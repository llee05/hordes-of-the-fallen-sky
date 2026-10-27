import { GAME } from '../config';
import type { RunState } from '../types';

/** Optional for compatibility with older expedition saves. All timestamps use active seconds. */
export interface ResearchRuntime {
  lastHitAt?: number;
  lastHitGeneration?: number;
  targetSlot?: number;
  targetSpawn?: number;
  targetUntil?: number;
  memoryStacks?: number;
  memoryUntil?: number;
  echoReleases?: number;
  echoNearCamp?: boolean;
}
export function ownsResearch(run: RunState, id: string): boolean {
  return (run.upgrades[id] ?? 0) > 0;
}
export function recordKhanTarget(run: RunState, slot: number, spawn: number): void {
  if (run.phase !== 'playing' || !ownsResearch(run, 'on-spirit-signal')) return;
  const r = (run.researchRuntime ??= {});
  r.targetSlot = slot;
  r.targetSpawn = spawn;
  r.targetUntil = run.elapsed + GAME.research.signalSeconds;
}
export function echoPrefers(run: RunState, slot: number, spawn: number): boolean {
  const r = run.researchRuntime;
  return (
    ownsResearch(run, 'on-spirit-signal') &&
    r?.targetSlot === slot &&
    r.targetSpawn === spawn &&
    (r.targetUntil ?? 0) > run.elapsed
  );
}
export function recordResearchShard(run: RunState): void {
  if (run.phase !== 'playing' || !ownsResearch(run, 'on-memory-vessels')) return;
  const r = (run.researchRuntime ??= {});
  r.memoryStacks = Math.min(
    GAME.research.memoryMaxStacks,
    ((r.memoryUntil ?? 0) > run.elapsed ? (r.memoryStacks ?? 0) : 0) + 1,
  );
  r.memoryUntil = run.elapsed + GAME.research.memorySeconds;
}
export function echoInterval(run: RunState): number {
  const r = run.researchRuntime;
  const bonus =
    ownsResearch(run, 'on-memory-vessels') && (r?.memoryUntil ?? 0) > run.elapsed
      ? (r?.memoryStacks ?? 0) * GAME.research.memorySpeed
      : 0;
  return run.patrons.ancestors.interval / (1 + bonus);
}
export function researchEchoRelease(run: RunState): boolean {
  if (run.phase !== 'playing' || !ownsResearch(run, 'on-ancestral-archers')) return false;
  const r = (run.researchRuntime ??= {});
  r.echoReleases = (r.echoReleases ?? 0) + 1;
  return r.echoReleases % GAME.research.twinEvery === 0;
}
export function updateEchoGuard(run: RunState, nearCamp: boolean): void {
  if (run.phase !== 'playing') return;
  (run.researchRuntime ??= {}).echoNearCamp = nearCamp && run.patrons.ancestors.count > 0;
}
export function researchResolveProtection(run: RunState): number {
  return ownsResearch(run, 'on-quiet-council') && run.researchRuntime?.echoNearCamp
    ? GAME.research.quietProtection
    : 1;
}
export function wideVolleyResearch(
  run: RunState,
  count: number,
  personal: boolean,
): { damage: number; spread: number } {
  return personal && count > 1 && ownsResearch(run, 'km-feathered-fan')
    ? { damage: GAME.research.fanDamage, spread: GAME.research.fanSpread }
    : { damage: 1, spread: 1 };
}

export function researchKhanHitProtection(run: RunState): number {
  if (!ownsResearch(run, 'go-layered-felt')) return 1;
  const r = (run.researchRuntime ??= {});
  const protectedHit =
    r.lastHitGeneration === run.khan.generation &&
    r.lastHitAt !== undefined &&
    run.elapsed - r.lastHitAt < GAME.research.layeredSeconds;
  r.lastHitAt = run.elapsed;
  r.lastHitGeneration = run.khan.generation;
  return protectedHit ? GAME.research.layeredProtection : 1;
}
export function researchCommonProtection(run: RunState): number {
  return ownsResearch(run, 'go-common-fire') &&
    run.khan.successionRemaining <= 0 &&
    run.health > run.stats.maxHealth * 0.8
    ? GAME.research.commonProtection
    : 1;
}
export function researchGrazing(run: RunState, grazing: number): number {
  return run.clan.stage !== 'migration' && ownsResearch(run, 'ee-deep-roots')
    ? 1 - (1 - grazing) * GAME.research.deepRootsLoss
    : grazing;
}
export function wagonResearchDefence(run: RunState): {
  active: boolean;
  fallback: boolean;
  range: number;
  damage: number;
} {
  const fallback = !run.clan.buildings.wagon;
  return {
    active: !fallback || ownsResearch(run, 'watchfires') || ownsResearch(run, 'rolling-fortress'),
    fallback,
    range: fallback ? GAME.research.wagonFallbackRange : 520,
    damage:
      (fallback ? GAME.research.wagonFallbackDamage : run.clan.stage === 'migration' ? 0.7 : 1.5) *
      run.clan.campEffects.multipliers.wagonDamage,
  };
}
