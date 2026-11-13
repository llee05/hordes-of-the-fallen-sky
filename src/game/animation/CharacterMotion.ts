import type { CharacterClassId } from '../../shared/characterProfile';

const PROFILES = {
  worker: { sheet: 'clan', stride: 30, idleFps: 1, recovery: 0.18, resting: true },
  packhorse: { sheet: 'clan', stride: 50, idleFps: 0.8, recovery: 0.18, resting: true },
  player: { sheet: 'mounted', stride: 70, idleFps: 0, recovery: 0.18 },
  rider: { sheet: 'mounted', stride: 65, idleFps: 0, recovery: 0.18 },
  wolf: { sheet: 'mounted', stride: 35, idleFps: 0, recovery: 0.2 },
  ghost: { sheet: 'mounted', stride: 65, idleFps: 0, recovery: 0.22 },
  shade: { sheet: 'creature', stride: 50, idleFps: 3, recovery: 0.22 },
  earth: { sheet: 'creature', stride: 45, idleFps: 0, recovery: 0.25 },
  seer: { sheet: 'creature', stride: 50, idleFps: 2, recovery: 0.24 },
  skybreaker: { sheet: 'creature', stride: 65, idleFps: 0, recovery: 0.3 },
} as const;

export type CharacterKind = keyof typeof PROFILES;
export const CHARACTER_KINDS = Object.keys(PROFILES) as CharacterKind[];
export const MOTION_SHEETS = [
  'mounted',
  'creature',
  'clan',
  'classes',
  'classes-directional',
] as const;
export const CHARACTER_DIRECTIONS = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'] as const;
export type CharacterDirection = (typeof CHARACTER_DIRECTIONS)[number];
export interface MotionArchive {
  cycle: number;
  releaseRemaining: number;
  hurtRemaining: number;
  moving: boolean;
  windingUp: boolean;
}

export function isCharacterKind(name: string): name is CharacterKind {
  return Object.hasOwn(PROFILES, name);
}

export function characterTexture(kind: CharacterKind): [string, string] {
  return [`steppe-${PROFILES[kind].sheet}-motion`, `${kind}-move-0`];
}

/** A presentation clock driven only by active gameplay seconds. It never uses
 * wall time, Phaser's automatic animation update, or physics transforms. */
export class CharacterMotion {
  private kind: CharacterKind;
  private cycle = 0;
  private releaseRemaining = 0;
  private hurtRemaining = 0;
  private moving = false;
  private windingUp = false;
  private playerClass?: CharacterClassId;
  private direction: CharacterDirection = 'e';

  /** Appearance comes from the profile, never from the motion save archive. */
  setPlayerClass(classId: CharacterClassId): void {
    this.playerClass = classId;
  }

  get texture(): string {
    if (this.directional) return 'steppe-classes-directional-motion';
    return this.kind === 'player' && this.playerClass
      ? 'steppe-classes-motion'
      : characterTexture(this.kind)[0];
  }

  /** Directional class art keeps the horse gait and rider upper body on independent layers. */
  get directional(): boolean {
    return this.kind === 'player' && this.playerClass === 'mounted-archer';
  }

  constructor(kind: CharacterKind, offset = 0) {
    this.kind = kind;
    this.reset(kind, offset);
  }

  reset(kind: CharacterKind, offset = 0): void {
    this.kind = kind;
    this.cycle = ((offset % 1) + 1) % 1;
    this.releaseRemaining = 0;
    this.hurtRemaining = 0;
    this.moving = false;
    this.windingUp = false;
    this.direction = 'e';
  }

  capture(): MotionArchive {
    const { cycle, releaseRemaining, hurtRemaining, moving, windingUp } = this;
    return { cycle, releaseRemaining, hurtRemaining, moving, windingUp };
  }

  restore(state: MotionArchive): void {
    Object.assign(this, state);
  }

  advance(dt: number, speed: number, windingUp = false): void {
    if (dt <= 0) return;
    const profile = PROFILES[this.kind];
    this.moving = speed > 2;
    this.windingUp = windingUp;
    const fps = this.moving
      ? Math.min(14, Math.max(4, (speed / profile.stride) * 4))
      : profile.idleFps;
    this.cycle = (this.cycle + (dt * fps) / 4) % 1;
    this.releaseRemaining = Math.max(0, this.releaseRemaining - dt);
    this.hurtRemaining = Math.max(0, this.hurtRemaining - dt);
  }

  attack(): void {
    this.releaseRemaining = PROFILES[this.kind].recovery;
  }

  /** Selects one of eight screen-space facings without changing movement or combat state. */
  face(x: number, y: number): void {
    if (x * x + y * y <= 0.0001) return;
    const octant = Math.round(Math.atan2(y, x) / (Math.PI / 4));
    this.direction = CHARACTER_DIRECTIONS[(octant + 8) % 8]!;
  }

  hit(): void {
    // Continuous burn ticks must not extend a hit flash indefinitely.
    if (this.hurtRemaining <= 0) this.hurtRemaining = 0.1;
  }

  get hurt(): boolean {
    return this.hurtRemaining > 0;
  }

  private get moveFrame(): number {
    return this.moving || PROFILES[this.kind].idleFps > 0 ? Math.floor(this.cycle * 4) : 0;
  }

  /** The upper layer may attack while `frame` continues advancing the horse gait. */
  get upperFrame(): string | undefined {
    if (!this.directional || !this.playerClass) return undefined;
    if (this.releaseRemaining > 0) return `${this.playerClass}-${this.direction}-upper-attack-1`;
    if (this.windingUp) return `${this.playerClass}-${this.direction}-upper-attack-0`;
    return `${this.playerClass}-${this.direction}-upper-move-${this.moveFrame}`;
  }

  get frame(): string {
    const kind = this.kind === 'player' && this.playerClass ? this.playerClass : this.kind;
    if (this.directional) return `${kind}-${this.direction}-move-${this.moveFrame}`;
    if (this.releaseRemaining > 0) return `${kind}-attack-1`;
    if (this.windingUp) return `${kind}-attack-0`;
    if (!this.moving && 'resting' in PROFILES[this.kind])
      return `${this.kind}-attack-${Math.floor(this.cycle * 4) % 2}`;
    return `${kind}-move-${this.moveFrame}`;
  }
}
