import Phaser from 'phaser';
import type { CharacterBanner } from '../../shared/characterProfile';
import { cachedClanStandard } from './clanStandardCache';

/** Painted layers are flattened once per profile; active frames move one sprite. */
export class ClanStandard extends Phaser.GameObjects.Image {
  private readonly restScale: number;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, banner?: CharacterBanner) {
    const cached = cachedClanStandard(scene, banner);
    super(scene, x, y, 'steppe-classes-motion', cached.frame);
    this.restScale = width / 128;
    this.setName('banner')
      .setOrigin(0.5, 0.9)
      .setScale(this.restScale)
      .setData('appearance', cached.appearance);
    scene.add.existing(this);
  }

  sway(activeSeconds: number): void {
    this.setScale(
      this.restScale * (1 + Math.sin(activeSeconds * 2.3 + this.x) * 0.035),
      this.restScale,
    ).setAngle(Math.sin(activeSeconds * 1.7 + this.x) * 1.2);
  }
}
