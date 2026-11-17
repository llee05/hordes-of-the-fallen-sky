export interface SpiritDrumWave {
  delay: number;
  range: number;
  damage: number;
  slowDuration: number;
}

export interface SpiritGuardianState {
  remaining: number;
  attackTimer: number;
  count: number;
  intercepts: number;
}

export interface SpiritOvooState {
  x: number;
  y: number;
  remaining: number;
  pulseTimer: number;
}

/** Active-time Spirit Caller combat state. It is optional in old full saves. */
export interface SpiritCallerCombatState {
  /** Spiritual Energy from saves before the shared class resource; moved on load. */
  energy?: number;
  guardians?: SpiritGuardianState;
  ovoo?: SpiritOvooState;
  veilRemaining: number;
  echoTimer: number;
  drumWaves: SpiritDrumWave[];
}

export function createSpiritCallerCombatState(): SpiritCallerCombatState {
  return { veilRemaining: 0, echoTimer: 0, drumWaves: [] };
}

export function activeSpiritCount(
  state: SpiritCallerCombatState,
  veilMultiplier: number,
  spectralCopies: number,
): number {
  const guardians = state.guardians?.remaining ? state.guardians.count : 0;
  return state.veilRemaining > 0 ? guardians * veilMultiplier + spectralCopies : guardians;
}
