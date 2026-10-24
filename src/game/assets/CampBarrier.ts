import Phaser from 'phaser';
import { barrierContact, campBoundary } from '../state/campBarrier';
import type { RunState } from '../types';

interface GroundPoint {
  x: number;
  y: number;
}

interface Hurdle {
  image: Phaser.GameObjects.Graphics;
  shadow: Phaser.GameObjects.Image;
  a: GroundPoint;
  b: GroundPoint;
  middle: GroundPoint;
  impactRemaining: number;
  height: number;
  wood: number;
  cloth?: number;
}

const MAX_HURDLES = 48;
const IMPACT_DURATION = 0.24;

/** Portable timber and felt hurdles share the simulation's camp boundary.
 * Each piece sorts at its own ground position; impacts use active seconds. */
export class CampBarrier {
  readonly hurdles: Hurdle[];
  radius = 0;
  private count = 0;
  private travelling = false;
  private wear = -1;

  constructor(scene: Phaser.Scene) {
    this.hurdles = Array.from({ length: MAX_HURDLES }, (_, index) => ({
      image: scene.add.graphics().setName(`camp-barrier-${index}`).setVisible(false),
      shadow: scene.add.image(0, 0, 'shadow').setAlpha(0.5).setVisible(false),
      a: { x: 0, y: 0 },
      b: { x: 0, y: 0 },
      middle: { x: 0, y: 0 },
      impactRemaining: 0,
      height: 25,
      wood: 0x856342,
    }));
  }

  refresh(run: RunState, camp: GroundPoint): void {
    const radius = campBoundary(run).radius;
    const travelling = run.clan.stage === 'migration';
    const wear = run.clan.integrity < 30 ? 2 : run.clan.integrity < 65 ? 1 : 0;
    const count = Math.min(MAX_HURDLES, Math.max(24, Math.ceil((Math.PI * 2 * radius) / 28)));
    const redraw = radius !== this.radius || travelling !== this.travelling || wear !== this.wear;
    this.radius = radius;
    this.travelling = travelling;
    this.wear = wear;
    this.count = count;
    this.hurdles.forEach((hurdle, index) => {
      const visible = index < count;
      hurdle.image.setVisible(visible);
      hurdle.shadow.setVisible(visible);
      if (!visible) {
        hurdle.impactRemaining = 0;
        return;
      }
      if (redraw) {
        const start = (index * Math.PI * 2) / count;
        const end = ((index + 1) * Math.PI * 2) / count;
        hurdle.a = { x: Math.cos(start) * radius, y: Math.sin(start) * radius };
        hurdle.b = { x: Math.cos(end) * radius, y: Math.sin(end) * radius };
        hurdle.middle = { x: (hurdle.a.x + hurdle.b.x) / 2, y: (hurdle.a.y + hurdle.b.y) / 2 };
        hurdle.shadow.setDisplaySize(
          Math.hypot(hurdle.b.x - hurdle.a.x, hurdle.b.y - hurdle.a.y) + 12,
          13,
        );
        this.paint(hurdle, index);
      }
      this.position(hurdle, camp);
    });
  }

  update(run: RunState, dt: number, camp: GroundPoint): void {
    if (run.phase !== 'playing' || dt <= 0) return;
    this.refresh(run, camp);
    this.hurdles.forEach((hurdle, index) => {
      if (index >= this.count || hurdle.impactRemaining <= 0) return;
      hurdle.impactRemaining = Math.max(0, hurdle.impactRemaining - dt);
      if (hurdle.impactRemaining === 0) this.paint(hurdle, index);
      this.position(hurdle, camp);
    });
  }

  hit(camp: GroundPoint, source: GroundPoint): GroundPoint {
    const angle = (Math.atan2(source.y - camp.y, source.x - camp.x) + Math.PI * 2) % (Math.PI * 2);
    const index = Math.min(this.count - 1, Math.floor((angle / (Math.PI * 2)) * this.count));
    const hurdle = this.hurdles[index]!;
    hurdle.impactRemaining = IMPACT_DURATION;
    this.paint(hurdle, index);
    return barrierContact(camp, source, this.radius);
  }

  relocate(run: RunState, camp: GroundPoint): void {
    for (const hurdle of this.hurdles) hurdle.impactRemaining = 0;
    this.radius = 0;
    this.refresh(run, camp);
  }

