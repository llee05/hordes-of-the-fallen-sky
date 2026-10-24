import type { LocationId } from '../types';
import type { MountainRegion, TerrainPoint } from '../terrain/types';
import { OTGONTENGER_MOUNTAINS } from './terrainBiomes';

export interface SceneShelf {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  rise: number;
  turn: number;
  fracture: number;
  peak?: number;
  camp?: boolean;
  ramp?: { start: TerrainPoint; end: TerrainPoint; halfWidth: number; shoulder: number };
  approaches?: readonly NonNullable<SceneShelf['ramp']>[];
}

export interface ScenePalette {
  grass: number;
  soil: number;
  rock: number;
  snow: number;
  fog: number;
}

export interface RegionComposition {
  id: LocationId;
  floor: number;
  snowLine: number;
  vegetation: 'meadow' | 'woodland' | 'alpine' | 'desert' | 'river';
  palette: ScenePalette;
  shelves: readonly SceneShelf[];
}

export interface ComposedRegion extends MountainRegion {
  scene: RegionComposition;
}

function shelf(
  id: string,
  x: number,
  z: number,
  width: number,
  depth: number,
  rise: number,
  turn = 0,
  peak = 0,
): SceneShelf {
  return {
    id,
    x,
    z,
    width,
    depth,
    rise,
    turn,
    peak,
    fracture: 110,
    ramp: {
      start: { x: x - width * 0.7, y: z + depth + 300 },
      end: { x: x - width * 0.45, y: z - depth * 0.35 },
      halfWidth: 150,
      shoulder: 290,
    },
  };
}

const meadow: ScenePalette = {
  grass: 0xa3ad69,
  soil: 0xc3a574,
  rock: 0x8d8f85,
  snow: 0xe4e9df,
  fog: 0xbac9bc,
};
const alpine: ScenePalette = {
  grass: 0x94a17a,
  soil: 0xb7ac8d,
  rock: 0x909d9d,
  snow: 0xe7eeeb,
  fog: 0xa8c3ce,
};
const desert: ScenePalette = {
  grass: 0xb7a776,
  soil: 0xd2b187,
  rock: 0xbca58c,
  snow: 0xeee5ce,
  fog: 0xcebc9f,
};

