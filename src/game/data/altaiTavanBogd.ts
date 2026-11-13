import type { TerrainPoint } from '../terrain/types';
import { ART_SPEC } from './artSpec';

export interface AltaiTavanBogdRamp {
  foot: TerrainPoint;
  top: TerrainPoint;
  halfWidth: number;
  shoulder: number;
}

export interface AltaiTavanBogdPlateau {
  id: string;
  outline: readonly TerrainPoint[];
  ramps: readonly AltaiTavanBogdRamp[];
}

export interface AltaiTavanBogdLandmark {
  id: string;
  texture: 'steppe-scenery' | 'orkhon-valley-sprites' | 'altai-tavan-bogd-north-ridge';
  frame: 'pyramid' | 'snow-dome' | 'glacier' | 'small_boulder' | 'loose_pebbles' | '__BASE';
  x: number;
  y: number;
  width: number;
  role: 'ridge-frame' | 'peak-frame' | 'glacier' | 'moraine' | 'meadow';
  footprint?: number;
  flip?: boolean;
}

export interface AltaiTavanBogdLayout {
  world: {
    width: number;
    height: number;
    terrainSize: number;
    minX: number;
    minY: number;
    camp: TerrainPoint;
    campClearRadius: number;
  };
  rise: number;
  plateaus: readonly AltaiTavanBogdPlateau[];
  paths: readonly (readonly TerrainPoint[])[];
  pathWidth: number;
  lake: {
    kind: 'glacial';
    width: number;
    color: number;
    bank: number;
    course: readonly number[];
    gorge: { rapids: number; bridges: readonly [] };
  };
  landmarks: readonly AltaiTavanBogdLandmark[];
}

const p = (x: number, y: number): TerrainPoint => ({ x, y });

export const ALTAI_TAVAN_BOGD_SITES = {
  camp: p(-1900, 900),
  westernMoraine: p(-900, -950),
  potaninOverlook: p(300, -950),
  northLakeShore: p(1250, -100),
  lowerJunction: p(-500, 350),
  boulderMeadow: p(-2750, 1300),
  southLakeMeadow: p(1300, 1400),
} as const;

const WEST_RAMP: AltaiTavanBogdRamp = {
  foot: p(-1700, 80),
  top: p(-1650, -350),
  halfWidth: 118,
  shoulder: 220,
};

const EAST_RAMP: AltaiTavanBogdRamp = {
  foot: p(850, -150),
  top: p(650, -560),
  halfWidth: 118,
  shoulder: 220,
};

/**
 * Authored camp-sized compression of the five-peak massif, Potanin glacier and long glacial-lake
 * valleys. Coordinates are level-centre-relative: +x east, +y south.
 */
export const ALTAI_TAVAN_BOGD: AltaiTavanBogdLayout = {
  world: {
    width: 6400,
    height: 4000,
    terrainSize: 8000,
    minX: -3200,
    minY: -2000,
    camp: ALTAI_TAVAN_BOGD_SITES.camp,
    campClearRadius: 520,
  },
  rise: ART_SPEC.orkhon.plateauRise,
  plateaus: [
    {
      id: 'northern-moraine',
      outline: [
        p(-3200, -2000),
        p(1100, -2000),
        p(1150, -1650),
        p(950, -1280),
        p(1120, -930),
        p(820, -620),
        p(350, -430),
        p(-250, -520),
        p(-800, -350),
        p(-1280, -440),
        p(-1800, -300),
        p(-2450, -430),
        p(-3200, -700),
      ],
      ramps: [WEST_RAMP, EAST_RAMP],
    },
  ],
  paths: [
    [
      ALTAI_TAVAN_BOGD_SITES.camp,
      p(-1820, 520),
      WEST_RAMP.foot,
      WEST_RAMP.top,
      ALTAI_TAVAN_BOGD_SITES.westernMoraine,
    ],
    [ALTAI_TAVAN_BOGD_SITES.westernMoraine, p(-350, -990), ALTAI_TAVAN_BOGD_SITES.potaninOverlook],
    [
      ALTAI_TAVAN_BOGD_SITES.potaninOverlook,
      EAST_RAMP.top,
      EAST_RAMP.foot,
      ALTAI_TAVAN_BOGD_SITES.northLakeShore,
    ],
    [ALTAI_TAVAN_BOGD_SITES.northLakeShore, p(650, 50), ALTAI_TAVAN_BOGD_SITES.lowerJunction],
    [ALTAI_TAVAN_BOGD_SITES.lowerJunction, p(-1200, 620), ALTAI_TAVAN_BOGD_SITES.camp],
    [ALTAI_TAVAN_BOGD_SITES.camp, p(-2350, 1100), ALTAI_TAVAN_BOGD_SITES.boulderMeadow],
    [
      ALTAI_TAVAN_BOGD_SITES.lowerJunction,
      p(250, 750),
      p(850, 1160),
      ALTAI_TAVAN_BOGD_SITES.southLakeMeadow,
    ],
    [
      ALTAI_TAVAN_BOGD_SITES.southLakeMeadow,
      p(1450, 820),
      p(1450, 350),
      ALTAI_TAVAN_BOGD_SITES.northLakeShore,
    ],
  ],
  pathWidth: 72,
  lake: {
    kind: 'glacial',
    width: 340,
    color: 0x75a5aa,
    bank: 0xc5c9b6,
    course: [1500, -1950, 1300, -1200, 1350, -600, 1600, 0, 1900, 650, 2200, 1300, 2420, 1950],
    gorge: { rapids: 0, bridges: [] },
  },
  landmarks: [
    {
      id: 'five-peak-north-ridge',
      texture: 'altai-tavan-bogd-north-ridge',
      frame: '__BASE',
      x: 0,
      y: -2650,
      width: 6900,
      role: 'ridge-frame',
    },
    {
      id: 'west-ramp-cap-north',
      texture: 'orkhon-valley-sprites',
      frame: 'loose_pebbles',
      x: -1800,
      y: -370,
      width: 108,
      role: 'moraine',
    },
    {
      id: 'west-ramp-cap-south',
      texture: 'orkhon-valley-sprites',
      frame: 'loose_pebbles',
      x: -1500,
      y: -330,
      width: 108,
      role: 'moraine',
      flip: true,
    },
    {
      id: 'east-ramp-cap-west',
      texture: 'orkhon-valley-sprites',
      frame: 'loose_pebbles',
      x: 510,
      y: -495,
      width: 108,
      role: 'moraine',
    },
    {
      id: 'east-ramp-cap-east',
      texture: 'orkhon-valley-sprites',
      frame: 'loose_pebbles',
      x: 790,
      y: -625,
      width: 108,
      role: 'moraine',
      flip: true,
    },
    {
      id: 'boulder-meadow-west',
      texture: 'orkhon-valley-sprites',
      frame: 'small_boulder',
      x: -2820,
      y: 1340,
      width: 72,
      role: 'meadow',
      footprint: 34,
    },
    {
      id: 'boulder-meadow-east',
      texture: 'orkhon-valley-sprites',
      frame: 'loose_pebbles',
      x: -2680,
      y: 1270,
      width: 84,
      role: 'meadow',
      footprint: 32,
    },
  ],
};

export const ALTAI_TAVAN_BOGD_FOOTPRINTS = ALTAI_TAVAN_BOGD.landmarks.filter(
  (landmark): landmark is AltaiTavanBogdLandmark & { footprint: number } =>
    typeof landmark.footprint === 'number',
);
