import { describe, expect, it } from 'vitest';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import {
  isRiverWater,
  riverChannels,
  riverOutline,
  riverPoint,
  riverSectionAt,
} from '../../src/game/assets/riverGeometry';

describe('river shorelines', () => {
  it('samples current positions continuously by distance and clamps safely at each end', () => {
    const channel = riverChannels(LANDSCAPES['orkhon-valley'].water!)[0]!;
    expect(riverSectionAt(channel, -100).x).toBe(channel.sections[0]!.x);
    expect(riverSectionAt(channel, channel.length + 100).x).toBe(channel.sections.at(-1)!.x);
    for (const index of [12, 40, 80]) {
      const a = channel.sections[index]!;
      const b = channel.sections[index + 1]!;
      const middle = riverSectionAt(channel, (a.distance + b.distance) / 2);
      expect(middle.x).toBeCloseTo((a.x + b.x) / 2);
      expect(middle.y).toBeCloseTo((a.y + b.y) / 2);
      expect(Math.hypot(middle.nx, middle.ny)).toBeCloseTo(1);
      expect(Object.values(middle).every(Number.isFinite)).toBe(true);
    }
  });
  it('keeps authored courses reproducible, smooth, finite, and bounded with asymmetric banks', () => {
    for (const definition of Object.values(LANDSCAPES)) {
      const water = definition.water;
      if (!water) continue;
      const channels = riverChannels(water);
      expect(channels).toEqual(riverChannels(water));
      expect(channels).toHaveLength(water.kind === 'braided' ? 2 : 1);
      for (const channel of channels) {
        expect(channel.sections.length).toBeLessThan(350);
        expect(channel.length).toBeGreaterThan(5000);
        let previous = -1;
        for (const section of channel.sections) {
          expect(Object.values(section).every(Number.isFinite)).toBe(true);
          expect(Math.hypot(section.nx, section.ny)).toBeCloseTo(1);
          expect(section.distance).toBeGreaterThan(previous);
          expect(section.left).toBeGreaterThan(0);
          expect(section.right).toBeGreaterThan(0);
          previous = section.distance;
        }
        const widths = channel.sections.map((section) => section.left + section.right);
        expect(Math.max(...widths) - Math.min(...widths)).toBeGreaterThan(water.width * 0.08);
        expect(riverOutline(channel.sections)).toHaveLength(channel.sections.length * 2);
      }
      const first = channels[0]!.sections[0]!;
      const last = channels[0]!.sections.at(-1)!;
      expect([first.x, first.y, last.x, last.y]).toEqual([
        water.course[0],
        water.course[1],
        water.course.at(-2),
        water.course.at(-1),
      ]);
    }
  });

  it('splits the Orkhon braids around dry bars and rejoins them along the authored river', () => {
    const channels = riverChannels(LANDSCAPES['orkhon-valley'].water!);
    const [main, branch] = channels;
    expect(main!.sections[0]!.y).toBeCloseTo(branch!.sections[0]!.y);
    expect(main!.sections.at(-1)!.y).toBeCloseTo(branch!.sections.at(-1)!.y);
    const index = Math.floor(main!.sections.length / 6);
    const a = main!.sections[index]!;
    const b = branch!.sections[index]!;
    expect(Math.abs(a.y - b.y)).toBeGreaterThan(a.left + b.right);
    expect(isRiverWater(channels, a.x, (a.y + b.y) / 2)).toBe(false);
  });

  it('recognizes water and dry ground beside authored channels', () => {
    for (const definition of Object.values(LANDSCAPES)) {
      if (!definition.water) continue;
      const channels = riverChannels(definition.water);
      for (const section of channels[0]!.sections.filter((_, index) => index % 12 === 0)) {
        expect(isRiverWater(channels, section.x, section.y)).toBe(true);
        if (definition.water.kind !== 'braided') {
          const dry = riverPoint(section, 1, 35);
          expect(isRiverWater(channels, dry.x, dry.y)).toBe(false);
        }
      }
    }
  });
});
