// Development-only measurements of the approved painted art for docs/art-spec.md. Requires
// ImageMagick; never runs in the game and changes no files.
// Usage: node scripts/measure-art.mjs
//
// For every group it reports, over painted texels (alpha >= 128): CIELAB lightness L* and chroma
// C* at the 5th, 50th and 95th percentiles, the chroma-weighted mean hue, and the median colour.
// Sprite groups also report their edge treatment: partially transparent texels per outline texel
// (an approximate feather width in source pixels) and how often paint touches the frame edge.
// Tiles report whether their last column and row repeat the first, and a seam score: the mean
// colour step across the wrap divided by the mean step between neighbouring interior columns and
// rows (about 1 is seamless). Partial alpha in the character sheets also counts their soft
// painted dust and hair, so their feather value is a share of soft paint, not an edge width.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const art = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'public/art');

function pixels(file, rect) {
  const crop = rect ? ['-crop', `${rect.w}x${rect.h}+${rect.x}+${rect.y}`, '+repage'] : [];
  const args = [join(art, file), ...crop, '-alpha', 'on', '-depth', '8', 'rgba:-'];
  const result = spawnSync('magick', args, { maxBuffer: 1 << 28 });
  if (result.status !== 0) throw new Error(`magick failed for ${file}: ${result.stderr}`);
  const size = spawnSync('magick', [join(art, file), ...crop, '-format', '%w %h', 'info:']);
  const [w, h] = String(size.stdout).split(' ').map(Number);
  return { data: result.stdout, w, h };
}

