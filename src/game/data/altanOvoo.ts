import type { OrkhonSprite } from '../assets/orkhonValleyArt';
import type { TerrainPoint } from '../terrain/types';
import { ART_SPEC } from './artSpec';

/** A broad walkable cut through the single cinder-cone cliff rim. */
export interface AltanOvooRamp {
  /** Lower-steppe end, outside the cone outline. */
  foot: TerrainPoint;
  /** Upper-cone end, inside the cone outline. */
  top: TerrainPoint;
  halfWidth: number;
  shoulder: number;
}

export interface AltanOvooPlateau {
  id: string;
  outline: readonly TerrainPoint[];
  ramps: readonly AltanOvooRamp[];
}

export type AltanOvooLandmarkRole = 'summit' | 'spirit-site' | 'spring' | 'balbal-site' | 'scenery';

/** Existing painted scenery placed at an authored terrain site. */
export interface AltanOvooLandmark {
  id: string;
  sprite: OrkhonSprite;
  x: number;
  y: number;
  role: AltanOvooLandmarkRole;
  scale?: number;
  flip?: boolean;
  /** Radius reserved from navigation and procedural dressing. */
  footprint?: number;
}

export interface AltanOvooLayout {
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
  /** Height of the sole upper-cone tier above lower steppe. */
  rise: number;
  plateaus: readonly AltanOvooPlateau[];
  /** Connected worn trails; every endpoint is an authored place. */
  paths: readonly (readonly TerrainPoint[])[];
  pathWidth: number;
  spring: {
    centre: TerrainPoint;
    radius: number;
    stream: {
      kind: 'stream';
      width: number;
      color: number;
      bank: number;
      course: readonly number[];
    };
  };
  landmarks: readonly AltanOvooLandmark[];
}

const p = (x: number, y: number): TerrainPoint => ({ x, y });

/** Named layout anchors used by roads, scenery, tests and the later painted-ground projection. */
export const ALTAN_OVOO_SITES = {
  camp: p(-2050, 1050),
  summit: p(-350, -1250),
  westernSpirit: p(-2050, -900),
  centralSpirit: p(650, -450),
  horseMeadow: p(-2750, -100),
  spring: p(1450, 650),
  balbal: p(2400, 1050),
} as const;

const SOUTHWEST_RAMP: AltanOvooRamp = {
  foot: p(-1350, 650),
  top: p(-1120, 170),
  halfWidth: 118,
  shoulder: 220,
};
const EAST_RAMP: AltanOvooRamp = {
  foot: p(1850, 650),
  top: p(1650, 250),
  halfWidth: 118,
  shoulder: 220,
};

/**
 * Authored Altan Ovoo (Dariganga) level. Coordinates are level-centre-relative: +x east, +y
 * south. A 6,400-unit terrain square contains the approved 6,400 × 4,000 playable rectangle,
 * leaving an off-screen strip north and south for the existing square chunk/navigation systems.
 */
