export interface GroundPoint {
  x: number;
  y: number;
}

/** Unit movement toward a held cursor target, settling instead of orbiting at close range. */
export function movementTowardCursor(
  rider: GroundPoint,
  target: GroundPoint | undefined,
  settleRadius = 18,
): GroundPoint {
  if (!target) return { x: 0, y: 0 };
  const dx = target.x - rider.x;
  const dy = target.y - rider.y;
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance <= settleRadius) return { x: 0, y: 0 };
  return { x: dx / distance, y: dy / distance };
}

/** A stable aim direction; a zero-length cursor offset keeps the prior facing. */
export function aimedDirection(
  rider: GroundPoint,
  target: GroundPoint,
  fallback: GroundPoint = { x: 1, y: 0 },
): GroundPoint {
  const dx = target.x - rider.x;
  const dy = target.y - rider.y;
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance < 0.001) return { ...fallback };
  return { x: dx / distance, y: dy / distance };
}

/** Whether a target lies inside a forward capsule-like attack lane. */
export function insideAttackLine(
  origin: GroundPoint,
  direction: GroundPoint,
  target: GroundPoint,
  range: number,
  width: number,
): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const forward = dx * direction.x + dy * direction.y;
  const sideways = Math.abs(dx * direction.y - dy * direction.x);
  return forward >= 0 && forward <= range && sideways <= width / 2;
}

/** Whether a target lies inside a forward-facing circular arc. */
export function insideAttackArc(
  origin: GroundPoint,
  direction: GroundPoint,
  target: GroundPoint,
  range: number,
  angle: number,
): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= 0.001 || distance > range) return false;
  const cosine = (dx * direction.x + dy * direction.y) / distance;
  return cosine >= Math.cos(angle / 2);
}
