/**
 * Machine-readable companion to `docs/art-spec.md`. Every number here was measured from the code
 * and approved art on main; the document explains each source and the disagreements found.
 *
 * Heights are billboard heights in world units: a painted cutout's height at its world scale.
 * Actors and scenery are camera-facing billboards, so these heights compare directly on screen.
 * Terrain walls are real geometry and appear `cos(48°)` (about two thirds) as tall on screen.
 */

/** A closed range in world units, inclusive. */
export type SizeBand = readonly [min: number, max: number];

export const ART_SPEC = {
  /** The angled world camera (`world3d/worldProjection.ts`, `WORLD_3D`). */
  camera: {
    /** Degrees above the horizontal. All painted perspective is drawn for this angle. */
    elevation: 48,
    /** Degrees the view is turned from north. */
    yaw: 30,
    /** Screen pixels per world unit at camera zoom 1. */
    screenPixelsPerUnit: 0.8,
    /** The F6/console debug range; art is only checked at `elevation`. */
    debugElevation: [35, 70],
  },

  /** The single scale reference: the Khan's mounted billboard. */
  reference: {
    /** Khan sprite width in world units (`ART_WIDTH.player`). */
    khanWidth: 62,
    /** Measured painted height range over every Khan frame. */
    khanHeight: [62.5, 64.4],
    /** Rounded reference height used for "riders" in the spec. */
    riderHeight: 63,
  },

  /** Size bands measured on main (scenery from Orkhon Valley after PR #63), rounded outward. */
  bands: {
    khan: [62, 65],
    clanRiders: [46, 53],
    /** Camp workers and packhorses, drawn at the camp's visual scale. */
    campLife: [25, 39],
    enemies: [25, 150],
    trees: [90, 150],
    /** Shrubs, flowers, reeds, pebbles and stones scattered at shrub scale. */
    shrubs: [15, 46],
    rocks: [30, 90],
    /** Banners, racks, standing stones and relic fires. */
    smallLandmarks: [55, 120],
    /** Gers, carts, canopies and camp fires dressing a camp. */
    structures: [75, 150],
    /** Raider camps, ruins, the ovoo and basalt pillars. */
    largeLandmarks: [170, 220],
  },

  /** Orkhon Valley's scale, the reference level for every band above. */
  orkhon: {
    /** Height of every plateau above the valley floor, in world units. */
    plateauRise: 240,
    /** Pixels along each side of a pack ground or water tile. */
    tilePixels: 128,
    /** World units covered by one repeat of a pack tile. */
    tileWorldSize: 200,
    /** World units per sprite pixel before the factors below. */
    spriteScale: 1.7,
    /** Prop factors relative to `spriteScale`. */
    propScale: { tree: 0.66, scrub: 0.5, rock: 0.7, reed: 0.6 },
    /** Random size spread around each prop factor. */
    jitter: {
      groveTree: [0.92, 1.1],
      rimTree: [0.9, 1.1],
      footRock: [0.85, 1.15],
    },
    /** Landmark factors relative to `spriteScale`; unlisted landmarks use 1. */
    landmarkScale: {
      red_enemy_banner: 0.7,
      blue_camp_banner: 0.7,
      spear_rack: 0.8,
      wooden_rack: 0.8,
      standing_stone: 0.6,
      relic_fire: 0.7,
      sacred_ovoo: 0.85,
    },
    /** The band each landmark sprite belongs to. */
    landmarkBands: {
      red_enemy_banner: 'smallLandmarks',
      blue_camp_banner: 'smallLandmarks',
      spear_rack: 'smallLandmarks',
      wooden_rack: 'smallLandmarks',
      standing_stone: 'smallLandmarks',
      relic_fire: 'smallLandmarks',
      player_ger_small: 'structures',
      player_ger_medium: 'structures',
      camp_supply_cart: 'structures',
      camp_canopy: 'structures',
      camp_fire: 'structures',
      sacred_ovoo: 'largeLandmarks',
      stone_ruins: 'largeLandmarks',
      cliff_isolated: 'largeLandmarks',
      enemy_camp_palisade: 'largeLandmarks',
      enemy_camp_ger: 'largeLandmarks',
      enemy_camp_tents: 'largeLandmarks',
    },
  },

  /** Lights and contact shadows (`world3d/World3DRenderer.ts`, `assets/painterlyArt.ts`). */
  light: {
    sunColor: 0xfff0db,
    /** Sun offset from the view focus in render axes (x east, y up, z south). */
    sunOffset: [-1900, 3450, 1350],
    shadowIntensity: 0.72,
    /** Contact-shadow ellipse colour; its alpha falls from 0x55 at the centre to 0. */
    contactShadowColor: 0x333c2f,
    /** Scenery contact shadow: width and depth as fractions of prop width, alpha, offset. */
    propShadow: { width: 0.7, depth: 0.22, alpha: 0.45, offset: [8, 5] },
  },

  /**
   * Palette ranges measured by `scripts/measure-art.mjs` over painted texels (alpha >= 128):
   * CIELAB lightness and chroma at the 5th, 50th and 95th percentiles, chroma-weighted mean hue
   * in degrees, and the median colour.
   */
  palette: {
    ground: { lightness: [38, 58, 72], chroma: [23, 50, 62], hue: 78, median: 0xb1832d },
    water: { lightness: [24, 37, 86], chroma: [5, 13, 17], hue: 219, median: 0x395c67 },
    cliffs: { lightness: [20, 43, 71], chroma: [6, 22, 66], hue: 71, median: 0x7f603b },
    trees: { lightness: [18, 51, 85], chroma: [15, 44, 79], hue: 72, median: 0xa96c25 },
    shrubs: { lightness: [23, 53, 90], chroma: [17, 39, 72], hue: 81, median: 0xa37828 },
    rocks: { lightness: [18, 51, 82], chroma: [8, 24, 59], hue: 69, median: 0x97714e },
    landmarks: { lightness: [16, 55, 89], chroma: [6, 28, 68], hue: 68, median: 0xaa7950 },
    structures: { lightness: [16, 55, 88], chroma: [13, 39, 68], hue: 63, median: 0xb97241 },
    khan: { lightness: [9, 28, 59], chroma: [4, 17, 47], hue: 58, median: 0x4d3b26 },
    clan: { lightness: [7, 30, 78], chroma: [4, 24, 56], hue: 52, median: 0x673a26 },
    enemies: { lightness: [16, 36, 74], chroma: [3, 14, 36], hue: 111, median: 0x4a5655 },
  },

  /** Cutout edges measured by `scripts/measure-art.mjs`. */
  edges: {
    /** Partially transparent texels per outline texel on Orkhon pack sprites. */
    packFeather: [2.3, 2.8],
    /** Pack sprites whose paint touches their frame edge (cropped overlays excepted). */
    packTouchingFrame: 0,
  },

  /**
   * Manuscript style contract for future painted terrain and scenery.
   * Establishes concrete, testable targets that supersede the legacy measured ground palette.
   */
  manuscript: {
    /** CIELAB chroma limits for new ground artwork (supersedes legacy saturated mustard median C* 50). */
    groundChromaMax: 35,
    groundChromaMedianTarget: [22, 28],
    /** CIELAB lightness ranges for valley floor and elevated plateau tops. */
    groundLightnessValley: [58, 64],
    groundLightnessPlateau: [46, 52],
    /** Minimum luminance drop (L*) from valley floor to plateau top for elevation readability. */
    minElevationLightnessDrop: 10,
    /** Ink line weight range at source texel density (pixels). */
    inkLineWidth: [1.0, 2.0],
    /** Directional hatching line spacing for shade and rock relief (pixels). */
    hatchingSpacing: [2, 5],
    /** Named mineral pigment swatches (hex) matching approved character and camp art. */
    swatches: {
      parchmentBase: 0xe5cca8,
      valleyGrassCalm: 0x9c9261,
      valleyGrassStraw: 0xb59d68,
      valleyGrassOlive: 0x85865c,
      plateauGrassMoss: 0x737a54,
      plateauGrassUpland: 0x656c49,
      dirtTrail: 0xa6835c,
      scree: 0x8c8273,
      basaltFace: 0x5e5245,
      basaltCrevice: 0x433930,
      inkContour: 0x2b221a,
      riverVerdigris: 0x4e6f77,
      riverChannel: 0x395c67,
      foamChalk: 0xd8e2df,
      lapisAccent: 0x2d4a68,
      vermilionAccent: 0x9c3d28,
      brassAccent: 0xc89e4b,
    },
  },
} as const;

export type ArtBand = keyof typeof ART_SPEC.bands;
