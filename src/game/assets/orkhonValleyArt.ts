/**
 * Orkhon Valley texture pack v2, imported unchanged by `scripts/pack-orkhon-valley.mjs`.
 * Ground and water tiles stay separate repeatable images; transparent sprites share one atlas.
 */
export const ORKHON_ATLAS = 'orkhon-valley-sprites';

/** Repeatable 128 × 128 tiles, keyed by their texture-pack folder and file name. */
export const ORKHON_TILES = {
  steppeGrass: 'ground/steppe_grass',
  steppeGrassVariant: 'ground/steppe_grass_var',
  dryGrass: 'ground/dry_grass',
  patchyGrass: 'ground/patchy_grass',
  plateauGrass: 'ground/plateau_grass',
  trampledEarth: 'ground/trampled_earth',
  rockyGround: 'ground/rocky_ground',
  riverFlow: 'water/river_flow',
  riverRapids: 'water/river_rapids',
} as const;
export type OrkhonTile = keyof typeof ORKHON_TILES;

export const orkhonTileKey = (tile: OrkhonTile): string => `orkhon-${ORKHON_TILES[tile]}`;

/** World units covered by one repeat of a 128-pixel ground or water tile. */
export const ORKHON_TILE_WORLD_SIZE = 200;

/** World units per sprite pixel for scenery at its painted scale. */
export const ORKHON_SPRITE_SCALE = 1.7;

/**
 * Painted geometry measured from the pack sprites at their source size. `lip` is the row where a
 * cliff's top rim meets its vertical face; anchors come from manifest.json.
 */
export interface OrkhonSpriteMetrics {
  width: number;
  height: number;
  anchorY: number;
  lip?: number;
  /** Painted foot and top of a ramp's path, in source pixels. */
  climb?: readonly [readonly [number, number], readonly [number, number]];
}

export const ORKHON_SPRITES = {
  cliff_face_tall: { width: 84, height: 80, anchorY: 1, lip: 9 },
  cliff_straight: { width: 85, height: 109, anchorY: 1, lip: 44 },
  cliff_cave_nook: { width: 85, height: 86, anchorY: 1, lip: 22 },
  cliff_corner_outer: { width: 84, height: 106, anchorY: 1, lip: 40 },
  cliff_end_cap: { width: 81, height: 109, anchorY: 1, lip: 38 },
  cliff_isolated: { width: 85, height: 103, anchorY: 1 },
  ramp_wide: {
    width: 126,
    height: 82,
    anchorY: 1,
    climb: [
      [35, 72],
      [95, 10],
    ],
  },
  ramp_descending: {
    width: 101,
    height: 79,
    anchorY: 1,
    climb: [
      [75, 72],
      [28, 14],
    ],
  },
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
