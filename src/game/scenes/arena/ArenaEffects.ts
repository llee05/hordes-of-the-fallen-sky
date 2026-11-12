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

  /** Expanding translucent ring reused by spirit pulses and sacred areas. */
  ring(x: number, y: number, radius: number, color: number): void {
    const ring = this.arena.scene.add
      .graphics()
      .setPosition(x, y)
      .setDepth(9500)
      .lineStyle(3, color, 0.7)
      .strokeCircle(0, 0, Math.max(8, radius * 0.25));
    this.arena.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 4,
      duration: 420,
      onComplete: () => ring.destroy(),
    });
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
