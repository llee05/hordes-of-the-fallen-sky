import { recordHybridKill, rewardLivingWaters } from './researchHybrids';
import { leadershipAttackSpeed } from './researchLeadership';
import { hasDevelopment } from './camp';
import { GAME } from '../config';
import type { RunState } from '../types';

/** Optional for compatibility with older expedition saves. All timestamps use active seconds. */
export interface ResearchRuntime {
  nearestCompanion?: string;
  echoFireAt?: number[];
  ghostAttacks?: number[];
  livingWaveKey?: string;
  livingWaveKills?: number;
  livingWatersCooldown?: number;
  thousandArrowsCooldown?: number;
  bloodEmberCooldown?: number;
  lastStandUntil?: number;
  lastStandCooldown?: number;
  lastStandLow?: boolean;

  firstConstructionCrossing?: number;
  arrowPlatformAt?: number;
  wardInside?: string[];
  riderFireAt?: number[];
  riderVolleyCounts?: number[];
  hornUntil?: number;
  hornCooldown?: number;
  rallyUntil?: number;
  rallyCrossing?: number;

  shardsGathered?: number;
  shardStreak?: number;
  shardStreakUntil?: number;
  spiritBurstUntil?: number;
  vulnerabilityUntil?: Record<string, number>;
  echoHits?: Record<string, number>;

