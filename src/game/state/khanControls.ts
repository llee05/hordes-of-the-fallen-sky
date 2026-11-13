export interface GroundPoint {
  x: number;
  y: number;
}

export type CombatNumberAction =
  | { kind: 'ability'; slot: 'q' | 'w' | 'e' | 'r' }
  | { kind: 'successor'; trait: 'outrider' | 'hearthguard' };

/** Number keys cast abilities while the Khan lives, and only 1/2 choose a successor while down. */
export function combatNumberAction(
  key: 1 | 2 | 3 | 4,
  khanActive: boolean,
): CombatNumberAction | undefined {
  const abilitySlots = ['q', 'w', 'e', 'r'] as const;
  if (khanActive) return { kind: 'ability', slot: abilitySlots[key - 1]! };
  if (key === 1) return { kind: 'successor', trait: 'outrider' };
  if (key === 2) return { kind: 'successor', trait: 'hearthguard' };
  return undefined;
}

/** Normalized digital movement shared by WASD and arrow-key input. */
export function digitalMovement(keys: {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}): GroundPoint {
  const x = Number(keys.right) - Number(keys.left);
  const y = Number(keys.down) - Number(keys.up);
  const length = Math.hypot(x, y);
  return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
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
