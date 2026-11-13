import type { LocationId } from '../types';
import type { MountainRegion } from '../terrain/types';
import { ALTAN_OVOO } from './altanOvoo';
import { OTGONTENGER } from './otgontenger';
import { EEJ_KHAIRKHAN } from './eejKhairkhan';
import { BELUKHA } from './belukha';
import { OTGONTENGER_MOUNTAINS } from './terrainBiomes';
import { ORKHON_VALLEY } from './orkhonValley';

export type SceneryProp =
  | 'larch'
  | 'pine'
  | 'willow'
  | 'foothill'
  | 'snow-dome'
  | 'pyramid'
  | 'glacier'
  | 'twin-summit'
  | 'volcano'
  | 'granite'
  | 'reeds'
  | 'crag';

export interface LandscapeLandmark {
  prop: SceneryProp;
  /** World offsets from the camp; width includes the shared transparent canvas. */
  x: number;
  y: number;
  width: number;
}

export interface LandscapeDefinition {
  title: string;
  description: string;
  surface: 'meadow' | 'frost' | 'scree' | 'sand' | 'basalt';
  /** Bundled PNG basename; replaces the shared grass, wash, and generated surface marks. */
  groundTile?: string;
  /** Opt-in heightfield terrain. Its ranges replace the legacy landform cutouts. */
  mountains?: MountainRegion;
  ground: number;
  wash: number;
  patch: number;
  grass: number;
  grassCount: number;
  flowers: boolean;
  cover: readonly { prop: SceneryProp; count: number; width: readonly [number, number] }[];
  landmarks: readonly LandscapeLandmark[];
  water?: {
    kind: 'stream' | 'frozen' | 'braided' | 'glacial';
    width: number;
    color: number;
    bank: number;
    /** Optional still-water head feeding the first point of an authored stream. */
    sourcePool?: { x: number; y: number; radius: number };
    /** Spline coordinates relative to the camp. All channels are decorative unless `gorge` is set. */
    course: readonly number[];
    /**
     * An authored gorge river keeps its exact course, cannot be waded and is crossed only at these
     * bridge decks. `angle` is the deck direction in radians; `rapids` is the channel distance
     * below the source drawn as rapids.
     */
    gorge?: {
      rapids: number;
      bridges: readonly { x: number; y: number; angle: number; length: number; width: number }[];
    };
  };
  air: { color: number; alpha: number; particles: 'seeds' | 'snow' | 'dust' | 'mist' };
}

const landmark = (prop: SceneryProp, x: number, y: number, width: number): LandscapeLandmark => ({
  prop,
  x,
  y,
  width,
});

