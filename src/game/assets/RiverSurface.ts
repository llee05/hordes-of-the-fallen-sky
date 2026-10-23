import Phaser from 'phaser';
import { GAME } from '../config';
import type { LocationId } from '../types';
import { landscapeRandom, isLandscapeClearing } from './landscapeLayout';
import { sceneryImage } from './painterlyArt';
import {
  riverChannels,
  isRiverWater,
  riverOutline,
  riverPoint,
  riverSectionAt,
  type RiverChannel,
  type RiverDefinition,
  type RiverSection,
} from './riverGeometry';

function mix(a: number, b: number, amount: number): number {
  const channel = (shift: number) =>
    Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/** Matte water and eroded banks stay behind actors and never add collision geometry. */
export class RiverSurface {
  readonly container: Phaser.GameObjects.Container;
  readonly channels;
  private readonly currents: Phaser.GameObjects.Graphics;
  private readonly flowColor: number;
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly marks: {
    channel: RiverChannel;
    distance: number;
    side: number;
    length: number;
    speed: number;
    phase: number;
  }[] = [];
  private lastFrame = -1;

  constructor(scene: Phaser.Scene, id: LocationId, water: RiverDefinition) {
    this.channels = riverChannels(water);
    const center = GAME.worldSize / 2;
    this.container = scene.add.container(center, center).setName(`water-${water.kind}`);
    const paint = scene.add.graphics().setName('river-banks');
    this.container.add(paint);
    const random = landscapeRandom(id);
    const deep = mix(water.color, 0x264b55, water.kind === 'glacial' ? 0.28 : 0.4);
    const shallow = mix(water.color, water.bank, 0.36);
    const light = mix(water.color, 0xe7e7cc, 0.52);
    this.flowColor = mix(water.color, 0xe6ead7, 0.75);

    // Draw complete banks first, then every water channel, so joining braids have no seams.
    for (const channel of this.channels) {
      paint
        .fillStyle(mix(water.bank, 0x53634c, 0.4), 0.1)
        .fillPoints(riverOutline(channel.sections, 1, 29), true);
      paint.fillStyle(water.bank, 0.26).fillPoints(riverOutline(channel.sections, 1, 19), true);
      paint.fillStyle(water.bank, 0.68).fillPoints(riverOutline(channel.sections, 1, 8), true);
      paint
        .fillStyle(mix(water.color, 0x455749, 0.35), 0.5)
        .fillPoints(riverOutline(channel.sections, 1, 2), true);
    }
    for (const channel of this.channels) {
      const sections = channel.sections;
      paint.fillStyle(shallow, 1).fillPoints(riverOutline(sections), true);
      paint.fillStyle(water.color, 0.85).fillPoints(riverOutline(sections, 0.82), true);
      for (let i = 0; i < sections.length - 1; i += 18) {
        const pool = sections.slice(i, i + 22);
        const stretch = pool.map((section, index) => {
          const taper = Math.sin((Math.PI * index) / (pool.length - 1));
          return { ...section, left: section.left * taper, right: section.right * taper };
        });
        paint
          .fillStyle(deep, 0.2 + random() * 0.12)
          .fillPoints(
            riverOutline(stretch, 0.32 + random() * 0.2, 0, Math.sin(i * 0.13) * 0.17),
            true,
          );
      }
      for (let i = 1; i < sections.length - 1; i++) {
        const section = sections[i]!;
        // Small broken brush strokes replace the old continuous pale center stripe.
        for (let brush = 0; brush < 3; brush++) {
          const point = riverPoint(section, (random() * 2 - 1) * 0.84);
          const length = 10 + random() * 35;
          paint
            .lineStyle(0.7 + random() * 2, brush === 0 ? deep : light, 0.06 + random() * 0.09)
            .lineBetween(
              point.x,
              point.y,
              point.x + section.ny * length,
              point.y - section.nx * length,
            );
        }
        if (i % 5 !== 0) continue;
        for (const side of [-1, 1]) {
          const bank = riverPoint(section, side, 11 + random() * 10);
          for (let pebble = 0; pebble < 5; pebble++) {
            const x = bank.x + (random() - 0.5) * 30;
            const y = bank.y + (random() - 0.5) * 9;
            const width = 2 + random() * 5;
            paint
              .fillStyle(mix(water.bank, 0x5d665b, random() * 0.6), 0.55)
              .fillEllipse(x + 1, y + 1, width + 1, width * 0.45);
            paint
              .fillStyle(mix(water.bank, 0xe1dac0, 0.45), 0.7)
              .fillEllipse(x, y, width, width * 0.4);
          }
          if (
            i % 15 === 0 &&
            !isLandscapeClearing(bank.x, bank.y) &&
            !isRiverWater(this.channels, bank.x, bank.y, 4)
          ) {
            this.container.add(
              sceneryImage(scene, bank.x, bank.y + 4, 'reeds', 25 + random() * 17)
                .setAlpha(0.78)
                .setFlipX(side < 0),
            );
          }
        }
        if (water.kind === 'frozen') this.drawIce(paint, section, i, random);
        else if (i % 15 === 0 && water.width > 45) {
          const point = riverPoint(section, (i % 2 ? -1 : 1) * 0.75);
          paint
            .fillStyle(water.bank, 0.48)
            .fillEllipse(point.x, point.y, 20 + random() * 30, 5 + random() * 5);
          paint
            .lineStyle(1, light, 0.2)
            .lineBetween(point.x - 16, point.y + 5, point.x + 8, point.y + 3);
        }
      }
    }
    for (const channel of this.channels) {
      for (let distance = 45; distance < channel.length - 60; distance += 145) {
        this.marks.push({
          channel,
          distance,
          side: (random() * 2 - 1) * 0.55,
          length: 12 + random() * Math.min(38, water.width * 0.4),
          speed: water.kind === 'frozen' ? 4 + random() * 3 : 10 + random() * 8,
          phase: random() * Math.PI * 2,
        });
      }
    }
    this.currents = scene.add.graphics().setName('river-currents');
    this.container.add(this.currents);
    this.update(0);
  }

  /** Only the scene's active seconds advance these subtle strokes; no automatic tweens. */
  update(elapsed: number): void {
    if (!Number.isFinite(elapsed)) return;
    const frame = this.reducedMotion.matches ? 0 : Math.floor(elapsed * 15);
    if (frame === this.lastFrame) return;
    this.lastFrame = frame;
    const time = frame / 15;
    this.currents.clear();
    for (const mark of this.marks) {
      const distance = (mark.distance + time * mark.speed) % mark.channel.length;
      const points = [0, 0.45, 1].map((offset) =>
        riverPoint(
          riverSectionAt(
            mark.channel,
            Math.min(mark.channel.length, distance + offset * mark.length),
          ),
          mark.side + Math.sin(time * 0.8 + mark.phase + offset) * 0.025,
        ),
      );
      const alpha = 0.1 + (Math.sin(time * 1.2 + mark.phase) + 1) * 0.045;
      this.currents.lineStyle(1.1, this.flowColor, alpha).strokePoints(points);
      const point = points[1]!;
      this.currents
        .lineStyle(0.7, this.flowColor, alpha * 0.55)
        .lineBetween(point.x - 3, point.y + 3, point.x + 8, point.y + 2);
    }
  }

  private drawIce(
    paint: Phaser.GameObjects.Graphics,
    section: RiverSection,
    index: number,
    random: () => number,
  ): void {
    const side = index % 2 ? -1 : 1;
    const anchor = riverPoint(section, side * 0.87);
    const width = 21 + random() * 35;
    const height = 7 + random() * 9;
    const points = [
      { x: anchor.x - width, y: anchor.y - height * 0.3 },
      { x: anchor.x - width * 0.55, y: anchor.y - height },
      { x: anchor.x + width * 0.6, y: anchor.y - height * 0.75 },
      { x: anchor.x + width, y: anchor.y + height * 0.1 },
      { x: anchor.x + width * 0.3, y: anchor.y + height * 0.65 },
      { x: anchor.x - width * 0.65, y: anchor.y + height * 0.5 },
    ];
    paint.fillStyle(0x4b7882, 0.24).fillPoints(
      points.map((p) => ({ x: p.x + 2, y: p.y + 3 })),
      true,
    );
    paint.fillStyle(0xd9e2d9, 0.88).fillPoints(points, true);
    paint.lineStyle(1.2, 0xf0eddb, 0.72).strokePoints(points.slice(0, 4));
    paint
      .lineStyle(0.8, 0x789ca4, 0.6)
      .beginPath()
      .moveTo(anchor.x - width * 0.5, anchor.y - height * 0.6)
      .lineTo(anchor.x - 5, anchor.y + 1)
      .lineTo(anchor.x + width * 0.3, anchor.y - height * 0.3)
      .strokePath();
  }
}
