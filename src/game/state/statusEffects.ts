import { GAME } from '../config.js';

/**
 * Reusable combat status effects. Everything here is renderer-independent and counts
 * active gameplay seconds, so class kits can combine stun, slow, armour shred, forced
 * movement (pull and knockback) and Khan-side guards without touching the scene.
 */

export interface GroundPoint {
  x: number;
  y: number;
}

/** Timed effects on one enemy. Saved with the enemy; every field is a plain number. */
export interface EnemyStatus {
  /** Seconds the enemy cannot move, attack or cast. */
  stun: number;
  /** Seconds a movement slow lasts, and the speed fraction kept while it does. */
  slow: number;
  slowMultiplier: number;
  /**
   * Seconds of armour shred. Shredded enemies take `shredBonus` more damage, and
   * enemies with an armour stat also lose its reduction. Enemies without armour only
   * take the extra damage.
   */
  shred: number;
  shredBonus: number;
  /** Seconds of forced movement (pull or knockback) at a fixed velocity. */
  forced: number;
  forcedVx: number;
  forcedVy: number;
}

export function createEnemyStatus(): EnemyStatus {
  return {
    stun: 0,
    slow: 0,
    slowMultiplier: 1,
    shred: 0,
    shredBonus: 0,
    forced: 0,
    forcedVx: 0,
    forcedVy: 0,
  };
}

/** What a hit, pulse or shockwave does to each enemy it reaches. Durations are seconds. */
export interface StatusPayload {
  /** Stops the enemy acting for this long. */
  stun?: number;
  /** Keeps `multiplier` of the enemy's speed for `seconds`. */
  slow?: { multiplier: number; seconds: number };
  /** Raises damage taken by `bonus` (0.3 = +30%) and strips armour for `seconds`. */
  shred?: { bonus: number; seconds: number };
  /** Shoves the enemy `distance` away from the Khan over `seconds`. */
  knockback?: { distance: number; seconds: number };
  /** Drags the enemy toward the Khan, stopping `stopAt` units short of him. */
  pull?: { distance: number; seconds: number; stopAt: number };
}

export type EnemySize = 'small' | 'large';

export interface SizedEnemy {
  elite?: boolean;
  scale: number;
}

/** Large enemies are the bulwark-sized bodies and every elite; the rest are small. */
export function enemySize(definition: SizedEnemy, elite = definition.elite ?? false): EnemySize {
  return elite || definition.scale >= GAME.status.largeScale ? 'large' : 'small';
}

/** Fraction of stun and forced-movement duration an enemy keeps. */
export function controlResistance(
  definition: SizedEnemy,
  elite = definition.elite ?? false,
): number {
  if (elite) return GAME.status.eliteControl;
  return enemySize(definition, elite) === 'large' ? GAME.status.largeControl : 1;
}

/** Returns a velocity that covers `distance` over `seconds` along the unit vector. */
function forcedVelocity(
  direction: GroundPoint,
  distance: number,
  seconds: number,
): { vx: number; vy: number } {
  return { vx: (direction.x * distance) / seconds, vy: (direction.y * distance) / seconds };
}

function unit(from: GroundPoint, to: GroundPoint): { x: number; y: number; length: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  return length < 0.001 ? { x: 1, y: 0, length } : { x: dx / length, y: dy / length, length };
}

/**
 * Applies a payload to an enemy at `position`, with the Khan at `origin`. Longer
 * effects never get shorter: a fresh stun, slow or shred only replaces a weaker one.
 * `resistance` scales stun and forced movement (see `controlResistance`).
 */
export function applyStatusPayload(
  status: EnemyStatus,
  payload: StatusPayload,
  position: GroundPoint,
  origin: GroundPoint,
  resistance = 1,
): void {
  if (payload.stun && payload.stun > 0)
    status.stun = Math.max(status.stun, payload.stun * resistance);
  if (payload.slow && payload.slow.seconds > 0) {
    const multiplier = Math.max(GAME.status.slowFloor, Math.min(1, payload.slow.multiplier));
    // A stronger slow wins; an equal or weaker one only refreshes the timer.
    status.slowMultiplier =
      status.slow > 0 ? Math.min(status.slowMultiplier, multiplier) : multiplier;
    status.slow = Math.max(status.slow, payload.slow.seconds);
  }
  if (payload.shred && payload.shred.seconds > 0) {
    status.shredBonus =
      status.shred > 0 ? Math.max(status.shredBonus, payload.shred.bonus) : payload.shred.bonus;
    status.shred = Math.max(status.shred, payload.shred.seconds);
  }
  if (payload.knockback) {
    const away = unit(origin, position);
    const seconds = Math.max(0.05, payload.knockback.seconds * resistance);
    const { vx, vy } = forcedVelocity(away, payload.knockback.distance * resistance, seconds);
    status.forced = seconds;
    status.forcedVx = vx;
    status.forcedVy = vy;
  }
  if (payload.pull) {
    const toward = unit(position, origin);
    const travel = Math.min(
      payload.pull.distance,
      Math.max(0, toward.length - payload.pull.stopAt),
    );
    if (travel > 0) {
      const seconds = Math.max(0.05, payload.pull.seconds);
      const { vx, vy } = forcedVelocity(toward, travel, seconds);
      status.forced = seconds;
      status.forcedVx = vx;
      status.forcedVy = vy;
    }
  }
}

