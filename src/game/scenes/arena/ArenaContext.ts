import type Phaser from 'phaser';
import type { VisualSettings } from '../../../shared/visualSettings';
import type { SteppeLandscape } from '../../assets/SteppeLandscape';
import type { DeveloperToolsState } from '../../dev/commands';
import type { Enemy } from '../../entities/actors';
import type { GameAudio } from '../../systems/Audio';
import type { SpatialHash } from '../../systems/SpatialHash';
import type { RunState } from '../../types';
import type { ArenaEffects } from './ArenaEffects';
import type { ArenaTimers } from './ArenaTimers';

export type { ArenaTimers } from './ArenaTimers';

/**
 * The world that ArenaScene's systems share. Replaceable state uses live getters
 * over the scene, so a system always sees the current run and the objects that
 * `create` rebuilt on the latest restart. Systems must never store `run`: New
 * Game, Load, Continue Camp and a tradition change all replace it.
 */
export interface ArenaContext {
  readonly scene: Phaser.Scene;
  readonly run: RunState;
  readonly timers: ArenaTimers;
  readonly player: Phaser.Physics.Arcade.Sprite;
  readonly camp: Phaser.GameObjects.Container;
  /** Pool order is part of saved identity; never reorder or recreate it. */
  readonly enemies: Phaser.Physics.Arcade.Group;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly hostileShots: Phaser.Physics.Arcade.Group;
  readonly gems: Phaser.Physics.Arcade.Group;
  readonly landscape: SteppeLandscape;
  readonly spatial: SpatialHash<Enemy>;
  readonly audio: GameAudio;
  readonly visualSettings: VisualSettings;
  readonly facing: Phaser.Math.Vector2;
  /** The clamped zoom the scene last applied. */
  readonly cameraZoom: number;
  /** Development builds only. */
  readonly developerTools?: DeveloperToolsState;
  readonly effects: ArenaEffects;
  /** Sends a fresh HUD snapshot to the interface. */
  readonly hud: { refresh(): void };
}
