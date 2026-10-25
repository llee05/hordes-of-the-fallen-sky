import { GAME } from '../config';
import { projectGround } from '../world3d/worldProjection';

interface Point {
  x: number;
  y: number;
}
export interface ProjectedGroundView {
  focus: Point & { elevation: number };
  /** Orthographic extents in projected world units, before conversion to screen pixels. */
  width: number;
  height: number;
  angle: number;
  yaw: number;
}
export interface SpawnGround {
  heightAt(x: number, y: number): number;
  walkable(x: number, y: number): boolean;
}

export function withinProjectedView(
  view: ProjectedGroundView,
  point: Point,
  elevation: number,
  padding = 0,
): boolean {
  const projected = projectGround(
    point.x - view.focus.x,
    point.y - view.focus.y,
    elevation - view.focus.elevation,
    view.angle,
    view.yaw,
  );
  return (
    Math.abs(projected.x) <= view.width / 2 + padding &&
    Math.abs(projected.y) <= view.height / 2 + padding
  );
}

/** Find connected arrivals just outside the actual angled camera, independently of chunk-streaming bounds. */
export function projectedEnemySpawnPosition(
  view: ProjectedGroundView,
  anchor: Point,
  player: Point | undefined,
  angle: number,
  ground: SpawnGround,
): Point | undefined {
  const C = GAME.spawning,
    padding = GAME.terrain.actorClearance;
  const inside = (p: Point, margin: number = GAME.camera.spawnMargin) =>
    withinProjectedView(view, p, ground.heightAt(p.x, p.y), margin);
  const valid = (p: Point) =>
    p.x >= padding &&
    p.y >= padding &&
    p.x <= GAME.worldSize - padding &&
    p.y <= GAME.worldSize - padding &&
    (!player || Math.hypot(p.x - player.x, p.y - player.y) >= C.minimumPlayerDistance) &&
    ground.walkable(p.x, p.y);
  let fallback: Point | undefined;
  let farthest = -1;
  for (let attempt = 0; attempt < C.directions; attempt++) {
    const direction = angle + (attempt * Math.PI * 2) / C.directions;
    const dx = Math.cos(direction),
      dy = Math.sin(direction);
    const edge = Math.min(
      Math.abs(dx) < 0.00001
        ? Infinity
        : ((dx > 0 ? GAME.worldSize - padding : padding) - anchor.x) / dx,
      Math.abs(dy) < 0.00001
        ? Infinity
        : ((dy > 0 ? GAME.worldSize - padding : padding) - anchor.y) / dy,
    );
    if (edge <= 0 || !Number.isFinite(edge)) continue;
    const at = (distance: number): Point => ({
      x: anchor.x + dx * distance,
      y: anchor.y + dy * distance,
    });
    let low = 0,
      high = Math.min(C.minimumAnchorDistance, edge);
    while (inside(at(high)) && high < edge) {
      low = high;
      high = Math.min(edge, high * 1.6 + C.probeStep);
    }
    if (inside(at(high))) {
      for (let probe = 0; probe < C.groundProbes; probe++) {
        const distance = high - probe * C.probeStep;
        if (distance < C.minimumAnchorDistance) break;
        const point = at(distance);
        if (distance > farthest && valid(point)) {
          farthest = distance;
          fallback = point;
          break;
        }
      }
      continue;
    }
    // Sampling real terrain elevation avoids both cliff-top pop-in and over-wide ground AABBs.
    if (inside(at(low)))
      for (let i = 0; i < 9; i++) {
        const mid = (low + high) / 2;
        if (inside(at(mid))) low = mid;
        else high = mid;
      }
    high = Math.max(Math.min(C.minimumAnchorDistance, edge), high);
    for (let probe = 0; probe < C.groundProbes; probe++) {
      const distance = high + probe * C.probeStep;
      if (distance > edge) break;
      const point = at(distance);
      if (
        !inside(point) &&
        valid(point) &&
        (distance <= C.despawnDistance || inside(point, C.viewRetentionMargin))
      )
        return point;
    }
  }
  // If the whole playable world fits on screen there is no invisible ground. Use a distant valid edge.
  const worldVisible = [
    { x: padding, y: padding },
    { x: GAME.worldSize - padding, y: padding },
    { x: padding, y: GAME.worldSize - padding },
    { x: GAME.worldSize - padding, y: GAME.worldSize - padding },
  ].every((p) => inside(p, 0));
  return worldVisible ? fallback : undefined;
}
