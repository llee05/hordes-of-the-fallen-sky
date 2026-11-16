import type { OrkhonSprite } from '../assets/orkhonValleyArt';
import type { LandscapeDefinition } from './landscapes';
import type { TerrainPoint } from '../terrain/types';

export type KarakorumLandmarkRole =
  'city-wall' | 'gate' | 'training-yard' | 'report-post' | 'patrol-road' | 'omen' | 'scenery';

/** Existing Orkhon-pack scenery placed at an authored city or road site. */
export interface KarakorumLandmark {
  id: string;
  sprite: OrkhonSprite;
  x: number;
  y: number;
  role: KarakorumLandmarkRole;
  scale?: number;
  flip?: boolean;
  /** Radius reserved from navigation and procedural dressing. */
  footprint?: number;
}

export interface KarakorumGrove {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  count: number;
}

export interface KarakorumLayout {
  world: {
    width: number;
    height: number;
    terrainSize: number;
    minX: number;
    minY: number;
    camp: TerrainPoint;
    campClearRadius: number;
  };
  /** Connected worn roads between the gate, yard, patrol route, omen and camp. */
  paths: readonly (readonly TerrainPoint[])[];
  pathWidth: number;
  /** A quiet bend of the upper Orkhon along the northern edge. */
  river: NonNullable<LandscapeDefinition['water']>;
  landmarks: readonly KarakorumLandmark[];
  groves: readonly KarakorumGrove[];
}

const p = (x: number, y: number): TerrainPoint => ({ x, y });

/**
 * Stable prologue anchors. Coordinates are level-centre-relative: +x east and +y south.
 * Phase 1 exposes them to level tests and dressing; later phases attach tutorial beats.
 */
export const KARAKORUM_SITES = {
  gate: p(1050, -520),
  yard: p(2050, 210),
  westTrack: [p(520, -310), p(-180, -130), p(-900, 40)] as const,
  cart: p(-1640, 210),
  omen: p(-2520, -460),
  rally: p(-2020, 570),
  campSite: p(-1120, 1110),
  reportPost: p(1470, -260),
} as const;

/**
 * Karakorum at the city edge: a broad playable pasture with a compact north-eastern settlement
 * footprint. The dedicated city kit is a later art phase; these placements reuse the Orkhon pack.
 */
