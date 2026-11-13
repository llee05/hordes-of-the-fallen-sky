import type Phaser from 'phaser';
import { effectAmount } from '../../../shared/visualSettings';
import type { ArenaContext } from './ArenaContext';

export const CLASS_ATTACK_CUES = [
  'mounted-archer:galloping-shot',
  'mounted-archer:piercing-draw',
  'mounted-archer:parthian-shot',
  'mounted-archer:rain-of-arrows',
  'mounted-archer:splintering-arrow',
  'mounted-archer:windstep',
  'lancer:spear-thrust',
  'lancer:impaling-strike',
  'lancer:breakthrough',
  'lancer:sweeping-lance',
  'lancer:lance-vault',
  'lancer:unstoppable-charge',
  'iron-pagoda:heavy-sabre',
  'iron-pagoda:sundering-cleave',
  'iron-pagoda:iron-wall',
  'iron-pagoda:crushing-hooves',
  'iron-pagoda:chain-snare',
  'iron-pagoda:unbroken-fortress',
  'spirit-caller:spirit-wisps',
  'spirit-caller:ancestral-drum',
  'spirit-caller:ongod-guardians',
  'spirit-caller:wind-of-tengri',
  'spirit-caller:sacred-ovoo',
  'spirit-caller:veil-between-worlds',
] as const;

export type ClassAttackCue = (typeof CLASS_ATTACK_CUES)[number];

export interface ClassAttackEffectOptions {
  x: number;
  y: number;
  direction?: { x: number; y: number };
  target?: { x: number; y: number };
  range?: number;
  radius?: number;
}

/** Short-lived visual feedback. Gameplay actors use the bounded pools instead. */
export class ArenaEffects {
  constructor(private readonly arena: ArenaContext) {}

  /**
   * Class-specific painted strokes. These are deliberately short, bounded effects: gameplay
   * events own their timing and this layer never schedules damage or movement.
   */
  classAttack(cue: ClassAttackCue, options: ClassAttackEffectOptions): void {
    if (effectAmount(this.arena.visualSettings) <= 0) return;
    const direction = this.direction(options);
    const range = options.range ?? options.radius ?? 80;
    switch (cue) {
      case 'mounted-archer:galloping-shot':
        this.thrustStroke(options.x, options.y, direction, 38, 0xf4dca8, 2);
        break;
      case 'mounted-archer:piercing-draw':
        this.thrustStroke(options.x, options.y, direction, Math.min(range, 150), 0xffe7a8, 6);
        break;
      case 'mounted-archer:parthian-shot':
        this.fanStroke(options.x, options.y, direction, 54, 0xf4dca8, 3);
        break;
      case 'mounted-archer:rain-of-arrows':
        this.arrowRain(options.target ?? options, options.radius ?? range, 0xe2c586);
        break;
      case 'mounted-archer:splintering-arrow':
        this.fanStroke(options.x, options.y, direction, 62, 0xe2c586, 5);
        break;
      case 'mounted-archer:windstep':
        this.rideTrail(options.x, options.y, direction, 0xb7ddd5);
        break;
      case 'lancer:spear-thrust':
        this.thrustStroke(options.x, options.y, direction, range, 0xf2b36d, 4);
        break;
      case 'lancer:impaling-strike':
        this.thrustStroke(options.x, options.y, direction, range, 0xffd08a, 8);
        break;
      case 'lancer:breakthrough':
        this.rideTrail(options.x, options.y, direction, 0xd98654);
        this.thrustStroke(options.x, options.y, direction, Math.min(range, 110), 0xf2b36d, 5);
        break;
      case 'lancer:sweeping-lance':
        this.slashStroke(options.x, options.y, direction, range, 0xf2b36d, Math.PI * 0.9, 5);
        break;
      case 'lancer:lance-vault':
        this.impactGlyph(options.target ?? options, options.radius ?? 46, 0xe2c586, 4);
        break;
      case 'lancer:unstoppable-charge':
        this.rideTrail(options.x, options.y, direction, 0xe2c586);
        this.auraGlyph(options.x, options.y, options.radius ?? 42, 0xd98654, false);
        break;
      case 'iron-pagoda:heavy-sabre':
        this.slashStroke(options.x, options.y, direction, range, 0xd8dee9, Math.PI * 0.62, 5);
        break;
      case 'iron-pagoda:sundering-cleave':
        this.slashStroke(options.x, options.y, direction, range, 0xe0bc76, Math.PI * 0.88, 9);
        break;
      case 'iron-pagoda:iron-wall':
        this.auraGlyph(options.x, options.y, options.radius ?? 52, 0xd8dee9, true);
        break;
      case 'iron-pagoda:crushing-hooves':
        this.impactGlyph(options, options.radius ?? range, 0xc9a26a, 6);
        break;
      case 'iron-pagoda:chain-snare':
        this.chainGlyph(options.x, options.y, options.radius ?? range, 0x9fc3ff);
        break;
      case 'iron-pagoda:unbroken-fortress':
        this.auraGlyph(options.x, options.y, options.radius ?? range, 0xe0bc76, true);
        break;
      case 'spirit-caller:spirit-wisps':
        this.spiritGlyph(options.x, options.y, direction, 0.75);
        break;
      case 'spirit-caller:ancestral-drum':
        this.impactGlyph(options, options.radius ?? range, 0x72e0d1, 3);
        break;
      case 'spirit-caller:ongod-guardians':
        this.spiritOrbit(options.x, options.y, options.radius ?? 32, 2);
        break;
      case 'spirit-caller:wind-of-tengri':
        this.windLane(options.x, options.y, direction, range, 0x72e0d1);
        break;
      case 'spirit-caller:sacred-ovoo':
        this.auraGlyph(options.x, options.y, options.radius ?? range, 0x72e0d1, false);
        break;
      case 'spirit-caller:veil-between-worlds':
        this.spiritOrbit(options.x, options.y, options.radius ?? 38, 4);
        break;
    }
  }

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

