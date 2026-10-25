import Phaser from 'phaser';
import { paintedImage } from '../assets/painterlyArt';
import { FIELD_OBJECTIVES } from '../data/fieldObjectives';
import type { FieldObjective } from '../state/fieldObjectives';

/** Reuses locally painted camp art; one optional objective and a bounded warning drawing. */
export class FieldMarkers {
  private image?: Phaser.GameObjects.Image;
  private key = '';
  readonly warnings: Phaser.GameObjects.Graphics;
  private readonly ring: Phaser.GameObjects.Graphics;
  constructor(private readonly scene: Phaser.Scene) {
    this.ring = scene.add.graphics().setDepth(4);
    this.warnings = scene.add.graphics().setDepth(5);
  }
  update(objective?: FieldObjective): void {
    const visible = !!objective && ['available', 'returning'].includes(objective.status);
    this.ring.clear();
    if (!visible) {
      this.image?.setVisible(false);
      return;
    }
    const art = FIELD_OBJECTIVES[objective.kind].art;
    if (art !== this.key) {
      this.image?.destroy();
      this.image = paintedImage(
        this.scene,
        objective.x,
        objective.y,
        art,
        art === 'worker' ? 38 : 64,
      );
      this.key = art;
    }
    this.image!.setVisible(true)
      .setPosition(objective.x, objective.y)
      .setDepth(100 + objective.y);
    this.ring
      .lineStyle(2, objective.kind === 'gathering' ? 0xc47c60 : 0xd6bd80, 0.6)
      .strokeCircle(objective.x, objective.y, 52);
  }
}
