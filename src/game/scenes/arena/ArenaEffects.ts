import { effectAmount } from '../../../shared/visualSettings';
import type { ArenaContext } from './ArenaContext';

/** Short-lived visual feedback. Gameplay actors use the bounded pools instead. */
export class ArenaEffects {
  constructor(private readonly arena: ArenaContext) {}

  /** Sparks scattered from a point, scaled by the effect-density setting. */
  burst(x: number, y: number, color: number, count: number): void {
    const { scene } = this.arena;
    count = Math.ceil(count * effectAmount(this.arena.visualSettings));
    for (let i = 0; i < count; i += 1) {
      const spark = scene.add
        .image(x, y, 'spark')
        .setDisplaySize(9, 9)
        .setTint(color)
        .setDepth(9600);
      const angle = Math.random() * Math.PI * 2;
      const distance = 8 + Math.random() * 20;
      scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        duration: 180 + Math.random() * 160,
        onComplete: () => spark.destroy(),
      });
    }
  }

  /**
   * A ground ring: it grows outward from the centre, or (inward) closes on it from
   * `radius`. Decorative, so it is skipped when effects are minimal.
   */
  ring(x: number, y: number, radius: number, color: number, inward = false): void {
    if (effectAmount(this.arena.visualSettings) <= 0) return;
    const { scene } = this.arena;
    const ring = scene.add
      .circle(x, y, radius, color, 0.07)
      .setStrokeStyle(3, color, 0.85)
      .setDepth(9500)
      .setScale(inward ? 1 : 0.3);
    scene.tweens.add({
      targets: ring,
      scale: inward ? 0.3 : 1,
      alpha: 0,
      duration: 320,
      onComplete: () => ring.destroy(),
    });
  }

  /** A fading wedge showing the reach of a melee sweep toward `direction`. */
  sweep(
    x: number,
    y: number,
    direction: { x: number; y: number },
    range: number,
    angle: number,
    color: number,
  ): void {
    if (effectAmount(this.arena.visualSettings) <= 0) return;
    const { scene } = this.arena;
    const heading = Math.atan2(direction.y, direction.x);
    const wedge = scene.add
      .graphics()
      .setDepth(9500)
      .fillStyle(color, 0.22)
      .slice(x, y, range, heading - angle / 2, heading + angle / 2, false)
      .fillPath()
      .lineStyle(3, color, 0.75)
      .strokePath();
    scene.tweens.add({
      targets: wedge,
      alpha: 0,
      duration: 260,
      onComplete: () => wedge.destroy(),
    });
  }

  /** A short camera jolt for heavy impacts. */
  shake(duration: number, intensity: number): void {
    if (effectAmount(this.arena.visualSettings) <= 0) return;
    this.arena.scene.cameras.main.shake(duration, intensity);
  }

  /** One dust puff behind a rider at (x, y) facing along `facingX`. */
  dust(x: number, y: number, facingX: number, galloping: boolean): void {
    const { scene } = this.arena;
    const dust = scene.add
      .image(x - facingX * 14, y + 3, 'dust')
      .setDepth(98 + y)
      .setAlpha(galloping ? 0.8 : 0.35)
      .setScale(0.4);
    scene.tweens.add({
      targets: dust,
      alpha: 0,
      scale: 1.3,
      x: dust.x - facingX * 15,
      duration: 700,
      onComplete: () => dust.destroy(),
    });
  }
}
