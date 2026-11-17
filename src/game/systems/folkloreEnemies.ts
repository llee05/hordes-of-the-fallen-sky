import { GAME } from '../config';

interface Point {
  x: number;
  y: number;
}

export type FolkloreAttack =
  'claw' | 'slam' | 'charge' | 'bite' | 'poison' | 'burrow' | 'dive' | 'shriek';
export type FolklorePhase = 'approach' | 'windup' | 'attack' | 'recover';

/** Saved, pooled attack state shared by the dedicated folklore enemies. */
export interface FolkloreEnemyState {
  phase: FolklorePhase;
  attack?: FolkloreAttack;
  remaining: number;
  cooldown: number;
  aim?: Point;
  direction?: Point;
  hit: boolean;
  sequence: number;
}

export interface FolkloreStep {
  started?: FolkloreAttack;
  released?: FolkloreAttack;
  emerged?: boolean;
}

export function createFolkloreEnemyState(): FolkloreEnemyState {
  return { phase: 'approach', remaining: 0, cooldown: 1.2, hit: false, sequence: 0 };
}

/** Alternates the worm's ranged spit and burrow ambush while preserving a close bite. */
export function advanceDeathWorm(
  state: FolkloreEnemyState,
  dt: number,
  from: Point,
  target: Point,
  disabled = false,
): FolkloreStep {
  if (!Number.isFinite(dt) || dt <= 0) return {};
  const tuning = GAME.tactics.deathWorm;
  state.cooldown = Math.max(0, state.cooldown - dt);
  if (disabled) {
    state.phase = 'recover';
    state.remaining = tuning.recovery;
    state.hit = false;
    return {};
  }
  state.remaining = Math.max(0, state.remaining - dt);
  const distance = Math.hypot(target.x - from.x, target.y - from.y);
  if (state.phase === 'approach' && state.cooldown <= 0 && distance <= tuning.burrowRange) {
    const attack: FolkloreAttack =
      distance <= tuning.biteRange
        ? 'bite'
        : distance > tuning.poisonRange || state.sequence % 2 === 0
          ? 'burrow'
          : 'poison';
    state.sequence += 1;
    state.phase = 'windup';
    state.attack = attack;
    state.remaining =
      attack === 'bite'
        ? tuning.biteWarning
        : attack === 'poison'
          ? tuning.poisonWarning
          : tuning.burrowWarning;
    state.aim = { x: target.x, y: target.y };
    const safeDistance = Math.max(1, distance);
    state.direction = {
      x: (target.x - from.x) / safeDistance,
      y: (target.y - from.y) / safeDistance,
    };
    state.hit = false;
    return { started: attack };
  }
  if (state.phase === 'windup' && state.remaining <= 0 && state.attack) {
    const released = state.attack;
    state.phase = released === 'burrow' ? 'attack' : 'recover';
    state.remaining = released === 'burrow' ? tuning.burrowDuration : tuning.recovery;
    state.cooldown = tuning.cooldown;
    return { released };
  }
  if (state.phase === 'attack' && state.attack === 'burrow' && state.remaining <= 0) {
    state.phase = 'recover';
    state.remaining = tuning.recovery;
    return { emerged: true };
  }
  if (state.phase === 'recover' && state.remaining <= 0) {
    state.phase = 'approach';
    state.attack = undefined;
    state.aim = undefined;
    state.direction = undefined;
    state.hit = false;
  }
  return {};
}

