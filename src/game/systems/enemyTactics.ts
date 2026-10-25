import { GAME } from '../config';
import type { EnemyDefinition } from '../types';
interface Point {
  x: number;
  y: number;
}
export interface EnemyTactics {
  phase: 'approach' | 'windup' | 'charge' | 'recover';
  remaining: number;
  aim?: Point;
  direction?: Point;
}
export function createEnemyTactics(): EnemyTactics {
  return { phase: 'approach', remaining: 0 };
}
/** Intent chooses a tactical goal; navigation remains responsible for every physical move. */
export function tacticalGoal(
  definition: EnemyDefinition,
  from: Point,
  target: Point,
  slot: number,
  time: number,
): Point {
  const distance = Math.hypot(target.x - from.x, target.y - from.y);
  if (
    (definition.tacticalRole === 'pack' || definition.id === 'wisp') &&
    distance > 300 &&
    distance < 800
  ) {
    const side = slot % 2 ? 1 : -1,
      dx = (from.x - target.x) / distance,
      dy = (from.y - target.y) / distance;
    const spread = GAME.tactics.packSpread * (0.75 + (slot % 3) * 0.15);
    return {
      x: target.x + dx * 150 - dy * spread * side,
      y: target.y + dy * 150 + dx * spread * side,
    };
  }
  if (definition.behavior === 'ranged' && distance < 650 && distance > 100) {
    const dx = (from.x - target.x) / distance,
      dy = (from.y - target.y) / distance;
    const turn = Math.sin(Math.floor(time / 6) + slot) * 0.35;
    return {
      x:
        target.x +
        (dx - dy * turn) *
          (definition.tacticalRole === 'skirmisher' ? 280 : GAME.tactics.seerRange),
      y:
        target.y +
        (dy + dx * turn) *
          (definition.tacticalRole === 'skirmisher' ? 280 : GAME.tactics.seerRange),
    };
  }
  return target;
}
export function advanceCharge(
  state: EnemyTactics,
  dt: number,
  from: Point,
  target: Point,
  blocked: boolean,
  pinned: boolean,
): void {
  if (!Number.isFinite(dt) || dt <= 0) return;
  if (pinned) {
    state.phase = 'recover';
    state.remaining = GAME.tactics.chargeRecovery;
    return;
  }
  state.remaining = Math.max(0, state.remaining - dt);
  if (
    state.phase === 'approach' &&
    Math.hypot(target.x - from.x, target.y - from.y) < GAME.tactics.chargeRange
  ) {
    state.phase = 'windup';
    state.remaining = GAME.tactics.chargeWarning;
    state.aim = { x: target.x, y: target.y };
    const distance = Math.max(1, Math.hypot(target.x - from.x, target.y - from.y));
    state.direction = { x: (target.x - from.x) / distance, y: (target.y - from.y) / distance };
  } else if (state.phase === 'windup' && state.remaining <= 0) {
    state.phase = blocked ? 'recover' : 'charge';
    state.remaining = blocked ? GAME.tactics.chargeRecovery : GAME.tactics.chargeDuration;
  } else if (state.phase === 'charge' && (state.remaining <= 0 || blocked)) {
    state.phase = 'recover';
    state.remaining = GAME.tactics.chargeRecovery;
  } else if (state.phase === 'recover' && state.remaining <= 0) {
    state.phase = 'approach';
  }
}
export function seerDangerRadius(definition: EnemyDefinition): number {
  return definition.id === 'hollow-seer' ? GAME.tactics.seerDangerRadius : 0;
}
