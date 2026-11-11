import { describe, expect, it } from 'vitest';
import { croppedSides, quarterContrast } from '../../scripts/atlas/analysis.mjs';
import {
  gridFrames,
  inspect,
  validateAtlas,
  validateTile,
  worstStatus,
  type Check,
} from '../../scripts/atlas/checks.mjs';
import { at, bleed, image, type Img } from '../../scripts/atlas/image.mjs';

const status = (checks: Check[], id: string) => checks.find((c) => c.id === id)?.status;

/** A seamless RGB tile: two sine periods across each axis, so its quarters match. */
function tile(w: number, h = w): Img {
  const img = image(w, h, 3);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = 128 + 50 * Math.sin((4 * Math.PI * x) / w) + 30 * Math.cos((4 * Math.PI * y) / h);
      img.data.set([v, v * 0.9, v * 0.7], at(img, x, y));
    }
  return img;
}

/** An RGBA atlas with opaque paint inset one texel inside each frame, on transparent `under`. */
function atlas(
  size: number,
  rects: { x: number; y: number; w: number; h: number }[],
  under = [0, 0, 0],
): Img {
  const img = image(size, size, 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const inside = rects.some(
        (r) => x > r.x && y > r.y && x < r.x + r.w - 1 && y < r.y + r.h - 1,
      );
      img.data.set(inside ? [90, 70, 40, 255] : [...under, 0], at(img, x, y));
    }
  return img;
}

describe('tile checks', () => {
  it('passes a seamless power-of-two tile at the spec density', () => {
    const checks = validateTile(tile(256));
    expect(worstStatus(checks)).toBe('pass');
    expect(checks.find((c) => c.id === 'texel-density')!.value).toBe(0.781);
  });

  it('fails a hard wrap seam and a wrong texel density', () => {
    const img = tile(256);
    for (let y = 0; y < 256; y++) img.data.set([255, 255, 255], at(img, 255, y));
    expect(status(validateTile(img), 'seam')).toBe('fail');
    expect(status(validateTile(tile(128), { worldSize: 200 }), 'texel-density')).toBe('fail');
  });

  it('checks only the wrapping axis of a bank band', () => {
    const band = tile(256, 92);
    expect(status(validateTile(band), 'mip-power-of-two')).toBe('warn');
    expect(status(validateTile(band, { axes: 'x' }), 'mip-power-of-two')).toBe('pass');
    // Grass above water: the halves along the band match even though top and bottom differ.
    for (let y = 46; y < 92; y++)
      for (let x = 0; x < 256; x++) band.data.set([20, 40, 60], at(band, x, y));
    expect(quarterContrast(band).spread).toBeGreaterThan(10);
    expect(status(validateTile(band, { axes: 'x' }), 'repeat-contrast')).toBe('pass');
  });

  it('warns about a lighter corner that marks the repeat', () => {
    const img = tile(64);
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) img.data.set([230, 220, 200], at(img, x, y));
    expect(status(validateTile(img), 'repeat-contrast')).toBe('warn');
  });
});

describe('atlas checks', () => {
  const a = { x: 2, y: 2, w: 12, h: 12 };
  const b = { x: 18, y: 2, w: 12, h: 12 };

  it('passes well-spaced, bled frames', () => {
    const img = bleed(atlas(32, [a, b]), 8);
    const checks = validateAtlas(img, { a, b }, { mipmaps: false });
    expect(worstStatus(checks)).toBe('pass');
  });

  it('fails touching frames and warns about thin padding and unbled edges', () => {
    const touching = { x: 14, y: 2, w: 12, h: 12 };
    const checks = validateAtlas(atlas(32, [a, touching]), { a, b: touching });
    expect(status(checks, 'frames-touching')).toBe('fail');
    expect(status(checks, 'frame-padding')).toBe('fail');
    expect(status(checks, 'mip-bleed')).toBe('warn');
    const close = { x: 15, y: 2, w: 12, h: 12 };
    expect(status(validateAtlas(atlas(32, [a, close]), { a, b: close }), 'frame-padding')).toBe(
      'warn',
    );
    expect(status(validateAtlas(atlas(32, [a, b]), { a, b }), 'transparent-colour')).toBe('warn');
  });

  it('fails a white fringe around a cutout and flags frames outside the atlas', () => {
    const img = atlas(32, [a]);
    for (let x = a.x + 1; x < a.x + a.w - 1; x++)
      img.data.set([250, 250, 250, 200], at(img, x, a.y + 1));
    expect(status(validateAtlas(img, { a }), 'white-fringe')).toBe('fail');
    const outside = { x: 30, y: 30, w: 4, h: 4 };
    expect(status(validateAtlas(img, { outside }), 'frames-in-bounds')).toBe('fail');
  });

  it('finds sides cut straight through opaque paint', () => {
    const img = atlas(32, [{ x: 2, y: 2, w: 12, h: 12 }]);
    expect(croppedSides(img, { x: 3, y: 3, w: 10, h: 10 })).toEqual([
      'left',
      'top',
      'right',
      'bottom',
    ]);
    expect(croppedSides(img, { x: 0, y: 0, w: 16, h: 16 })).toEqual([]);
  });
});

describe('inspection', () => {
  it('splits a sheet into a grid and reports painted bounds per cell', () => {
    const frames = gridFrames({ w: 32, h: 16 }, 16);
    expect(Object.keys(frames)).toEqual(['c0r0', 'c1r0']);
    const report = inspect(atlas(32, [{ x: 3, y: 3, w: 6, h: 6 }]), frames) as {
      frames: Record<string, { bounds: unknown }>;
    };
    expect(report.frames.c0r0!.bounds).toEqual({ x: 4, y: 4, w: 4, h: 4, touches: [] });
    expect(report.frames.c1r0!.bounds).toBeNull();
    expect(inspect(tile(16))).toHaveProperty('tile.seam');
  });
});