/** Alternates a committed dive with a stationary supernatural shriek. */
export function advanceMuuShuuvuu(
  state: FolkloreEnemyState,
  dt: number,
  from: Point,
  target: Point,
  disabled = false,
): FolkloreStep {
  if (!Number.isFinite(dt) || dt <= 0) return {};
  const tuning = GAME.tactics.muuShuuvuu;
  state.cooldown = Math.max(0, state.cooldown - dt);
  if (disabled) {
    state.phase = 'recover';
    state.remaining = tuning.recovery;
    state.hit = false;
    return {};
  }
  state.remaining = Math.max(0, state.remaining - dt);
  const distance = Math.hypot(target.x - from.x, target.y - from.y);
  if (state.phase === 'approach' && state.cooldown <= 0 && distance <= tuning.attackRange) {
    const attack: FolkloreAttack = state.sequence % 2 === 0 ? 'dive' : 'shriek';
    state.sequence += 1;
    state.phase = 'windup';
    state.attack = attack;
    state.remaining = attack === 'dive' ? tuning.diveWarning : tuning.shriekWarning;
    state.aim = { x: target.x, y: target.y };
    const safeDistance = Math.max(1, distance);
    state.direction = {
      x: (target.x - from.x) / safeDistance,
      y: (target.y - from.y) / safeDistance,
    };
    state.hit = false;
    return { started: attack };
  }
  if (state.phase === 'windup' && state.remaining <= 0 && state.attack) {
    const released = state.attack;
    state.phase = released === 'dive' ? 'attack' : 'recover';
    state.remaining = released === 'dive' ? tuning.diveDuration : tuning.recovery;
    state.cooldown = tuning.cooldown;
    return { released };
  }
  if (state.phase === 'attack' && state.attack === 'dive' && state.remaining <= 0) {
    state.phase = 'recover';
    state.remaining = tuning.recovery;
  }
  if (state.phase === 'recover' && state.remaining <= 0) {
    state.phase = 'approach';
    state.attack = undefined;
    state.aim = undefined;
    state.direction = undefined;
    state.hit = false;
  }
  return {};
}

/** Stable per-slot orbit target used by the Muu Shuuvuu's overhead circling movement. */
export function muuShuuvuuOrbit(target: Point, activeSeconds: number, slot: number): Point {
  const tuning = GAME.tactics.muuShuuvuu;
  const angle = activeSeconds * tuning.orbitSpeed + slot * 1.91;
  const radius = tuning.orbitRadius + (slot % 3) * 24;
  return {
    x: target.x + Math.cos(angle) * radius,
    y: target.y + Math.sin(angle) * radius,
  };
}

/**
 * Advances the Almas' committed attack cycle. Movement, telegraphs and damage
 * remain scene-owned; this pure clock makes the choices independently testable.
 */
export function advanceAlmas(
  state: FolkloreEnemyState,
  dt: number,
  from: Point,
  target: Point,
  disabled = false,
): FolkloreStep {
  if (!Number.isFinite(dt) || dt <= 0) return {};
  const tuning = GAME.tactics.almas;
  state.cooldown = Math.max(0, state.cooldown - dt);
  if (disabled) {
    if (state.phase !== 'approach') {
      state.phase = 'recover';
      state.remaining = tuning.recovery;
      state.hit = false;
    }
    return {};
  }

  state.remaining = Math.max(0, state.remaining - dt);
  const distance = Math.hypot(target.x - from.x, target.y - from.y);
  if (state.phase === 'approach' && state.cooldown <= 0 && distance <= tuning.chargeRange) {
    const attack: FolkloreAttack =
      distance <= tuning.clawRange ? 'claw' : distance <= tuning.slamRange ? 'slam' : 'charge';
    state.phase = 'windup';
    state.attack = attack;
    state.remaining =
      attack === 'claw'
        ? tuning.clawWarning
        : attack === 'slam'
          ? tuning.slamWarning
          : tuning.chargeWarning;
    state.aim = { x: target.x, y: target.y };
    const safeDistance = Math.max(1, distance);
    state.direction = {
      x: (target.x - from.x) / safeDistance,
      y: (target.y - from.y) / safeDistance,
    };
    state.hit = false;
    return { started: attack };
  }
  if (state.phase === 'windup' && state.remaining <= 0 && state.attack) {
    const released = state.attack;
    state.phase = released === 'charge' ? 'attack' : 'recover';
    state.remaining = released === 'charge' ? tuning.chargeDuration : tuning.recovery;
    state.cooldown = tuning.cooldown;
    return { released };
  }
  if (state.phase === 'attack' && state.remaining <= 0) {
    state.phase = 'recover';
    state.remaining = tuning.recovery;
  } else if (state.phase === 'recover' && state.remaining <= 0) {
    state.phase = 'approach';
    state.attack = undefined;
    state.aim = undefined;
    state.direction = undefined;
    state.hit = false;
  }
  return {};
}
