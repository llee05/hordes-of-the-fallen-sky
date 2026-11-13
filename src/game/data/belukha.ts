import type { TerrainPoint } from '../terrain/types';
import { ART_SPEC } from './artSpec';

export interface BelukhaRamp {
  foot: TerrainPoint;
  top: TerrainPoint;
  halfWidth: number;
  shoulder: number;
}

export interface BelukhaPlateau {
  id: string;
  outline: readonly TerrainPoint[];
  ramps: readonly BelukhaRamp[];
}

export interface BelukhaLayout {
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
  plateaus: readonly BelukhaPlateau[];
  paths: readonly (readonly TerrainPoint[])[];
  pathWidth: number;
  water: {
    kind: 'glacial';
    width: number;
    color: number;
    bank: number;
    sourcePool: { x: number; y: number; radius: number };
    course: readonly number[];
    gorge: {
      rapids: number;
      bridges: readonly { x: number; y: number; angle: number; length: number; width: number }[];
    };
  };
}

const p = (x: number, y: number): TerrainPoint => ({ x, y });

export const BELUKHA_SITES = {
  camp: p(-2100, 1050),
  westernMoraine: p(-2450, -450),
  lakeShore: p(250, -250),
  eastBank: p(1280, 320),
  larchOverlook: p(2400, -550),
  coniferHollow: p(2350, 820),
  outwash: p(2450, 1550),
} as const;

const WEST_RAMP: BelukhaRamp = {
  foot: p(-1450, 610),
  top: p(-1760, 190),
  halfWidth: 122,
  shoulder: 230,
};
const EAST_NORTH_RAMP: BelukhaRamp = {
  foot: p(1520, 120),
  top: p(1920, -190),
  halfWidth: 120,
  shoulder: 225,
};
const EAST_SOUTH_RAMP: BelukhaRamp = {
  foot: p(2850, 1200),
  top: p(2490, 290),
  halfWidth: 120,
  shoulder: 225,
};

/**
 * Authored Mount Belukha (Uch-Sumer) valley. The paired white heights form the unreachable
 * northern frame; combat space lies around Akkem-inspired glacial water, meadow and moraine.
 * Coordinates are level-centre-relative, with +x east and +y south.
 */
export const BELUKHA: BelukhaLayout = {
  world: {
    width: 6400,
    height: 4000,
    // The renderer's yawed view extends beyond the 2D camera rectangle at low zoom. This larger
    // square keeps painted fallback terrain beneath every legal view of the 6,400 × 4,000 arena.
    terrainSize: 9216,
    minX: -3200,
    minY: -2000,
    camp: BELUKHA_SITES.camp,
    campClearRadius: 540,
  },
  rise: ART_SPEC.orkhon.plateauRise,
  plateaus: [
    {
      id: 'twin-summit-headwall',
      outline: [
        p(-3200, -2000),
        p(3200, -2000),
        p(3200, -1520),
        p(2780, -1450),
        p(2360, -1600),
        p(1880, -1390),
        p(1370, -1510),
        p(860, -1290),
        p(310, -1420),
        p(-180, -1260),
        p(-760, -1450),
        p(-1290, -1310),
        p(-1810, -1510),
        p(-2350, -1360),
        p(-2780, -1510),
        p(-3200, -1420),
      ],
      ramps: [],
    },
    {
      id: 'western-moraine-terrace',
      outline: [
        p(-3200, -1180),
        p(-2800, -1290),
        p(-2240, -1190),
        p(-1760, -910),
        p(-1430, -520),
        p(-1320, 20),
        p(-1510, 420),
        p(-2040, 520),
        p(-2590, 350),
        p(-3060, 80),
        p(-3200, -360),
      ],
      ramps: [WEST_RAMP],
    },
    {
      id: 'eastern-larch-terrace',
      outline: [
        p(1540, -1120),
        p(2100, -1260),
        p(2700, -1170),
        p(3200, -880),
        p(3200, 980),
        p(2860, 1100),
        p(2460, 950),
        p(2130, 670),
        p(1790, 340),
        p(1440, -40),
        p(1320, -520),
      ],
      ramps: [EAST_NORTH_RAMP, EAST_SOUTH_RAMP],
    },
  ],
  paths: [
    [BELUKHA_SITES.camp, p(-1350, 880), p(-650, 560), p(-120, 180), BELUKHA_SITES.lakeShore],
    [
      BELUKHA_SITES.camp,
      p(-1780, 820),
      WEST_RAMP.foot,
      WEST_RAMP.top,
      BELUKHA_SITES.westernMoraine,
    ],
    [
      BELUKHA_SITES.lakeShore,
      p(720, -40),
      BELUKHA_SITES.eastBank,
      p(1750, 520),
      BELUKHA_SITES.coniferHollow,
      EAST_SOUTH_RAMP.foot,
      EAST_SOUTH_RAMP.top,
      BELUKHA_SITES.larchOverlook,
      EAST_NORTH_RAMP.top,
      EAST_NORTH_RAMP.foot,
      BELUKHA_SITES.eastBank,
    ],
    [BELUKHA_SITES.coniferHollow, p(2240, 1180), BELUKHA_SITES.outwash],
    [BELUKHA_SITES.camp, p(-1200, 1300), p(-200, 1400), p(850, 1380), BELUKHA_SITES.outwash],
  ],
  pathWidth: 72,
  water: {
    kind: 'glacial',
    width: 108,
    color: 0xb6cccb,
    bank: 0xaaa995,
    sourcePool: { x: 520, y: -560, radius: 390 },
    course: [
      520, -260, 760, -80, 1010, 100, 1280, 320, 1510, 650, 1740, 980, 2050, 1320, 2360, 1760,
    ],
    gorge: {
      rapids: 0,
      bridges: [{ x: 1280, y: 320, angle: -0.72, length: 320, width: 124 }],
    },
  },
};
