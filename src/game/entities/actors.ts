import { createEnemyTactics } from '../systems/enemyTactics';
import Phaser from 'phaser';
import type { EnemyDefinition } from '../types';
import { CharacterMotion } from '../animation/CharacterMotion';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  definition!: EnemyDefinition;
  health = 0;
  maxHealth = 0;
  spawnId = 0;
  readonly motion = new CharacterMotion('wolf');
  preparingAttack = false;
  attackTimer = 0;
  clanAttackTimer = 0;
  chargeTimer = 0;
  burning = 0;
  objectiveId?: number;
  crossingId?: string;
  tactics = createEnemyTactics();
  pinned = 0;
  lastGallop = -1;
  dangerTimer = 3;
  tacticalSlot = 0;
}

export class Projectile extends Phaser.Physics.Arcade.Image {
  damage = 0;
  remaining = 0;
  fire = false;
  tempest = false;
  turn = 0;
  pierces = 0;
  pins = false;
  readonly hitTargets = new Map<Enemy, number>();
}

export class Gem extends Phaser.Physics.Arcade.Image {
  value = 0;
  attracted = false;
}
