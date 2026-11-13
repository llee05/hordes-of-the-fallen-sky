import type { LocationId } from '../types';
import type { MountainRegion, TerrainBounds, TerrainPoint } from '../terrain/types';
import { OTGONTENGER_MOUNTAINS } from './terrainBiomes';
import { ALTAN_OVOO, ALTAN_OVOO_FOOTPRINTS } from './altanOvoo';
import { OTGONTENGER, OTGONTENGER_FOOTPRINTS } from './otgontenger';
import { EEJ_KHAIRKHAN, EEJ_KHAIRKHAN_FOOTPRINTS } from './eejKhairkhan';
import { BELUKHA } from './belukha';
import { KHAN_TENGRI, KHAN_TENGRI_FOOTPRINTS } from './khanTengri';
import { BOGD_KHAN_UUL, BOGD_KHAN_UUL_FOOTPRINTS } from './bogdKhanUul';
import { ORKHON_FOOTPRINTS, ORKHON_VALLEY, type OrkhonPlateau } from './orkhonValley';

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
  /**
   * Authored camp-relative polygon. When present it replaces the chamfered rectangle; x, z,
   * width and depth then describe its bounding box for culling.
   */
  outline?: readonly TerrainPoint[];
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
  /** Square terrain extent used by the elevation and chunk systems. */
  terrainSize?: number;
  /** Playable camera and physics rectangle inside the terrain square, relative to its centre. */
  playBounds?: TerrainBounds;
  /** Settlement anchor relative to the terrain centre. */
  camp?: TerrainPoint;
  /** Flat, protected radius around an authored settlement. */
  campClearRadius?: number;
  /** Authored levels keep the camp on the valley floor instead of a raised camp shelf. */
  campShelf?: boolean;
  /** Scale of the gentle valley-floor undulation; authored two-level maps keep it low. */
  relief?: number;
  /** Authored ground: worn paths replace the generic caravan lane in the material masks. */
  ground?: {
    paths: readonly (readonly TerrainPoint[])[];
    width: number;
    /** Graded ramps worn bare across their walkable width. */
    ramps?: readonly {
      foot: TerrainPoint;
      top: TerrainPoint;
      halfWidth: number;
      /** Outer edge of the steep flanks beside the graded width. */
      shoulder?: number;
    }[];
  };
  /** Camp-relative solid footprints, such as authored landmarks, blocked for movement. */
  obstacles?: readonly { x: number; y: number; radius: number }[];
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

/** The pre-authored Otgontenger composition, retained as a development fallback. */
export const OTGONTENGER_GENERATED_REGION: RegionComposition = {
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
};

/** The pre-authored Altan Ovoo composition, retained as a development fallback. */
export const ALTAN_OVOO_GENERATED_REGION: RegionComposition = {
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
};

/** The pre-authored Eej Khairkhan composition, retained as a development fallback. */
export const EEJ_KHAIRKHAN_GENERATED_REGION: RegionComposition = {
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
};

/** The pre-authored Mount Belukha composition, retained as a development fallback. */
export const BELUKHA_GENERATED_REGION: RegionComposition = {
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
};

/** The pre-authored Khan Tengri composition, retained as a development fallback. */
export const KHAN_TENGRI_GENERATED_REGION: RegionComposition = {
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
};

/** The former generated Bogd Khan Uul composition, retained as a development fallback. */
export const BOGD_KHAN_UUL_GENERATED_REGION: RegionComposition = {
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
};

/** One authored level-1 plateau, sharing the ramp mechanics of the composed shelves. */
function plateau(
  source: Pick<OrkhonPlateau, 'id' | 'outline' | 'ramps'>,
  rise: number,
): SceneShelf {
  const xs = source.outline.map((point) => point.x);
  const ys = source.outline.map((point) => point.y);
  const [first, ...rest] = source.ramps.map((ramp) => ({
    start: ramp.foot,
    end: ramp.top,
    halfWidth: ramp.halfWidth,
    shoulder: ramp.shoulder,
  }));
  return {
    id: source.id,
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    z: (Math.min(...ys) + Math.max(...ys)) / 2,
    width: (Math.max(...xs) - Math.min(...xs)) / 2,
    depth: (Math.max(...ys) - Math.min(...ys)) / 2,
    rise,
    turn: 0,
    fracture: 0,
    outline: source.outline,
    ramp: first,
    approaches: rest,
  };
}

