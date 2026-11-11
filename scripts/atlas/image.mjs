// Pure image helpers shared by the terrain-kit cutter, measure-art and the atlas tools
// (docs/visual-workflow.md). Development-only; never runs in the game. No file access here:
// `io.mjs` reads and writes images with sharp.
//
// Images are { w, h, c, data }: `c` channels per texel (3 = RGB, 4 = RGBA), values 0..255, in a
// Uint8Array/Buffer or a Float32Array for intermediate results.

/** A blank image with `c` channels. */
export const image = (w, h, c) => ({ w, h, c, data: new Float32Array(w * h * c) });

/** Index of texel (x, y)'s first channel. */
export const at = (img, x, y) => ((y * img.w + x) * img.c) | 0;

/** Rec. 601 luma of texel (x, y), 0..1. */
export const luma = (img, x, y) => {
  const i = at(img, x, y);
  return (img.data[i] * 0.299 + img.data[i + 1] * 0.587 + img.data[i + 2] * 0.114) / 255;
};

export const smoothstep = (a, b, v) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Deterministic smooth value noise in [0, 1). */
export function noise(x, y, seed) {
  const hash = (i, j) => {
    let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const i = Math.floor(x),
    j = Math.floor(y);
  const fx = x - i,
    fy = y - j;
  const sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy);
  const top = hash(i, j) + (hash(i + 1, j) - hash(i, j)) * sx;
  const bottom = hash(i, j + 1) + (hash(i + 1, j + 1) - hash(i, j + 1)) * sx;
  return top + (bottom - top) * sy;
}

/** Round and clamp every channel to bytes. */
export function toBytes(img) {
  const bytes = new Uint8Array(img.data.length);
  for (let i = 0; i < bytes.length; i++)
    bytes[i] = Math.max(0, Math.min(255, Math.round(img.data[i])));
  return bytes;
}

/** A copy of the rectangle { x, y, w, h }. */
export function crop(img, rect) {
  const Data = img.data instanceof Float32Array ? Float32Array : Uint8Array;
  const out = { w: rect.w, h: rect.h, c: img.c, data: new Data(rect.w * rect.h * img.c) };
  for (let y = 0; y < rect.h; y++) {
    const from = at(img, rect.x, rect.y + y);
    out.data.set(img.data.subarray(from, from + rect.w * img.c), at(out, 0, y));
  }
  return out;
}

/** Shift the image by (dx, dy), wrapping around its edges. */
export function roll(img, dx, dy) {
  const out = image(img.w, img.h, img.c);
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const from = at(img, (x - dx + img.w) % img.w, (y - dy + img.h) % img.h);
      out.data.set(img.data.subarray(from, from + img.c), at(out, x, y));
    }
  return out;
}

/** Turn a quarter clockwise. */
export function turn(img) {
  const out = image(img.h, img.w, img.c);
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const from = at(img, x, y);
      out.data.set(img.data.subarray(from, from + img.c), at(out, img.h - 1 - y, x));
    }
  return out;
}

export function flipRows(img) {
  const out = image(img.w, img.h, img.c);
  for (let y = 0; y < img.h; y++)
    out.data.set(
      img.data.subarray(at(img, 0, y), at(img, 0, y) + img.w * img.c),
      at(out, 0, img.h - 1 - y),
    );
  return out;
}

/**
 * Offset-and-heal along one axis. Near the wrap edges the copy rolled by half a tile shows instead,
 * so the wrap joins painted neighbours; the copy's own join, in the middle, is never shown. Where
 * the two meet, the lighter or darker stroke wins (height blending), along an irregular line.
 */
export function healAxis(img, axis, seed) {
  const size = axis === 'x' ? img.w : img.h;
  const half = size >> 1;
  const rolled = axis === 'x' ? roll(img, half, 0) : roll(img, 0, half);
  const out = image(img.w, img.h, img.c);
  const reach = size * 0.22;
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const p = axis === 'x' ? x : y;
      const q = axis === 'x' ? y : x;
      const edge = Math.min(p, size - 1 - p);
      const wobble = noise(q / 23, edge / 31, seed) * reach * 0.6;
      const weight = 1 - smoothstep(reach * 0.35, reach, edge + wobble);
      const v = weight + (luma(rolled, x, y) - luma(img, x, y)) * 0.7;
      const mix = edge < 2 ? 1 : smoothstep(0.44, 0.56, v);
      const i = at(img, x, y);
      for (let k = 0; k < img.c; k++)
        out.data[i + k] = img.data[i + k] * (1 - mix) + rolled.data[i + k] * mix;
    }
  return out;
}

/** Make an image wrap seamlessly along the given axes (offset-and-heal). */
export const heal = (img, seed, axes = 'xy') => {
  let out = img;
  if (axes.includes('x')) out = healAxis(out, 'x', seed);
  if (axes.includes('y')) out = healAxis(out, 'y', seed + 1);
  return out;
};