/** Hand-composed terrain masses surround an open, continuous combat and caravan floor. */
export const WORLD_REGIONS: Readonly<Record<LocationId, RegionComposition>> = {
  'golden-pasture': {
    id: 'golden-pasture',
    floor: 65,
    snowLine: 10000,
    vegetation: 'meadow',
    palette: meadow,
    shelves: [
      shelf('meadow-bluff', -180, -800, 1160, 450, 165, -8),
      shelf('upper-pasture', -480, -1160, 680, 380, 145, 12),
      shelf('eastern-shoulder', 920, 650, 460, 380, 135, -18),
      shelf('distant-ridge', 100, -2120, 2350, 620, 260, 4, 110),
    ],
  },
  'silent-river': {
    id: 'silent-river',
    floor: 70,
    snowLine: 160,
    vegetation: 'river',
    palette: { ...alpine, grass: 0xa4b5a1 },
    shelves: [
      shelf('frozen-bank', -160, -850, 1250, 420, 155, 3),
      shelf('ice-shelf', 460, -1250, 610, 370, 190, -10),
      shelf('western-stone', -980, 520, 380, 500, 165, 12),
      shelf('distant-ridge', 0, -2140, 2400, 620, 300, 0, 100),
    ],
  },
  'broken-pass': {
    id: 'broken-pass',
    floor: 70,
    snowLine: 10000,
    vegetation: 'alpine',
    palette: { ...meadow, grass: 0x999c6b, rock: 0x797d81 },
    shelves: [
      shelf('western-wall', -900, -250, 430, 1100, 300, -12),
      shelf('western-crown', -1100, -720, 300, 540, 220, -12),
      shelf('eastern-wall', 980, -760, 510, 640, 330, 12),
      shelf('distant-ridge', 0, -2080, 2360, 640, 380, 0, 150),
    ],
  },
  'heart-of-the-steppe': {
    id: 'heart-of-the-steppe',
    floor: 80,
    snowLine: 10000,
    vegetation: 'alpine',
    palette: { grass: 0x7b9086, soil: 0xa1a092, rock: 0x656b83, snow: 0xd7e4e4, fog: 0x718ba2 },
    shelves: [
      shelf('indigo-gate', -180, -810, 1150, 440, 310, -5),
      shelf('higher-threshold', -450, -1200, 620, 420, 290, 12),
      shelf('eastern-bastion', 1000, 550, 480, 420, 290, -18),
      shelf('distant-ridge', 0, -2120, 2420, 660, 400, 4, 200),
    ],
  },
  otgontenger: {
    id: 'otgontenger',
    floor: 80,
    snowLine: 320,
    vegetation: 'alpine',
    palette: alpine,
    shelves: [
      shelf('alpine-shelf', -50, -830, 1200, 450, 260, -8),
      shelf('white-crown', -350, -1220, 740, 410, 280, 10, 80),
      shelf('eastern-granite', 940, 620, 450, 390, 200, -20),
      shelf('connected-range', 100, -2190, 2390, 670, 420, 5, 190),
    ],
  },
  'bogd-khan-uul': {
    id: 'bogd-khan-uul',
    floor: 65,
    snowLine: 10000,
    vegetation: 'woodland',
    palette: { ...meadow, grass: 0x8b9e66, rock: 0x8f9383 },
    shelves: [
      shelf('forest-shelf', -180, -790, 1200, 440, 180, -9),
      shelf('larch-highland', -500, -1190, 690, 430, 170, 12),
      shelf('woodland-shoulder', 910, 620, 480, 390, 155, -17),
      shelf('distant-ridge', 0, -2120, 2450, 650, 310, 0, 120),
    ],
  },
  'altai-tavan-bogd': {
    id: 'altai-tavan-bogd',
    floor: 85,
    snowLine: 240,
    vegetation: 'alpine',
    palette: { ...alpine, rock: 0x8fa2ae },
    shelves: [
      shelf('glacial-shelf', -120, -820, 1300, 470, 270, -6),
      shelf('western-summit', -700, -1250, 430, 380, 300, 8, 140),
      shelf('eastern-summit', 470, -1330, 470, 400, 330, -9, 160),
      shelf('distant-five-peaks', 0, -2170, 2400, 700, 450, 0, 220),
    ],
  },
  'khan-tengri': {
    id: 'khan-tengri',
    floor: 90,
    snowLine: 250,
    vegetation: 'alpine',
    palette: { ...alpine, grass: 0x9ba5a2, rock: 0x9995a8 },
    shelves: [
      shelf('marble-approach', -80, -830, 1120, 450, 260, -6),
      shelf('marble-spire', -220, -1320, 620, 480, 370, 15, 300),
      shelf('eastern-crag', 980, 650, 450, 400, 235, -18),
      shelf('distant-ridge', 0, -2240, 2400, 710, 440, 0, 190),
    ],
  },
  belukha: {
    id: 'belukha',
    floor: 75,
    snowLine: 300,
    vegetation: 'woodland',
    palette: { ...alpine, grass: 0x87a08a },
    shelves: [
      shelf('forest-bank', -120, -810, 1230, 440, 230, -5),
      shelf('western-white-summit', -650, -1250, 420, 390, 310, 8, 130),
      shelf('eastern-white-summit', 380, -1300, 430, 400, 330, -10, 140),
      shelf('distant-ridge', 0, -2200, 2400, 700, 430, 0, 150),
    ],
  },
  'altan-ovoo': {
    id: 'altan-ovoo',
    floor: 65,
    snowLine: 10000,
    vegetation: 'meadow',
    palette: { ...meadow, grass: 0xb3a36b, rock: 0x72756e },
    shelves: [
      shelf('basalt-shoulder', -160, -850, 1160, 460, 225, -8),
      shelf('old-volcanic-crown', -380, -1230, 720, 440, 180, 10, 60),
      shelf('eastern-basalt', 920, 650, 440, 380, 165, -20),
      shelf('distant-ridge', 0, -2200, 2450, 650, 290, 0, 90),
    ],
  },
  'eej-khairkhan': {
    id: 'eej-khairkhan',
    floor: 65,
    snowLine: 10000,
    vegetation: 'desert',
    palette: desert,
    shelves: [
      shelf('granite-shelter', -160, -810, 1170, 450, 245, -8),
      shelf('sculpted-granite', -550, -1220, 650, 400, 200, 14, 75),
      shelf('eastern-stone', 940, 620, 480, 410, 200, -22),
      shelf('distant-granite', 0, -2180, 2400, 650, 320, 0, 120),
    ],
  },
  'orkhon-valley': {
    id: 'orkhon-valley',
    floor: 60,
    snowLine: 10000,
    vegetation: 'river',
    palette: { ...meadow, grass: 0x92aa73, rock: 0x929784 },
    shelves: [
      shelf('river-terrace', -180, -820, 1240, 430, 150, -8),
      shelf('upper-grazing', -540, -1190, 680, 410, 165, 10),
      shelf('eastern-bank', 980, 670, 460, 390, 130, -20),
      shelf('distant-ridge', 0, -2180, 2440, 660, 290, 0, 110),
    ],
  },
};

export function composedRegion(id: LocationId): ComposedRegion {
  return {
    seed: `living-steppe-scenes-v3:${id}`,
    biome: {
      ...OTGONTENGER_MOUNTAINS.biome,
      id: `scene-${id}`,
      heightScale: 1000,
      campRadius: 350,
      caravan: { length: 1530, halfWidth: 240, shoulder: 110 },
    },
    scene: {
      ...WORLD_REGIONS[id],
      shelves: [
        {
          id: 'camp-shelf',
          x: 0,
          z: -30,
          width: 660,
          depth: 430,
          rise: 150,
          turn: 0,
          fracture: 45,
          camp: true,
          ramp: { start: { x: 950, y: 0 }, end: { x: 260, y: 0 }, halfWidth: 260, shoulder: 380 },
          approaches: [
            {
              start: { x: -980, y: -170 },
              end: { x: -300, y: -170 },
              halfWidth: 200,
              shoulder: 300,
            },
            { start: { x: 0, y: -760 }, end: { x: 0, y: -160 }, halfWidth: 200, shoulder: 290 },
          ],
        },
        ...WORLD_REGIONS[id].shelves,
      ],
    },
  };
}
