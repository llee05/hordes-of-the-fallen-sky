// Pure measurements of painted textures and atlases, shared by scripts/measure-art.mjs and the
// atlas inspector and validator (docs/visual-workflow.md). Images are { w, h, c, data } as in
// `image.mjs`; RGB images (c = 3) count as fully opaque.
import { at, crop } from './image.mjs';

/**
 * World units per terrain-tile texel in Orkhon Valley: 200 units over 256 pixels
 * (`ART_SPEC.orkhon.tileWorldSize / tilePixels`, docs/art-spec.md). A unit test keeps them equal.
 */
export const TILE_UNITS_PER_TEXEL = 200 / 256;

const alphaOf = (img, i) => (img.c === 4 ? img.data[i + 3] : 255);

const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
/** sRGB bytes to CIELAB (D65). */
export function lab(r, g, b) {
  const [R, G, B] = [r, g, b].map((c) => linear(c / 255));
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

export const percentile = (sorted, p) =>
  sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
const hex = (v) => Math.round(v).toString(16).padStart(2, '0');

/**
 * Colour statistics over painted texels (alpha >= 128) of one or more images: CIELAB lightness
 * and chroma at the 5th, 50th and 95th percentiles, chroma-weighted mean hue, median colour; the
 * edge feather (partially transparent texels per outline texel) and how many images have paint
 * touching their edge (`trimmed` reports trimmed frames instead).
 */
export function measure(sources, trimmed = false) {
  const L = [],
    C = [],
    R = [],
    G = [],
    B = [];
  let ha = 0,
    hb = 0,
    partial = 0,
    outline = 0,
    touching = 0;
  for (const img of sources) {
    const { data, w, h } = img;
    const alpha = (x, y) => alphaOf(img, at(img, x, y));
    let touches = false;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = at(img, x, y);
        const a = alpha(x, y);
        if (a > 0 && a < 255) partial++;
        if (a < 128) continue;
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touches = true;
        const near = [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ];
        if (near.some(([nx, ny]) => nx < 0 || ny < 0 || nx >= w || ny >= h || alpha(nx, ny) < 128))
          outline++;
        const [l, la, lb] = lab(data[i], data[i + 1], data[i + 2]);
        L.push(l);
        C.push(Math.hypot(la, lb));
        R.push(data[i]);
        G.push(data[i + 1]);
        B.push(data[i + 2]);
        ha += la;
        hb += lb;
      }
    if (touches) touching++;
  }
  for (const list of [L, C, R, G, B]) list.sort((p, q) => p - q);
  const triple = (list) => [0.05, 0.5, 0.95].map((p) => Math.round(percentile(list, p)));
  return {
    texels: L.length,
    lightness: triple(L),
    chroma: triple(C),
    hue: Math.round(((Math.atan2(hb, ha) * 180) / Math.PI + 360) % 360),
    median: `#${hex(percentile(R, 0.5))}${hex(percentile(G, 0.5))}${hex(percentile(B, 0.5))}`,
    feather: outline ? Math.round((partial / outline) * 100) / 100 : 0,
    framesTouchingEdge: trimmed ? 'trimmed frames' : `${touching}/${sources.length}`,
  };
}

const step = (img, i, j) =>
  Math.abs(img.data[i] - img.data[j]) +
  Math.abs(img.data[i + 1] - img.data[j + 1]) +
  Math.abs(img.data[i + 2] - img.data[j + 2]);

/**
 * Tile seam score: the mean colour step across the wrap divided by the mean step between
 * neighbouring interior columns and rows (about 1 is seamless). Tiles that repeat their first
 * column and row as their last wrap from the second-to-last column (`edgeRepeatsFirst`).
 * `axes` limits the score to 'x' (left-right wrap) or 'y' (top-bottom wrap).
 */
export function seam(img, axes = 'xy') {
  const { w, h } = img;
  const px = (x, y) => at(img, x, y);
  let same = true;
  for (let k = 0; k < h && same; k++) same = step(img, px(w - 1, k), px(0, k)) === 0;
  for (let k = 0; k < w && same; k++) same = step(img, px(k, h - 1), px(k, 0)) === 0;
  const last = same ? 2 : 1;
  let wrap = 0,
    inner = 0;
  if (axes.includes('x'))
    for (let k = 0; k < h; k++) {
      wrap += step(img, px(w - last, k), px(0, k));
      inner += step(img, px(w >> 1, k), px((w >> 1) + 1, k));
    }
  if (axes.includes('y'))
    for (let k = 0; k < w; k++) {
      wrap += step(img, px(k, h - last), px(k, 0));
      inner += step(img, px(k, h >> 1), px(k, (h >> 1) + 1));
    }
  return { edgeRepeatsFirst: same, seam: Math.round((wrap / Math.max(1, inner)) * 100) / 100 };
}

