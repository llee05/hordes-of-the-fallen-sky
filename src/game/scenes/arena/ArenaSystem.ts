import type { ArenaContext } from './ArenaContext';

/**
 * Base for scene systems whose code moved out of ArenaScene. The getters read the
 * shared context live, so moved code keeps its `this.run`/`this.player` shape and
 * always sees the current run and the objects the latest `create` built.
 */
export abstract class ArenaSystem {
  constructor(protected readonly arena: ArenaContext) {}

  protected get run() {
    return this.arena.run;
  }
  protected get timers() {
    return this.arena.timers;
  }
  protected get player() {
    return this.arena.player;
  }
  protected get camp() {
    return this.arena.camp;
  }
  protected get enemies() {
    return this.arena.enemies;
  }
  protected get projectiles() {
    return this.arena.projectiles;
  }
  protected get hostileShots() {
    return this.arena.hostileShots;
  }
  protected get gems() {
    return this.arena.gems;
  }
  protected get landscape() {
    return this.arena.landscape;
  }
  protected get spatial() {
    return this.arena.spatial;
  }
  protected get audio() {
    return this.arena.audio;
  }
  protected get visualSettings() {
    return this.arena.visualSettings;
  }
  protected get facing() {
    return this.arena.facing;
  }
  protected get effects() {
    return this.arena.effects;
  }
  protected get add() {
    return this.arena.scene.add;
  }
  protected get physics() {
    return this.arena.scene.physics;
  }
  protected get cameras() {
    return this.arena.scene.cameras;
  }
  protected get tweens() {
    return this.arena.scene.tweens;
  }
}
