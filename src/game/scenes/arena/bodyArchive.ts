import type Phaser from 'phaser';
import type { BodyArchive } from '../../state/expeditionArchive';

/** The saved position, velocity and facing of one physics actor. */
export function captureBody(
  actor: Phaser.Physics.Arcade.Sprite | Phaser.Physics.Arcade.Image,
): BodyArchive {
  return {
    x: actor.x,
    y: actor.y,
    vx: actor.body!.velocity.x,
    vy: actor.body!.velocity.y,
    flip: actor.flipX,
  };
}