/** Location identity is independent of economic balance and cultural context. */
export const LANDSCAPES: Readonly<Record<LocationId, LandscapeDefinition>> = {
  otgontenger: {
    title: 'The white crown',
    description:
      'Winding grassy passes and larches give way to rocky shoulders, alpine plateaus, and snow-covered ridges.',
    surface: 'meadow',
    groundTile: 'mount-otgontenger',
    mountains: OTGONTENGER_MOUNTAINS,
    ground: 0xabb39a,
    wash: 0.46,
    patch: 0xd2d3b5,
    grass: 0xdbd6a5,
    grassCount: 650,
    flowers: true,
    cover: [
      { prop: 'larch', count: 48, width: [65, 110] },
      { prop: 'foothill', count: 42, width: [65, 120] },
    ],
    landmarks: [
      landmark('snow-dome', -430, 310, 410),
      landmark('larch', 415, -160, 160),
      landmark('foothill', -410, -110, 245),
    ],
    water: OTGONTENGER.tarn.outflow,
    air: { color: 0xc2d0c5, alpha: 0.04, particles: 'mist' },
  },
  'bogd-khan-uul': {
    title: 'The sheltered woodland',
    description:
      'Golden larch and deep sage pine groves shelter rolling green foothills and sunlit clearings.',
    surface: 'meadow',
    groundTile: 'bogd-khan-uul',
    ground: 0x94a26f,
    wash: 0.48,
    patch: 0x687c59,
    grass: 0xd7c583,
    grassCount: 900,
    flowers: true,
    cover: [
      { prop: 'pine', count: 120, width: [85, 135] },
      { prop: 'larch', count: 85, width: [80, 125] },
    ],
    landmarks: [
      landmark('foothill', -320, -130, 280),
      landmark('pine', -435, -120, 195),
      landmark('larch', 405, -200, 210),
      landmark('pine', 490, 320, 165),
    ],
    air: { color: 0x9eae83, alpha: 0.03, particles: 'seeds' },
  },
  'altai-tavan-bogd': {
    title: 'The five-peak glacier',
    description:
      'Five snowy crests and turquoise glacial seams overlook a silver-green gravel plain.',
    surface: 'scree',
    groundTile: 'altai-tavan-bogd',
    ground: 0xb4bbb0,
    wash: 0.64,
    patch: 0xdce0cd,
    grass: 0xd3d3ac,
    grassCount: 280,
    flowers: false,
    cover: [
      { prop: 'crag', count: 65, width: [60, 115] },
      { prop: 'glacier', count: 32, width: [90, 155] },
    ],
    landmarks: [
      landmark('pyramid', -470, -90, 195),
      landmark('snow-dome', -245, -105, 210),
      landmark('pyramid', 0, -120, 220),
      landmark('snow-dome', 245, -105, 210),
      landmark('pyramid', 470, -90, 195),
      landmark('glacier', -410, 340, 350),
    ],
    water: {
      kind: 'glacial',
      width: 64,
      color: 0x92bbbc,
      bank: 0xd0d5bf,
      course: [-2600, -540, -900, -390, -150, -270, 950, -350, 2600, -570],
    },
    air: { color: 0xb0cbca, alpha: 0.05, particles: 'mist' },
  },
  'khan-tengri': {
    title: 'The marble spire',
    description:
      'A lone angular white pyramid towers over lavender scree and sharp blue-grey crags.',
    surface: 'scree',
    groundTile: 'khan-tengri',
    ground: 0xb0adb4,
    wash: 0.7,
    patch: 0x88879a,
    grass: 0xcac5b1,
    grassCount: 170,
    flowers: false,
    cover: [{ prop: 'crag', count: 110, width: [70, 135] }],
    landmarks: [
      landmark('pyramid', -430, 315, 420),
      landmark('crag', 450, -100, 230),
      landmark('crag', 510, 335, 255),
    ],
    air: { color: 0xb3b6ce, alpha: 0.065, particles: 'snow' },
  },
  belukha: {
    title: 'The white summits',
    description:
      'Paired white heights, cold milky water, and dark conifers frame a cool upland meadow.',
    surface: 'frost',
    groundTile: 'mount-belukha',
    ground: 0xbac5b4,
    wash: 0.6,
    patch: 0xdde0cd,
    grass: 0xcdd2ac,
    grassCount: 480,
    flowers: false,
    cover: [
      { prop: 'pine', count: 85, width: [70, 115] },
      { prop: 'glacier', count: 28, width: [70, 125] },
    ],
    landmarks: [
      landmark('twin-summit', -420, 300, 430),
      landmark('pine', 425, -180, 185),
      landmark('pine', 470, 325, 160),
    ],
    water: {
      ...BELUKHA.water,
    },
    air: { color: 0xb5c9ce, alpha: 0.055, particles: 'mist' },
  },
  'altan-ovoo': {
    title: 'The basalt steppe',
    description:
      'An old flat-topped volcanic cone stands above amber grass and scattered charcoal basalt.',
    surface: 'basalt',
    groundTile: 'altan-ovoo',
    ground: 0xc2a169,
    wash: 0.38,
    patch: 0x706d56,
    grass: 0xe7ca7f,
    grassCount: 800,
    flowers: false,
    cover: [
      { prop: 'crag', count: 65, width: [50, 100] },
      { prop: 'foothill', count: 25, width: [70, 120] },
    ],
    landmarks: [
      landmark('volcano', -400, 300, 440),
      landmark('crag', 430, -165, 180),
      landmark('foothill', -430, -110, 220),
    ],
    water: ALTAN_OVOO.spring.stream,
    air: { color: 0xd9b479, alpha: 0.035, particles: 'dust' },
  },
  'eej-khairkhan': {
    title: 'The granite shelter',
    description:
      'Warm sculpted granite, pale sand ribbons, and sparse dry grass surround a sheltered desert camp.',
    surface: 'sand',
    groundTile: 'eej-khairkhan',
    ground: 0xd5b784,
    wash: 0.83,
    patch: 0xe9cca0,
    grass: 0xdac18b,
    grassCount: 170,
    flowers: false,
    cover: [{ prop: 'granite', count: 95, width: [65, 135] }],
    landmarks: [
      landmark('granite', -365, -45, 300),
      landmark('granite', 410, -30, 350),
      landmark('granite', -450, 360, 270),
    ],
    water: EEJ_KHAIRKHAN.spring.water,
    air: { color: 0xe3bd8c, alpha: 0.045, particles: 'dust' },
  },
  'orkhon-valley': {
    title: 'The basalt gorge',
    description:
      'An open steppe valley ringed by basalt plateaus, with the eastern falls feeding a river gorge.',
    surface: 'meadow',
    groundTile: 'orkhon-valley',
    ground: 0x9faf7c,
    wash: 0.48,
    patch: 0x7a956c,
    grass: 0xd7d59d,
    grassCount: 1000,
    flowers: true,
    cover: [
      { prop: 'willow', count: 45, width: [85, 135] },
      { prop: 'reeds', count: 60, width: [35, 70] },
    ],
    landmarks: [
      landmark('willow', -410, -160, 195),
      landmark('willow', 470, -465, 220),
      landmark('foothill', -380, 335, 255),
    ],
    water: {
      kind: 'stream',
      width: ORKHON_VALLEY.river.width,
      color: 0x4d7f95,
      bank: 0xaab88a,
      course: ORKHON_VALLEY.river.course,
      gorge: { rapids: ORKHON_VALLEY.river.rapids, bridges: ORKHON_VALLEY.river.bridges },
    },
    air: { color: 0xc2d1ab, alpha: 0.025, particles: 'seeds' },
  },
};
