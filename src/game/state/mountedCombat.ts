import { GAME } from '../config';
import type { RunState } from '../types';
import { isKhanActive } from './khan';
export interface GroundPoint {
  x: number;
  y: number;
}
export interface MountedCombatState {
  previous?: GroundPoint;
  heading?: GroundPoint;
  rideSeconds: number;
  ready: boolean;
  gallopSerial: number;
  volleys: number;
  trails: (GroundPoint & { remaining: number })[];
}
export function createMountedCombat(): MountedCombatState {
  return { rideSeconds: 0, ready: false, gallopSerial: 0, volleys: 0, trails: [] };
}
/** Measures real travelled ground, so pressing into a wall cannot build momentum or charged volleys. */
export function advanceMountedCombat(
  run: RunState,
  dt: number,
  position: GroundPoint,
  galloping: boolean,
): void {
  if (run.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
  const c = run.combat;
  c.trails = c.trails
    .map((t) => ({ ...t, remaining: t.remaining - dt }))
    .filter((t) => t.remaining > 0);
  if (!isKhanActive(run)) {
    c.previous = undefined;
    c.heading = undefined;
    c.rideSeconds = 0;
    c.ready = false;
    run.clan.momentum = 0;
    return;
  }
  const dx = c.previous ? position.x - c.previous.x : 0,
    dy = c.previous ? position.y - c.previous.y : 0;
  const distance = Math.hypot(dx, dy),
    speed = distance / dt;
  // Reject terrain relocation and debug teleports as riding skill.
  const moving = speed > GAME.mounted.minimumSpeed && speed < GAME.dash.speed * 1.6;
  const heading = moving ? { x: dx / distance, y: dy / distance } : undefined;
  const turn = heading && c.heading ? heading.x * c.heading.x + heading.y * c.heading.y : 1;
  const steady = moving && turn > 0.2;
  run.clan.momentum = Math.max(
    0,
    Math.min(
      1,
      run.clan.momentum + dt * (steady ? GAME.mounted.momentumGain : -GAME.mounted.momentumLoss),
    ),
  );
  c.rideSeconds = steady
    ? Math.min(GAME.mounted.chargeSeconds, c.rideSeconds + dt)
    : Math.max(0, c.rideSeconds - dt * 2);
  if (turn < 0.2) run.clan.momentum *= 0.8;
  c.ready = c.rideSeconds >= GAME.mounted.chargeSeconds;
  if (
    galloping &&
    (run.upgrades['turned-earth'] ?? 0) > 0 &&
    (!c.trails.length ||
      Math.hypot(position.x - c.trails.at(-1)!.x, position.y - c.trails.at(-1)!.y) >
        GAME.mounted.trailSpacing)
  ) {
    c.trails.push({ x: position.x, y: position.y, remaining: GAME.mounted.trailSeconds });
    if (c.trails.length > GAME.mounted.maxTrails) c.trails.shift();
  }
  c.previous = { x: position.x, y: position.y };
  c.heading = heading;
}
export function spendMountedVolley(run: RunState): boolean {
  if (!run.combat.ready || !isKhanActive(run)) return false;
  run.combat.ready = false;
  run.combat.rideSeconds = 0;
  return true;
}
export function retreatShot(
  run: RunState,
  player: GroundPoint,
  camp: GroundPoint,
  target: GroundPoint,
  facing: GroundPoint,
): boolean {
  if (run.clan.formation !== 'retreat' || run.clan.momentum <= 0.4) return false;
  return (
    (target.x - player.x) * facing.x + (target.y - player.y) * facing.y < -40 &&
    (player.x - camp.x) * facing.x + (player.y - camp.y) * facing.y > 0
  );
}