const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function lab(r, g, b) {
  const [R, G, B] = [r, g, b].map((c) => linear(c / 255));
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

const percentile = (sorted, p) =>
  sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
const hex = (v) => Math.round(v).toString(16).padStart(2, '0');

function measure(sources, trimmed = false) {
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
  for (const { data, w, h } of sources) {
    let touches = false;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const alpha = data[i + 3];
        if (alpha > 0 && alpha < 255) partial++;
        if (alpha < 128) continue;
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touches = true;
        const near = [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ];
        if (
          near.some(
            ([nx, ny]) =>
              nx < 0 || ny < 0 || nx >= w || ny >= h || data[(ny * w + nx) * 4 + 3] < 128,
          )
        )
          outline++;
        const [l, a, b] = lab(data[i], data[i + 1], data[i + 2]);
        const c = Math.hypot(a, b);
        L.push(l);
        C.push(c);
        R.push(data[i]);
        G.push(data[i + 1]);
        B.push(data[i + 2]);
        ha += a;
        hb += b;
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

function seam({ data, w, h }) {
  const step = (i, j) =>
    Math.abs(data[i] - data[j]) +
    Math.abs(data[i + 1] - data[j + 1]) +
    Math.abs(data[i + 2] - data[j + 2]);
  // Pack tiles repeat their first column and row as their last; then the wrap runs from the
  // second-to-last column into the first.
  let same = true;
  for (let k = 0; k < h && same; k++) same = step((k * w + w - 1) * 4, k * w * 4) === 0;
  for (let k = 0; k < w && same; k++) same = step(((h - 1) * w + k) * 4, k * 4) === 0;
  const last = same ? 2 : 1;
  let wrap = 0,
    inner = 0;
  for (let k = 0; k < h; k++) {
    wrap += step((k * w + w - last) * 4, k * w * 4);
    inner += step((k * w + Math.floor(w / 2)) * 4, (k * w + Math.floor(w / 2) + 1) * 4);
  }
  for (let k = 0; k < w; k++) {
    wrap += step(((h - last) * w + k) * 4, k * 4);
    inner += step((Math.floor(h / 2) * w + k) * 4, ((Math.floor(h / 2) + 1) * w + k) * 4);
  }
  return { edgeRepeatsFirst: same, seam: Math.round((wrap / Math.max(1, inner)) * 100) / 100 };
}

function atlasFrames(atlas, json, match) {
  const frames = JSON.parse(readFileSync(join(art, json), 'utf8')).frames;
  return Object.entries(frames)
    .filter(([name]) => match(name))
    .map(([, frame]) => pixels(atlas, frame.frame));
}

const orkhon = (names) =>
  atlasFrames(
    'orkhon-valley/orkhon-valley-sprites.png',
    'orkhon-valley/orkhon-valley-sprites.json',
    (name) => names.includes(name),
  );
const kit = (names) =>
  atlasFrames(
    'orkhon-valley/orkhon-terrain-kit.png',
    'orkhon-valley/orkhon-terrain-kit.json',
    (name) => names.includes(name),
  );
const motion = (sheet, kinds) =>
  atlasFrames(`steppe-${sheet}-motion.png`, `steppe-${sheet}-motion.json`, (name) =>
    kinds.some((kind) => name.startsWith(`${kind}-`)),
  );

const TILES = [
  'valley_calm',
  'valley_straw',
  'valley_olive',
  'plateau_moss',
  'trail_dirt',
  'scree_gravel',
];
const WATER = ['river_channel', 'river_rapids', 'bank_far', 'bank_near'];
const report = { tiles: {}, sprites: {} };
for (const tile of TILES) {
  const image = pixels(`orkhon-valley/ground/${tile}.png`);
  report.tiles[tile] = { ...measure([image]), ...seam(image) };
}
for (const tile of WATER) {
  const image = pixels(`orkhon-valley/water/${tile}.png`);
  report.tiles[tile] = { ...measure([image]), ...seam(image) };
}
report.tiles['all ground'] = measure(
  TILES.map((tile) => pixels(`orkhon-valley/ground/${tile}.png`)),
);
report.tiles['valley floor'] = measure(
  ['valley_calm', 'valley_olive'].map((tile) => pixels(`orkhon-valley/ground/${tile}.png`)),
);
report.tiles['all water'] = measure(
  ['river_channel', 'river_rapids'].map((tile) => pixels(`orkhon-valley/water/${tile}.png`)),
);
const GROUPS = {
  trees: ['autumn_yellow_tree', 'olive_tree', 'autumn_red_tree', 'pine_tree', 'bare_tree'],
  'shrubs and flowers': [
    'shrub_olive',
    'shrub_gold',
    'shrub_green',
    'shrub_mix',
    'white_wildflowers',
    'red_wildflowers',
    'reed_clump',
  ],
  rocks: ['small_boulder', 'loose_pebbles'],
  landmarks: [
    'sacred_ovoo',
    'stone_ruins',
    'standing_stone',
    'relic_fire',
    'red_enemy_banner',
    'blue_camp_banner',
    'spear_rack',
    'wooden_rack',
  ],
  'camps and gers': [
    'player_ger_small',
    'player_ger_medium',
    'camp_supply_cart',
    'camp_canopy',
    'enemy_camp_palisade',
    'enemy_camp_ger',
    'enemy_camp_tents',
  ],
};
for (const [group, names] of Object.entries(GROUPS)) report.sprites[group] = measure(orkhon(names));
report.sprites['kit cliff run'] = measure(kit(['cliff_straight_run']));
report.sprites['kit falls'] = measure(kit(['waterfall_curtain', 'waterfall_foam_pool']));
report.sprites['kit rocks'] = measure(
  kit(['landmark_basalt_pillar', 'prop_cliff_scree', 'prop_river_islet']),
);
report.sprites['Khan (player frames)'] = measure(motion('mounted', ['player']), true);
report.sprites['clan riders, workers, packhorses'] = measure(
  [...motion('mounted', ['rider']), ...motion('clan', ['worker', 'packhorse'])],
  true,
);
report.sprites['enemies'] = measure(
  [
    ...motion('mounted', ['wolf', 'ghost']),
    ...motion('creature', ['shade', 'earth', 'seer', 'skybreaker']),
  ],
  true,
);
console.log(JSON.stringify(report, null, 2));
