import type { LocationId } from '../types';

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
    /** Spline coordinates relative to the camp. All channels are decorative. */
    course: readonly number[];
  };
  air: { color: number; alpha: number; particles: 'seeds' | 'snow' | 'dust' | 'mist' };
}

const landmark = (prop: SceneryProp, x: number, y: number, width: number): LandscapeLandmark => ({
  prop,
  x,
  y,
  width,
});

/** Location identity is independent of story chapter, economic balance, and cultural context. */
export const LANDSCAPES: Readonly<Record<LocationId, LandscapeDefinition>> = {
  'golden-pasture': {
    title: 'The wind-combed meadow',
    description:
      'Honey-gold grass, flowering hollows, and low sage outcrops beside a narrow stream.',
    surface: 'meadow',
    ground: 0xd6b566,
    wash: 0.14,
    patch: 0xb3ae70,
    grass: 0xffe2a1,
    grassCount: 1050,
    flowers: true,
    cover: [
      { prop: 'foothill', count: 35, width: [75, 135] },
      { prop: 'reeds', count: 28, width: [30, 55] },
    ],
    landmarks: [landmark('foothill', -430, -205, 270), landmark('foothill', 450, 310, 220)],
    water: {
      kind: 'stream',
      width: 36,
      color: 0x719c94,
      bank: 0x98a873,
      course: [-2600, -380, -900, -350, 0, -310, 950, -430, 2600, -320],
    },
    air: { color: 0xe7c886, alpha: 0.025, particles: 'seeds' },
  },
  'silent-river': {
    title: 'The frostbound shallows',
    description:
      'Pale gravel bars divide a steel-blue river; ice shelves and bare reeds catch the snow.',
    surface: 'frost',
    ground: 0xc4cfbe,
    wash: 0.64,
    patch: 0xe2e6cf,
    grass: 0xd6d7b8,
    grassCount: 390,
    flowers: false,
    cover: [
      { prop: 'reeds', count: 90, width: [38, 65] },
      { prop: 'crag', count: 28, width: [55, 105] },
    ],
    landmarks: [landmark('crag', -390, -190, 200), landmark('reeds', 410, -190, 100)],
    water: {
      kind: 'frozen',
      width: 125,
      color: 0x7dabb2,
      bank: 0xdbe0c4,
      course: [-2600, -240, -1000, -390, -280, -290, 600, -365, 2600, -200],
    },
    air: { color: 0x9ebec4, alpha: 0.075, particles: 'snow' },
  },
  'broken-pass': {
    title: 'The fractured corridor',
    description: 'Ochre scree and dark slate walls flank a dry, broken mountain road.',
    surface: 'scree',
    ground: 0xaaa087,
    wash: 0.62,
    patch: 0x72786d,
    grass: 0xc2bb8e,
    grassCount: 270,
    flowers: false,
    cover: [{ prop: 'crag', count: 100, width: [75, 150] }],
    landmarks: [
      landmark('crag', -390, -210, 350),
      landmark('crag', 330, -275, 390),
      landmark('crag', -400, 370, 300),
      landmark('crag', 530, 390, 280),
    ],
    air: { color: 0x7c8780, alpha: 0.055, particles: 'dust' },
  },
  'heart-of-the-steppe': {
    title: 'The indigo threshold',
    description:
      'An ash-sage basin, dark mountain shoulders, and blue banners beneath the red eclipse.',
    surface: 'scree',
    ground: 0x939b99,
    wash: 0.68,
    patch: 0x656b83,
    grass: 0xc3c6a9,
    grassCount: 360,
    flowers: false,
    cover: [
      { prop: 'crag', count: 85, width: [90, 150] },
      { prop: 'pine', count: 20, width: [65, 100] },
    ],
    landmarks: [
      landmark('pyramid', -450, -230, 420),
      landmark('twin-summit', 470, -245, 440),
      landmark('crag', -380, 365, 280),
    ],
    air: { color: 0x453b63, alpha: 0.12, particles: 'mist' },
  },
  otgontenger: {
    title: 'The white crown',
    description:
      'A broad snow crown rises over sage alpine turf, pale meltwater, and scattered larches.',
    surface: 'meadow',
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
      landmark('snow-dome', -250, -245, 520),
      landmark('larch', 415, -160, 160),
      landmark('foothill', -410, 310, 245),
    ],
    water: {
      kind: 'glacial',
      width: 27,
      color: 0xa5c4bb,
      bank: 0xc3c7a6,
      course: [-2600, -500, -650, -410, 300, -320, 900, -600, 2600, -450],
    },
    air: { color: 0xc2d0c5, alpha: 0.04, particles: 'mist' },
  },
  'bogd-khan-uul': {
    title: 'The sheltered woodland',
    description:
      'Golden larch and deep sage pine groves shelter rolling green foothills and sunlit clearings.',
    surface: 'meadow',
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
      landmark('foothill', -320, -260, 420),
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
      landmark('pyramid', -470, -280, 225),
      landmark('snow-dome', -245, -310, 245),
      landmark('pyramid', 0, -335, 260),
      landmark('snow-dome', 245, -310, 245),
      landmark('pyramid', 470, -280, 225),
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
    ground: 0xb0adb4,
    wash: 0.7,
    patch: 0x88879a,
    grass: 0xcac5b1,
    grassCount: 170,
    flowers: false,
    cover: [{ prop: 'crag', count: 110, width: [70, 135] }],
    landmarks: [
      landmark('pyramid', -180, -235, 590),
      landmark('crag', 450, -190, 310),
      landmark('crag', -470, 345, 255),
    ],
    air: { color: 0xb3b6ce, alpha: 0.065, particles: 'snow' },
  },
  belukha: {
    title: 'The white summits',
    description:
      'Paired white heights, cold milky water, and dark conifers frame a cool upland meadow.',
    surface: 'frost',
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
      landmark('twin-summit', -210, -255, 550),
      landmark('pine', 425, -180, 185),
      landmark('pine', -430, 325, 160),
    ],
    water: {
      kind: 'glacial',
      width: 78,
      color: 0xb6cccb,
      bank: 0xd3d7bf,
      course: [-2600, -470, -900, -340, 0, -330, 950, -460, 2600, -320],
    },
    air: { color: 0xb5c9ce, alpha: 0.055, particles: 'mist' },
  },
  'altan-ovoo': {
    title: 'The basalt steppe',
    description:
      'An old flat-topped volcanic cone stands above amber grass and scattered charcoal basalt.',
    surface: 'basalt',
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
      landmark('volcano', -220, -235, 570),
      landmark('crag', 430, -165, 180),
      landmark('foothill', -430, 330, 220),
    ],
    air: { color: 0xd9b479, alpha: 0.035, particles: 'dust' },
  },
  'eej-khairkhan': {
    title: 'The granite shelter',
    description:
      'Warm sculpted granite, pale sand ribbons, and sparse dry grass surround a sheltered desert camp.',
    surface: 'sand',
    ground: 0xd5b784,
    wash: 0.83,
    patch: 0xe9cca0,
    grass: 0xdac18b,
    grassCount: 170,
    flowers: false,
    cover: [{ prop: 'granite', count: 95, width: [65, 135] }],
    landmarks: [
      landmark('granite', -365, -195, 390),
      landmark('granite', 375, -250, 460),
      landmark('granite', -450, 360, 270),
    ],
    air: { color: 0xe3bd8c, alpha: 0.045, particles: 'dust' },
  },
  'orkhon-valley': {
    title: 'The braided pasture',
    description:
      'Blue-green river braids, willow clusters, reed beds, and lush sage grazing spread across the valley.',
    surface: 'meadow',
    ground: 0x9faf7c,
    wash: 0.48,
    patch: 0x7a956c,
    grass: 0xd7d59d,
    grassCount: 1000,
    flowers: true,
    cover: [
      { prop: 'willow', count: 65, width: [85, 135] },
      { prop: 'reeds', count: 100, width: [35, 70] },
    ],
    landmarks: [
      landmark('willow', -410, -160, 195),
      landmark('willow', 470, -220, 220),
      landmark('foothill', -380, 335, 255),
    ],
    water: {
      kind: 'braided',
      width: 100,
      color: 0x6d9e9c,
      bank: 0xaab88a,
      course: [-2600, -380, -1100, -300, -350, -350, 450, -245, 1100, -350, 2600, -300],
    },
    air: { color: 0xc2d1ab, alpha: 0.025, particles: 'seeds' },
  },
};