  /** Short-lived progress arc kept close to a charging Khan. */
  charge(x: number, y: number, progress: number, color: number): void {
    const arc = this.arena.scene.add
      .arc(x, y, 20, -90, -90 + Math.max(0.02, Math.min(1, progress)) * 360, false, color, 0.1)
      .setStrokeStyle(3, color, 0.9)
      .setDepth(9600);
    this.arena.scene.tweens.add({
      targets: arc,
      alpha: 0,
      duration: 110,
      onComplete: () => arc.destroy(),
    });
  }

  /** Ground-target warning whose fill grows as impact approaches. */
  telegraph(x: number, y: number, radius: number, color: number, progress: number): void {
    const marker = this.arena.scene.add
      .circle(x, y, radius, color, 0.04 + Math.max(0, Math.min(1, progress)) * 0.1)
      .setStrokeStyle(2, color, 0.8)
      .setScale(1, 0.62)
      .setDepth(9400);
    this.arena.scene.tweens.add({
      targets: marker,
      alpha: 0,
      duration: 150,
      onComplete: () => marker.destroy(),
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

  private direction(options: ClassAttackEffectOptions): { x: number; y: number } {
    if (options.direction) {
      const length = Math.hypot(options.direction.x, options.direction.y);
      if (length > 0.001)
        return { x: options.direction.x / length, y: options.direction.y / length };
    }
    if (options.target) {
      const x = options.target.x - options.x;
      const y = options.target.y - options.y;
      const length = Math.hypot(x, y);
      if (length > 0.001) return { x: x / length, y: y / length };
    }
    return { x: 1, y: 0 };
  }

  private fade(graphics: Phaser.GameObjects.Graphics, duration = 260): void {
    this.arena.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration,
      onComplete: () => graphics.destroy(),
    });
  }

  private thrustStroke(
    x: number,
    y: number,
    direction: { x: number; y: number },
    range: number,
    color: number,
    width: number,
  ): void {
    const endX = x + direction.x * range;
    const endY = y + direction.y * range;
    const startX = x + direction.x * 18;
    const startY = y + direction.y * 18;
    const mark = this.arena.scene.add.graphics().setDepth(9510);
    mark.lineStyle(width + 4, 0x2b221a, 0.48).lineBetween(startX, startY, endX, endY);
    mark.lineStyle(Math.max(2, width), color, 0.9).lineBetween(startX, startY, endX, endY);
    mark
      .fillStyle(0xf4e3b8, 0.9)
      .fillTriangle(
        endX,
        endY,
        endX - direction.x * 13 + direction.y * 5,
        endY - direction.y * 13 - direction.x * 5,
        endX - direction.x * 13 - direction.y * 5,
        endY - direction.y * 13 + direction.x * 5,
      );
    this.fade(mark, 210);
  }

  private slashStroke(
    x: number,
    y: number,
    direction: { x: number; y: number },
    range: number,
    color: number,
    angle: number,
    width: number,
  ): void {
    const heading = Math.atan2(direction.y, direction.x);
    const start = heading - angle / 2;
    const mark = this.arena.scene.add.graphics().setDepth(9510);
    mark
      .lineStyle(width + 5, 0x2b221a, 0.42)
      .beginPath()
      .arc(x, y, range * 0.78, start, start + angle, false)
      .strokePath();
    mark
      .lineStyle(width, color, 0.84)
      .beginPath()
      .arc(x, y, range * 0.78, start, start + angle, false)
      .strokePath();
    this.fade(mark, 250);
  }

  private fanStroke(
    x: number,
    y: number,
    direction: { x: number; y: number },
    range: number,
    color: number,
    count: number,
  ): void {
    const heading = Math.atan2(direction.y, direction.x);
    for (let index = 0; index < count; index++) {
      const offset = (index - (count - 1) / 2) * 0.13;
      this.thrustStroke(
        x,
        y,
        { x: Math.cos(heading + offset), y: Math.sin(heading + offset) },
        range - Math.abs(offset) * 30,
        color,
        2,
      );
    }
  }

  private rideTrail(
    x: number,
    y: number,
    direction: { x: number; y: number },
    color: number,
  ): void {
    const normal = { x: -direction.y, y: direction.x };
    const mark = this.arena.scene.add.graphics().setDepth(9490);
    for (const offset of [-10, 0, 10]) {
      mark
        .lineStyle(3, offset === 0 ? color : 0x2b221a, offset === 0 ? 0.72 : 0.3)
        .lineBetween(
          x + normal.x * offset - direction.x * 18,
          y + normal.y * offset - direction.y * 18,
          x + normal.x * offset - direction.x * 70,
          y + normal.y * offset - direction.y * 70,
        );
    }
    this.fade(mark, 300);
  }

  private auraGlyph(x: number, y: number, radius: number, color: number, inward: boolean): void {
    const mark = this.arena.scene.add.graphics().setDepth(9495);
    mark.lineStyle(5, 0x2b221a, 0.35).strokeCircle(x, y, radius);
    mark.lineStyle(2.5, color, 0.82).strokeCircle(x, y, radius);
    for (let index = 0; index < 4; index++) {
      const angle = index * (Math.PI / 2) + Math.PI / 4;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      mark.fillStyle(0xf4e3b8, 0.82).fillCircle(px, py, 3.5);
    }
    mark.setScale(inward ? 1.08 : 0.72);
    this.arena.scene.tweens.add({
      targets: mark,
      scale: inward ? 0.82 : 1.08,
      alpha: 0,
      duration: 420,
      onComplete: () => mark.destroy(),
    });
  }

  private impactGlyph(
    point: { x: number; y: number },
    radius: number,
    color: number,
    spokes: number,
  ): void {
    const mark = this.arena.scene.add.graphics().setDepth(9500);
    mark.lineStyle(5, 0x2b221a, 0.32).strokeCircle(point.x, point.y, radius * 0.72);
    mark.lineStyle(3, color, 0.8).strokeCircle(point.x, point.y, radius * 0.72);
    for (let index = 0; index < spokes; index++) {
      const angle = (index / spokes) * Math.PI * 2;
      mark.lineBetween(
        point.x + Math.cos(angle) * radius * 0.3,
        point.y + Math.sin(angle) * radius * 0.3,
        point.x + Math.cos(angle) * radius,
        point.y + Math.sin(angle) * radius,
      );
    }
    mark.setScale(0.45);
    this.arena.scene.tweens.add({
      targets: mark,
      scale: 1,
      alpha: 0,
      duration: 330,
      onComplete: () => mark.destroy(),
    });
  }

  private chainGlyph(x: number, y: number, radius: number, color: number): void {
    const mark = this.arena.scene.add.graphics().setDepth(9510);
    for (let index = 0; index < 12; index++) {
      const angle = (index / 12) * Math.PI * 2;
      mark
        .lineStyle(3, index % 2 ? color : 0x2b221a, 0.82)
        .strokeEllipse(
          x + Math.cos(angle) * radius * 0.72,
          y + Math.sin(angle) * radius * 0.72,
          12,
          6,
        );
    }
    this.fade(mark, 360);
  }

  private arrowRain(point: { x: number; y: number }, radius: number, color: number): void {
    const count = Math.max(5, Math.round(11 * effectAmount(this.arena.visualSettings)));
    const mark = this.arena.scene.add.graphics().setDepth(9510);
    for (let index = 0; index < count; index++) {
      const angle = index * 2.399963;
      const distance = radius * Math.sqrt((index + 0.5) / count) * 0.78;
      const x = point.x + Math.cos(angle) * distance;
      const y = point.y + Math.sin(angle) * distance;
      mark.lineStyle(4, 0x2b221a, 0.4).lineBetween(x - 7, y - 15, x + 2, y + 4);
      mark.lineStyle(2, color, 0.9).lineBetween(x - 7, y - 15, x + 2, y + 4);
    }
    this.fade(mark, 300);
  }

  private spiritGlyph(
    x: number,
    y: number,
    direction: { x: number; y: number },
    scale: number,
  ): void {
    const wisp = this.arena.scene.add
      .image(x + direction.x * 20, y + direction.y * 20, 'spirit-wisp')
      .setDisplaySize(32 * scale, 21 * scale)
      .setRotation(Math.atan2(direction.y, direction.x))
      .setDepth(9520)
      .setAlpha(0.9);
    this.arena.scene.tweens.add({
      targets: wisp,
      x: wisp.x + direction.x * 28,
      y: wisp.y + direction.y * 28,
      alpha: 0,
      duration: 260,
      onComplete: () => wisp.destroy(),
    });
  }

  private spiritOrbit(x: number, y: number, radius: number, count: number): void {
    for (let index = 0; index < count; index++) {
      const angle = (index / count) * Math.PI * 2;
      this.spiritGlyph(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius * 0.65,
        { x: -Math.sin(angle), y: Math.cos(angle) },
        0.62,
      );
    }
  }

  private windLane(
    x: number,
    y: number,
    direction: { x: number; y: number },
    range: number,
    color: number,
  ): void {
    const normal = { x: -direction.y, y: direction.x };
    const mark = this.arena.scene.add.graphics().setDepth(9500);
    for (const offset of [-18, 0, 18]) {
      const startX = x + normal.x * offset;
      const startY = y + normal.y * offset;
      const endX = startX + direction.x * range;
      const endY = startY + direction.y * range;
      mark.lineStyle(5, 0x2b221a, 0.26).lineBetween(startX, startY, endX, endY);
      mark.lineStyle(2, color, 0.68).lineBetween(startX, startY, endX, endY);
    }
    this.fade(mark, 340);
  }
}
