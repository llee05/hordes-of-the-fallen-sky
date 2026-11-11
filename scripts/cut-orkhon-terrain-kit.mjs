// Development-only cutter for the Orkhon Valley terrain kit sheet (docs/art-orders/orkhon-terrain-kit.md).
// Requires the `sharp` dev dependency; never runs in the game.
// Usage: node scripts/cut-orkhon-terrain-kit.mjs [sheet] (default art-source/orkhon-terrain-kit.png)
//
// The 1536 x 1024 sheet is a 6 x 4 grid of 256-pixel cells. Only small corrective adjustments are
// made; no piece is repainted, recoloured or tinted:
// - Ground and water tiles are made seamless by offset-and-heal: each axis is blended with a copy
//   rolled by half a tile, so the wrap edges come from neighbouring painted texels. The blend follows
//   each painting's own light and dark strokes (as the terrain shader does) instead of a soft fade.
//   Tiles are then downsampled 50% (Lanczos3) to 128 pixels, 200 world units per repeat.
// - The dirt trail runs through grass, so the plain dirt tile is quilted from dirt-only patches of
//   the trail painting and healed the same way.
// - River tiles are turned a quarter so the current runs along the tile's rows (the river shader's
//   along-channel axis). Bank tiles keep only their bank band (grass, clay lip, edge of the water).
// - Cutouts (rows 2 and 4) are keyed from their white backing: only white connected to the cell
//   border becomes transparent, partly white edge texels are un-mixed from white so no white fringe
//   remains, and transparent texels take nearby painted colour so linear filtering stays clean.
//   Cutouts keep their full sheet resolution and are packed into one atlas with JSON frames.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sheetPath = resolve(process.argv[2] ?? join(root, 'art-source/orkhon-terrain-kit.png'));
const output = join(root, 'public/art/orkhon-valley');
const CELL = 256;
const TILE = 128;

/** Seamless 128-pixel tiles: output path, sheet cell (column, row from 0), and processing. */
const TILES = [
  { path: 'ground/valley_calm', cell: [0, 0] },
  { path: 'ground/valley_straw', cell: [1, 0] },
  { path: 'ground/valley_olive', cell: [2, 0] },
  { path: 'ground/plateau_moss', cell: [3, 0] },
  { path: 'ground/trail_dirt', cell: [4, 0], quilt: true },
  { path: 'ground/scree_gravel', cell: [5, 0] },
  { path: 'water/river_channel', cell: [0, 2], turn: true },
  { path: 'water/river_rapids', cell: [5, 2], turn: true },
];

/** Bank bands (sheet rows within the cell), repeated along each shore. Land is at the top. */
const BANKS = [
  // South bank: grass, the clay lip seen from the front, then water. Used where land is far.
  { path: 'water/bank_far', cell: [1, 2], rows: [108, 200], flip: false },
  // North bank: water, the lip seen from above, then grass; flipped so land is at the top.
  { path: 'water/bank_near', cell: [2, 2], rows: [104, 196], flip: true },
];

/** Cutouts packed into the kit atlas. */
const CUTOUTS = [
  { name: 'cliff_straight_run', cell: [0, 1] },
  { name: 'waterfall_curtain', cell: [1, 3] },
  { name: 'waterfall_foam_pool', cell: [2, 3] },
  { name: 'landmark_basalt_pillar', cell: [3, 3] },
  { name: 'prop_cliff_scree', cell: [4, 3] },
  { name: 'prop_river_islet', cell: [5, 3] },
];
const ATLAS = 'orkhon-terrain-kit';
const ATLAS_WIDTH = 1024;
const GUTTER = 4;

// ---------------------------------------------------------------------------------------------
// Float RGB(A) images: { w, h, c, data: Float32Array } with values 0..255.