export const ALTAN_OVOO: AltanOvooLayout = {
  world: {
    width: 6400,
    height: 4000,
    terrainSize: 6400,
    minX: -3200,
    minY: -2000,
    camp: ALTAN_OVOO_SITES.camp,
    campClearRadius: 520,
  },
  rise: ART_SPEC.orkhon.plateauRise,
  plateaus: [
    {
      id: 'cinder-cone',
      outline: [
        p(-2600, -300),
        p(-2440, -920),
        p(-1940, -1510),
        p(-1080, -1830),
        p(-220, -1900),
        p(760, -1780),
        p(1580, -1420),
        p(2200, -900),
        p(2500, -120),
        p(2220, 300),
        p(1800, 500),
        p(900, 550),
        p(0, 600),
        p(-900, 550),
        p(-1800, 300),
      ],
      ramps: [SOUTHWEST_RAMP, EAST_RAMP],
    },
  ],
  paths: [
    // Main ascent: camp -> southwest ramp -> summit.
    [
      ALTAN_OVOO_SITES.camp,
      p(-1750, 880),
      SOUTHWEST_RAMP.foot,
      SOUTHWEST_RAMP.top,
      p(-920, -180),
      p(-1080, -520),
      p(-700, -820),
      ALTAN_OVOO_SITES.summit,
    ],
    // Upper loop: summit -> central spirit site -> east ramp -> spring.
    [
      ALTAN_OVOO_SITES.summit,
      p(80, -1080),
      p(390, -780),
      ALTAN_OVOO_SITES.centralSpirit,
      p(1080, -120),
      EAST_RAMP.top,
      EAST_RAMP.foot,
      p(1650, 590),
      ALTAN_OVOO_SITES.spring,
    ],
    // Western spirit branch, joined to the main ascent at the upper ramp.
    [SOUTHWEST_RAMP.top, p(-1450, -230), p(-1750, -580), ALTAN_OVOO_SITES.westernSpirit],
    // Lower camp road completes the traversal loop through the spring.
    [
      ALTAN_OVOO_SITES.camp,
      p(-1350, 960),
      p(-500, 980),
      p(350, 930),
      p(980, 800),
      ALTAN_OVOO_SITES.spring,
    ],
    // Lower-west route ends at the named horse-meadow terrain site.
    [ALTAN_OVOO_SITES.camp, p(-2350, 700), p(-2600, 300), ALTAN_OVOO_SITES.horseMeadow],
    // Spring route ends at the balbal terrain site.
    [ALTAN_OVOO_SITES.spring, p(1800, 760), p(2100, 900), ALTAN_OVOO_SITES.balbal],
  ],
  pathWidth: 72,
  spring: {
    centre: ALTAN_OVOO_SITES.spring,
    radius: 155,
    stream: {
      kind: 'stream',
      width: 44,
      color: 0x4e6f77,
      bank: 0x8f8064,
      course: [1450, 650, 1500, 720, 1540, 835, 1600, 980, 1690, 1150, 1820, 1330, 1980, 1500],
    },
  },
  landmarks: [
    {
      id: 'sacred-summit',
      sprite: 'sacred_ovoo',
      ...ALTAN_OVOO_SITES.summit,
      role: 'summit',
      scale: 0.82,
      footprint: 105,
    },
    {
      id: 'summit-west-flag',
      sprite: 'blue_camp_banner',
      x: -520,
      y: -1170,
      role: 'scenery',
      scale: 0.8,
      footprint: 28,
    },
    {
      id: 'summit-east-flag',
      sprite: 'red_enemy_banner',
      x: -80,
      y: -1330,
      role: 'scenery',
      scale: 0.8,
      flip: true,
      footprint: 28,
    },
    {
      id: 'western-spirit-stone',
      sprite: 'standing_stone',
      ...ALTAN_OVOO_SITES.westernSpirit,
      role: 'spirit-site',
      footprint: 54,
    },
    {
      id: 'western-spirit-relic',
      sprite: 'relic_fire',
      x: -1960,
      y: -840,
      role: 'spirit-site',
      scale: 0.75,
      footprint: 40,
    },
    {
      id: 'central-spirit-stone',
      sprite: 'standing_stone',
      ...ALTAN_OVOO_SITES.centralSpirit,
      role: 'spirit-site',
      flip: true,
      footprint: 54,
    },
    {
      id: 'central-spirit-relic',
      sprite: 'relic_fire',
      x: 745,
      y: -390,
      role: 'spirit-site',
      scale: 0.75,
      footprint: 40,
    },
    {
      id: 'spring-reeds-west',
      sprite: 'reed_clump',
      x: 1320,
      y: 625,
      role: 'spring',
      scale: 0.9,
    },
    {
      id: 'spring-reeds-east',
      sprite: 'reed_clump',
      x: 1570,
      y: 660,
      role: 'spring',
      scale: 0.9,
      flip: true,
    },
    // Existing standing stones indicate the site; dedicated balbal statue art remains a follow-up.
    {
      id: 'balbal-west',
      sprite: 'standing_stone',
      x: 2330,
      y: 1050,
      role: 'balbal-site',
      scale: 0.78,
      footprint: 45,
    },
    {
      id: 'balbal-centre',
      sprite: 'standing_stone',
      ...ALTAN_OVOO_SITES.balbal,
      role: 'balbal-site',
      scale: 0.92,
      footprint: 50,
    },
    {
      id: 'balbal-east',
      sprite: 'standing_stone',
      x: 2475,
      y: 1055,
      role: 'balbal-site',
      scale: 0.75,
      footprint: 43,
      flip: true,
    },
  ],
};

export const ALTAN_OVOO_FOOTPRINTS = ALTAN_OVOO.landmarks.filter(
  (landmark): landmark is AltanOvooLandmark & { footprint: number } =>
    typeof landmark.footprint === 'number',
);
