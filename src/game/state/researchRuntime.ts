import { hasDevelopment } from './camp';
import { GAME } from '../config';
import type { RunState } from '../types';

/** Optional for compatibility with older expedition saves. All timestamps use active seconds. */
export interface ResearchRuntime {
  lastGallopAt?: number;
  riverStacks?: number;
  riverUntil?: number;
  lastHitAt?: number;
  lastHitGeneration?: number;
  targetSlot?: number;
  targetSpawn?: number;
  targetUntil?: number;
  memoryStacks?: number;
  memoryUntil?: number;
  echoReleases?: number;
  echoAttacks?: number[];
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
  if (run.phase !== 'playing') return;
  if (ownsResearch(run, 'hy-river-of-spirits')) {
    const r = (run.researchRuntime ??= {});
    r.riverStacks = Math.min(
      GAME.research.riverStacks,
      ((r.riverUntil ?? 0) > run.elapsed ? (r.riverStacks ?? 0) : 0) + 1,
    );
    r.riverUntil = run.elapsed + GAME.research.riverSeconds;
  }
  if (!ownsResearch(run, 'on-memory-vessels')) return;
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
export function researchEchoRelease(run: RunState, index = 0): boolean {
  if (run.phase !== 'playing' || !ownsResearch(run, 'on-ancestral-archers')) return false;
  if (!Number.isInteger(index) || index < 0 || index >= GAME.patrons.ancestors.maximum)
    return false;
  const r = (run.researchRuntime ??= {});
  r.echoReleases = (r.echoReleases ?? 0) + 1;
  const attacks = (r.echoAttacks ??= Array(GAME.patrons.ancestors.maximum).fill(0) as number[]);
  attacks[index] = (attacks[index] ?? 0) + 1;
  return attacks[index]! % GAME.research.twinEvery === 0;
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

export function researchLayeredProtection(run: RunState): number {
  const r = run.researchRuntime;
  return ownsResearch(run, 'go-layered-felt') &&
    r?.lastHitGeneration === run.khan.generation &&
    r.lastHitAt !== undefined &&
    run.elapsed - r.lastHitAt < GAME.research.layeredSeconds
    ? GAME.research.layeredProtection
    : 1;
}
export function researchKhanHitProtection(run: RunState): number {
  if (!ownsResearch(run, 'go-layered-felt')) return 1;
  const r = (run.researchRuntime ??= {});
  const protection = researchLayeredProtection(run);
  r.lastHitAt = run.elapsed;
  r.lastHitGeneration = run.khan.generation;
  return protection;
}
export function researchCommonProtection(run: RunState): number {
  return ownsResearch(run, 'go-common-fire') &&
    run.khan.successionRemaining <= 0 &&
    run.health > run.stats.maxHealth * GAME.research.commonThreshold
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
      (fallback
        ? GAME.research.wagonFallbackDamage
        : run.clan.stage === 'migration' && !hasDevelopment(run, 'wagon', 'war-carts')
          ? 0.7
          : 1.5) * run.clan.campEffects.multipliers.wagonDamage,
  };
}

export function researchGallop(run: RunState): void {
  if (run.phase === 'playing') (run.researchRuntime ??= {}).lastGallopAt = run.elapsed;
}
export function gallopingBarrage(
  run: RunState,
  personal: boolean,
): { damage: number; speed: number } {
  const time = run.researchRuntime?.lastGallopAt;
  const active =
    personal &&
    ownsResearch(run, 'hy-galloping-barrage') &&
    time !== undefined &&
    run.elapsed - time <= GAME.research.barrageSeconds;
  return active
    ? { damage: GAME.research.barrageDamage, speed: GAME.research.barrageSpeed }
    : { damage: 1, speed: 1 };
}
export function stillwaterRefuge(run: RunState): boolean {
  return (
    ownsResearch(run, 'hy-stillwater-refuge') &&
    run.patrons.water.slow > 0 &&
    run.health > 0 &&
    run.khan.successionRemaining <= 0
  );
}
export function researchWaterRadius(run: RunState): number {
  const r = run.researchRuntime;
  return (
    run.patrons.water.radius +
    (ownsResearch(run, 'hy-river-of-spirits') && (r?.riverUntil ?? 0) > run.elapsed
      ? (r?.riverStacks ?? 0) * GAME.research.riverRadius
      : 0)
  );
}