/** Hand-composed terrain masses surround an open, continuous combat and caravan floor. */
export const WORLD_REGIONS: Readonly<Record<LocationId, RegionComposition>> = {
  otgontenger: {
    id: 'otgontenger',
    floor: 80,
    snowLine: 265,
    vegetation: 'alpine',
    palette: { ...alpine, grass: 0x8f9d72, soil: 0xb2a98d, rock: 0x8b9290 },
    campShelf: false,
    relief: 0.35,
    terrainSize: OTGONTENGER.world.terrainSize,
    playBounds: {
      x: OTGONTENGER.world.minX,
      y: OTGONTENGER.world.minY,
      width: OTGONTENGER.world.width,
      height: OTGONTENGER.world.height,
    },
    camp: OTGONTENGER.world.camp,
    campClearRadius: OTGONTENGER.world.campClearRadius,
    ground: {
      paths: OTGONTENGER.paths,
      width: OTGONTENGER.pathWidth,
      ramps: OTGONTENGER.plateaus.flatMap((source) => source.ramps),
    },
    obstacles: OTGONTENGER_FOOTPRINTS.map(({ x, y, footprint }) => ({
      x,
      y,
      radius: footprint,
    })),
    shelves: OTGONTENGER.plateaus.map((source) => plateau(source, OTGONTENGER.rise)),
  },
  'bogd-khan-uul': {
    id: 'bogd-khan-uul',
    floor: 65,
    snowLine: 10000,
    vegetation: 'woodland',
    palette: { ...meadow, grass: 0x8b9e66, rock: 0x8f9383 },
    campShelf: false,
    relief: 0.35,
    terrainSize: BOGD_KHAN_UUL.world.terrainSize,
    playBounds: {
      x: BOGD_KHAN_UUL.world.minX,
      y: BOGD_KHAN_UUL.world.minY,
      width: BOGD_KHAN_UUL.world.width,
      height: BOGD_KHAN_UUL.world.height,
    },
    camp: BOGD_KHAN_UUL.world.camp,
    campClearRadius: BOGD_KHAN_UUL.world.campClearRadius,
    ground: {
      paths: BOGD_KHAN_UUL.paths,
      width: BOGD_KHAN_UUL.pathWidth,
      ramps: BOGD_KHAN_UUL.plateaus.flatMap((source) => source.ramps),
    },
    obstacles: BOGD_KHAN_UUL_FOOTPRINTS.map(({ x, y, footprint }) => ({
      x,
      y,
      radius: footprint,
    })),
    shelves: BOGD_KHAN_UUL.plateaus.map((source) => plateau(source, BOGD_KHAN_UUL.rise)),
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
    campShelf: false,
    relief: 0.28,
    terrainSize: KHAN_TENGRI.world.terrainSize,
    playBounds: {
      x: KHAN_TENGRI.world.minX,
      y: KHAN_TENGRI.world.minY,
      width: KHAN_TENGRI.world.width,
      height: KHAN_TENGRI.world.height,
    },
    camp: KHAN_TENGRI.world.camp,
    campClearRadius: KHAN_TENGRI.world.campClearRadius,
    ground: {
      paths: KHAN_TENGRI.paths,
      width: KHAN_TENGRI.pathWidth,
      ramps: KHAN_TENGRI.plateaus.flatMap((source) => source.ramps),
    },
    obstacles: KHAN_TENGRI_FOOTPRINTS.map(({ x, y, footprint }) => ({
      x,
      y,
      radius: footprint,
    })),
    shelves: [
      ...KHAN_TENGRI.plateaus.map((source) => plateau(source, KHAN_TENGRI.rise)),
      {
        id: 'northern-peak-wall',
        x: 0,
        z: -3200,
        width: 3800,
        depth: 800,
        rise: 430,
        turn: 0,
        fracture: 150,
        peak: 280,
      },
    ],
  },
  belukha: {
    id: 'belukha',
    floor: 75,
    snowLine: 300,
    vegetation: 'woodland',
    palette: { ...alpine, grass: 0x87a08a },
    campShelf: false,
    relief: 0.35,
    terrainSize: BELUKHA.world.terrainSize,
    playBounds: {
      x: BELUKHA.world.minX,
      y: BELUKHA.world.minY,
      width: BELUKHA.world.width,
      height: BELUKHA.world.height,
    },
    camp: BELUKHA.world.camp,
    campClearRadius: BELUKHA.world.campClearRadius,
    ground: {
      paths: BELUKHA.paths,
      width: BELUKHA.pathWidth,
      ramps: BELUKHA.plateaus.flatMap((source) => source.ramps),
    },
    shelves: BELUKHA.plateaus.map((source) => plateau(source, BELUKHA.rise)),
  },
  'altan-ovoo': {
    id: 'altan-ovoo',
    floor: 65,
    snowLine: 10000,
    vegetation: 'meadow',
    palette: { ...meadow, grass: 0xb3a36b, rock: 0x72756e },
    campShelf: false,
    relief: 0.35,
    terrainSize: ALTAN_OVOO.world.terrainSize,
    playBounds: {
      x: ALTAN_OVOO.world.minX,
      y: ALTAN_OVOO.world.minY,
      width: ALTAN_OVOO.world.width,
      height: ALTAN_OVOO.world.height,
    },
    camp: ALTAN_OVOO.world.camp,
    campClearRadius: ALTAN_OVOO.world.campClearRadius,
    ground: {
      paths: ALTAN_OVOO.paths,
      width: ALTAN_OVOO.pathWidth,
      ramps: ALTAN_OVOO.plateaus.flatMap((source) => source.ramps),
    },
    obstacles: ALTAN_OVOO_FOOTPRINTS.map(({ x, y, footprint }) => ({
      x,
      y,
      radius: footprint,
    })),
    shelves: ALTAN_OVOO.plateaus.map((source) => plateau(source, ALTAN_OVOO.rise)),
  },
  'eej-khairkhan': {
    id: 'eej-khairkhan',
    floor: 65,
    snowLine: 10000,
    vegetation: 'desert',
    palette: { ...desert, grass: 0xb79c72, soil: 0xd1a174, rock: 0xb97862, fog: 0xd5b991 },
    campShelf: false,
    relief: 0.28,
    terrainSize: EEJ_KHAIRKHAN.world.terrainSize,
    playBounds: {
      x: EEJ_KHAIRKHAN.world.minX,
      y: EEJ_KHAIRKHAN.world.minY,
      width: EEJ_KHAIRKHAN.world.width,
      height: EEJ_KHAIRKHAN.world.height,
    },
    camp: EEJ_KHAIRKHAN.world.camp,
    campClearRadius: EEJ_KHAIRKHAN.world.campClearRadius,
    ground: {
      paths: EEJ_KHAIRKHAN.paths,
      width: EEJ_KHAIRKHAN.pathWidth,
      ramps: EEJ_KHAIRKHAN.plateaus.flatMap((source) => source.ramps),
    },
    obstacles: EEJ_KHAIRKHAN_FOOTPRINTS.map(({ x, y, footprint }) => ({
      x,
      y,
      radius: footprint,
    })),
    shelves: EEJ_KHAIRKHAN.plateaus.map((source) => plateau(source, EEJ_KHAIRKHAN.rise)),
  },
  'orkhon-valley': {
    id: 'orkhon-valley',
    floor: 60,
    snowLine: 10000,
    vegetation: 'river',
    palette: { ...meadow, grass: 0x92aa73, rock: 0x929784, fog: 0xc9c2a2 },
    campShelf: false,
    relief: 0.35,
    terrainSize: ORKHON_VALLEY.world.terrainSize,
    playBounds: {
      x: ORKHON_VALLEY.world.minX,
      y: ORKHON_VALLEY.world.minY,
      width: ORKHON_VALLEY.world.width,
      height: ORKHON_VALLEY.world.height,
    },
    camp: ORKHON_VALLEY.world.camp,
    ground: {
      // Trails end at the ramp feet; each ramp wears its own graded width (`rampWear`).
      paths: ORKHON_VALLEY.paths,
      width: ORKHON_VALLEY.pathWidth,
      ramps: ORKHON_VALLEY.plateaus.flatMap((source) => source.ramps),
    },
    obstacles: ORKHON_FOOTPRINTS.map(({ x, y, footprint }) => ({ x, y, radius: footprint })),
    shelves: ORKHON_VALLEY.plateaus.map((source) => plateau(source, ORKHON_VALLEY.rise)),
  },
};

