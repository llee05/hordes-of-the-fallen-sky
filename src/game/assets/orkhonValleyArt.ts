/**
 * Orkhon Valley art. Terrain comes from the manuscript terrain kit sheet
 * (`art-source/orkhon-terrain-kit.png`), cut by `scripts/cut-orkhon-terrain-kit.mjs` into
 * repeatable tiles, bank bands and the kit atlas. Scenery the kit does not replace (trees, shrubs,
 * landmarks, camps, the bridge deck) comes from texture pack v2 (`scripts/pack-orkhon-valley.mjs`).
 */
import { ART_SPEC } from '../data/artSpec';

/** Texture pack v2 scenery sprites. */
export const ORKHON_ATLAS = 'orkhon-valley-sprites';
/** Terrain kit cutouts: the cliff wall, the falls, the basalt pillar, cliff-foot scree, islets. */
export const ORKHON_KIT_ATLAS = 'orkhon-terrain-kit';

/** Repeatable 128 × 128 terrain kit tiles, keyed by folder and file name. */
export const ORKHON_TILES = {
  valleyCalm: 'ground/valley_calm',
  valleyStraw: 'ground/valley_straw',
  valleyOlive: 'ground/valley_olive',
  plateauMoss: 'ground/plateau_moss',
  trailDirt: 'ground/trail_dirt',
  screeGravel: 'ground/scree_gravel',
  riverChannel: 'water/river_channel',
  riverRapids: 'water/river_rapids',
} as const;
export type OrkhonTile = keyof typeof ORKHON_TILES;

/**
 * Riverbank bands (128 × 46), repeated along each shore with the land at the top of the image.
 * `bankFar` shows the clay lip from the front, for shores whose land lies away from the camera;
 * `bankNear` shows it from above. The painted water edge sits `ORKHON_BANK_SHORE` down the band.
 */
export const ORKHON_BANKS = {
  bankFar: 'water/bank_far',
  bankNear: 'water/bank_near',
} as const;
export type OrkhonBank = keyof typeof ORKHON_BANKS;
export const ORKHON_BANK_SHORE = 0.73;

export const orkhonTileKey = (tile: OrkhonTile | OrkhonBank): string =>
  `orkhon-${tile in ORKHON_TILES ? ORKHON_TILES[tile as OrkhonTile] : ORKHON_BANKS[tile as OrkhonBank]}`;

/** World units covered by one repeat of a 128-pixel ground or water tile (`docs/art-spec.md`). */
export const ORKHON_TILE_WORLD_SIZE = ART_SPEC.orkhon.tileWorldSize;

/** World units per sprite pixel for scenery at its painted scale. */
export const ORKHON_SPRITE_SCALE = ART_SPEC.orkhon.spriteScale;

/**
 * The pack's sprites were painted at unrelated sizes. These factors, relative to the shared
 * sprite scale, set one miniature scale against the Khan's mounted billboard (about 63 units
 * tall) and the 240-unit cliffs: trees about twice a rider, shrubs and flowers below a horse's
 * back, single rocks knee to shoulder high. `docs/art-spec.md` lists the resulting size bands.
 */
export const ORKHON_PROP_SCALE = ART_SPEC.orkhon.propScale;

/** Landmark sprites drawn smaller than their painted scale, relative to the shared scale. */
export const ORKHON_LANDMARK_SCALE: Partial<Record<OrkhonSprite, number>> =
  ART_SPEC.orkhon.landmarkScale;

/**
 * Painted geometry measured from the sprites at their source size. Pack anchors come from its
 * manifest.json; kit anchors sit where each painting's ground meets its base.
 */
export interface OrkhonSpriteMetrics {
  width: number;
  height: number;
  anchorY: number;
}

/** Terrain kit cutouts, trimmed from their sheet cells at full sheet resolution. */
export const ORKHON_KIT_SPRITES = {
  cliff_straight_run: { width: 238, height: 146, anchorY: 1 },
  waterfall_curtain: { width: 143, height: 221, anchorY: 1 },
  waterfall_foam_pool: { width: 241, height: 171, anchorY: 1 },
  landmark_basalt_pillar: { width: 211, height: 217, anchorY: 0.92 },
  prop_cliff_scree: { width: 243, height: 143, anchorY: 0.86 },
  prop_river_islet: { width: 218, height: 155, anchorY: 0.84 },
} as const satisfies Record<string, OrkhonSpriteMetrics>;

