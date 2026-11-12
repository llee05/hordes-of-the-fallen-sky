import { GAME } from '../config.js';

export interface Point {
  x: number;
  y: number;
}

/** A short movement or empowered-contact action kept in the save-safe scene timers. */
export interface ClassActionState {
  kind: 'dash' | 'unstoppable';
  remaining: number;
  duration: number;
  directionX: number;
  directionY: number;
  speed: number;
  previousX: number;
  previousY: number;
  distance: number;
  startSpeed: number;
  hits: string[];
  maxDuration: number;
  extension: number;
}

/** Normalized held duration used by any charged attack. */
export function chargeRatio(held: number, maximum: number): number {
  if (!Number.isFinite(held) || !Number.isFinite(maximum) || maximum <= 0) return 0;
  return Math.max(0, Math.min(1, held / maximum));
}

/** Linear scale from an attack's base value to its fully charged multiplier. */
export function chargedValue(base: number, maximumMultiplier: number, ratio: number): number {
  return base * (1 + (maximumMultiplier - 1) * Math.max(0, Math.min(1, ratio)));
}

/** Breakthrough rewards both entry speed and how much of its lane has been travelled. */
export function breakthroughDamage(
  base: number,
  speedScale: number,
  distanceScale: number,
  startSpeed: number,
  referenceSpeed: number,
  distance: number,
  maximumDistance: number,
): number {
  const speed = Math.max(0, startSpeed) / Math.max(1, referenceSpeed);
  const travel = Math.max(0, Math.min(1, distance / Math.max(1, maximumDistance)));
  return base + speedScale * speed + distanceScale * travel;
}

/** Distance from `point` to a finite line segment. */
export function distanceToSegment(point: Point, from: Point, to: Point): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared <= 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared),
        );
  return Math.hypot(point.x - (from.x + dx * t), point.y - (from.y + dy * t));
}

/**
 * Finds the furthest safe vault landing toward `direction`. Only the landing has to
 * be walkable, allowing the path between to cross enemies and blocking terrain.
 */
export function safeVaultLanding(
  origin: Point,
  direction: Point,
  distance: number,
  walkable: (point: Point) => boolean,
  probes = 12,
): Point {
  const length = Math.hypot(direction.x, direction.y) || 1;
  const unit = { x: direction.x / length, y: direction.y / length };
  const clearance = GAME.terrain.actorClearance;
  for (let probe = 0; probe <= probes; probe++) {
    const travel = distance * (1 - probe / probes);
    const point = {
      x: Math.max(clearance, Math.min(GAME.worldSize - clearance, origin.x + unit.x * travel)),
      y: Math.max(clearance, Math.min(GAME.worldSize - clearance, origin.y + unit.y * travel)),
    };
    if (walkable(point)) return point;
  }
  return { ...origin };
}

/** Extends a timed state without exceeding its authored total-duration cap. */
export function extendAction(
  remaining: number,
  elapsed: number,
  extension: number,
  cap: number,
): number {
  return Math.min(Math.max(0, cap - elapsed), Math.max(0, remaining) + Math.max(0, extension));
}