export const KARAKORUM: KarakorumLayout = {
  world: {
    width: 6400,
    height: 4000,
    // Padding keeps the angled camera footprint on terrain at every playable edge.
    terrainSize: 8704,
    minX: -3200,
    minY: -2000,
    camp: KARAKORUM_SITES.campSite,
    campClearRadius: 520,
  },
  paths: [
    [KARAKORUM_SITES.gate, p(1480, -120), KARAKORUM_SITES.yard],
    [
      KARAKORUM_SITES.gate,
      ...KARAKORUM_SITES.westTrack,
      KARAKORUM_SITES.cart,
      p(-2100, -40),
      KARAKORUM_SITES.omen,
    ],
    [KARAKORUM_SITES.cart, KARAKORUM_SITES.rally, KARAKORUM_SITES.campSite],
    [KARAKORUM_SITES.gate, KARAKORUM_SITES.reportPost],
    [KARAKORUM_SITES.reportPost, p(520, 380), KARAKORUM_SITES.campSite],
  ],
  pathWidth: 78,
  river: {
    kind: 'stream',
    width: 112,
    color: 0x557985,
    bank: 0xa9ad83,
    course: [
      -3340, -1670, -2820, -1550, -2250, -1510, -1640, -1600, -980, -1740, -260, -1810, 520, -1760,
      1270, -1630, 2010, -1560, 2690, -1650, 3340, -1810,
    ],
  },
  landmarks: [
    // Placeholder north wall and western gate. The purpose-built city kit replaces these runs.
    {
      id: 'wall-north-west',
      sprite: 'enemy_camp_palisade',
      x: 340,
      y: -1110,
      role: 'city-wall',
      scale: 1.08,
      footprint: 118,
    },
    {
      id: 'wall-gate-west',
      sprite: 'enemy_camp_palisade',
      x: 760,
      y: -1010,
      role: 'gate',
      scale: 1.08,
      footprint: 118,
    },
    {
      id: 'wall-gate-east',
      sprite: 'enemy_camp_palisade',
      x: 1380,
      y: -1010,
      role: 'gate',
      scale: 1.08,
      flip: true,
      footprint: 118,
    },
    {
      id: 'wall-north-east',
      sprite: 'enemy_camp_palisade',
      x: 1830,
      y: -1100,
      role: 'city-wall',
      scale: 1.08,
      flip: true,
      footprint: 118,
    },
    {
      id: 'wall-far-east',
      sprite: 'enemy_camp_palisade',
      x: 2380,
      y: -980,
      role: 'city-wall',
      scale: 1.08,
      footprint: 118,
    },
    {
      id: 'wall-east-lower',
      sprite: 'enemy_camp_palisade',
      x: 2780,
      y: -560,
      role: 'city-wall',
      scale: 1.08,
      flip: true,
      footprint: 118,
    },
    {
      id: 'wall-east-south',
      sprite: 'enemy_camp_palisade',
      x: 2840,
      y: -10,
      role: 'city-wall',
      scale: 1.08,
      footprint: 118,
    },
    {
      id: 'gate-banner',
      sprite: 'blue_camp_banner',
      x: 1110,
      y: -820,
      role: 'gate',
      scale: 1.12,
    },
    {
      id: 'report-stone',
      sprite: 'standing_stone',
      x: 1535,
      y: -330,
      role: 'report-post',
      scale: 0.9,
    },
    {
      id: 'yard-canopy',
      sprite: 'camp_canopy',
      x: 2230,
      y: 10,
      role: 'training-yard',
      scale: 1.1,
      footprint: 54,
    },
    {
      id: 'yard-spear-rack',
      sprite: 'spear_rack',
      x: 1880,
      y: 40,
      role: 'training-yard',
      scale: 0.94,
      footprint: 30,
    },
    {
      id: 'yard-wooden-rack',
      sprite: 'wooden_rack',
      x: 2180,
      y: 390,
      role: 'training-yard',
      scale: 0.9,
      flip: true,
      footprint: 32,
    },
    {
      id: 'city-ger-north',
      sprite: 'player_ger_medium',
      x: 1920,
      y: -600,
      role: 'scenery',
      scale: 1.08,
      footprint: 58,
    },
    {
      id: 'city-ger-east',
      sprite: 'player_ger_small',
      x: 2480,
      y: -360,
      role: 'scenery',
      scale: 1,
      footprint: 64,
    },
    {
      id: 'patrol-cart',
      sprite: 'camp_supply_cart',
      x: KARAKORUM_SITES.cart.x + 35,
      y: KARAKORUM_SITES.cart.y - 65,
      role: 'patrol-road',
      scale: 0.96,
    },
    {
      id: 'western-ovoo',
      sprite: 'sacred_ovoo',
      x: KARAKORUM_SITES.omen.x - 35,
      y: KARAKORUM_SITES.omen.y - 120,
      role: 'omen',
      scale: 0.9,
    },
  ],
  groves: [
    { x: -2810, y: 1220, radiusX: 300, radiusY: 430, count: 24 },
    { x: -250, y: 1570, radiusX: 480, radiusY: 230, count: 22 },
    { x: 2940, y: 1220, radiusX: 230, radiusY: 420, count: 18 },
    { x: -2750, y: -1180, radiusX: 300, radiusY: 210, count: 14 },
  ],
};

export const KARAKORUM_FOOTPRINTS = KARAKORUM.landmarks.filter(
  (landmark): landmark is KarakorumLandmark & { footprint: number } =>
    typeof landmark.footprint === 'number',
);

/** Sites suitable for ordinary field objectives in the Phase 1 developer camp. */
export const KARAKORUM_FIELD_SITES = [
  KARAKORUM_SITES.cart,
  KARAKORUM_SITES.rally,
  KARAKORUM_SITES.omen,
] as const;

/** Western disturbance bearings keep ambient arrivals outside the placeholder city. */
export const KARAKORUM_ENEMY_CAMPS = [KARAKORUM_SITES.omen, KARAKORUM_SITES.westTrack[2]] as const;