export const ORKHON_SPRITES = {
  ...ORKHON_KIT_SPRITES,
  bridge_horizontal: { width: 131, height: 63, anchorY: 1 },
  autumn_yellow_tree: { width: 90, height: 105, anchorY: 0.96 },
  olive_tree: { width: 76, height: 103, anchorY: 0.96 },
  autumn_red_tree: { width: 75, height: 94, anchorY: 0.96 },
  pine_tree: { width: 86, height: 115, anchorY: 0.96 },
  bare_tree: { width: 43, height: 99, anchorY: 0.96 },
  shrub_olive: { width: 58, height: 48, anchorY: 1 },
  shrub_gold: { width: 59, height: 53, anchorY: 1 },
  shrub_green: { width: 65, height: 37, anchorY: 1 },
  shrub_mix: { width: 60, height: 38, anchorY: 1 },
  white_wildflowers: { width: 53, height: 50, anchorY: 1 },
  red_wildflowers: { width: 55, height: 44, anchorY: 1 },
  small_boulder: { width: 40, height: 41, anchorY: 1 },
  loose_pebbles: { width: 32, height: 20, anchorY: 1 },
  reed_clump: { width: 33, height: 33, anchorY: 1 },
  sacred_ovoo: { width: 215, height: 151, anchorY: 1 },
  stone_ruins: { width: 178, height: 111, anchorY: 1 },
  red_enemy_banner: { width: 43, height: 97, anchorY: 1 },
  blue_camp_banner: { width: 63, height: 98, anchorY: 1 },
  spear_rack: { width: 50, height: 75, anchorY: 1 },
  wooden_rack: { width: 75, height: 43, anchorY: 1 },
  relic_fire: { width: 73, height: 56, anchorY: 1 },
  standing_stone: { width: 65, height: 72, anchorY: 1 },
  player_ger_small: { width: 111, height: 86, anchorY: 1 },
  player_ger_medium: { width: 92, height: 72, anchorY: 1 },
  camp_supply_cart: { width: 87, height: 59, anchorY: 1 },
  camp_fire: { width: 69, height: 45, anchorY: 1 },
  camp_canopy: { width: 86, height: 56, anchorY: 1 },
  enemy_camp_palisade: { width: 146, height: 126, anchorY: 1 },
  enemy_camp_ger: { width: 163, height: 110, anchorY: 1 },
  enemy_camp_tents: { width: 152, height: 119, anchorY: 1 },
} as const satisfies Record<string, OrkhonSpriteMetrics>;
export type OrkhonSprite = keyof typeof ORKHON_SPRITES;

/** The atlas texture holding a sprite. */
export const orkhonAtlasOf = (sprite: OrkhonSprite): string =>
  Object.hasOwn(ORKHON_KIT_SPRITES, sprite) ? ORKHON_KIT_ATLAS : ORKHON_ATLAS;

/** An opaque basalt band cropped from the kit's straight cliff run, with its grass lip on top. */
export interface OrkhonCliffFace {
  sprite: OrkhonSprite;
  /** Source pixel of the band's top-left corner. */
  x: number;
  y: number;
  /** Source rows from the grass lip to the cliff foot. */
  height: number;
}

/** Source columns used from every band; each repeat along a cliff picks one band. */
export const ORKHON_CLIFF_FACE_WIDTH = 100;

/**
 * Cliff walls are textured with these bands, repeated along the plateau outline so faces and
 * corners stay continuous. Each is a fully opaque window of `cliff_straight_run`: its rows run
 * from the grass lip and the inked column tops to the scree at the cliff foot.
 */
export const ORKHON_CLIFF_FACES: readonly OrkhonCliffFace[] = [
  { sprite: 'cliff_straight_run', x: 16, y: 16, height: 117 },
  { sprite: 'cliff_straight_run', x: 56, y: 16, height: 117 },
  { sprite: 'cliff_straight_run', x: 92, y: 16, height: 117 },
  { sprite: 'cliff_straight_run', x: 128, y: 16, height: 117 },
];