/** Half-size box downsample that wraps at the edges (one mip level of a tiling texture). */
export function downsample(img) {
  const w = Math.max(1, img.w >> 1),
    h = Math.max(1, img.h >> 1);
  const out = { w, h, c: img.c, data: new Float32Array(w * h * img.c) };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      for (let k = 0; k < img.c; k++) {
        let sum = 0;
        for (const [dx, dy] of [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ])
          sum += img.data[at(img, (2 * x + dx) % img.w, (2 * y + dy) % img.h) + k];
        out.data[at(out, x, y) + k] = sum / 4;
      }
  return out;
}

/**
 * Seam score at each mip level down to `minSize` texels: a tile can be seamless at full size and
 * still show its wrap once the GPU averages it for distant ground.
 */
export function mipSeams(img, minSize = 16, axes = 'xy') {
  const levels = [];
  let level = img;
  while (level.w >= minSize && level.h >= minSize) {
    levels.push({ size: [level.w, level.h], seam: seam(level, axes).seam });
    if (level.w < 2 || level.h < 2) break;
    level = downsample(level);
  }
  return levels;
}

/**
 * Tiling period: the mean CIELAB lightness of each quarter of the tile (or, for a band that wraps
 * only along x, of its left and right halves). A strong difference between them (a lighter or
 * darker corner) is what makes the repeat visible from afar.
 */
export function quarterContrast(img, axes = 'xy') {
  const cells =
    axes === 'x'
      ? [
          { x: 0, y: 0, w: img.w >> 1, h: img.h },
          { x: img.w >> 1, y: 0, w: img.w >> 1, h: img.h },
        ]
      : [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ].map(([qx, qy]) => ({
          x: (qx * img.w) >> 1,
          y: (qy * img.h) >> 1,
          w: img.w >> 1,
          h: img.h >> 1,
        }));
  const quarters = cells.map((rect) => {
    const q = crop(img, rect);
    let sum = 0;
    for (let i = 0; i < q.w * q.h; i++) {
      const [l] = lab(q.data[i * q.c], q.data[i * q.c + 1], q.data[i * q.c + 2]);
      sum += l;
    }
    return sum / (q.w * q.h);
  });
  return {
    quarterLightness: quarters.map((v) => Math.round(v * 10) / 10),
    spread: Math.round((Math.max(...quarters) - Math.min(...quarters)) * 10) / 10,
  };
}

/**
 * Sides of `rect` cut straight through paint: at least `share` of the side's texels are mostly
 * opaque (alpha >= 128). Trimmed cutouts touch their frame only with a few soft texels.
 */
export function croppedSides(img, rect, share = 0.25) {
  const alpha = (x, y) => alphaOf(img, at(img, rect.x + x, rect.y + y));
  const sides = {
    left: Array.from({ length: rect.h }, (_, y) => [0, y]),
    top: Array.from({ length: rect.w }, (_, x) => [x, 0]),
    right: Array.from({ length: rect.h }, (_, y) => [rect.w - 1, y]),
    bottom: Array.from({ length: rect.w }, (_, x) => [x, rect.h - 1]),
  };
  return Object.entries(sides)
    .filter(
      ([, points]) => points.filter(([x, y]) => alpha(x, y) >= 128).length >= share * points.length,
    )
    .map(([side]) => side);
}

/** Shares of transparent (alpha 0), partial and opaque (255) texels. */
export function alphaCoverage(img) {
  let transparent = 0,
    partial = 0,
    opaque = 0;
  for (let i = 0; i < img.w * img.h; i++) {
    const a = alphaOf(img, i * img.c);
    if (a === 0) transparent++;
    else if (a === 255) opaque++;
    else partial++;
  }
  const n = Math.max(1, img.w * img.h);
  const share = (v) => Math.round((v / n) * 10000) / 10000;
  return { transparent: share(transparent), partial: share(partial), opaque: share(opaque) };
}

/**
 * Painted bounds (alpha > 0) of `rect` (default the whole image) relative to the rectangle,
 * and which of its edges the paint touches. `null` when nothing is painted.
 */
export function paintBounds(img, rect = { x: 0, y: 0, w: img.w, h: img.h }) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < rect.h; y++)
    for (let x = 0; x < rect.w; x++)
      if (alphaOf(img, at(img, rect.x + x, rect.y + y)) > 0) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
  if (maxX < 0) return null;
  const touches = [];
  if (minX === 0) touches.push('left');
  if (minY === 0) touches.push('top');
  if (maxX === rect.w - 1) touches.push('right');
  if (maxY === rect.h - 1) touches.push('bottom');
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, touches };
}

/** Gap in texels between two rectangles (0 when they touch, negative when they overlap). */
export function rectGap(a, b) {
  const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  return Math.max(dx, dy);
}

/**
 * Frame spacing in an atlas: the smallest gap between any two frames and from any frame to the
 * atlas edge, the pairs that touch or overlap, and each frame's nearest neighbour.
 */
