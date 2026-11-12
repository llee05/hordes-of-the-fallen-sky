export interface GroundDirection {
  x: number;
  y: number;
}

/** Reusable active-time ride burst. A direction makes it a forced dash. */
export interface KhanManeuverState {
  remaining: number;
  speedMultiplier: number;
  direction?: GroundDirection;
}

export function startKhanManeuver(
  timers: { khanManeuver?: KhanManeuverState },
  duration: number,
  speedMultiplier: number,
  direction?: GroundDirection,
): void {
  timers.khanManeuver = {
    remaining: Math.max(0, duration),
    speedMultiplier: Math.max(0, speedMultiplier),
    direction: direction ? normalized(direction) : undefined,
  };
}

export function advanceKhanManeuver(
  timers: { khanManeuver?: KhanManeuverState },
  dt: number,
): void {
  const maneuver = timers.khanManeuver;
  if (!maneuver || !Number.isFinite(dt) || dt <= 0) return;
  maneuver.remaining = Math.max(0, maneuver.remaining - dt);
  if (maneuver.remaining <= 0) delete timers.khanManeuver;
}

export function activeKhanManeuver(timers: {
  khanManeuver?: KhanManeuverState;
}): KhanManeuverState | undefined {
  return timers.khanManeuver?.remaining ? timers.khanManeuver : undefined;
}

function normalized(direction: GroundDirection): GroundDirection {
  const length = Math.hypot(direction.x, direction.y);
  return length > 0.001 ? { x: direction.x / length, y: direction.y / length } : { x: 1, y: 0 };
}
