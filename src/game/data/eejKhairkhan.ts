import { ART_SPEC } from './artSpec';
import type { TerrainPoint } from '../terrain/types';

/** A broad walkable cut through the granite-terrace rim. */
export interface EejKhairkhanRamp {
  foot: TerrainPoint;
  top: TerrainPoint;
  halfWidth: number;
  shoulder: number;
}

export interface EejKhairkhanPlateau {
  id: string;
  outline: readonly TerrainPoint[];
  ramps: readonly EejKhairkhanRamp[];
}

export type EejKhairkhanFormationRole = 'massif' | 'wind-court' | 'terrace' | 'spring';

/** Existing granite scenery anchored to the authored layout. */
export interface EejKhairkhanFormation {
  id: string;
  x: number;
  y: number;
  width: number;
  role: EejKhairkhanFormationRole;
  frame: 'crag' | 'boulder';
  flip?: boolean;
  /** Radius reserved from movement and procedural dressing. */
  footprint: number;
}

export interface EejKhairkhanLayout {
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
  plateaus: readonly EejKhairkhanPlateau[];
  paths: readonly (readonly TerrainPoint[])[];
  pathWidth: number;
  spring: {
    centre: TerrainPoint;
    radius: number;
    water: {
      kind: 'stream';
      width: number;
      color: number;
      bank: number;
      sourcePool: { x: number; y: number; radius: number };
      course: readonly number[];
    };
  };
  formations: readonly EejKhairkhanFormation[];
}

const p = (x: number, y: number): TerrainPoint => ({ x, y });

/** Named anchors shared by paths, dressing, tests and captures. */
export const EEJ_KHAIRKHAN_SITES = {
  camp: p(-2150, 1050),
  basins: p(-1450, -850),
  overlook: p(450, -700),
  windCourt: p(-2700, 250),
  centralCourt: p(-450, 650),
  spring: p(2100, 800),
  caravanApproach: p(3000, 1550),
} as const;

const WEST_RAMP: EejKhairkhanRamp = {
  foot: p(-1850, 180),
  top: p(-1600, -120),
  halfWidth: 120,
  shoulder: 225,
};

const EAST_RAMP: EejKhairkhanRamp = {
  foot: p(1650, 430),
  top: p(1350, 100),
  halfWidth: 120,
  shoulder: 225,
};

/**
 * Authored Eej Khairkhan battlefield. Coordinates are level-centre-relative: +x east and +y
 * south. The high massif is scenery beyond the north edge of the sole 240-unit playable terrace.
 */
export const EEJ_KHAIRKHAN: EejKhairkhanLayout = {
  world: {
    width: 6400,
    height: 4000,
    terrainSize: 6400,
    minX: -3200,
    minY: -2000,
    camp: EEJ_KHAIRKHAN_SITES.camp,
    campClearRadius: 520,
  },
  rise: ART_SPEC.orkhon.plateauRise,
  plateaus: [
    {
      id: 'granite-terrace',
      outline: [
        p(-3200, -1900),
        p(2800, -1900),
        p(3200, -900),
        p(2500, -250),
        p(1500, 250),
        p(800, -50),
        p(-300, -100),
        p(-900, 250),
        p(-2100, 50),
        p(-3000, -500),
        p(-3200, -900),
      ],
      ramps: [WEST_RAMP, EAST_RAMP],
    },
  ],
  paths: [
    // Complete granite loop: camp -> west ramp -> basins -> overlook -> east ramp -> spring.
    [
      EEJ_KHAIRKHAN_SITES.camp,
      p(-2050, 650),
      WEST_RAMP.foot,
      WEST_RAMP.top,
      p(-1600, -500),
      EEJ_KHAIRKHAN_SITES.basins,
      p(-850, -720),
      EEJ_KHAIRKHAN_SITES.overlook,
      p(950, -420),
      EAST_RAMP.top,
      EAST_RAMP.foot,
      p(1850, 610),
      EEJ_KHAIRKHAN_SITES.spring,
    ],
    // Broad lower combat spine closes the loop through the central gravel court.
    [
      EEJ_KHAIRKHAN_SITES.camp,
      p(-1500, 930),
      p(-900, 760),
      EEJ_KHAIRKHAN_SITES.centralCourt,
      p(300, 650),
      p(1150, 680),
      EEJ_KHAIRKHAN_SITES.spring,
    ],
    // A short terrain spur has a legible granite destination.
    [EEJ_KHAIRKHAN_SITES.camp, p(-2400, 700), EEJ_KHAIRKHAN_SITES.windCourt],
    // The departure road visibly continues beyond this camp-sized slice.
    [EEJ_KHAIRKHAN_SITES.spring, p(2500, 1080), EEJ_KHAIRKHAN_SITES.caravanApproach],
  ],
  pathWidth: 76,
  spring: {
    centre: EEJ_KHAIRKHAN_SITES.spring,
    radius: 150,
    water: {
      kind: 'stream',
      width: 28,
      color: 0x557d80,
      bank: 0xa98262,
      sourcePool: { ...EEJ_KHAIRKHAN_SITES.spring, radius: 150 },
      // A short overflow groove stays inside the spring hollow; this is not a river level.
      course: [2050, 810, 2090, 825, 2150, 820, 2210, 795],
    },
  },
  formations: [
    // Wind-carved court: the road stops between these existing granite cutouts.
    {
      id: 'wind-court-west',
      x: -2820,
      y: 180,
      width: 210,
      role: 'wind-court',
      frame: 'crag',
      footprint: 88,
    },
    {
      id: 'wind-court-east',
      x: -2580,
      y: 310,
      width: 180,
      role: 'wind-court',
      frame: 'boulder',
      flip: true,
      footprint: 76,
    },
    // A sparse northern wall implies the higher massif without adding a third terrain tier.
    ...[-2750, -2050, -1280, -450, 430, 1280, 2070, 2780].map(
      (x, index): EejKhairkhanFormation => ({
        id: `massif-${index + 1}`,
        x,
        y: -1740 + (index % 3) * 55,
        width: 250 + (index % 4) * 35,
        role: 'massif',
        frame: index % 3 === 1 ? 'boulder' : 'crag',
        flip: index % 2 === 1,
        footprint: 105 + (index % 3) * 12,
      }),
    ),
    {
      id: 'eastern-ramp-shoulder',
      x: 1900,
      y: 160,
      width: 170,
      role: 'terrace',
      frame: 'boulder',
      footprint: 70,
    },
  ],
};

export const EEJ_KHAIRKHAN_FOOTPRINTS = EEJ_KHAIRKHAN.formations;
