// Development-only measurements of the approved painted art for docs/art-spec.md. Uses the
// `sharp` dev dependency; never runs in the game and changes no files.
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
// The measurements live in scripts/atlas/analysis.mjs, shared with the atlas tools.
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { measure, seam } from './atlas/analysis.mjs';
import { crop } from './atlas/image.mjs';
import { readFrames, readImage } from './atlas/io.mjs';

const art = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'public/art');

const decoded = new Map();
async function pixels(file, rect) {
  if (!decoded.has(file)) decoded.set(file, await readImage(join(art, file)));
  const img = decoded.get(file);
  return rect ? crop(img, rect) : img;
}

async function atlasFrames(atlas, json, match) {
  const frames = readFrames(join(art, json));
  return Promise.all(
    Object.entries(frames)
      .filter(([name]) => match(name))
      .map(([, frame]) => pixels(atlas, frame)),
  );
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
  const image = await pixels(`orkhon-valley/ground/${tile}.png`);
  report.tiles[tile] = { ...measure([image]), ...seam(image) };
}
for (const tile of WATER) {
  const image = await pixels(`orkhon-valley/water/${tile}.png`);
  report.tiles[tile] = { ...measure([image]), ...seam(image) };
}
const ground = (tiles) =>
  Promise.all(tiles.map((tile) => pixels(`orkhon-valley/ground/${tile}.png`)));
report.tiles['all ground'] = measure(await ground(TILES));
report.tiles['valley floor'] = measure(await ground(['valley_calm', 'valley_olive']));
report.tiles['all water'] = measure(
  await Promise.all(
    ['river_channel', 'river_rapids'].map((tile) => pixels(`orkhon-valley/water/${tile}.png`)),
  ),
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
for (const [group, names] of Object.entries(GROUPS))
  report.sprites[group] = measure(await orkhon(names));
report.sprites['kit cliff run'] = measure(await kit(['cliff_straight_run']));
report.sprites['kit falls'] = measure(await kit(['waterfall_curtain', 'waterfall_foam_pool']));
report.sprites['kit rocks'] = measure(
  await kit(['landmark_basalt_pillar', 'prop_cliff_scree', 'prop_river_islet']),
);
report.sprites['Khan (player frames)'] = measure(await motion('mounted', ['player']), true);
report.sprites['clan riders, workers, packhorses'] = measure(
  [...(await motion('mounted', ['rider'])), ...(await motion('clan', ['worker', 'packhorse']))],
  true,
);
report.sprites['enemies'] = measure(
  [
    ...(await motion('mounted', ['wolf', 'ghost'])),
    ...(await motion('creature', ['shade', 'earth', 'seer', 'skybreaker'])),
  ],
  true,
);
console.log(JSON.stringify(report, null, 2));
