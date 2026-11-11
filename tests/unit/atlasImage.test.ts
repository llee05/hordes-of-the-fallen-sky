import { describe, expect, it } from 'vitest';
import {
  alphaCoverage,
  edgeFringe,
  frameSpacing,
  measure,
  mipSafeLevel,
  mipSeams,
  paintBounds,
  quarterContrast,
  rectGap,
  seam,
  TILE_UNITS_PER_TEXEL,
} from '../../scripts/atlas/analysis.mjs';
import {
  at,
  bleed,
  compose,
  crop,
  extrude,
  frameMap,
  heal,
  image,
  isPowerOfTwo,
  roll,
  shelfPack,
  toBytes,
  trim,
  turn,
  type Img,
} from '../../scripts/atlas/image.mjs';
import { ART_SPEC } from '../../src/game/data/artSpec';

/** An RGBA image painted by `paint(x, y)` -> [r, g, b, a]. */
function rgba(w: number, h: number, paint: (x: number, y: number) => number[]): Img {
  const img = image(w, h, 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) img.data.set(paint(x, y), at(img, x, y));
  return img;
}

/** A smooth tiling RGB pattern: one sine period across the tile on each axis. */
function tiling(size: number): Img {
  const img = image(size, size, 3);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const v =
        128 + 60 * Math.sin((2 * Math.PI * x) / size) + 40 * Math.cos((2 * Math.PI * y) / size);
      img.data.set([v, v * 0.9, v * 0.6], at(img, x, y));
    }
  return img;
}

describe('image helpers', () => {
  it('rolls, turns and crops without losing texels', () => {
    const img = rgba(4, 2, (x, y) => [x, y, 0, 255]);
    expect([...crop(roll(img, 1, 0), { x: 0, y: 0, w: 1, h: 1 }).data.subarray(0, 2)]).toEqual([
      3, 0,
    ]);
    const turned = turn(img);
    expect([turned.w, turned.h]).toEqual([2, 4]);
    // A quarter turn clockwise: the bottom-left texel moves to the top-left.
    expect(turned.data[at(turned, 0, 0)]).toBe(0);
    expect(turned.data[at(turned, 0, 0) + 1]).toBe(1);
  });

  it('rounds and clamps to bytes', () => {
    const img = image(1, 1, 3);
    img.data.set([-4, 127.5, 300]);
    expect([...toBytes(img)]).toEqual([0, 128, 255]);
  });

  it('trims to painted bounds and bleeds colour into transparent texels', () => {
    const img = rgba(6, 5, (x, y) =>
      x >= 2 && x <= 3 && y === 2 ? [200, 100, 50, 255] : [0, 0, 0, 0],
    );
    const { img: trimmed, offset } = trim(img);
    expect([trimmed.w, trimmed.h, ...offset]).toEqual([2, 1, 2, 2]);
    expect(trim(rgba(2, 2, () => [0, 0, 0, 0])).img.w).toBe(0);
    bleed(img);
    // Transparent texels take the paint's colour but stay transparent.
    expect([...img.data.subarray(at(img, 0, 0), at(img, 0, 0) + 4)]).toEqual([200, 100, 50, 0]);
  });

  it('extrudes edge texels outward', () => {
    const img = rgba(2, 1, (x) => [x * 100, 0, 0, 255]);
    const out = extrude(img, 2);
    expect([out.w, out.h]).toEqual([6, 5]);
    expect(out.data[at(out, 0, 0)]).toBe(0);
    expect(out.data[at(out, 5, 4)]).toBe(100);
  });

  it('heals a tile so it wraps seamlessly', () => {
    // A gradient has a hard step at its wrap; healing replaces the edges with painted neighbours.
    const ramp = image(64, 64, 3);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) ramp.data.set([x * 4, y * 4, 128], at(ramp, x, y));
    expect(seam(ramp).seam).toBeGreaterThan(20);
    expect(seam(heal(ramp, 3)).seam).toBeLessThan(seam(ramp).seam / 4);
  });

  it('shelf-packs tallest first with gutters and a power-of-two height', () => {
    const sizes = [
      { w: 10, h: 4 },
      { w: 10, h: 8 },
      { w: 10, h: 6 },
    ];
    const { positions, height } = shelfPack(sizes, { width: 32, gutter: 2 });
    expect(positions[1]).toEqual({ x: 2, y: 2 });
    expect(positions[2]).toEqual({ x: 14, y: 2 });
    expect(positions[0]).toEqual({ x: 2, y: 12 });
    expect(height).toBe(32);
    expect(() => shelfPack([{ w: 40, h: 1 }], { width: 32, gutter: 2 })).toThrow();
  });

  it('composes pieces and writes a TexturePacker hash', () => {
    const out = compose([{ img: rgba(1, 1, () => [9, 8, 7, 255]), x: 1, y: 0 }], 2, 1);
    expect([...toBytes(out)]).toEqual([0, 0, 0, 0, 9, 8, 7, 255]);
    const map = frameMap([['a', { x: 1, y: 0, w: 1, h: 1 }]], { image: 'a.png' });
    expect(map.frames.a!.frame).toEqual({ x: 1, y: 0, w: 1, h: 1 });
    expect(map.frames.a!.sourceSize).toEqual({ w: 1, h: 1 });
    expect(isPowerOfTwo(256)).toBe(true);
    expect(isPowerOfTwo(92)).toBe(false);
  });
});

