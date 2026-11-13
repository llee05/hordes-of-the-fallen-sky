export interface PendingMountedShot {
  delay: number;
  x: number;
  y: number;
  damage: number;
  range: number;
  width: number;
}

export interface MountedVolleyState {
  shots: number;
  timer: number;
  x: number;
  y: number;
}

export interface MountedRainState {
  x: number;
  y: number;
  warning: number;
  remaining: number;
  tickTimer: number;
  visualTimer: number;
}

export interface MountedWindstepState {
  remaining: number;
  shotTimer: number;
}

/** Saved active-time state for the Mounted Archer's delayed combat effects. */
export interface MountedArcherCombatState {
  basicShots: number;
  pendingShot?: PendingMountedShot;
  parthian?: MountedVolleyState;
  rain?: MountedRainState;
  windstep?: MountedWindstepState;
}

export function createMountedArcherCombatState(): MountedArcherCombatState {
  return { basicShots: 0 };
}