const image = (w, h, c) => ({ w, h, c, data: new Float32Array(w * h * c) });
const at = (img, x, y) => ((y * img.w + x) * img.c) | 0;
const luma = (img, x, y) => {
  const i = at(img, x, y);
  return (img.data[i] * 0.299 + img.data[i + 1] * 0.587 + img.data[i + 2] * 0.114) / 255;
};
const smoothstep = (a, b, v) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** Deterministic smooth value noise in [0, 1). */
function noise(x, y, seed) {
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

async function cell(sheet, [column, row], rows = [0, CELL]) {
  const { data, info } = await sheet
    .clone()
    .extract({
      left: column * CELL,
      top: row * CELL + rows[0],
      width: CELL,
      height: rows[1] - rows[0],
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const img = image(info.width, info.height, 3);
  img.data.set(data);
  return img;
}

function roll(img, dx, dy) {
  const out = image(img.w, img.h, img.c);
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const from = at(img, (x - dx + img.w) % img.w, (y - dy + img.h) % img.h);
      out.data.set(img.data.subarray(from, from + img.c), at(out, x, y));
    }
  return out;
}

function turn(img) {
  const out = image(img.h, img.w, img.c);
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const from = at(img, x, y);
      out.data.set(img.data.subarray(from, from + img.c), at(out, img.h - 1 - y, x));
    }
  return out;
}

function flipRows(img) {
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
function healAxis(img, axis, seed) {
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

const heal = (img, seed, axes = 'xy') => {
  let out = img;
  if (axes.includes('x')) out = healAxis(out, 'x', seed);
  if (axes.includes('y')) out = healAxis(out, 'y', seed + 1);
  return out;
};

/**
 * Plain dirt quilted from the trail painting: square windows that hold only dirt, laid on a 5 x 5
 * grid that wraps, each meeting its neighbours along their own strokes.
 */
function quiltDirt(trail) {
  // Dirt is told from grass by its blue, averaged over 5 x 5 texels so dark pebbles count as dirt.
  const blue = new Float32Array(CELL * CELL);
  for (let y = 0; y < CELL; y++)
    for (let x = 0; x < CELL; x++) {
      let sum = 0;
      for (let j = -2; j <= 2; j++)
        for (let i = -2; i <= 2; i++)
          sum += trail.data[at(trail, (x + i + CELL) % CELL, (y + j + CELL) % CELL) + 2];
      blue[y * CELL + x] = sum / 25;
    }
  const isDirt = (x, y) => blue[y * CELL + x] > 78;
  const PATCH = 56;
  const windows = [];
  for (let y = 0; y <= CELL - PATCH; y += 4)
    for (let x = 0; x <= CELL - PATCH; x += 4) {
      let dirt = 0;
      for (let j = 0; j < PATCH; j += 2)
        for (let i = 0; i < PATCH; i += 2) dirt += isDirt(x + i, y + j);
      if (
        dirt >= (PATCH / 2) ** 2 * 0.985 &&
        windows.every((w) => Math.hypot(w.x - x, w.y - y) > 20)
      )
        windows.push({ x, y });
    }
  if (windows.length < 4) throw new Error('Too few dirt-only windows in the trail painting');
  const GRID = 5;
  const step = CELL / GRID;
  const pick = [];
  for (let j = 0; j < GRID; j++)
    for (let i = 0; i < GRID; i++) {
      let k = (i * 7 + j * 3 + ((i * j) % 5)) % windows.length;
      while ((i > 0 && pick[j * GRID + i - 1] === k) || (j > 0 && pick[(j - 1) * GRID + i] === k))
        k = (k + 1) % windows.length;
      pick.push(k);
    }
  const margin = (PATCH - step) / 2;
  // Sample cell (i, j) at local offset (lx, ly), which may reach `margin` past the cell.
  const sample = (i, j, lx, ly) => {
    const w = windows[pick[((j + GRID) % GRID) * GRID + ((i + GRID) % GRID)]];
    const sx = Math.max(0, Math.min(PATCH - 1, Math.round(margin + lx)));
    const sy = Math.max(0, Math.min(PATCH - 1, Math.round(margin + ly)));
    return at(trail, w.x + sx, w.y + sy);
  };
  const out = image(CELL, CELL, 3);
  const lum = (index) =>
    (trail.data[index] * 0.299 + trail.data[index + 1] * 0.587 + trail.data[index + 2] * 0.114) /
    255;
  for (let y = 0; y < CELL; y++)
    for (let x = 0; x < CELL; x++) {
      const i = Math.floor(x / step),
        j = Math.floor(y / step);
      const lx = x - i * step,
        ly = y - j * step;
      // Blend the nearer neighbour in the overlap on each axis.
      const ni = lx < step / 2 ? i - 1 : i + 1;
      const nj = ly < step / 2 ? j - 1 : j + 1;
      const dx = Math.min(lx, step - lx),
        dy = Math.min(ly, step - ly);
      let index = sample(i, j, lx, ly);
      const choose = (other, distance) => {
        const weight = 0.5 - distance / (2 * margin);
        if (weight <= 0) return;
        if (weight + (lum(other) - lum(index)) * 0.8 > 0.5) index = other;
      };
      choose(sample(ni, j, lx - (ni - i) * step, ly), dx);
      choose(sample(i, nj, lx, ly - (nj - j) * step), dy);
      out.data.set(trail.data.subarray(index, index + 3), at(out, x, y));
    }
  return out;
}

async function writeTile(img, file, size = [TILE, Math.round((TILE * img.h) / img.w)]) {
  // Resize a 3 x 3 repeat and keep its centre, so the filter wraps across the tile edges.
  const tiled = image(img.w * 3, img.h * 3, 3);
  for (let y = 0; y < tiled.h; y++)
    for (let x = 0; x < tiled.w; x++)
      tiled.data.set(
        img.data.subarray(at(img, x % img.w, y % img.h), at(img, x % img.w, y % img.h) + 3),
        at(tiled, x, y),
      );
  const big = Buffer.from(tiled.data.map((v) => Math.max(0, Math.min(255, Math.round(v)))));
  await sharp(big, { raw: { width: tiled.w, height: tiled.h, channels: 3 } })
    .resize(size[0] * 3, size[1] * 3, { kernel: sharp.kernel.lanczos3 })
    .extract({ left: size[0], top: size[1], width: size[0], height: size[1] })
    .png({ compressionLevel: 9 })
    .toFile(join(output, `${file}.png`));
}

/**
 * Key the white backing to transparency. Only near-white texels connected to the cell border are
 * background; partly white edge texels get partial alpha and are un-mixed from white.
 */
function keyWhite(img) {
  const out = image(img.w, img.h, 4);
  const whiteness = (x, y) => {
    const i = at(img, x, y);
    return 255 - Math.min(img.data[i], img.data[i + 1], img.data[i + 2]);
  };
  const background = new Uint8Array(img.w * img.h);
  const stack = [];
  const visit = (x, y) => {
    if (x < 0 || y < 0 || x >= img.w || y >= img.h || background[y * img.w + x]) return;
    if (whiteness(x, y) > 40) return;
    background[y * img.w + x] = 1;
    stack.push(x, y);
  };
  for (let x = 0; x < img.w; x++) (visit(x, 0), visit(x, img.h - 1));
  for (let y = 0; y < img.h; y++) (visit(0, y), visit(img.w - 1, y));
  while (stack.length) {
    const y = stack.pop(),
      x = stack.pop();
    (visit(x + 1, y), visit(x - 1, y), visit(x, y + 1), visit(x, y - 1));
  }
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const i = at(img, x, y),
        o = at(out, x, y);
      let alpha = 1;
      if (background[y * img.w + x]) {
        alpha = smoothstep(8, 40, whiteness(x, y));
        if (alpha < 0.12) alpha = 0;
      }
      for (let k = 0; k < 3; k++)
        out.data[o + k] =
          alpha > 0 ? Math.max(0, Math.min(255, (img.data[i + k] - 255 * (1 - alpha)) / alpha)) : 0;
      out.data[o + 3] = alpha * 255;
    }
  // Specks of grid-line antialiasing at the cell edge are not part of the piece.
  const seen = new Uint8Array(img.w * img.h);
  for (let start = 0; start < img.w * img.h; start++) {
    if (!out.data[start * 4 + 3] || seen[start]) continue;
    const component = [start];
    seen[start] = 1;
    for (let k = 0; k < component.length; k++) {
      const p = component[k],
        px = p % img.w,
        py = (p - px) / img.w;
      for (const [nx, ny] of [
        [px + 1, py],
        [px - 1, py],
        [px, py + 1],
        [px, py - 1],
      ]) {
        const q = ny * img.w + nx;
        if (nx < 0 || ny < 0 || nx >= img.w || ny >= img.h || !out.data[q * 4 + 3] || seen[q])
          continue;
        seen[q] = 1;
        component.push(q);
      }
    }
    if (component.length < 64) for (const p of component) out.data[p * 4 + 3] = 0;
  }
  return out;
}

function trim(img) {
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
  const out = image(maxX - minX + 1, maxY - minY + 1, 4);
  for (let y = 0; y < out.h; y++)
    out.data.set(
      img.data.subarray(at(img, minX, minY + y), at(img, minX, minY + y) + out.w * 4),
      at(out, 0, y),
    );
  return { img: out, offset: [minX, minY] };
}

/** Fill transparent texels with the colour of nearby painted texels (alpha unchanged). */
function bleed(img) {
  const filled = new Uint8Array(img.w * img.h);
  for (let p = 0; p < img.w * img.h; p++) filled[p] = img.data[p * 4 + 3] > 0 ? 1 : 0;
  for (let pass = 0; pass < 6; pass++) {
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

// ---------------------------------------------------------------------------------------------

const sheet = sharp(sheetPath);
const meta = await sheet.metadata();
if (meta.width !== CELL * 6 || meta.height !== CELL * 4)
  throw new Error(`Expected a 1536 x 1024 sheet, got ${meta.width} x ${meta.height}`);
mkdirSync(join(output, 'ground'), { recursive: true });
mkdirSync(join(output, 'water'), { recursive: true });

for (const [index, tile] of TILES.entries()) {
  let img = await cell(sheet, tile.cell);
  if (tile.quilt) img = quiltDirt(img);
  if (tile.turn) img = turn(img);
  await writeTile(heal(img, 11 + index * 7), tile.path);
}
for (const [index, bank] of BANKS.entries()) {
  let img = await cell(sheet, bank.cell, bank.rows);
  if (bank.flip) img = flipRows(img);
  await writeTile(heal(img, 101 + index * 7, 'x'), bank.path);
}

const pieces = [];
for (const cutout of CUTOUTS) {
  const keyed = trim(keyWhite(await cell(sheet, cutout.cell)));
  pieces.push({
    name: cutout.name,
    img: bleed(keyed.img),
    source: cutout.cell,
    offset: keyed.offset,
  });
}
// Shelf packing, tallest first, with transparent gutters between frames.
const order = [...pieces].sort((a, b) => b.img.h - a.img.h || b.img.w - a.img.w);
let x = GUTTER,
  y = GUTTER,
  shelf = 0;
for (const piece of order) {
  if (x + piece.img.w + GUTTER > ATLAS_WIDTH) {
    x = GUTTER;
    y += shelf + GUTTER;
    shelf = 0;
  }
  piece.x = x;
  piece.y = y;
  x += piece.img.w + GUTTER;
  shelf = Math.max(shelf, piece.img.h);
}
const height = 2 ** Math.ceil(Math.log2(y + shelf + GUTTER));
const atlas = Buffer.alloc(ATLAS_WIDTH * height * 4);
for (const piece of pieces)
  for (let row = 0; row < piece.img.h; row++)
    for (let column = 0; column < piece.img.w; column++) {
      const from = at(piece.img, column, row);
      const to = ((piece.y + row) * ATLAS_WIDTH + piece.x + column) * 4;
      for (let k = 0; k < 4; k++)
        atlas[to + k] = Math.max(0, Math.min(255, Math.round(piece.img.data[from + k])));
    }
await sharp(atlas, { raw: { width: ATLAS_WIDTH, height, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(join(output, `${ATLAS}.png`));
const frames = Object.fromEntries(
  pieces.map((piece) => [
    piece.name,
    {
      frame: { x: piece.x, y: piece.y, w: piece.img.w, h: piece.img.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: piece.img.w, h: piece.img.h },
      sourceSize: { w: piece.img.w, h: piece.img.h },
    },
  ]),
);
writeFileSync(
  join(output, `${ATLAS}.json`),
  `${JSON.stringify(
    {
      frames,
      meta: {
        app: 'scripts/cut-orkhon-terrain-kit.mjs',
        source: 'art-source/orkhon-terrain-kit.png',
        image: `${ATLAS}.png`,
        format: 'RGBA8888',
        size: { w: ATLAS_WIDTH, h: height },
        scale: '1',
      },
    },
    null,
    2,
  )}\n`,
);
for (const piece of pieces)
  console.log(
    `${piece.name}: ${piece.img.w}x${piece.img.h}, sheet cell ${piece.source.join(',')} offset ${piece.offset.join(',')}`,
  );
console.log(
  `Wrote ${TILES.length} tiles, ${BANKS.length} bank bands and ${pieces.length} cutouts.`,
);