/** Crop an RGBA image to its painted (alpha > 0) bounds; `offset` is the crop's top-left. */
export function trim(img) {
  let minX = img.w,
    minY = img.h,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++)
      if (img.data[at(img, x, y) + 3] > 0) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
  if (maxX < 0) return { img: image(0, 0, 4), offset: [0, 0] };
  const out = image(maxX - minX + 1, maxY - minY + 1, 4);
  for (let y = 0; y < out.h; y++)
    out.data.set(
      img.data.subarray(at(img, minX, minY + y), at(img, minX, minY + y) + out.w * 4),
      at(out, 0, y),
    );
  return { img: out, offset: [minX, minY] };
}

/**
 * Fill fully transparent RGBA texels, in place, with the mean colour of painted neighbours, growing
 * `passes` texels outward (alpha unchanged), so linear filtering does not pull in black or white.
 */
export function bleed(img, passes = 6) {
  const filled = new Uint8Array(img.w * img.h);
  for (let p = 0; p < img.w * img.h; p++) filled[p] = img.data[p * 4 + 3] > 0 ? 1 : 0;
  for (let pass = 0; pass < passes; pass++) {
    const next = filled.slice();
    for (let y = 0; y < img.h; y++)
      for (let x = 0; x < img.w; x++) {
        if (filled[y * img.w + x]) continue;
        let r = 0,
          g = 0,
          b = 0,
          n = 0;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = x + dx,
            ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= img.w || ny >= img.h || !filled[ny * img.w + nx]) continue;
          const i = at(img, nx, ny);
          r += img.data[i];
          g += img.data[i + 1];
          b += img.data[i + 2];
          n++;
        }
        if (!n) continue;
        const i = at(img, x, y);
        img.data[i] = r / n;
        img.data[i + 1] = g / n;
        img.data[i + 2] = b / n;
        next[y * img.w + x] = 1;
      }
    filled.set(next);
  }
  return img;
}

/** A copy grown by `n` texels on every side, repeating the edge texels outward (all channels). */
export function extrude(img, n) {
  const out = image(img.w + 2 * n, img.h + 2 * n, img.c);
  for (let y = 0; y < out.h; y++)
    for (let x = 0; x < out.w; x++) {
      const from = at(
        img,
        Math.max(0, Math.min(img.w - 1, x - n)),
        Math.max(0, Math.min(img.h - 1, y - n)),
      );
      out.data.set(img.data.subarray(from, from + img.c), at(out, x, y));
    }
  return out;
}

const isPowerOfTwo = (n) => n > 0 && (n & (n - 1)) === 0;
export { isPowerOfTwo };

/**
 * Shelf packing, tallest first. `sizes` are { w, h }; each is placed `gutter` texels from the atlas
 * edge and from its neighbours. Returns the positions in input order and the power-of-two height.
 */
export function shelfPack(sizes, { width, gutter }) {
  const order = sizes.map((size, index) => ({ ...size, index }));
  order.sort((a, b) => b.h - a.h || b.w - a.w);
  const positions = new Array(sizes.length);
  let x = gutter,
    y = gutter,
    shelf = 0;
  for (const piece of order) {
    if (piece.w + 2 * gutter > width)
      throw new Error(`A ${piece.w}-texel piece does not fit a ${width}-texel atlas`);
    if (x + piece.w + gutter > width) {
      x = gutter;
      y += shelf + gutter;
      shelf = 0;
    }
    positions[piece.index] = { x, y };
    x += piece.w + gutter;
    shelf = Math.max(shelf, piece.h);
  }
  return { positions, height: 2 ** Math.ceil(Math.log2(y + shelf + gutter)) };
}

/** Draw each { img, x, y } into a new `c`-channel image; RGB pieces become opaque. */
export function compose(pieces, width, height, c = 4) {
  const out = image(width, height, c);
  for (const piece of pieces)
    for (let row = 0; row < piece.img.h; row++)
      for (let column = 0; column < piece.img.w; column++) {
        const from = at(piece.img, column, row);
        const to = at(out, piece.x + column, piece.y + row);
        for (let k = 0; k < c; k++)
          out.data[to + k] = k < piece.img.c ? piece.img.data[from + k] : 255;
      }
  return out;
}

/** Phaser/TexturePacker "hash" frame map: `frames` is [name, { x, y, w, h }] pairs. */
export function frameMap(frames, meta) {
  return {
    frames: Object.fromEntries(
      frames.map(([name, rect]) => [
        name,
        {
          frame: { x: rect.x, y: rect.y, w: rect.w, h: rect.h },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: rect.w, h: rect.h },
          sourceSize: { w: rect.w, h: rect.h },
        },
      ]),
    ),
    meta,
  };
}
