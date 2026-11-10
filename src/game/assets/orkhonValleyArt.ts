/**
 * Orkhon Valley texture pack v2, imported unchanged by `scripts/pack-orkhon-valley.mjs`.
 * Ground and water tiles stay separate repeatable images; transparent sprites share one atlas.
 */
import { ART_SPEC } from '../data/artSpec';

export const ORKHON_ATLAS = 'orkhon-valley-sprites';

/** Repeatable 128 × 128 tiles, keyed by their texture-pack folder and file name. */
export const ORKHON_TILES = {
  steppeGrassVariant: 'ground/steppe_grass_var',
  dryGrass: 'ground/dry_grass',
  patchyGrass: 'ground/patchy_grass',
  plateauGrass: 'ground/plateau_grass',
  dryDirt: 'ground/dry_dirt',
  rockyGround: 'ground/rocky_ground',
  riverFlow: 'water/river_flow',
  riverRapids: 'water/river_rapids',
} as const;
export type OrkhonTile = keyof typeof ORKHON_TILES;

export const orkhonTileKey = (tile: OrkhonTile): string => `orkhon-${ORKHON_TILES[tile]}`;

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
 * Painted geometry measured from the pack sprites at their source size. `lip` is the row where the
 * waterfall's top rim meets its drop; anchors come from manifest.json.
 */
export interface OrkhonSpriteMetrics {
  width: number;
  height: number;
  anchorY: number;
  lip?: number;
}

export const ORKHON_SPRITES = {
  cliff_face_tall: { width: 84, height: 80, anchorY: 1 },
  cliff_face_medium: { width: 86, height: 71, anchorY: 1 },
  cliff_face_short: { width: 87, height: 60, anchorY: 1 },
  cliff_end_cap: { width: 81, height: 109, anchorY: 1 },
  cliff_isolated: { width: 85, height: 103, anchorY: 1 },
  waterfall_top: { width: 73, height: 93, anchorY: 1, lip: 6 },
  waterfall_base: { width: 79, height: 90, anchorY: 1 },
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
  rock_cluster_large: { width: 98, height: 61, anchorY: 1 },
  rock_cluster_round: { width: 118, height: 63, anchorY: 1 },
  rock_single: { width: 53, height: 36, anchorY: 1 },
  rock_pair: { width: 42, height: 34, anchorY: 1 },
  fallen_rocks: { width: 67, height: 32, anchorY: 1 },
  small_stones: { width: 50, height: 31, anchorY: 1 },
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

/** An opaque basalt band cropped from a supplied cliff sprite, with its painted grass lip on top. */
export interface OrkhonCliffFace {
  sprite: OrkhonSprite;
  /** Source pixel of the band's top-left corner. */
  x: number;
  y: number;
  /** Source rows from the grass lip to the cliff foot. */
  height: number;
}

/** Source columns used from every band; each repeat along a cliff picks one band. */
export const ORKHON_CLIFF_FACE_WIDTH = 66;

/**
 * Cliff walls are textured with these bands, repeated along the plateau outline so faces and
 * corners stay continuous. Every band is fully opaque in the supplied art.
 */
export const ORKHON_CLIFF_FACES: readonly OrkhonCliffFace[] = [
  { sprite: 'cliff_face_tall', x: 6, y: 6, height: 69 },
  { sprite: 'cliff_face_medium', x: 8, y: 14, height: 53 },
  { sprite: 'cliff_end_cap', x: 6, y: 34, height: 48 },
  { sprite: 'cliff_face_short', x: 6, y: 12, height: 44 },
];