export function composedRegion(id: LocationId, generatedFallback = false): ComposedRegion {
  const fallback =
    id === 'altan-ovoo'
      ? ALTAN_OVOO_GENERATED_REGION
      : id === 'otgontenger'
        ? OTGONTENGER_GENERATED_REGION
        : id === 'eej-khairkhan'
          ? EEJ_KHAIRKHAN_GENERATED_REGION
          : id === 'belukha'
            ? BELUKHA_GENERATED_REGION
            : id === 'khan-tengri'
              ? KHAN_TENGRI_GENERATED_REGION
              : id === 'bogd-khan-uul'
                ? BOGD_KHAN_UUL_GENERATED_REGION
                : undefined;
  const composition = generatedFallback && fallback ? fallback : WORLD_REGIONS[id];
  return {
    seed: `living-steppe-scenes-v3:${id}`,
    biome: {
      ...OTGONTENGER_MOUNTAINS.biome,
      id: `scene-${id}`,
      heightScale: 1000,
      campRadius: composition.campClearRadius ?? 350,
      caravan: { length: 1530, halfWidth: 240, shoulder: 110 },
    },
    scene: {
      ...composition,
      shelves: [...(composition.campShelf === false ? [] : [CAMP_SHELF]), ...composition.shelves],
    },
  };
}

const CAMP_SHELF: SceneShelf = {
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
};
