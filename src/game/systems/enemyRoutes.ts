import { GAME } from '../config';

/** The waypoint an enemy keeps steering toward between route refreshes. */
export interface EnemyRoute {
  x: number;
  y: number;
  /** What the route leads to; a change of target (Khan or camp) forces a refresh. */
  target: object;
}

/**
 * Frames between route refreshes for an enemy this far from the nearer of its
 * target and the Khan. Close enemies plan every frame.
 */
export function routeInterval(distance: number): number {
  const { nearRange, farRange, midInterval, farInterval } = GAME.enemyRoutes;
  return distance < nearRange ? 1 : distance < farRange ? midInterval : farInterval;
}

/**
 * Whether an enemy recomputes its route this frame. Refreshes are staggered by
 * pool slot, so any `interval` consecutive frames refresh every enemy once.
 * Movement still steers toward the kept waypoint every frame.
 */
export function routeDue(
  route: EnemyRoute | undefined,
  frame: number,
  slot: number,
  distance: number,
  target: object,
  position: { x: number; y: number },
): boolean {
  if (!route || route.target !== target) return true;
  // Re-plan on arrival so an enemy never overshoots or idles on a reached waypoint.
  if (Math.hypot(route.x - position.x, route.y - position.y) <= GAME.enemyRoutes.arrival)
    return true;
  return (frame + slot) % routeInterval(distance) === 0;
}