describe('measurements', () => {
  it('keeps the terrain tile density equal to the art spec', () => {
    expect(TILE_UNITS_PER_TEXEL).toBe(ART_SPEC.orkhon.tileWorldSize / ART_SPEC.orkhon.tilePixels);
  });

  it('scores a seamless tile near 1 at every mip level', () => {
    const tile = tiling(64);
    expect(seam(tile).seam).toBeGreaterThan(0.5);
    expect(seam(tile).seam).toBeLessThan(1.5);
    const levels = mipSeams(tile);
    expect(levels.map((level) => level.size[0])).toEqual([64, 32, 16]);
    for (const level of levels) expect(level.seam).toBeLessThan(1.5);
  });

  it('reports colour statistics of painted texels only', () => {
    const img = rgba(4, 4, (x) => (x < 2 ? [255, 255, 255, 255] : [0, 0, 0, 0]));
    const stats = measure([img]);
    expect(stats.texels).toBe(8);
    expect(stats.lightness[1]).toBe(100);
    expect(stats.median).toBe('#ffffff');
    expect(stats.framesTouchingEdge).toBe('1/1');
  });

  it('finds lighter quarters, coverage and painted bounds', () => {
    const img = rgba(8, 8, (x, y) => (x < 4 && y < 4 ? [220, 220, 220, 255] : [100, 100, 100, 0]));
    expect(quarterContrast(img).spread).toBeGreaterThan(40);
    expect(alphaCoverage(img)).toEqual({ transparent: 0.75, partial: 0, opaque: 0.25 });
    expect(paintBounds(img)).toEqual({ x: 0, y: 0, w: 4, h: 4, touches: ['left', 'top'] });
    expect(paintBounds(img, { x: 4, y: 4, w: 4, h: 4 })).toBeNull();
  });

  it('measures frame gaps, touching frames and mip-safe levels', () => {
    const a = { x: 0, y: 0, w: 4, h: 4 };
    expect(rectGap(a, { x: 6, y: 0, w: 2, h: 2 })).toBe(2);
    expect(rectGap(a, { x: 4, y: 0, w: 2, h: 2 })).toBe(0);
    expect(rectGap(a, { x: 3, y: 3, w: 2, h: 2 })).toBe(-1);
    const size = { w: 64, h: 64 };
    const spacing = frameSpacing({ a, b: { x: 4, y: 0, w: 4, h: 4 } }, size);
    expect(spacing.touching).toEqual([['a', 'b', 0]]);
    expect(mipSafeLevel({ a, b: { x: 4, y: 0, w: 4, h: 4 } }, size)).toBe(-1);
    // Frames 16 texels apart on an aligned grid stay apart through several levels.
    const far = { a: { x: 0, y: 0, w: 16, h: 16 }, b: { x: 32, y: 0, w: 16, h: 16 } };
    expect(mipSafeLevel(far, size)).toBe(4);
    expect(mipSafeLevel({ a }, size)).toBe(6);
  });

  it('flags white fringes and unbled transparent texels around a cutout', () => {
    // A dark square with a white outline on transparent white: a cutout keyed badly from white.
    const bad = rgba(8, 8, (x, y) => {
      const inside = x >= 2 && x <= 5 && y >= 2 && y <= 5;
      const rim = inside && (x === 2 || x === 5 || y === 2 || y === 5);
      if (rim) return [250, 250, 250, 255];
      return inside ? [40, 30, 20, 255] : [255, 255, 255, 0];
    });
    const fringe = edgeFringe(bad);
    expect(fringe.lightOutline).toBe(1);
    expect(fringe.transparentWhite).toBe(1);
    const good = bleed(
      rgba(8, 8, (x, y) =>
        x >= 2 && x <= 5 && y >= 2 && y <= 5 ? [40, 30, 20, 255] : [0, 0, 0, 0],
      ),
    );
    expect(edgeFringe(good)).toMatchObject({
      lightOutline: 0,
      transparentWhite: 0,
      transparentBlack: 0,
    });
  });
});
