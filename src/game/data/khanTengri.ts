import type { OrkhonSprite } from '../assets/orkhonValleyArt';
import type { SceneryProp } from './landscapes';
import type { TerrainPoint } from '../terrain/types';
import { ART_SPEC } from './artSpec';

/** A broad walkable cut through the raised lateral-moraine terrace. */
export interface KhanTengriRamp {
  foot: TerrainPoint;
  top: TerrainPoint;
  halfWidth: number;
  shoulder: number;
}

export interface KhanTengriPlateau {
  id: string;
  outline: readonly TerrainPoint[];
  ramps: readonly KhanTengriRamp[];
}

export type KhanTengriLandmarkRole = 'overlook' | 'gap' | 'glacier' | 'erratic-field' | 'scenery';

/** Existing bundled scenery placed at an authored terrain site. */
export interface KhanTengriLandmark {
  id: string;
  texture: 'steppe-scenery' | 'orkhon-valley-sprites' | 'orkhon-terrain-kit';
  frame: SceneryProp | OrkhonSprite;
  x: number;
  y: number;
  width: number;
  role: KhanTengriLandmarkRole;
  flip?: boolean;
  /** Radius reserved from navigation and procedural dressing. */
  footprint?: number;
  shadow?: boolean;
}

export interface KhanTengriLayout {
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
  plateaus: readonly KhanTengriPlateau[];
  paths: readonly (readonly TerrainPoint[])[];
  pathWidth: number;
  meltwater: {
    kind: 'glacial';
    width: number;
    color: number;
    bank: number;
    course: readonly number[];
    gorge: { rapids: number; bridges: readonly [] };
  };
  landmarks: readonly KhanTengriLandmark[];
}

const p = (x: number, y: number): TerrainPoint => ({ x, y });

/** Stable anchors shared by routes, scenery, tests and capture views. */
export const KHAN_TENGRI_SITES = {
  camp: p(-2050, 1050),
  westOverlook: p(-2500, -1150),
  marbleView: p(-450, -1300),
  chapaevGap: p(1200, -1100),
  blueIceMargin: p(2100, -100),
  erraticField: p(900, 1150),
  meltwaterFan: p(2400, 1150),
  moraineGate: p(-2850, 200),
} as const;

const WEST_RAMP: KhanTengriRamp = {
  foot: p(-1750, -250),
  top: p(-1580, -680),
  halfWidth: 120,
  shoulder: 225,
};
const EAST_RAMP: KhanTengriRamp = {
  foot: p(1500, -390),
  top: p(1270, -790),
  halfWidth: 120,
  shoulder: 225,
};

/**
 * Authored Khan Tengri glacier-margin level. Coordinates are level-centre-relative: +x east,
 * +y south. A terrain ridge walls off the distant northern peaks, while the playable battlefield
 * stays on the lower moraine floor and one raised lateral-moraine terrace.
 */
export const KHAN_TENGRI: KhanTengriLayout = {
  world: {
    width: 6400,
    height: 4000,
    terrainSize: 8800,
    minX: -3200,
    minY: -2000,
    camp: KHAN_TENGRI_SITES.camp,
    campClearRadius: 540,
  },
  rise: ART_SPEC.orkhon.plateauRise,
  plateaus: [
    {
      id: 'lateral-moraine-terrace',
      outline: [
        p(-3200, -2000),
        p(2100, -2000),
        p(2300, -1650),
        p(2100, -1200),
        p(1750, -900),
        p(1300, -700),
        p(800, -560),
        p(200, -600),
        p(-500, -680),
        p(-1100, -620),
        p(-1700, -450),
        p(-2400, -520),
        p(-2900, -850),
        p(-3200, -1100),
      ],
      ramps: [WEST_RAMP, EAST_RAMP],
    },
  ],
  paths: [
    // The main traversal climbs the west ramp, crosses the upper terrace, and descends east.
    [
      KHAN_TENGRI_SITES.camp,
      p(-1950, 600),
      WEST_RAMP.foot,
      WEST_RAMP.top,
      p(-2100, -850),
      KHAN_TENGRI_SITES.westOverlook,
      p(-1600, -1250),
      KHAN_TENGRI_SITES.marbleView,
      p(350, -1220),
      KHAN_TENGRI_SITES.chapaevGap,
      EAST_RAMP.top,
      EAST_RAMP.foot,
      p(1800, -250),
      KHAN_TENGRI_SITES.blueIceMargin,
    ],
    // The lower return closes the route across broad open outwash.
    [
      KHAN_TENGRI_SITES.blueIceMargin,
      p(1650, 250),
      p(1300, 650),
      KHAN_TENGRI_SITES.erraticField,
      p(100, 1350),
      p(-900, 1300),
      KHAN_TENGRI_SITES.camp,
    ],
    // A second western approach joins the main ascent at its ramp foot.
    [
      KHAN_TENGRI_SITES.camp,
      p(-2500, 700),
      KHAN_TENGRI_SITES.moraineGate,
      p(-2450, -50),
      WEST_RAMP.foot,
    ],
    // This branch ends at the named glacier-fed fan instead of open ground.
    [KHAN_TENGRI_SITES.erraticField, p(1500, 1200), p(2050, 1180), KHAN_TENGRI_SITES.meltwaterFan],
  ],
  pathWidth: 76,
  meltwater: {
    kind: 'glacial',
    width: 58,
    color: 0x78aabc,
    bank: 0xa7a5ad,
    course: [1800, -2000, 1850, -1300, 2000, -600, 2200, 50, 2350, 600, 2650, 1250, 3000, 2000],
    gorge: { rapids: 0, bridges: [] },
  },
  landmarks: [
    {
      id: 'western-overlook-stone',
      texture: 'orkhon-valley-sprites',
      frame: 'standing_stone',
      x: -2500,
      y: -1150,
      width: 66,
      role: 'overlook',
      footprint: 42,
      shadow: true,
    },
    {
      id: 'chapaev-crag',
      texture: 'steppe-scenery',
      frame: 'crag',
      x: 1510,
      y: -1290,
      width: 390,
      role: 'gap',
      footprint: 155,
      shadow: true,
    },
    {
      id: 'erratic-west',
      texture: 'orkhon-valley-sprites',
      frame: 'small_boulder',
      x: 820,
      y: 1090,
      width: 58,
      role: 'erratic-field',
      footprint: 32,
      shadow: true,
    },
    {
      id: 'erratic-east',
      texture: 'orkhon-terrain-kit',
      frame: 'prop_cliff_scree',
      x: 1030,
      y: 1220,
      width: 125,
      role: 'erratic-field',
      footprint: 62,
      flip: true,
      shadow: true,
    },
  ],
};

export const KHAN_TENGRI_FOOTPRINTS = KHAN_TENGRI.landmarks.filter(
  (landmark): landmark is KhanTengriLandmark & { footprint: number } =>
    typeof landmark.footprint === 'number',
);