export function frameSpacing(frames, size) {
  const names = Object.keys(frames);
  let minGap = Infinity,
    minEdge = Infinity;
  const touching = [];
  const nearest = {};
  for (const name of names) {
    const r = frames[name];
    minEdge = Math.min(minEdge, r.x, r.y, size.w - (r.x + r.w), size.h - (r.y + r.h));
    nearest[name] = { name: null, gap: Infinity };
  }
  for (let i = 0; i < names.length; i++)
    for (let j = i + 1; j < names.length; j++) {
      const gap = rectGap(frames[names[i]], frames[names[j]]);
      minGap = Math.min(minGap, gap);
      if (gap <= 0) touching.push([names[i], names[j], gap]);
      if (gap < nearest[names[i]].gap) nearest[names[i]] = { name: names[j], gap };
      if (gap < nearest[names[j]].gap) nearest[names[j]] = { name: names[i], gap };
    }
  return { minGap: names.length > 1 ? minGap : null, minEdge, touching, nearest };
}

/**
 * The deepest mip level at which bilinear sampling inside every frame still reads only that
 * frame's own texels (or empty gutter): at level k one texel averages 2^k x 2^k source texels on
 * the aligned grid. Returns -1 when even level 0 leaks (touching or overlapping frames).
 */
export function mipSafeLevel(frames, size, maxLevel = 12) {
  const rects = Object.values(frames);
  const reach = (r, s) => ({
    // Texels at level k that bilinear sampling within the frame's UV rectangle reads.
    x0: Math.floor(r.x / s - 0.5),
    x1: Math.ceil((r.x + r.w) / s + 0.5) - 1,
    y0: Math.floor(r.y / s - 0.5),
    y1: Math.ceil((r.y + r.h) / s + 0.5) - 1,
  });
  const content = (r, s) => ({
    // Texels at level k that average any of the frame's source texels.
    x0: Math.floor(r.x / s),
    x1: Math.floor((r.x + r.w - 1) / s),
    y0: Math.floor(r.y / s),
    y1: Math.floor((r.y + r.h - 1) / s),
  });
  const overlap = (a, b) => a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;
  let safe = -1;
  for (let k = 0; k <= maxLevel && 2 ** k <= Math.max(size.w, size.h); k++) {
    const s = 2 ** k;
    for (let i = 0; i < rects.length; i++)
      for (let j = 0; j < rects.length; j++)
        if (i !== j && overlap(reach(rects[i], s), content(rects[j], s))) return safe;
    safe = k;
  }
  return safe;
}

/**
 * Edge colour around painted cutouts in `rect`. Outline texels have alpha > 0 and a transparent
 * 4-neighbour. `lightOutline` is the share of outline texels that are near white (every channel
 * >= 215 and low chroma), the visible white fringe of a cutout keyed from a white backing.
 * `transparentWhite` / `transparentBlack` are shares of transparent texels next to paint whose
 * colour is near white or black: linear filtering of straight (not premultiplied) alpha pulls
 * those colours into the edge.
 */
export function edgeFringe(img, rect = { x: 0, y: 0, w: img.w, h: img.h }) {
  if (img.c !== 4) return { outline: 0, lightOutline: 0, transparentWhite: 0, transparentBlack: 0 };
  const alpha = (x, y) => img.data[at(img, rect.x + x, rect.y + y) + 3];
  const inside = (x, y) => x >= 0 && y >= 0 && x < rect.w && y < rect.h;
  const near = (x, y) =>
    [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ].filter(([nx, ny]) => inside(nx, ny));
  let outline = 0,
    light = 0,
    border = 0,
    white = 0,
    black = 0;
  for (let y = 0; y < rect.h; y++)
    for (let x = 0; x < rect.w; x++) {
      const i = at(img, rect.x + x, rect.y + y);
      const [r, g, b] = [img.data[i], img.data[i + 1], img.data[i + 2]];
      const neighbours = near(x, y);
      if (alpha(x, y) > 0) {
        if (!neighbours.some(([nx, ny]) => alpha(nx, ny) === 0)) continue;
        outline++;
        if (Math.min(r, g, b) >= 215 && Math.max(r, g, b) - Math.min(r, g, b) < 24) light++;
      } else if (neighbours.some(([nx, ny]) => alpha(nx, ny) > 0)) {
        border++;
        if (Math.min(r, g, b) >= 215) white++;
        if (Math.max(r, g, b) <= 24) black++;
      }
    }
  const share = (v, n) => (n ? Math.round((v / n) * 10000) / 10000 : 0);
  return {
    outline,
    lightOutline: share(light, outline),
    transparentWhite: share(white, border),
    transparentBlack: share(black, border),
  };
}

/** World units per texel for a texture of `pixels` covering `worldSize` units. */
export const unitsPerTexel = (worldSize, pixels) => worldSize / pixels;
