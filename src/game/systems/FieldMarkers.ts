import { CharacterMotion, isCharacterKind } from '../animation/CharacterMotion';
import { renderCharacter } from '../animation/CharacterVisuals';
import Phaser from 'phaser';
import { paintedImage } from '../assets/painterlyArt';
import { FIELD_OBJECTIVES } from '../data/fieldObjectives';
import type { FieldObjective } from '../state/fieldObjectives';

/** Reuses locally painted camp art; one optional objective and a bounded warning drawing. */
export class FieldMarkers {
  private image?: Phaser.GameObjects.Image;
  private motion?: CharacterMotion;
  private previous?: { x: number; y: number };
  private key = '';
  readonly warnings: Phaser.GameObjects.Graphics;
  private readonly ring: Phaser.GameObjects.Graphics;
  constructor(
    private readonly scene: Phaser.Scene,
    warnings?: Phaser.GameObjects.Graphics,
  ) {
    this.ring = scene.add.graphics().setDepth(4);
    this.warnings = warnings ?? scene.add.graphics().setDepth(5);
  }
  update(objective?: Pick<FieldObjective, 'kind' | 'x' | 'y' | 'status'>, dt = 0): void {
    const visible = !!objective && ['available', 'returning'].includes(objective.status);
    this.ring.clear();
    if (!visible) {
      this.image?.setVisible(false);
      this.previous = undefined;
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
      this.motion = isCharacterKind(art) ? new CharacterMotion(art) : undefined;
    }
    this.image!.setVisible(true)
      .setPosition(objective.x, objective.y)
      .setDepth(100 + objective.y);
    if (this.motion && dt > 0) {
      const speed = this.previous
        ? Math.hypot(objective.x - this.previous.x, objective.y - this.previous.y) / dt
        : 0;
      this.motion.advance(dt, speed, false);
      renderCharacter(this.image!, this.motion);
    }
    this.previous = { x: objective.x, y: objective.y };
    this.ring
      .lineStyle(2, objective.kind === 'gathering' ? 0xc47c60 : 0xd6bd80, 0.6)
      .strokeCircle(objective.x, objective.y, 52);
  }
}
