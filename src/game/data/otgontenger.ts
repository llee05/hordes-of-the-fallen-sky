import type { OrkhonSprite } from '../assets/orkhonValleyArt';
import type { TerrainPoint } from '../terrain/types';
import { ART_SPEC } from './artSpec';

export interface OtgontengerRamp {
  /** Lower-valley end, outside the alpine bench outline. */
  foot: TerrainPoint;
  /** Upper-bench end, inside the outline. */
  top: TerrainPoint;
  halfWidth: number;
  shoulder: number;
}

export interface OtgontengerPlateau {
  id: string;
  outline: readonly TerrainPoint[];
  ramps: readonly OtgontengerRamp[];
}

export type OtgontengerLandmarkRole =
  'moraine-gate' | 'overlook' | 'larch-hollow' | 'ford' | 'scenery';

/** Existing painted scenery placed at an authored terrain site. */
export interface OtgontengerLandmark {
  id: string;
  sprite: OrkhonSprite;
  x: number;
  y: number;
  role: OtgontengerLandmarkRole;
  scale?: number;
  flip?: boolean;
  /** Radius reserved from navigation and procedural dressing. */
  footprint?: number;
}

export interface OtgontengerLayout {
  world: {
    width: number;
    height: number;
    terrainSize: number;
    minX: number;
    minY: number;
    /** Live-camp anchor relative to the level centre. */
    camp: TerrainPoint;
    /** Dressing and relief stay outside this spawn-safe radius. */
    campClearRadius: number;
  };
  /** Height of the walkable alpine bench above the lower glacial meadow. */
  rise: number;
  plateaus: readonly OtgontengerPlateau[];
  /** Connected worn trails; every endpoint is an authored place or joined route. */
  paths: readonly (readonly TerrainPoint[])[];
  pathWidth: number;
  tarn: {
    centre: TerrainPoint;
    radius: number;
    outflow: {
      kind: 'glacial';
      width: number;
      color: number;
      bank: number;
      sourcePool: { x: number; y: number; radius: number };
      course: readonly number[];
    };
  };
  landmarks: readonly OtgontengerLandmark[];
}

const p = (x: number, y: number): TerrainPoint => ({ x, y });

/** Named layout anchors used by roads, scenery, tests and the painted-ground projection. */
export const OTGONTENGER_SITES = {
  camp: p(-1900, 900),
  snowOverlook: p(-650, -1300),
  glacierBench: p(1100, -1250),
  tarn: p(2250, 480),
  larchHollow: p(-2750, 1200),
  outflowFord: p(2800, 1200),
  moraineGate: p(-2550, -300),
} as const;

const WEST_RAMP: OtgontengerRamp = {
  foot: p(-1850, -480),
  top: p(-1650, -900),
  halfWidth: 118,
  shoulder: 224,
};
const EAST_RAMP: OtgontengerRamp = {
  foot: p(1500, -350),
  top: p(1300, -760),
  halfWidth: 118,
  shoulder: 224,
};

/**
 * Authored Mount Otgontenger surroundings. The ice-capped massif stays beyond the playable north
 * edge; the level is a broad two-tier glacial meadow and alpine bench below it. Coordinates are
 * level-centre-relative: +x east and +y south.
 */