/** Counts every timer down; expired effects return to neutral values. */
export function tickEnemyStatus(status: EnemyStatus, dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return;
  status.stun = Math.max(0, status.stun - dt);
  status.slow = Math.max(0, status.slow - dt);
  status.shred = Math.max(0, status.shred - dt);
  status.forced = Math.max(0, status.forced - dt);
  if (status.slow <= 0) status.slowMultiplier = 1;
  if (status.shred <= 0) status.shredBonus = 0;
  if (status.forced <= 0) {
    status.forcedVx = 0;
    status.forcedVy = 0;
  }
}

export const isStunned = (status: EnemyStatus): boolean => status.stun > 0;

/** Pinned (gallop, pin arrows) or stunned enemies cannot move, shoot, charge or cast. */
export const isEnemyDisabled = (enemy: { pinned: number; status: EnemyStatus }): boolean =>
  enemy.pinned > 0 || enemy.status.stun > 0;

/** Fraction of normal speed an enemy keeps from slows. */
export const statusSpeedMultiplier = (status: EnemyStatus): number =>
  status.slow > 0 ? status.slowMultiplier : 1;

/** Damage multiplier from armour shred. */
export const statusDamageMultiplier = (status: EnemyStatus): number =>
  status.shred > 0 ? 1 + status.shredBonus : 1;

/** True while the enemy's armour reduction is stripped away. */
export const isShredded = (status: EnemyStatus): boolean => status.shred > 0;

/** Timed defences on the Khan. Saved in the combat timers. */
export interface KhanStatus {
  /** Seconds of damage reduction (`reduction` is the fraction removed from each hit). */
  guard: number;
  reduction: number;
  /** Seconds the Khan ignores knockback, stuns and terrain slows. */
  unstoppable: number;
  /** Fraction of ride speed kept while guarding. */
  speedMultiplier: number;
  /** Seconds of fortress stance left, and the time until its next sweep. */
  fortress: number;
  fortressTimer: number;
  /** Absorbs damage after the reduction. Only the fortress stance refills it. */
  shield: number;
  shieldMax: number;
  shieldPerSecond: number;
}

/** The Khan's status record in a timers object, created on first use (older saves lack it). */
export function khanStatusOf(timers: { khanStatus?: KhanStatus }): KhanStatus {
  return (timers.khanStatus ??= createKhanStatus());
}

export function createKhanStatus(): KhanStatus {
  return {
    guard: 0,
    reduction: 0,
    unstoppable: 0,
    speedMultiplier: 1,
    fortress: 0,
    fortressTimer: 0,
    shield: 0,
    shieldMax: 0,
    shieldPerSecond: 0,
  };
}

/** Starts or refreshes a damage-reduction guard; the stronger reduction wins. */
export function guardKhan(
  status: KhanStatus,
  options: {
    duration: number;
    reduction: number;
    speedMultiplier?: number;
    unstoppable?: boolean;
  },
): void {
  status.reduction =
    status.guard > 0 ? Math.max(status.reduction, options.reduction) : options.reduction;
  status.speedMultiplier =
    status.guard > 0
      ? Math.min(status.speedMultiplier, options.speedMultiplier ?? 1)
      : (options.speedMultiplier ?? 1);
  status.guard = Math.max(status.guard, options.duration);
  if (options.unstoppable) status.unstoppable = Math.max(status.unstoppable, options.duration);
}

export function tickKhanStatus(status: KhanStatus, dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return;
  status.guard = Math.max(0, status.guard - dt);
  status.unstoppable = Math.max(0, status.unstoppable - dt);
  if (status.fortress > 0) {
    status.fortress = Math.max(0, status.fortress - dt);
    status.shield = Math.min(status.shieldMax, status.shield + status.shieldPerSecond * dt);
  }
  if (status.fortress <= 0) {
    status.fortressTimer = 0;
    status.shield = 0;
    status.shieldMax = 0;
    status.shieldPerSecond = 0;
  }
  if (status.guard <= 0) {
    status.reduction = 0;
    status.speedMultiplier = 1;
  }
}

export const isKhanUnstoppable = (status: KhanStatus): boolean => status.unstoppable > 0;
export const isKhanGuarded = (status: KhanStatus): boolean =>
  status.guard > 0 || status.fortress > 0 || status.shield > 0;

/** Ride-speed fraction kept while braced or in a stance. */
export const khanStatusSpeed = (status: KhanStatus): number =>
  status.guard > 0 ? status.speedMultiplier : 1;

/** Adds to the stance shield, never above its cap. */
export function addShield(status: KhanStatus, amount: number): void {
  if (status.fortress > 0 && amount > 0)
    status.shield = Math.min(status.shieldMax, status.shield + amount);
}

/**
 * Damage the Khan still takes after reduction and shield. The shield absorbs what the
 * reduction lets through; the remainder goes on to the class's own damage multiplier.
 */
export function mitigateKhanDamage(status: KhanStatus, amount: number): number {
  let remaining = status.guard > 0 ? amount * (1 - status.reduction) : amount;
  if (status.shield > 0 && remaining > 0) {
    const absorbed = Math.min(status.shield, remaining);
    status.shield -= absorbed;
    remaining -= absorbed;
  }
  return remaining;
}
