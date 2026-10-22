import Phaser from 'phaser';
import { paintedImage } from '../assets/painterlyArt';
import { CharacterMotion } from '../animation/CharacterMotion';
import { renderCharacter } from '../animation/CharacterVisuals';
import { GAME } from '../config';
import type { Enemy } from '../entities/actors';
import type { RunState } from '../types';
import type { SpatialHash } from './SpatialHash';
import { isKhanActive } from '../state/khan';

interface GroundPosition {
  x: number;
  y: number;
}

/** Scene-owned support effects; every timer, pose, and position uses active seconds. */
export class PatronSupport {
  private readonly fields: Phaser.GameObjects.Graphics;
  private readonly spirits: {
    image: Phaser.GameObjects.Image;
    shadow: Phaser.GameObjects.Image;
    motion: CharacterMotion;
  }[];
  private ancestorTimer = 0;
  private waterTimer = 0;
  private guardianTimer = 0;

  constructor(scene: Phaser.Scene, position: GroundPosition) {
    this.fields = scene.add.graphics().setDepth(3);
    this.spirits = Array.from({ length: GAME.patrons.ancestors.maximum }, (_, index) => ({
      image: paintedImage(scene, position.x, position.y, 'rider')
        .setVisible(false)
        .setAlpha(0.62)
        .setTint(0x9be2d7),
      shadow: scene.add
        .image(position.x, position.y, 'shadow')
        .setDisplaySize(46, 16)
        .setAlpha(0.3)
        .setVisible(false),
      motion: new CharacterMotion('rider', index * 0.23),
    }));
  }

  relocate(position: GroundPosition): void {
    this.fields.clear();
    for (const spirit of this.spirits) {
      spirit.image.setPosition(position.x, position.y);
      spirit.shadow.setPosition(position.x, position.y);
    }
  }

  update(
    run: RunState,
    dt: number,
    player: GroundPosition,
    camp: GroundPosition,
    spatial: SpatialHash<Enemy>,
    actions: {
      damage: (enemy: Enemy, amount: number) => void;
      volley: (x: number, y: number, target: Enemy, multiplier: number) => void;
    },
  ): void {
    if (run.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    const effects = run.patrons;
    const khanActive = isKhanActive(run);
    const anchor = khanActive ? player : camp;
    this.ancestorTimer -= dt;
    this.waterTimer -= dt;
    this.guardianTimer -= dt;
    this.fields.clear();
    if (effects.water.slow > 0) {
      this.fields.lineStyle(1.5, 0x86beb1, 0.22).fillStyle(0x70a99c, 0.025);
      for (const position of khanActive ? [player, camp] : [camp])
        this.fields
          .fillCircle(position.x, position.y, effects.water.radius)
          .strokeCircle(position.x, position.y, effects.water.radius);
    }
    if (effects.guardian.wardDamage > 0)
      this.fields
        .lineStyle(1, 0xd8bc7e, 0.3)
        .strokeCircle(camp.x, camp.y, GAME.patrons.guardian.wardRadius);

    const count = Math.min(this.spirits.length, effects.ancestors.count);
    if (count === 0) this.ancestorTimer = 0;
    const release = count > 0 && this.ancestorTimer <= 0;
    for (const [index, spirit] of this.spirits.entries()) {
      const active = index < count;
      if (active && !spirit.image.visible) {
        spirit.image.setPosition(anchor.x, anchor.y);
        spirit.motion.reset('rider', index * 0.23);
      }
      spirit.image.setVisible(active);
      spirit.shadow.setVisible(active);
      if (!active) continue;
      const angle = run.elapsed * 0.45 + (index * Math.PI * 2) / count;
      const x = Phaser.Math.Linear(
        spirit.image.x,
        anchor.x + Math.cos(angle) * 80,
        Math.min(1, dt * 5),
      );
      const y = Phaser.Math.Linear(
        spirit.image.y,
        anchor.y + Math.sin(angle) * 60,
        Math.min(1, dt * 5),
      );
      const dx = x - spirit.image.x;
      const speed = Math.hypot(dx, y - spirit.image.y) / dt;
      spirit.image.setPosition(x, y).setDepth(100 + y);
      if (Math.abs(dx) > 0.1) spirit.image.setFlipX(dx < 0);
      spirit.shadow.setPosition(x + 7, y + 4).setDepth(99 + y);
      const target = release ? spatial.nearest(x, y, GAME.patrons.ancestors.range) : undefined;
      if (target) {
        spirit.motion.attack();
        actions.volley(x, y, target, effects.ancestors.damage);
      }
      spirit.motion.advance(dt, speed, false);
      renderCharacter(spirit.image, spirit.motion);
    }
    if (release) this.ancestorTimer = effects.ancestors.interval;

    if (khanActive && effects.water.pulseDamage > 0 && this.waterTimer <= 0) {
      spatial.forEachNearby(player.x, player.y, effects.water.radius, (enemy) => {
        actions.damage(enemy, run.stats.damage * effects.water.pulseDamage);
        if (!enemy.active) return;
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.hypot(dx, dy);
        const nx = distance > 0 ? dx / distance : 1;
        const ny = distance > 0 ? dy / distance : 0;
        enemy.setPosition(
          Phaser.Math.Clamp(enemy.x + nx * GAME.patrons.water.push, 24, GAME.worldSize - 24),
          Phaser.Math.Clamp(enemy.y + ny * GAME.patrons.water.push, 24, GAME.worldSize - 24),
        );
      });
      this.waterTimer = GAME.patrons.water.pulseEvery;
    }
    if (effects.guardian.wardDamage > 0 && this.guardianTimer <= 0) {
      spatial.forEachNearby(camp.x, camp.y, GAME.patrons.guardian.wardRadius, (enemy) =>
        actions.damage(enemy, run.stats.damage * effects.guardian.wardDamage),
      );
      this.guardianTimer = GAME.patrons.guardian.wardEvery;
    }
  }
}
