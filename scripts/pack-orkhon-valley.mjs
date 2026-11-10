// Development-only import of the Orkhon Valley texture pack v2. Requires ImageMagick; never runs in the game.
// Usage: node scripts/pack-orkhon-valley.mjs <path to extracted orkhon_valley_texture_pack_v2>
//
// Ground and water tiles are copied unchanged. Transparent sprites are packed unscaled into one atlas.
// The only pixel change is alpha-edge cleanup: fully transparent texels receive the colour of nearby
// painted texels so linear filtering does not darken cutout edges. Alpha and every visible texel are kept.
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pack = process.argv[2] && resolve(process.argv[2]);
if (!pack) throw new Error('Pass the extracted orkhon_valley_texture_pack_v2 directory');
const output = join(root, 'public/art/orkhon-valley');
const manifest = JSON.parse(readFileSync(join(pack, 'manifest.json'), 'utf8'));
const sizes = new Map(manifest.assets.map((asset) => [asset.path, asset.size_px]));

/** Repeatable ground and water materials used by the terrain and river shaders. */
export const TILES = [
  'ground/steppe_grass_var.png',
  'ground/dry_grass.png',
  'ground/patchy_grass.png',
  'ground/plateau_grass.png',
  'ground/dry_dirt.png',
  'ground/rocky_ground.png',
  'water/river_flow.png',
  'water/river_rapids.png',
];

/** Transparent sprites placed by the authored level. */
export const SPRITES = [
  'elevation/cliff_face_tall.png',
  'elevation/cliff_face_medium.png',
  'elevation/cliff_face_short.png',
  'elevation/cliff_end_cap.png',
  'elevation/cliff_isolated.png',
  'water/waterfall_top.png',
  'water/waterfall_base.png',
  'structures/bridge_horizontal.png',
  'props/trees/autumn_yellow_tree.png',
  'props/trees/olive_tree.png',
  'props/trees/autumn_red_tree.png',
  'props/trees/pine_tree.png',
  'props/trees/bare_tree.png',
  'props/decor/shrub_olive.png',
  'props/decor/shrub_gold.png',
  'props/decor/shrub_green.png',
  'props/decor/shrub_mix.png',
  'props/decor/white_wildflowers.png',
  'props/decor/red_wildflowers.png',
  'props/decor/small_boulder.png',
  'props/decor/loose_pebbles.png',
  'props/decor/reed_clump.png',
  'props/rocks/rock_cluster_large.png',
  'props/rocks/rock_cluster_round.png',
  'props/rocks/rock_single.png',
  'props/rocks/rock_pair.png',
  'props/rocks/fallen_rocks.png',
  'props/rocks/small_stones.png',
  'landmarks/sacred_ovoo.png',
  'landmarks/stone_ruins.png',
  'landmarks/red_enemy_banner.png',
  'landmarks/blue_camp_banner.png',
  'landmarks/spear_rack.png',
  'landmarks/wooden_rack.png',
  'landmarks/relic_fire.png',
  'landmarks/standing_stone.png',
  'camps/player_ger_small.png',
  'camps/player_ger_medium.png',
  'camps/camp_supply_cart.png',
  'camps/camp_fire.png',
  'camps/camp_canopy.png',
  'camps/enemy_camp_palisade.png',
  'camps/enemy_camp_ger.png',
  'camps/enemy_camp_tents.png',
];

const ATLAS_WIDTH = 1024;
const GUTTER = 4;
const magick = (...args) => {
  const result = spawnSync('magick', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'ImageMagick is required');
  return result.stdout.trim();
};
const frameName = (path) => basename(path, '.png');

const temporary = mkdtempSync(join(tmpdir(), 'orkhon-valley-'));
try {
  mkdirSync(join(output, 'ground'), { recursive: true });
  mkdirSync(join(output, 'water'), { recursive: true });
  for (const tile of TILES) {
    const [w, h] = magick(join(pack, tile), '-format', '%w %h', 'info:').split(' ').map(Number);
    const expected = sizes.get(tile);
    if (!expected || expected[0] !== w || expected[1] !== h)
      throw new Error(`${tile} does not match manifest.json`);
    copyFileSync(join(pack, tile), join(output, tile));
  }

  const pieces = SPRITES.map((path) => {
    const [w, h] = magick(join(pack, path), '-format', '%w %h', 'info:').split(' ').map(Number);
    const expected = sizes.get(path);
    if (!expected || expected[0] !== w || expected[1] !== h)
      throw new Error(`${path} does not match manifest.json`);
    const cleaned = join(temporary, `${frameName(path)}.png`);
    // Fill transparent texels from a normalised blur of nearby painted texels; keep visible texels.
    magick(
      join(pack, path),
      '(',
      '-clone',
      '0',
      '-background',
      'black',
      '-alpha',
      'remove',
      '-alpha',
      'off',
      '-blur',
      '0x4',
      ')',
      '(',
      '-clone',
      '0',
      '-alpha',
      'extract',
      '-blur',
      '0x4',
      ')',
      '(',
      '-clone',
      '1,2',
      '-fx',
      'u/max(v,0.0001)',
      ')',
      '-delete',
      '1,2',
      '-channel',
      'RGB',
      '-fx',
      'u.a>0 ? u : v',
      '+channel',
      '-delete',
      '1',
      `PNG32:${cleaned}`,
    );
    return { name: frameName(path), file: cleaned, w, h };
  });

  // Shelf packing, tallest first, with transparent gutters between frames.
  const order = [...pieces].sort((a, b) => b.h - a.h || b.w - a.w);
  let x = GUTTER,
    y = GUTTER,
    shelf = 0;
  for (const piece of order) {
    if (x + piece.w + GUTTER > ATLAS_WIDTH) {
      x = GUTTER;
      y += shelf + GUTTER;
      shelf = 0;
    }
    piece.x = x;
    piece.y = y;
    x += piece.w + GUTTER;
    shelf = Math.max(shelf, piece.h);
  }
  const height = 2 ** Math.ceil(Math.log2(y + shelf + GUTTER));
  const composite = ['-size', `${ATLAS_WIDTH}x${height}`, 'canvas:none'];
  for (const piece of order)
    composite.push(piece.file, '-geometry', `+${piece.x}+${piece.y}`, '-composite');
  magick(...composite, 'PNG32:' + join(output, 'orkhon-valley-sprites.png'));

  const frames = Object.fromEntries(
    pieces.map((piece) => [
      piece.name,
      {
        frame: { x: piece.x, y: piece.y, w: piece.w, h: piece.h },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: piece.w, h: piece.h },
        sourceSize: { w: piece.w, h: piece.h },
      },
    ]),
  );
  writeFileSync(
    join(output, 'orkhon-valley-sprites.json'),
    `${JSON.stringify(
      {
        frames,
        meta: {
          app: 'scripts/pack-orkhon-valley.mjs',
          source: 'Orkhon Valley texture pack v2',
          image: 'orkhon-valley-sprites.png',
          format: 'RGBA8888',
          size: { w: ATLAS_WIDTH, h: height },
          scale: '1',
        },
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `Packed ${pieces.length} sprites into ${ATLAS_WIDTH}x${height}; copied ${TILES.length} tiles.`,
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