export const OTGONTENGER: OtgontengerLayout = {
  world: {
    width: 6400,
    height: 4000,
    // Tiled off-playfield ground pads the angled camera footprint at 4K and minimum zoom.
    terrainSize: 8704,
    minX: -3200,
    minY: -2000,
    camp: OTGONTENGER_SITES.camp,
    campClearRadius: 560,
  },
  rise: ART_SPEC.orkhon.plateauRise,
  plateaus: [
    {
      id: 'alpine-bench',
      outline: [
        p(-3300, -2200),
        p(3300, -2200),
        p(3300, -900),
        p(2900, -760),
        p(2200, -700),
        p(1650, -620),
        p(900, -520),
        p(300, -650),
        p(-450, -560),
        p(-1050, -760),
        p(-1700, -690),
        p(-2350, -850),
        p(-3200, -650),
        p(-3300, -800),
      ],
      ramps: [WEST_RAMP, EAST_RAMP],
    },
  ],
  paths: [
    // Main ascent: camp -> west ramp -> snow overlook.
    [
      OTGONTENGER_SITES.camp,
      p(-1900, 350),
      p(-2050, -100),
      WEST_RAMP.foot,
      WEST_RAMP.top,
      p(-1200, -1080),
      OTGONTENGER_SITES.snowOverlook,
    ],
    // Upper bench and east descent reach the tarn.
    [
      OTGONTENGER_SITES.snowOverlook,
      p(-50, -1450),
      p(550, -1420),
      OTGONTENGER_SITES.glacierBench,
      EAST_RAMP.top,
      EAST_RAMP.foot,
      p(1820, 40),
      OTGONTENGER_SITES.tarn,
    ],
    // Wide lower meadow route completes the main loop.
    [
      OTGONTENGER_SITES.camp,
      p(-1200, 700),
      p(-300, 680),
      p(650, 720),
      p(1450, 650),
      OTGONTENGER_SITES.tarn,
    ],
    // Western branch reaches a named larch-and-boulder clearing.
    [OTGONTENGER_SITES.camp, p(-2250, 980), p(-2500, 1100), OTGONTENGER_SITES.larchHollow],
    // Tarn branch follows the gravel fan to the shallow outflow ford.
    [OTGONTENGER_SITES.tarn, p(2460, 750), p(2620, 980), OTGONTENGER_SITES.outflowFord],
    // The moraine gate spur leaves and rejoins the main ascent instead of ending in open ground.
    [p(-1900, 350), OTGONTENGER_SITES.moraineGate, p(-2050, -100)],
  ],
  pathWidth: 72,
  tarn: {
    centre: OTGONTENGER_SITES.tarn,
    radius: 280,
    outflow: {
      kind: 'glacial',
      width: 52,
      color: 0x668995,
      bank: 0x9b927d,
      sourcePool: { x: OTGONTENGER_SITES.tarn.x, y: OTGONTENGER_SITES.tarn.y, radius: 280 },
      course: [2380, 620, 2470, 760, 2600, 930, 2750, 1120, 2940, 1330, 3200, 1550],
    },
  },
  landmarks: [
    {
      id: 'moraine-gate-west',
      sprite: 'prop_cliff_scree',
      x: -2640,
      y: -340,
      role: 'moraine-gate',
      scale: 0.62,
      footprint: 58,
    },
    {
      id: 'moraine-gate-east',
      sprite: 'small_boulder',
      x: -2450,
      y: -250,
      role: 'moraine-gate',
      scale: 0.82,
      footprint: 38,
    },
    {
      id: 'snow-overlook-boulder',
      sprite: 'small_boulder',
      x: -760,
      y: -1370,
      role: 'overlook',
      scale: 0.86,
      footprint: 38,
    },
    {
      id: 'glacier-bench-scree',
      sprite: 'prop_cliff_scree',
      x: 1200,
      y: -1360,
      role: 'overlook',
      scale: 0.55,
      footprint: 54,
    },
    {
      id: 'larch-hollow-stone',
      sprite: 'small_boulder',
      x: -2830,
      y: 1280,
      role: 'larch-hollow',
      scale: 0.82,
      footprint: 38,
    },
    {
      id: 'ford-stones',
      sprite: 'loose_pebbles',
      x: 2830,
      y: 1170,
      role: 'ford',
      scale: 1.05,
    },
  ],
};

export const OTGONTENGER_FOOTPRINTS = OTGONTENGER.landmarks.filter(
  (landmark): landmark is OtgontengerLandmark & { footprint: number } =>
    typeof landmark.footprint === 'number',
);
