import Phaser from 'phaser';
import type { EnemyDefinition } from '../types';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  definition!: EnemyDefinition;
  health = 0;
  /** Visual motion uses a stable offset instead of allocating individual tweens. */
  bobOffset = 0;
  attackTimer = 0;
  clanAttackTimer = 0;
  chargeTimer = 0;
  burning = 0;
}

export class Projectile extends Phaser.Physics.Arcade.Image {
  damage = 0;
  remaining = 0;
  fire = false;
  tempest = false;
  turn = 0;
}

export class Gem extends Phaser.Physics.Arcade.Image {
  value = 0;
  attracted = false;
}
