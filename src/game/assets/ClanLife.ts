import Phaser from 'phaser';
import { CharacterMotion } from '../animation/CharacterMotion';
import { renderCharacter } from '../animation/CharacterVisuals';
import {
  campHorsePosition,
  campWorkerPosition,
  campWorkers,
  CAMP_LIFE_LIMITS,
} from '../state/campLife';
import type { RunState } from '../types';
import { paintedImage } from './painterlyArt';

interface CampActor {
  kind: 'worker' | 'packhorse';
  image: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  motion: CharacterMotion;
}

/** Bounded visual representatives of the existing people and herd, with no physics or extra economy. */
export class ClanLife {
  readonly workers: CampActor[];
  readonly horses: CampActor[];
  private region = -1;
  private stage = '';
  private packing = 0;

  constructor(scene: Phaser.Scene) {
    const pool = (kind: 'worker' | 'packhorse', count: number, width: number): CampActor[] =>
      Array.from({ length: count }, (_, index) => ({
        kind,
        image: paintedImage(scene, 0, 0, kind, width)
          .setName(`camp-${kind}-${index}`)
          .setVisible(false)
          .setAlpha(0),
        shadow: scene.add
          .image(0, 0, 'shadow')
          .setDisplaySize(width * 0.6, width * 0.22)
          .setVisible(false),
        motion: new CharacterMotion(kind, index * 0.137),
      }));
    this.workers = pool('worker', CAMP_LIFE_LIMITS.workers, 30);
    this.horses = pool('packhorse', CAMP_LIFE_LIMITS.horses, 58);
  }

  update(run: RunState, dt: number, anchor: { x: number; y: number }): void {
    if (run.phase !== 'playing' || dt <= 0) return;
    const relocated = this.region !== run.clan.region;
    this.region = run.clan.region;
    if (this.stage !== run.clan.stage) {
      this.packing = run.clan.stage === 'migration' ? 2.4 : 0;
      this.stage = run.clan.stage;
    }
    this.packing = Math.max(0, this.packing - dt);
    const jobs = campWorkers(run);
    const position = (
      actor: CampActor,
      target: { x: number; y: number },
      visible: boolean,
      index: number,
    ): void => {
      const image = actor.image;
      if (!visible) {
        image.setAlpha(Math.max(0, image.alpha - dt * 4));
        if (image.alpha === 0) {
          image.setVisible(false);
          actor.shadow.setVisible(false);
        } else actor.shadow.setAlpha(image.alpha * 0.7);
        return;
      }
      const x = anchor.x + target.x;
      const y = anchor.y + target.y;
      if (!image.visible || relocated) {
        image.setPosition(x, y).setVisible(true).setFlipX(false).clearTint().setAngle(0);
        actor.motion.reset(actor.kind, index * 0.137);
      }
      const oldX = image.x;
      const oldY = image.y;
      image.setPosition(
        Phaser.Math.Linear(oldX, x, Math.min(1, dt * 4)),
        Phaser.Math.Linear(oldY, y, Math.min(1, dt * 4)),
      );
      const speed = Math.hypot(image.x - oldX, image.y - oldY) / dt;
      // A moving caravan's representatives walk even after settling into their travelling rows.
      const walking = run.clan.stage === 'migration' ? Math.max(20, speed) : speed;
      actor.motion.advance(dt, walking);
      renderCharacter(image, actor.motion);
      if (run.clan.stage === 'migration') image.setFlipX(false);
      else if (Math.abs(image.x - oldX) > 0.015) image.setFlipX(image.x < oldX);
      image.setDepth(100 + image.y).setAlpha(Math.min(1, image.alpha + dt * 4));
      actor.shadow
        .setVisible(true)
        .setPosition(image.x + 4, image.y + 2)
        .setDepth(99 + image.y)
        .setAlpha(image.alpha * 0.7);
    };
    this.workers.forEach((actor, index) => {
      const job = jobs[index];
      const target = campWorkerPosition(run, index, job ?? 'ger');
      if (this.packing > 0) {
        const progress = this.packing / 2.4;
        const atWork = campWorkerPosition(run, index, job ?? 'ger', false);
        target.x = Phaser.Math.Linear(target.x, atWork.x, progress);
        target.y = Phaser.Math.Linear(target.y, atWork.y, progress);
      }
      position(actor, target, job !== undefined, index);
    });
    this.horses.forEach((actor, index) =>
      position(actor, campHorsePosition(run, index), index < run.clan.herd, index),
    );
  }

  relocate(): void {
    this.region = -1;
  }
}
