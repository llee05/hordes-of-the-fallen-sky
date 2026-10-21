import Phaser from 'phaser';
import type { CharacterMotion } from './CharacterMotion';

type PaintedActor = Phaser.GameObjects.Image | Phaser.Physics.Arcade.Sprite;

export function renderCharacter(actor: PaintedActor, motion: CharacterMotion): void {
  const frame = motion.frame;
  // Every frame has the same logical canvas. Preserve origin, scale, and body
  // offsets rather than letting frame changes resize a physics actor.
  if (actor.frame.name !== frame) actor.setFrame(frame, false, false);
}

class DefeatEcho extends Phaser.GameObjects.Image {
  elapsed = 0;
  restScaleX = 1;
  restScaleY = 1;
}

/** Gameplay bodies leave immediately; these bounded, non-physical copies finish
 * the painted defeat pose using the same active-gameplay clock as characters. */
export class DefeatSprites {
  private readonly images: Phaser.GameObjects.Group;
  private static readonly duration = 0.28;

  constructor(scene: Phaser.Scene) {
    this.images = scene.add.group({ classType: DefeatEcho, maxSize: 32 });
  }

  show(actor: PaintedActor): void {
    const echo = this.images.get(
      actor.x,
      actor.y,
      actor.texture.key,
      actor.frame.name,
    ) as DefeatEcho | null;
    if (!echo) return;
    echo.elapsed = 0;
    echo.restScaleX = actor.scaleX;
    echo.restScaleY = actor.scaleY;
    echo
      .setActive(true)
      .setVisible(true)
      .setTexture(actor.texture.key, actor.frame.name)
      .setPosition(actor.x, actor.y)
      .setOrigin(actor.originX, actor.originY)
      .setScale(actor.scaleX, actor.scaleY)
      .setFlip(actor.flipX, actor.flipY)
      .setAngle(0)
      .setAlpha(0.8)
      .setTint(0xc4baa4)
      .setDepth(100 + actor.y);
  }

  update(dt: number): void {
    for (const echo of this.images.getChildren() as DefeatEcho[]) {
      if (!echo.active) continue;
      echo.elapsed += dt;
      const progress = echo.elapsed / DefeatSprites.duration;
      if (progress >= 1) {
        echo.setActive(false).setVisible(false);
        continue;
      }
      echo
        .setAlpha(0.8 * (1 - progress))
        .setY(echo.y - dt * 10)
        .setScale(echo.restScaleX * (1 + progress * 0.08), echo.restScaleY * (1 - progress * 0.16));
    }
  }
}
