import type { OrkhonSprite } from '../assets/orkhonValleyArt';
import type { TerrainPoint } from '../terrain/types';
import { ART_SPEC } from './artSpec';

export interface BogdKhanUulRamp {
  foot: TerrainPoint;
  top: TerrainPoint;
  halfWidth: number;
  shoulder: number;
}

export interface BogdKhanUulPlateau {
  id: string;
  outline: readonly TerrainPoint[];
  ramps: readonly BogdKhanUulRamp[];
}

export type BogdKhanUulLandmarkRole = 'riverside' | 'clearing' | 'overlook' | 'scenery';

export interface BogdKhanUulLandmark {
  id: string;
  sprite: OrkhonSprite;
  x: number;
  y: number;
  role: BogdKhanUulLandmarkRole;
  scale?: number;
  flip?: boolean;
  footprint?: number;
}

const p = (x: number, y: number): TerrainPoint => ({ x, y });

export const BOGD_KHAN_UUL_SITES = {
  camp: p(-2050, -500),
  tuulLanding: p(-2400, -1180),
  larchGlade: p(780, -420),
  tuulBend: p(2300, -1100),
  tsetseeShoulder: p(-260, 1450),
  pineHollow: p(2200, 1250),
} as const;

const WEST_RAMP: BogdKhanUulRamp = {
  foot: p(-1400, 420),
  top: p(-1150, 900),
  halfWidth: 120,
  shoulder: 225,
};
const EAST_RAMP: BogdKhanUulRamp = {
  foot: p(1450, 400),
  top: p(1650, 880),
  halfWidth: 120,
  shoulder: 225,
};

/**
 * Authored Tuul-side foothills of Bogd Khan Uul. Coordinates are relative to the level centre:
 * +x east and +y south. The protected massif frames a broad lower meadow and one southern
 * shoulder rather than turning the battlefield into a summit ascent.
 */
export const BOGD_KHAN_UUL = {
  world: {
    width: 6400,
    height: 4000,
    // The playable painting remains 6,400 × 4,000. A streamed ground apron keeps the tilted
    // camera over terrain even at the outer play-bound clamps and minimum zoom.
    terrainSize: 8000,
    minX: -3200,
    minY: -2000,
    camp: BOGD_KHAN_UUL_SITES.camp,
    campClearRadius: 520,
  },
  // A taller wooded shoulder stays legible beneath the dense tree line and at combat zoom.
  rise: ART_SPEC.orkhon.plateauRise + 80,
  plateaus: [
    {
      id: 'southern-woodland-shoulder',
      outline: [
        p(-3200, 620),
        p(-2700, 720),
        p(-2200, 650),
        p(-1750, 790),
        p(-1180, 700),
        p(-650, 820),
        p(-50, 730),
        p(520, 830),
        p(1050, 720),
        p(1600, 820),
        p(2160, 690),
        p(2700, 820),
        p(3200, 700),
        p(3200, 2000),
        p(-3200, 2000),
      ],
      ramps: [WEST_RAMP, EAST_RAMP],
    },
  ] as readonly BogdKhanUulPlateau[],
  paths: [
    [BOGD_KHAN_UUL_SITES.camp, p(-2200, -800), BOGD_KHAN_UUL_SITES.tuulLanding],
    [BOGD_KHAN_UUL_SITES.camp, p(-1300, -520), p(-350, -480), BOGD_KHAN_UUL_SITES.larchGlade],
    [BOGD_KHAN_UUL_SITES.larchGlade, p(1400, -650), p(1900, -900), BOGD_KHAN_UUL_SITES.tuulBend],
    [
      BOGD_KHAN_UUL_SITES.camp,
      p(-1750, -40),
      WEST_RAMP.foot,
      WEST_RAMP.top,
      p(-400, 1120),
      p(650, 1130),
      p(1450, 1160),
      BOGD_KHAN_UUL_SITES.pineHollow,
    ],
    [
      BOGD_KHAN_UUL_SITES.pineHollow,
      EAST_RAMP.top,
      EAST_RAMP.foot,
      p(1470, 100),
      BOGD_KHAN_UUL_SITES.larchGlade,
    ],
    [p(650, 1130), p(0, 1300), BOGD_KHAN_UUL_SITES.tsetseeShoulder],
  ] as readonly (readonly TerrainPoint[])[],
  pathWidth: 72,
  river: {
    kind: 'stream' as const,
    width: 240,
    color: 0x426f78,
    bank: 0x918165,
    course: [
      -3500, -1470, -2600, -1580, -1700, -1450, -700, -1600, 300, -1500, 1300, -1620, 2300, -1480,
      3500, -1580,
    ],
  },
  landmarks: [
    {
      id: 'tuul-landing-stones',
      sprite: 'loose_pebbles',
      x: -2510,
      y: -1120,
      role: 'riverside',
      scale: 1.15,
    },
    {
      id: 'tuul-bend-boulder',
      sprite: 'small_boulder',
      x: 2430,
      y: -1040,
      role: 'riverside',
      scale: 0.78,
      footprint: 38,
    },
    {
      id: 'tsetsee-scree',
      sprite: 'prop_cliff_scree',
      x: -430,
      y: 1530,
      role: 'overlook',
      scale: 0.78,
      footprint: 52,
    },
    {
      id: 'pine-hollow-stone',
      sprite: 'small_boulder',
      x: 2320,
      y: 1360,
      role: 'clearing',
      scale: 0.7,
      footprint: 36,
    },
  ] as readonly BogdKhanUulLandmark[],
};

export const BOGD_KHAN_UUL_FOOTPRINTS = BOGD_KHAN_UUL.landmarks.filter(
  (landmark): landmark is BogdKhanUulLandmark & { footprint: number } =>
    typeof landmark.footprint === 'number',
);
