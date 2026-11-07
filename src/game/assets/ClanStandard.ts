import Phaser from 'phaser';
import type { CharacterBanner } from '../../shared/characterProfile';
import { clanStandardAppearance } from './clanStandardAppearance';

/** Registered painted layers share a texture, ground anchor and active-time sway. */
export class ClanStandard extends Phaser.GameObjects.Container {
  private readonly restScale: number;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, banner?: CharacterBanner) {
    super(scene, x, y);
    const appearance = clanStandardAppearance(banner);
    this.restScale = width / 256;
    this.setName('banner').setScale(this.restScale);
    for (const [name, frame, tint] of [
      ['banner-pole', appearance.poleFrame, 0xffffff],
      ['banner-field', appearance.fieldFrame, appearance.fieldTint],
      ['banner-trim', appearance.trimFrame, appearance.ornamentTint],
      ['banner-emblem', appearance.emblemFrame, appearance.ornamentTint],
    ] as const) {
      this.add(
        scene.add
          .image(0, 0, 'steppe-classes-motion', frame)
          .setOrigin(0.5, 0.9)
          .setName(name)
          .setTint(tint),
      );
    }
    scene.add.existing(this);
  }

  sway(activeSeconds: number): void {
    this.setScale(
      this.restScale * (1 + Math.sin(activeSeconds * 2.3 + this.x) * 0.035),
      this.restScale,
    ).setAngle(Math.sin(activeSeconds * 1.7 + this.x) * 1.2);
  }
}