  private position(hurdle: Hurdle, camp: GroundPoint): void {
    const kick = hurdle.impactRemaining > 0 ? Math.sin(hurdle.impactRemaining * 65) * 1.3 : 0;
    hurdle.image
      .setPosition(camp.x + hurdle.middle.x + kick, camp.y + hurdle.middle.y)
      .setDepth(100 + camp.y + Math.max(hurdle.a.y, hurdle.b.y));
    hurdle.image.setData('world-fence', {
      ax: camp.x + hurdle.a.x + kick,
      az: camp.y + hurdle.a.y,
      bx: camp.x + hurdle.b.x + kick,
      bz: camp.y + hurdle.b.y,
      height: hurdle.height,
      wood: hurdle.wood,
      cloth: hurdle.cloth,
    });
    hurdle.shadow
      .setPosition(camp.x + hurdle.middle.x + 5, camp.y + hurdle.middle.y + 4)
      .setDepth(98 + camp.y + hurdle.middle.y);
  }

  private paint(hurdle: Hurdle, index: number): void {
    const g = hurdle.image.clear();
    const a = { x: hurdle.a.x - hurdle.middle.x, y: hurdle.a.y - hurdle.middle.y };
    const b = { x: hurdle.b.x - hurdle.middle.x, y: hurdle.b.y - hurdle.middle.y };
    const height = (this.travelling ? 15 : 25) + (index % 3) * 1.4;
    const hit = hurdle.impactRemaining > 0;
    const wood = hit ? 0xc59a60 : this.wear === 2 ? 0x65513d : 0x856342;
    const light = hit ? 0xf0cc86 : 0xb08b58;
    hurdle.height = height;
    hurdle.wood = wood;
    hurdle.cloth = index % 3 === 0 ? (index % 2 === 0 ? 0x315d64 : 0x94523e) : undefined;
    const plank = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      width: number,
      color: number,
    ): void => {
      g.lineStyle(width + 1.5, 0x4e402d, 0.95).lineBetween(x1, y1, x2, y2);
      g.lineStyle(width, color, 1).lineBetween(x1 - 0.5, y1 - 0.5, x2 - 0.5, y2 - 0.5);
      g.lineStyle(0.8, light, 0.7).lineBetween(x1 - 1, y1 - 1.5, x2 - 1, y2 - 1.5);
    };
    // Low crossed hurdles leave silhouettes and the camp interior readable.
    plank(a.x, a.y - 6, b.x, b.y - height + 5, 2.4, wood);
    plank(a.x, a.y - height + 5, b.x, b.y - 6, 2.4, wood);
    plank(a.x, a.y - height * 0.64, b.x, b.y - height * 0.64, 3.2, wood);
    for (const end of [a, b]) {
      plank(end.x, end.y, end.x - 0.8, end.y - height, 4.2, wood);
      g.lineStyle(1.4, 0xd1b989, 0.85);
      for (let wrap = 0; wrap < 3; wrap++)
        g.lineBetween(
          end.x - 3,
          end.y - height * 0.65 + wrap * 2,
          end.x + 2,
          end.y - height * 0.65 + wrap * 2 + 1,
        );
      g.lineStyle(0.8, 0x392f26, 0.55).lineBetween(
        end.x + 0.8,
        end.y - 4,
        end.x + 0.3,
        end.y - height + 4,
      );
    }
    g.lineStyle(1.2, 0xd8bf8f, 0.9).lineBetween(a.x, a.y - height + 3, b.x, b.y - height + 3);
    if (index % 3 === 0) {
      const x = (a.x + b.x) / 2;
      const y = (a.y + b.y) / 2 - height + 2;
      const cloth = index % 2 === 0 ? 0x315d64 : 0x94523e;
      g.fillStyle(cloth, 1).fillPoints(
        [
          { x: x - 7, y },
          { x: x + 6, y: y + 1 },
          { x: x + 5, y: y + (this.wear > 0 ? 10 : 13) },
          { x: x - 5, y: y + 12 },
        ],
        true,
      );
      g.lineStyle(1, 0xd0b67c, 0.85).lineBetween(x - 4, y + 3, x + 3, y + 3);
      g.lineStyle(1, 0xc9b888, 0.7).strokeRect(x - 2, y + 6, 3, 3);
    }
    if (this.travelling && index % 2 === 0) {
      g.fillStyle(0x453c2e, 1).fillCircle(a.x, a.y + 1, 3.5);
      g.lineStyle(1, 0xba955f, 1).strokeCircle(a.x, a.y + 1, 3.5);
    }
    if (this.wear > 0 && index % 2 === 0)
      g.lineStyle(1.4, 0x3e362b, 0.75).lineBetween(a.x + 4, a.y - 9, b.x - 3, b.y - 6);
  }
}