  slowSince?: Record<string, number>;
  slowSeenAt?: Record<string, number>;
  slowUntil?: Record<string, number>;
  rootUntil?: Record<string, number>;
  rootCooldown?: Record<string, number>;
  terrainPulseAt?: number;
  undertowAt?: number;
  floodgateAt?: number;
  dodgeUntil?: number;
  dodgeCooldown?: number;
  rockArcCooldown?: number;
  stoneTickAt?: number;
  ridgePatches?: { x: number; y: number; until: number }[];
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
  markedUntil?: Record<string, number>;
  staggerUntil?: Record<string, number>;
  staggerCooldownUntil?: Record<string, number>;
  hoofTrails?: { x: number; y: number; until: number; gallopSerial: number }[];
  hoofTrailHits?: Record<string, number>;
  throatSlot?: number;
  throatSpawn?: number;
  throatStacks?: number;
  dashHitSerial?: number;
  dashHitEnemies?: string[];
  stormChaserUntil?: number;
  momentumHoldUntil?: number;
  markedNearKhan?: boolean;
  endlessBurstUntil?: number;
  vigilantHerdersUntil?: number;
  craftspeopleRefundedCrossing?: number;
  crossingMaterialsSpent?: number;
  crossingSpentIndex?: number;
  khanVolleyCount?: number;
  precisionVolleyCount?: number;
  wideVolleyCount?: number;
  precisionMarkedUntil?: Record<string, number>;
  bleedStacks?: Record<string, number>;
  bleedUntil?: Record<string, number>;
  sunderStacks?: Record<string, number>;
  sunderUntil?: Record<string, number>;
  arrowRainAt?: number;
  arrowRainX?: number;
  arrowRainY?: number;
  arrowRainDamage?: number;
  warmAshesPending?: boolean;
  embersReturnUntil?: number;
  khanStationaryNearCamp?: boolean;
  hearthCampInRange?: boolean;
  ashBornInvulnerableUntil?: number;
  ashBornPulsePending?: boolean;
  firebreakUntil?: number;
  householdOathUntil?: number;
  flameHealUntil?: number;
  flamePulsesRemaining?: number;
  flameNextPulseAt?: number;
}
function enemyKey(slot: number, spawn: number): string {
  return `${slot}:${spawn}`;
}
function pruneExpired(map: Record<string, number>, now: number): void {
  for (const [k, until] of Object.entries(map)) if (until <= now) delete map[k];
}
export function ownsResearch(run: RunState, id: string): boolean {
  return (run.upgrades[id] ?? 0) > 0;
}
/** Reusable Marked status (5 s default, refreshes rather than stacks). */
export function markEnemy(
  run: RunState,
  slot: number,
  spawn: number,
  duration = GAME.research.markSeconds,
): void {
  if (run.phase !== 'playing' || !Number.isFinite(duration) || duration <= 0) return;
  const r = (run.researchRuntime ??= {});
  const marks = (r.markedUntil ??= {});
  pruneExpired(marks, run.elapsed);
  marks[enemyKey(slot, spawn)] = Math.max(
    marks[enemyKey(slot, spawn)] ?? 0,
    run.elapsed + duration,
  );
}
export function isEnemyMarked(run: RunState, slot: number, spawn: number): boolean {
  return (run.researchRuntime?.markedUntil?.[enemyKey(slot, spawn)] ?? 0) > run.elapsed;
}
export function markedPursuitMultiplier(run: RunState, slot: number, spawn: number): number {
  return ownsResearch(run, 'bc-scent-of-fear') && isEnemyMarked(run, slot, spawn)
    ? GAME.research.scentOfFearDamage
    : 1;
}
export function throatOfPreyMultiplier(run: RunState, slot: number, spawn: number): number {
  const r = run.researchRuntime;
  if (
    !ownsResearch(run, 'bc-throat-of-the-prey') ||
    r?.throatSlot !== slot ||
    r.throatSpawn !== spawn ||
    !isEnemyMarked(run, slot, spawn)
  )
    return 1;
  return (
    1 +
    Math.min(GAME.research.throatMaxStacks, r.throatStacks ?? 0) * GAME.research.throatRampPerHit
  );
}
export function isPrecisionMarked(run: RunState, slot: number, spawn: number): boolean {
  return (run.researchRuntime?.precisionMarkedUntil?.[enemyKey(slot, spawn)] ?? 0) > run.elapsed;
}
/** Applies marked-target damage bonuses and updates Scent of Fear / Throat of the Prey / Draw to Breath state. */
export function recordFriendlyHitOnEnemy(
  run: RunState,
  slot: number,
  spawn: number,
  healthRatioBefore: number,
  elite = false,
  healthRatioAfter = healthRatioBefore,
  precision = true,
): number {
  if (run.phase !== 'playing') return 1;
  const r = (run.researchRuntime ??= {});
  const key = enemyKey(slot, spawn);
  const wasMarked = isEnemyMarked(run, slot, spawn);
  const precisionHit =
    precision && ownsResearch(run, 'km-draw-to-breath') && isPrecisionMarked(run, slot, spawn);
  if (precisionHit) delete r.precisionMarkedUntil?.[key];
  if (ownsResearch(run, 'bc-throat-of-the-prey')) {
    if (r.throatSlot !== slot || r.throatSpawn !== spawn) {
      r.throatSlot = slot;
      r.throatSpawn = spawn;
      r.throatStacks = 0;
    }
    if (elite && wasMarked)
      r.throatStacks = Math.min(GAME.research.throatMaxStacks, (r.throatStacks ?? 0) + 1);
    else if (!wasMarked) r.throatStacks = 0;
  }
  const mult =
    (precisionHit ? GAME.research.drawToBreathDamage : 1) *
    (ownsResearch(run, 'bc-scent-of-fear') && wasMarked ? GAME.research.scentOfFearDamage : 1) *
    (ownsResearch(run, 'bc-throat-of-the-prey') && elite && wasMarked
      ? 1 + (r.throatStacks ?? 0) * GAME.research.throatRampPerHit
      : 1);
  if (
    ownsResearch(run, 'bc-scent-of-fear') &&
    (healthRatioBefore < 0.5 || (healthRatioAfter > 0 && healthRatioAfter < 0.5))
  )
    markEnemy(run, slot, spawn, GAME.research.markSeconds);
  return mult;
}
export function recordGallopThroughEnemy(
  run: RunState,
  slot: number,
  spawn: number,
  isBoss = false,
): {
  staggered: boolean;
  staggerSeconds: number;
  bossSlow: number;
  stormChaserVolley: boolean;
} {
  if (run.phase !== 'playing')
    return { staggered: false, staggerSeconds: 0, bossSlow: 1, stormChaserVolley: false };
  const r = (run.researchRuntime ??= {});
  const key = enemyKey(slot, spawn);
  let staggered = false;
  let staggerSeconds = 0;
  if (ownsResearch(run, 'bc-bounding-charge')) {
    const cooldowns = (r.staggerCooldownUntil ??= {});
    const staggers = (r.staggerUntil ??= {});
    pruneExpired(cooldowns, run.elapsed);
    pruneExpired(staggers, run.elapsed);
    if ((cooldowns[key] ?? -Infinity) <= run.elapsed) {
      cooldowns[key] = run.elapsed + GAME.research.boundingChargeCooldown;
      staggers[key] = run.elapsed + GAME.research.boundingChargeStagger;
      staggered = true;
      staggerSeconds = GAME.research.boundingChargeStagger;
    }
  }
  let stormChaserVolley = false;
  if (ownsResearch(run, 'bc-storm-chaser')) {
    const serial = run.combat.gallopSerial;
    if (r.dashHitSerial !== serial) {
      r.dashHitSerial = serial;
      r.dashHitEnemies = [];
    }
    const hits = (r.dashHitEnemies ??= []);
    if (!hits.includes(key) && hits.length < GAME.maxEnemies) hits.push(key);
    if (
      hits.length >= GAME.research.stormChaserTargets &&
      (r.stormChaserUntil ?? -Infinity) <= run.elapsed
    ) {
      r.stormChaserUntil = run.elapsed + GAME.research.stormChaserCooldown;
      stormChaserVolley = true;
    }
  }
  return {
    staggered,
    staggerSeconds,
    bossSlow: isBoss && staggered ? 1 - GAME.research.bossStaggerSlow : 1,
    stormChaserVolley,
  };
}
export function isEnemyStaggered(run: RunState, slot: number, spawn: number): boolean {
  return (run.researchRuntime?.staggerUntil?.[enemyKey(slot, spawn)] ?? 0) > run.elapsed;
}
export function enemyStaggerSlowMultiplier(
  run: RunState,
  slot: number,
  spawn: number,
  isBoss = false,
): number {
  if (!isEnemyStaggered(run, slot, spawn)) return 1;
  return isBoss ? 1 - GAME.research.bossStaggerSlow : 0;
}
export function packInstinctActive(run: RunState): boolean {
  return ownsResearch(run, 'bc-pack-instinct') && run.clan.momentum > 0.5;
}
export function packInstinctBonus(
  run: RunState,
  isNearestCompanion = true,
): { moveSpeed: number; attackSpeed: number } {
  return packInstinctActive(run) && isNearestCompanion
    ? {
        moveSpeed: GAME.research.packInstinctMoveSpeed,
        attackSpeed: 1 + GAME.research.packInstinctAttackSpeed,
      }
    : { moveSpeed: 1, attackSpeed: 1 };
}
export function riderPrefersTarget(run: RunState, slot: number, spawn: number): boolean {
  return (
    ownsResearch(run, 'bc-call-of-the-pack') &&
    run.clan.momentum > 0.5 &&
    isEnemyMarked(run, slot, spawn)
  );
}
export function riderAttackSpeedMultiplier(run: RunState, isNearestCompanion = false): number {
  let bonus = leadershipAttackSpeed(run);
  if (packInstinctActive(run) && isNearestCompanion) bonus += GAME.research.packInstinctAttackSpeed;
  if (ownsResearch(run, 'bc-call-of-the-pack') && run.clan.momentum > 0.5)
    bonus += GAME.research.callOfPackSpeed;
  return 1 + bonus;
}
export function riderFiringInterval(run: RunState, isNearestCompanion = false): number {
  return (
    (run.stats.attackInterval *
      run.clan.campEffects.multipliers.hostInterval *
      (run.clan.formation === 'retreat' && run.clan.momentum > 0.4 ? 0.7 : 1)) /
    riderAttackSpeedMultiplier(run, isNearestCompanion)
  );
}
export function advanceHoofTrails(
  run: RunState,
  position: { x: number; y: number },
  galloping: boolean,
): void {
  if (run.phase !== 'playing') return;
  const r = run.researchRuntime;
  if (r?.hoofTrails) r.hoofTrails = r.hoofTrails.filter((t) => t.until > run.elapsed);
  if (!galloping || !ownsResearch(run, 'bc-wind-cutting-hooves')) return;
  const rt = (run.researchRuntime ??= {});
  const trails = (rt.hoofTrails ??= []);
  const last = trails.at(-1);
  if (
    !last ||
    last.gallopSerial !== run.combat.gallopSerial ||
    Math.hypot(position.x - last.x, position.y - last.y) > GAME.mounted.trailSpacing
  ) {
    trails.push({
      x: position.x,
      y: position.y,
      until: run.elapsed + GAME.research.hoofTrailSeconds,
      gallopSerial: run.combat.gallopSerial,
    });
    if (trails.length > GAME.mounted.maxTrails) trails.shift();
  }
}
export function claimHoofTrailDamage(
  run: RunState,
  slot: number,
  spawn: number,
  x: number,
  y: number,
): number {
  if (run.phase !== 'playing' || !ownsResearch(run, 'bc-wind-cutting-hooves')) return 0;
  const r = run.researchRuntime;
  const trails = r?.hoofTrails;
  if (!trails?.length) return 0;
  const hits = (r!.hoofTrailHits ??= {});
  const active = new Set(
    trails.filter((trail) => trail.until > run.elapsed).map((trail) => trail.gallopSerial),
  );
  for (const key of Object.keys(hits)) if (!active.has(Number(key.split(':')[0]))) delete hits[key];
  for (const trail of trails) {
    if (trail.until <= run.elapsed) continue;
    const key = `${trail.gallopSerial}:${slot}`;
    if (Math.hypot(x - trail.x, y - trail.y) < GAME.mounted.trailRadius && hits[key] !== spawn) {
      hits[key] = spawn;
      return run.stats.damage * GAME.research.hoofTrailDamage;
    }
  }
  return 0;
}
export function updateMarkedProximity(run: RunState, nearKhan: boolean): void {
  if (run.phase !== 'playing') return;
  (run.researchRuntime ??= {}).markedNearKhan = nearKhan;
}
export function hasMarkedEnemyNearKhan(run: RunState): boolean {
  const r = run.researchRuntime;
  if (!r) return false;
  if (r.markedNearKhan !== undefined) return r.markedNearKhan;
  return Object.values(r.markedUntil ?? {}).some((until) => until > run.elapsed);
}
export function researchMomentumFloor(run: RunState): number {
  const r = run.researchRuntime;
  let floor = 0;
  if (ownsResearch(run, 'bc-hounds-of-the-horizon') && (r?.momentumHoldUntil ?? 0) > run.elapsed)
    floor = Math.max(floor, GAME.research.houndsMomentumFloor);
  if (ownsResearch(run, 'bc-endless-pursuit') && hasMarkedEnemyNearKhan(run))
    floor = Math.max(floor, GAME.research.endlessPursuitFloor);
  return floor;
}
export function researchKhanSpeedMultiplier(run: RunState): number {
  const r = run.researchRuntime;
  return ownsResearch(run, 'bc-endless-pursuit') && (r?.endlessBurstUntil ?? 0) > run.elapsed
    ? GAME.research.endlessPursuitBurstSpeed
    : 1;
}
export function recordResearchEnemyKill(
  run: RunState,
  enemy: { slot: number; spawn: number; elite?: boolean; nearCamp?: boolean },
): void {
  if (run.phase !== 'playing') return;
  const r = (run.researchRuntime ??= {});
  const key = enemyKey(enemy.slot, enemy.spawn);
  const wasMarked = isEnemyMarked(run, enemy.slot, enemy.spawn);
  recordHybridKill(run, enemy.elite === true && wasMarked, enemy.nearCamp === true);
  if (wasMarked && ownsResearch(run, 'bc-hounds-of-the-horizon')) {
    const base = Math.max(r.momentumHoldUntil ?? 0, run.elapsed);
    r.momentumHoldUntil = Math.min(
      run.elapsed + GAME.research.houndsMomentumMax,
      base + GAME.research.houndsMomentumAdd,
    );
    run.clan.momentum = Math.max(run.clan.momentum, GAME.research.houndsMomentumFloor);
  }
  if (ownsResearch(run, 'bc-endless-pursuit') && run.clan.momentum > 0.5) {
    r.endlessBurstUntil = run.elapsed + GAME.research.endlessPursuitBurstSeconds;
  }
  delete r.markedUntil?.[key];
  delete r.precisionMarkedUntil?.[key];
  delete r.staggerUntil?.[key];
  delete r.bleedUntil?.[key];
  delete r.bleedStacks?.[key];
  delete r.sunderUntil?.[key];
  delete r.sunderStacks?.[key];
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
  if (
    ownsResearch(run, 'bc-call-of-the-pack') &&
    run.clan.momentum > 0.5 &&
    isEnemyMarked(run, slot, spawn)
  )
    return true;
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
export function echoInterval(run: RunState, isNearestCompanion = false): number {
  const r = run.researchRuntime;
  let bonus =
    ownsResearch(run, 'on-memory-vessels') && (r?.memoryUntil ?? 0) > run.elapsed
      ? (r?.memoryStacks ?? 0) * GAME.research.memorySpeed
      : 0;
  if (ownsResearch(run, 'bc-call-of-the-pack') && run.clan.momentum > 0.5)
    bonus += GAME.research.callOfPackSpeed;
  if (packInstinctActive(run) && isNearestCompanion) bonus += GAME.research.packInstinctAttackSpeed;
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
export function updateCampfireVigil(
  run: RunState,
  stationaryNearCamp: boolean,
  campDistance = Infinity,
): void {
  if (run.phase !== 'playing') return;
  const active = run.health > 0 && run.khan.successionRemaining <= 0;
  const r = (run.researchRuntime ??= {});
  r.khanStationaryNearCamp = stationaryNearCamp && active;
  r.hearthCampInRange = active && campDistance <= GAME.research.eternalHearthRadius;
}
export function campfireVigilActive(run: RunState): boolean {
  return (
    ownsResearch(run, 'go-campfire-vigil') &&
    Boolean(run.researchRuntime?.khanStationaryNearCamp) &&
    run.health > 0 &&
    run.khan.successionRemaining <= 0
  );
}
export function researchResolveProtection(run: RunState): number {
  let mult = 1;
  if (ownsResearch(run, 'on-quiet-council') && run.researchRuntime?.echoNearCamp)
    mult *= GAME.research.quietProtection;
  if (campfireVigilActive(run)) mult *= GAME.research.campfireVigilProtection;
  return mult;
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
export function recordKhanVolley(
  run: RunState,
  count: number,
  candidates: readonly {
    slot: number;
    spawn: number;
    health: number;
    x?: number;
    y?: number;
  }[] = [],
): {
  markedTarget?: { slot: number; spawn: number };
  executionArrow: boolean;
  skyDarkener: boolean;
  arrowRainQueued: boolean;
  damageMultiplier: number;
  bonusPierces: number;
  overrideCount?: number;
} {
  if (run.phase !== 'playing')
    return {
      executionArrow: false,
      skyDarkener: false,
      arrowRainQueued: false,
      damageMultiplier: 1,
      bonusPierces: 0,
    };
  const r = (run.researchRuntime ??= {});
  r.khanVolleyCount = (r.khanVolleyCount ?? 0) + 1;
  if (count === 1) r.precisionVolleyCount = (r.precisionVolleyCount ?? 0) + 1;
  let markedTarget: { slot: number; spawn: number } | undefined;
  if (
    ownsResearch(run, 'km-draw-to-breath') &&
    r.khanVolleyCount % GAME.research.drawToBreathEvery === 0 &&
    candidates.length > 0
  ) {
    const best = candidates.reduce((a, b) => (b.health > a.health ? b : a));
    markEnemy(run, best.slot, best.spawn, GAME.research.markSeconds);
    const precisionMarks = (r.precisionMarkedUntil ??= {});
    pruneExpired(precisionMarks, run.elapsed);
    precisionMarks[enemyKey(best.slot, best.spawn)] = run.elapsed + GAME.research.markSeconds;
    markedTarget = { slot: best.slot, spawn: best.spawn };
  }
  let executionArrow = false;
  let skyDarkener = false;
  let arrowRainQueued = false;
  let damageMultiplier = 1;
  let bonusPierces = 0;
  let overrideCount: number | undefined;
  if (
    count === 1 &&
    ownsResearch(run, 'km-one-arrow-one-fate') &&
    (r.precisionVolleyCount ?? 0) % GAME.research.oneArrowEvery === 0
  ) {
    executionArrow = true;
    damageMultiplier *= GAME.research.oneArrowDamage;
    bonusPierces += 1;
    overrideCount = 1;
  }
  if (
    ownsResearch(run, 'km-sky-darkener') &&
    r.khanVolleyCount % GAME.research.skyDarkenerEvery === 0
  ) {
    skyDarkener = true;
    damageMultiplier *= GAME.research.skyDarkenerDamage;
    overrideCount = Math.max(count, GAME.research.skyDarkenerArrows);
  }
  if (count > 1) {
    r.wideVolleyCount = (r.wideVolleyCount ?? 0) + 1;
    if (
      ownsResearch(run, 'km-arrow-rain') &&
      r.wideVolleyCount % GAME.research.arrowRainEvery === 0 &&
      r.arrowRainAt === undefined
    ) {
      const target = candidates[0];
      r.arrowRainAt = run.elapsed + GAME.research.arrowRainDelay;
      r.arrowRainX = target?.x ?? 0;
      r.arrowRainY = target?.y ?? 0;
      r.arrowRainDamage = run.stats.damage * GAME.research.arrowRainDamage;
      arrowRainQueued = true;
    }
  }
  return {
    markedTarget,
    executionArrow,
    skyDarkener,
    arrowRainQueued,
    damageMultiplier,
    bonusPierces,
    overrideCount,
  };
}
export function claimArrowRainDrop(
  run: RunState,
): { x: number; y: number; damage: number; radius: number } | undefined {
  if (run.phase !== 'playing' || !ownsResearch(run, 'km-arrow-rain')) return undefined;
  const r = run.researchRuntime;
  if (r?.arrowRainAt === undefined || run.elapsed < r.arrowRainAt) return undefined;
  const drop = {
    x: r.arrowRainX ?? 0,
    y: r.arrowRainY ?? 0,
    damage: r.arrowRainDamage ?? run.stats.damage * GAME.research.arrowRainDamage,
    radius: GAME.research.arrowRainRadius,
  };
  r.arrowRainAt = undefined;
  return drop;
}
export function recordPiercingHitOnEnemy(run: RunState, slot: number, spawn: number): void {
  if (run.phase !== 'playing') return;
  const r = (run.researchRuntime ??= {});
  const key = enemyKey(slot, spawn);
  if (ownsResearch(run, 'km-barbed-flight')) {
    const bleedUntil = (r.bleedUntil ??= {});
    const bleedStacks = (r.bleedStacks ??= {});
    pruneExpired(bleedUntil, run.elapsed);
    const active = (bleedUntil[key] ?? 0) > run.elapsed ? (bleedStacks[key] ?? 0) : 0;
    bleedStacks[key] = Math.min(GAME.research.barbedFlightMaxStacks, active + 1);
    bleedUntil[key] = run.elapsed + GAME.research.barbedFlightSeconds;
  }
  if (ownsResearch(run, 'km-sunder-the-ranks')) {
    const sunderUntil = (r.sunderUntil ??= {});
    const sunderStacks = (r.sunderStacks ??= {});
    pruneExpired(sunderUntil, run.elapsed);
    const active = (sunderUntil[key] ?? 0) > run.elapsed ? (sunderStacks[key] ?? 0) : 0;
    sunderStacks[key] = Math.min(GAME.research.sunderMaxStacks, active + 1);
    sunderUntil[key] = run.elapsed + GAME.research.sunderSeconds;
  }
}
export function advanceEnemyBleed(run: RunState, slot: number, spawn: number, dt: number): number {
  if (
    run.phase !== 'playing' ||
    !ownsResearch(run, 'km-barbed-flight') ||
    !Number.isFinite(dt) ||
    dt <= 0
  )
    return 0;
  const r = run.researchRuntime;
  const key = enemyKey(slot, spawn);
  const until = r?.bleedUntil?.[key] ?? 0;
  if (until <= run.elapsed) {
    delete r?.bleedUntil?.[key];
    delete r?.bleedStacks?.[key];
    return 0;
  }
  const stacks = Math.min(GAME.research.barbedFlightMaxStacks, r?.bleedStacks?.[key] ?? 0);
  const effectiveDt = Math.min(dt, until - run.elapsed);
  return stacks * GAME.research.barbedFlightDamagePerSecond * run.stats.damage * effectiveDt;
}
export function enemySunderArmourReduction(run: RunState, slot: number, spawn: number): number {
  if (!ownsResearch(run, 'km-sunder-the-ranks')) return 0;
  const r = run.researchRuntime;
  const key = enemyKey(slot, spawn);
  if ((r?.sunderUntil?.[key] ?? 0) <= run.elapsed) return 0;
  return (
    Math.min(GAME.research.sunderMaxStacks, r?.sunderStacks?.[key] ?? 0) *
    GAME.research.sunderPerStack
  );
}
export function researchArmorMultiplier(
  run: RunState,
  slot: number,
  spawn: number,
  baseArmorMultiplier: number,
  precisionHit = true,
): number {
  let reduction = Math.max(0, 1 - baseArmorMultiplier);
  if (ownsResearch(run, 'km-eagle-eye') && precisionHit)
    reduction *= 1 - GAME.research.eagleEyeArmorIgnore;
  const sunder = enemySunderArmourReduction(run, slot, spawn);
  return 1 - Math.max(0, reduction - sunder);
}
export function eagleEyeOverkillSpill(
  run: RunState,
  hitDamage: number,
  enemyHealth: number,
  isBoss = false,
): number {
  if (!ownsResearch(run, 'km-eagle-eye') || isBoss || enemyHealth <= 0 || hitDamage <= enemyHealth)
    return 0;
  return (hitDamage - enemyHealth) * GAME.research.eagleEyeOverkillSpill;
}
export function researchBonusPierces(run: RunState, basePierces: number): number {
  const piercing = basePierces > 0 || ownsResearch(run, 'piercing-shaft');
  if (!piercing) return 0;
  let bonus = 0;
  if (ownsResearch(run, 'km-drilling-shafts')) bonus += GAME.research.drillingShaftsBonusPierce;
  if (ownsResearch(run, 'km-world-piercer')) bonus += GAME.research.worldPiercerBonusPierces;
  return bonus;
}
export function projectileDamageAfterPierce(run: RunState, currentDamage: number): number {
  return ownsResearch(run, 'km-drilling-shafts')
    ? currentDamage * GAME.research.drillingShaftsAfterHit
    : currentDamage;
}
export function capWorldPiercerDamage(
  run: RunState,
  hitDamage: number,
  baseDamage: number,
  dealtSoFar: number,
): number {
  if (!ownsResearch(run, 'km-world-piercer')) return hitDamage;
  const cap = baseDamage * GAME.research.worldPiercerMaxTotalDamage;
  return Math.max(0, Math.min(hitDamage, cap - dealtSoFar));
}
export function stillHandActive(run: RunState): boolean {
  if (!ownsResearch(run, 'km-still-hand')) return false;
  const last = run.researchRuntime?.lastGallopAt;
  return last === undefined || run.elapsed - last >= GAME.research.stillHandIdleSeconds;
}
export function stillHandCritChance(run: RunState): number {
  return stillHandActive(run) ? GAME.research.stillHandCritChance : 0;
}
export function stillHandDamageMultiplier(run: RunState, roll = Math.random()): number {
  if (!stillHandActive(run)) return 1;
  return roll < GAME.research.stillHandCritChance ? GAME.research.stillHandCritDamage : 1;
}
export function circleOfShaftsVolley(
  run: RunState,
  count: number,
  personal: boolean,
): { count: number; damage: number } {
  return personal &&
    count > 1 &&
    ownsResearch(run, 'km-circle-of-shafts') &&
    run.clan.momentum > 0.5
    ? {
        count: GAME.research.circleOfShaftsArrows,
        damage: GAME.research.circleOfShaftsDamage,
      }
    : { count: 0, damage: 0 };
}
export function researchAttackIntervalMultiplier(run: RunState): number {
  return ownsResearch(run, 'km-one-arrow-one-fate') ? 1 / GAME.research.oneArrowFireRate : 1;
}

function addClanResolve(run: RunState, amount: number): void {
  if (amount <= 0 || run.clan.integrity <= 0 || run.clan.population <= 0) return;
  run.clan.integrity = Math.min(GAME.clan.maxResolve, run.clan.integrity + amount);
}
export function khanHealingMultiplier(run: RunState): number {
  return ownsResearch(run, 'go-fortress-of-felt') ? GAME.research.fortressOfFeltHealing : 1;
}
export function healKhan(run: RunState, rawAmount: number): number {
  if (
    run.phase !== 'playing' ||
    !Number.isFinite(rawAmount) ||
    rawAmount <= 0 ||
    run.health <= 0 ||
    run.khan.successionRemaining > 0
  )
    return 0;
  const scaled = rawAmount * khanHealingMultiplier(run);
  const next = run.health + scaled;
  const overheal = Math.max(0, next - run.stats.maxHealth);
  run.health = Math.min(run.stats.maxHealth, next);
  if (overheal > 0 && ownsResearch(run, 'go-household-oath')) {
    const r = (run.researchRuntime ??= {});
    if ((r.householdOathUntil ?? -Infinity) <= run.elapsed) {
      r.householdOathUntil = run.elapsed + GAME.research.householdOathCooldown;
      addClanResolve(run, GAME.research.householdOathResolve);
    }
  }
  return scaled;
}
export function recordKhanSurvivedHit(run: RunState): void {
  if (
    run.phase !== 'playing' ||
    !ownsResearch(run, 'go-embers-return') ||
    run.health <= 0 ||
    run.khan.successionRemaining > 0 ||
    run.health >= run.stats.maxHealth * GAME.research.embersReturnThreshold
  )
    return;
  const r = (run.researchRuntime ??= {});
  if ((r.embersReturnUntil ?? -Infinity) <= run.elapsed) {
    r.embersReturnUntil = run.elapsed + GAME.research.embersReturnCooldown;
    healKhan(run, GAME.research.embersReturnHeal);
  }
}
export function recordLastEmberRevival(run: RunState): void {
  if (run.phase !== 'playing') return;
  if (ownsResearch(run, 'go-ash-born')) {
    const r = (run.researchRuntime ??= {});
    r.ashBornInvulnerableUntil = run.elapsed + GAME.research.ashBornInvulnerableSeconds;
    r.ashBornPulsePending = true;
  }
  if (ownsResearch(run, 'go-flame-that-refuses')) {
    const r = (run.researchRuntime ??= {});
    r.flameHealUntil = run.elapsed + GAME.research.flameHealSeconds;
    r.flamePulsesRemaining = GAME.research.flamePulses;
    r.flameNextPulseAt = run.elapsed + GAME.research.flamePulseInterval;
  }
}
export function ashBornInvulnerable(run: RunState): boolean {
  return (
    ownsResearch(run, 'go-ash-born') &&
    (run.researchRuntime?.ashBornInvulnerableUntil ?? 0) > run.elapsed
  );
}
export function claimAshBornPulse(run: RunState): { radius: number; push: number } | undefined {
  if (
    run.phase !== 'playing' ||
    !ownsResearch(run, 'go-ash-born') ||
    !run.researchRuntime?.ashBornPulsePending
  )
    return undefined;
  run.researchRuntime.ashBornPulsePending = false;
  return {
    radius: GAME.research.ashBornPulseRadius,
    push: GAME.research.ashBornPulsePush,
  };
}
export function flameRefusesRegen(run: RunState): number {
  return ownsResearch(run, 'go-flame-that-refuses') &&
    (run.researchRuntime?.flameHealUntil ?? 0) > run.elapsed
    ? run.stats.maxHealth * GAME.research.flameHealFractionPerSecond
    : 0;
}
export function claimFlameRefusesPulse(
  run: RunState,
): { damage: number; radius: number } | undefined {
  if (run.phase !== 'playing' || !ownsResearch(run, 'go-flame-that-refuses')) return undefined;
  const r = run.researchRuntime;
  if (
    (r?.flamePulsesRemaining ?? 0) <= 0 ||
    r?.flameNextPulseAt === undefined ||
    run.elapsed < r.flameNextPulseAt
  )
    return undefined;
  r.flamePulsesRemaining = (r.flamePulsesRemaining ?? 1) - 1;
  r.flameNextPulseAt =
    r.flamePulsesRemaining > 0 ? r.flameNextPulseAt + GAME.research.flamePulseInterval : undefined;
  return {
    damage: run.stats.damage * GAME.research.flamePulseDamage,
    radius: GAME.research.flamePulseRadius,
  };
}
export function eternalHearthActive(run: RunState): boolean {
  return (
    run.phase === 'playing' &&
    ownsResearch(run, 'go-eternal-hearth') &&
    run.elapsed >= GAME.research.eternalHearthCycle &&
    run.elapsed % GAME.research.eternalHearthCycle < GAME.research.eternalHearthDuration
  );
}
export function eternalHearthPush(run: RunState, distance: number, isBoss = false): number {
  return eternalHearthActive(run) && !isBoss && distance < GAME.research.eternalHearthRadius
    ? GAME.research.eternalHearthPushSpeed
    : 0;
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
export function researchKhanHitProtection(run: RunState, incomingDamage = 0): number {
  let protection = campfireVigilActive(run) ? GAME.research.campfireVigilProtection : 1;
  if (
    ownsResearch(run, 'go-fortress-of-felt') &&
    run.health < run.stats.maxHealth * GAME.research.fortressOfFeltThreshold
  )
    protection *= GAME.research.fortressOfFeltProtection;
  if (ownsResearch(run, 'go-layered-felt')) {
    const r = (run.researchRuntime ??= {});
    protection *= researchLayeredProtection(run);
    r.lastHitAt = run.elapsed;
    r.lastHitGeneration = run.khan.generation;
  }
  if (
    ownsResearch(run, 'go-firebreak') &&
    incomingDamage >= run.stats.maxHealth * GAME.research.firebreakThreshold
  ) {
    const r = (run.researchRuntime ??= {});
    if ((r.firebreakUntil ?? -Infinity) <= run.elapsed) {
      r.firebreakUntil = run.elapsed + GAME.research.firebreakCooldown;
      protection *= GAME.research.firebreakMultiplier;
    }
  }
  return protection;
}
export function researchCommonProtection(run: RunState): number {
  return ownsResearch(run, 'go-common-fire') &&
    run.khan.successionRemaining <= 0 &&
    run.health > run.stats.maxHealth * GAME.research.commonThreshold
    ? GAME.research.commonProtection
    : 1;
}
export function researchGrazing(
  run: RunState,
  grazing: number,
  pasture = run.clan.pasture,
): number {
  if (run.clan.stage === 'migration') {
    if (!ownsResearch(run, 'ee-wandering-city')) return 0;
    const roadGrazing = Math.max(0, Math.min(pasture, 100)) / 100;
    return roadGrazing * GAME.research.wanderingCityFoodRate;
  }
  return ownsResearch(run, 'ee-deep-roots')
    ? 1 - (1 - grazing) * GAME.research.deepRootsLoss
    : grazing;
}
export function researchMaterialGrazing(
  run: RunState,
  grazing: number,
  pasture = run.clan.pasture,
): number {
  if (run.clan.stage !== 'migration') return grazing;
  if (!ownsResearch(run, 'ee-wandering-city')) return 0;
  const roadGrazing = Math.max(0, Math.min(pasture, 100)) / 100;
  return roadGrazing * GAME.research.wanderingCityMaterialRate;
}
export function settleWarmAshes(run: RunState, combatActive: boolean): void {
  if (run.phase !== 'playing' || combatActive || !run.researchRuntime?.warmAshesPending) return;
  run.researchRuntime.warmAshesPending = false;
  healKhan(run, GAME.research.warmAshesHeal);
}
export function recordWaveEnded(run: RunState, combatActive: boolean): void {
  if (run.phase !== 'playing') return;
  rewardLivingWaters(run);
  if (ownsResearch(run, 'ee-vigilant-herders')) {
    const r = (run.researchRuntime ??= {});
    r.vigilantHerdersUntil = run.elapsed + GAME.research.vigilantHerdersSeconds;
  }
  if (ownsResearch(run, 'go-warm-ashes')) (run.researchRuntime ??= {}).warmAshesPending = true;
  settleWarmAshes(run, combatActive);
  if (ownsResearch(run, 'go-shelter-the-wounded')) {
    const missing = Math.max(0, run.stats.maxHealth - run.health);
    if (missing > 0) healKhan(run, missing * GAME.research.shelterWoundedHealthFraction);
    addClanResolve(run, GAME.research.shelterWoundedResolve);
  }
}
export function researchFoodProductionMultiplier(run: RunState): number {
  let mult = 1;
  const r = run.researchRuntime;
  if (ownsResearch(run, 'ee-vigilant-herders') && (r?.vigilantHerdersUntil ?? 0) > run.elapsed)
    mult *= GAME.research.vigilantHerdersBonus;
  return mult;
}
export function researchPastureRecoveryBonus(run: RunState): number {
  return ownsResearch(run, 'ee-unbroken-seasons')
    ? GAME.research.unbrokenSeasonsPastureRecovery
    : 0;
}
export function researchStarvationMultiplier(run: RunState): number {
  return ownsResearch(run, 'ee-unbroken-seasons')
    ? GAME.research.unbrokenSeasonsStarvationMultiplier
    : 1;
}
/** Reusable crossing material-spend ledger and Camp of Craftspeople first-spend refund. */
export function recordMaterialSpend(run: RunState, spentMaterials: number): number {
  if (!Number.isFinite(spentMaterials) || spentMaterials <= 0) return 0;
  const crossing = run.story.crossings.length;
  const hasCraftspeople = ownsResearch(run, 'ee-camp-of-craftspeople');
  if (!hasCraftspeople && !run.researchRuntime) return 0;
  const r = (run.researchRuntime ??= {});
  if (r.crossingSpentIndex !== crossing) {
    r.crossingSpentIndex = crossing;
    r.crossingMaterialsSpent = 0;
  }
  let refund = 0;
  if (hasCraftspeople && r.craftspeopleRefundedCrossing !== crossing) {
    r.craftspeopleRefundedCrossing = crossing;
    refund = Math.floor(spentMaterials * GAME.research.craftspeopleRefund);
    run.clan.materials += refund;
  }
  r.crossingMaterialsSpent = (r.crossingMaterialsSpent ?? 0) + Math.max(0, spentMaterials - refund);
  return refund;
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
