import type { RunState } from '../types';
export interface GroundPoint {
  x: number;
  y: number;
}
export interface MountedCombatState {
  gallopSerial: number;
  volleys: number;
  trails: (GroundPoint & { remaining: number })[];
}
export function createMountedCombat(): MountedCombatState {
  return { gallopSerial: 0, volleys: 0, trails: [] };
}
/** Fades the remaining slowing trails over active gameplay seconds. */
export function advanceMountedCombat(run: RunState, dt: number): void {
  if (run.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
  const c = run.combat;
  c.trails = c.trails
    .map((t) => ({ ...t, remaining: t.remaining - dt }))
    .filter((t) => t.remaining > 0);
}
