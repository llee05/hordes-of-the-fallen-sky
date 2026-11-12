import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ORKHON_GROUND_QUADRANTS,
  ORKHON_PAINTED_GROUND,
  orkhonPaintedGroundGpuBytes,
  orkhonPaintedGroundEnabled,
  orkhonPaintedGroundWorldBounds,
} from '../../src/game/world3d/orkhonPaintedGround';

describe('Orkhon painted ground', () => {
  it('ships enabled and keeps an explicit development fallback', () => {
    expect(orkhonPaintedGroundEnabled('', true)).toBe(true);
    expect(orkhonPaintedGroundEnabled('?orkhonPaintedGround=0', true)).toBe(false);
    expect(orkhonPaintedGroundEnabled('?orkhonPaintedGround=1', true)).toBe(true);
    expect(orkhonPaintedGroundEnabled('?unrelated=1&orkhonPaintedGround=1', true)).toBe(true);
    expect(orkhonPaintedGroundEnabled('', false)).toBe(true);
    expect(orkhonPaintedGroundEnabled('?orkhonPaintedGround=0', false)).toBe(true);
  });

  it('maps the approved 16:10 battlefield into its square terrain', () => {
    expect(ORKHON_PAINTED_GROUND.bounds).toEqual({
      minX: -3200,
      minY: -2000,
      width: 6400,
      height: 4000,
    });
    expect(orkhonPaintedGroundWorldBounds(6400)).toEqual([0, 1200, 6400, 4000]);
    expect(ORKHON_PAINTED_GROUND.pixels.width / 3200).toBeCloseTo(0.5, 9);
    expect(ORKHON_PAINTED_GROUND.pixels.height / 2000).toBeCloseTo(0.5, 9);
  });

  it('ships four opaque quadrant paintings and the fine grayscale detail layer', () => {
    for (const quadrant of ORKHON_GROUND_QUADRANTS) {
      const painting = ORKHON_PAINTED_GROUND.quadrants[quadrant];
      const png = readFileSync(resolve(`public/art/orkhon-valley/${painting.file}`));
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([
        ORKHON_PAINTED_GROUND.pixels.width,
        ORKHON_PAINTED_GROUND.pixels.height,
      ]);
      expect(png.readUInt8(25)).toBe(2);
    }
    const detail = readFileSync(
      resolve(`public/art/orkhon-valley/${ORKHON_PAINTED_GROUND.detail.file}`),
    );
    expect([detail.readUInt32BE(16), detail.readUInt32BE(20), detail.readUInt8(25)]).toEqual([
      1024, 1024, 0,
    ]);
    expect(orkhonPaintedGroundGpuBytes()).toBe(39_724_100);
  });
});
