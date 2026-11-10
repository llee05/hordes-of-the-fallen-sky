import type { OrkhonSprite } from '../assets/orkhonValleyArt';
import { ART_SPEC } from './artSpec';
import { terrainSeed } from '../terrain/noise';
import type { TerrainPoint } from '../terrain/types';

/**
 * Authored Orkhon Valley (Ulaan Tsutgalan) level, following the texture pack's reference layout.
 * Coordinates are camp-relative world units: +x is east and +y is south. The battlefield is
 * 5200 units square, so ±2600 is the world edge. Outlines extend past it to avoid edge walls.
 */
export interface OrkhonRamp {
  /** Valley-floor end of the ramp, outside the plateau. */
  foot: TerrainPoint;
  /** Plateau end of the ramp, inside the outline. */
  top: TerrainPoint;
  /** Fully graded half width; the flanks between this and `shoulder` are steep and blocked. */
  halfWidth: number;
  shoulder: number;
}

export interface OrkhonPlateau {
  id: string;
  /** Simple polygon of the level-1 top; its boundary is a vertical cliff except at ramps. */
  outline: readonly TerrainPoint[];
  ramps: readonly OrkhonRamp[];
}

/** How a landmark maps onto an existing game system. */
export type OrkhonLandmarkRole =
  'enemy-camp' | 'field-site' | 'camp-outskirts' | 'shrine' | 'scenery';

export interface OrkhonLandmark {
  id: string;
  sprite: OrkhonSprite;
  x: number;
  y: number;
  role: OrkhonLandmarkRole;
  /** Relative to the shared sprite scale. */
  scale?: number;
  flip?: boolean;
  /** Radius of ground blocked for movement and navigation. */
  footprint?: number;
}

export interface OrkhonGrove {
  x: number;
  y: number;
  radius: number;
  count: number;
  sprites: readonly OrkhonSprite[];
}

export interface OrkhonValleyLayout {
  /** Height of every level-1 plateau above the level-0 valley floor. */
  rise: number;
  plateaus: readonly OrkhonPlateau[];
  /** The eastern river starts below the falls and runs south through the gorge. */
  river: {
    course: readonly number[];
    width: number;
    /** Channel distance shown as rapids below the waterfall. */
    rapids: number;
    bridges: readonly { x: number; y: number; angle: number; length: number; width: number }[];
  };
  /** Foot of the falls, where the plateau edge meets the head of the river. */
  waterfall: TerrainPoint;
  /** Worn ground from the camp to each ramp and across the bridge. */
  paths: readonly (readonly TerrainPoint[])[];
  pathWidth: number;
  landmarks: readonly OrkhonLandmark[];
  groves: readonly OrkhonGrove[];
}

/**
 * Height of every plateau above the valley floor: about four mounted riders in world units. Walls
 * are foreshortened by the camera, so on screen a cliff stands about two and a half riders tall.
 */
const RISE = ART_SPEC.orkhon.plateauRise;
/**
 * A ramp crossing the cliff at `at`. North ramps climb 30° east of north and west ramps climb
 * slightly north of west.
 */
const ramp = (at: TerrainPoint, direction: 'north' | 'west'): OrkhonRamp => {
  const d = direction === 'north' ? { x: 0.5, y: -0.866 } : { x: -0.99, y: -0.14 };
  // Ramps keep a constant walkable grade, so their length follows the rise.
  const half = Math.round((115 * RISE) / 160);
  return {
    foot: { x: Math.round(at.x - d.x * half), y: Math.round(at.y - d.y * half) },
    top: { x: Math.round(at.x + d.x * half), y: Math.round(at.y + d.y * half) },
    halfWidth: 112,
    // Steep basalt flanks span several terrain mesh cells, so the cliff tapers without teeth.
    shoulder: 212,
  };
};
const p = (x: number, y: number): TerrainPoint => ({ x, y });
const FALLS = p(1620, -1478);

/**
 * Break a plateau's long straight edges into irregular basalt jogs, as in the reference layout:
 * every ~210 units a point steps up to 48 units in or out. Deterministic. Within 330 units of a
 * ramp crossing or the falls the outline stays on its authored line, so ramps and the falls keep
 * their exact edge; points beyond the world edge are left out.
 */
function plateau(id: string, outline: readonly TerrainPoint[], ramps: OrkhonRamp[]): OrkhonPlateau {
  const keep = [FALLS, ...ramps.map((r) => p((r.foot.x + r.top.x) / 2, (r.foot.y + r.top.y) / 2))];
  let seed = terrainSeed(`orkhon-outline:${id}`);
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const result: TerrainPoint[] = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]!,
      b = outline[(i + 1) % outline.length]!;
    result.push(a);
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const pieces = Math.floor(length / 210);
    const n = { x: (b.y - a.y) / length, y: -(b.x - a.x) / length };
    for (let k = 1; k < pieces; k++) {
      const t = (k + (random() - 0.5) * 0.5) / pieces;
      const at = p(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
      const step = (k % 2 ? 1 : -1) * (18 + random() * 30);
      if (Math.abs(at.x) > 2650 || Math.abs(at.y) > 2650) continue;
      const offset = keep.some((q) => Math.hypot(q.x - at.x, q.y - at.y) < 330) ? 0 : step;
      result.push(p(Math.round(at.x + n.x * offset), Math.round(at.y + n.y * offset)));
    }
  }
  return { id, outline: result, ramps };
}

export const ORKHON_VALLEY: OrkhonValleyLayout = {
  rise: RISE,
  plateaus: [
    plateau(
      'shrine-heights',
      [
        p(-2700, -2700),
        p(-750, -2700),
        p(-750, -1700),
        p(-1000, -1350),
        p(-1650, -1250),
        p(-2100, -1450),
        p(-2700, -1450),
      ],
      [ramp(p(-1300, -1304), 'north')],
    ),
    plateau(
      'falls-plateau',
      [
        p(-450, -2700),
        p(2700, -2700),
        p(2700, -300),
        p(2350, -300),
        p(2150, -450),
        p(2000, -900),
        p(1950, -1350),
        p(1700, -1500),
        p(1450, -1450),
        p(1050, -1450),
        p(600, -1250),
        p(-100, -1300),
        p(-450, -1600),
      ],
      [ramp(p(250, -1275), 'north'), ramp(p(2420, -300), 'north')],
    ),
    plateau(
      'western-shelf',
      [p(-2700, -750), p(-1900, -750), p(-1750, -450), p(-1800, 250), p(-2050, 550), p(-2700, 550)],
      [ramp(p(-1770, -170), 'west')],
    ),
    plateau(
      'southwest-shelf',
      [
        p(-2700, 1250),
        p(-1900, 1250),
        p(-1550, 1500),
        p(-1350, 1900),
        p(-1500, 2700),
        p(-2700, 2700),
      ],
      [ramp(p(-1397, 2150), 'west')],
    ),
    plateau(
      'southern-shelf',
      [p(-650, 1750), p(700, 1700), p(950, 1950), p(1000, 2700), p(-800, 2700), p(-850, 2050)],
      [ramp(p(967, 2200), 'west')],
    ),
    plateau(
      'gorge-shelf',
      [p(700, 500), p(1500, 420), p(1680, 700), p(1650, 1150), p(1200, 1250), p(750, 1050)],
      [ramp(p(1300, 1228), 'north')],
    ),
  ],
  river: {
    course: [
      1620, -1440, 1760, -1100, 1810, -700, 1720, -300, 1790, 20, 1920, 300, 1890, 700, 1910, 1100,
      2060, 1550, 2250, 2050, 2420, 2750,
    ],
    width: 120,
    rapids: 420,
    /** The deck runs 30° north of east so the supplied bridge painting stays level on screen. */
    bridges: [{ x: 1790, y: 20, angle: -Math.PI / 6, length: 360, width: 150 }],
  },
  waterfall: FALLS,
  paths: [
    [p(0, 0), p(1450, 0), p(1640, 105)],
    [p(1950, -75), p(2200, -90), p(2334, -150)],
    [p(-150, -120), p(-900, -650), p(-1386, -1154)],
    [p(0, -250), p(164, -1125)],
    [p(-250, -60), p(-1599, -146)],
    [p(-200, 220), p(-600, 640), p(-1000, 1060), p(-1226, 2174)],
    [p(220, 220), p(1214, 1378), p(1150, 1700), p(1138, 2224)],
  ],
  pathWidth: 46,
  landmarks: [
    {
      id: 'north-raiders',
      sprite: 'enemy_camp_palisade',
      x: 650,
      y: -1950,
      role: 'enemy-camp',
      footprint: 115,
    },
    {
      id: 'east-raiders',
      sprite: 'enemy_camp_tents',
      x: 2400,
      y: -1300,
      role: 'enemy-camp',
      footprint: 115,
    },
    {
      id: 'west-raiders',
      sprite: 'enemy_camp_ger',
      x: -1450,
      y: 700,
      role: 'enemy-camp',
      footprint: 115,
    },
    {
      id: 'south-raiders',
      sprite: 'enemy_camp_palisade',
      x: 1300,
      y: 1800,
      role: 'enemy-camp',
      footprint: 115,
      flip: true,
    },
    { id: 'ruins', sprite: 'stone_ruins', x: -620, y: 700, role: 'field-site', footprint: 95 },
    { id: 'ovoo', sprite: 'sacred_ovoo', x: 1050, y: -650, role: 'field-site', footprint: 120 },
    {
      id: 'valley-shrine',
      sprite: 'relic_fire',
      x: -1000,
      y: 1060,
      role: 'field-site',
      footprint: 40,
    },
    {
      id: 'heights-shrine',
      sprite: 'relic_fire',
      x: -1700,
      y: -1850,
      role: 'shrine',
      footprint: 40,
    },
    {
      id: 'heights-stone-west',
      sprite: 'standing_stone',
      x: -1840,
      y: -1890,
      role: 'shrine',
      footprint: 30,
    },
    {
      id: 'heights-stone-east',
      sprite: 'standing_stone',
      x: -1560,
      y: -1900,
      role: 'shrine',
      footprint: 30,
      flip: true,
    },
    {
      id: 'valley-stone',
      sprite: 'standing_stone',
      x: -1110,
      y: 1010,
      role: 'shrine',
      footprint: 30,
    },
    { id: 'north-banner', sprite: 'red_enemy_banner', x: 470, y: -1830, role: 'scenery' },
    { id: 'north-rack', sprite: 'spear_rack', x: 840, y: -1830, role: 'scenery' },
    { id: 'east-banner', sprite: 'red_enemy_banner', x: 2230, y: -1180, role: 'scenery' },
    { id: 'west-banner', sprite: 'red_enemy_banner', x: -1270, y: 790, role: 'scenery' },
    { id: 'west-rack', sprite: 'spear_rack', x: -1640, y: 800, role: 'scenery' },
    { id: 'south-banner', sprite: 'red_enemy_banner', x: 1120, y: 1900, role: 'scenery' },
    { id: 'south-rack', sprite: 'wooden_rack', x: 1480, y: 1910, role: 'scenery' },
    {
      id: 'west-pillar',
      sprite: 'cliff_isolated',
      x: -1980,
      y: 880,
      role: 'scenery',
      footprint: 50,
    },
    {
      id: 'gorge-pillar',
      sprite: 'cliff_isolated',
      x: 1450,
      y: -760,
      role: 'scenery',
      footprint: 50,
      flip: true,
    },
    {
      id: 'east-pillar',
      sprite: 'cliff_isolated',
      x: 2300,
      y: 1250,
      role: 'scenery',
      footprint: 50,
    },
    {
      id: 'outskirts-ger',
      sprite: 'player_ger_small',
      x: -560,
      y: -300,
      role: 'camp-outskirts',
      footprint: 60,
    },
    {
      id: 'outskirts-ger-east',
      sprite: 'player_ger_medium',
      x: 470,
      y: -420,
      role: 'camp-outskirts',
      footprint: 50,
      flip: true,
    },
    { id: 'outskirts-cart', sprite: 'camp_supply_cart', x: 560, y: 330, role: 'camp-outskirts' },
    { id: 'outskirts-canopy', sprite: 'camp_canopy', x: -560, y: 290, role: 'camp-outskirts' },
    { id: 'outskirts-fire', sprite: 'camp_fire', x: -470, y: 420, role: 'camp-outskirts' },
    { id: 'outskirts-rack', sprite: 'wooden_rack', x: -660, y: -150, role: 'camp-outskirts' },
    {
      id: 'outskirts-banner-west',
      sprite: 'blue_camp_banner',
      x: -470,
      y: -470,
      role: 'camp-outskirts',
    },
    {
      id: 'outskirts-banner-east',
      sprite: 'blue_camp_banner',
      x: 560,
      y: -230,
      role: 'camp-outskirts',
      flip: true,
    },
  ],
  groves: [
    {
      x: -2150,
      y: -2050,
      radius: 330,
      count: 11,
      sprites: ['pine_tree', 'autumn_yellow_tree', 'pine_tree'],
    },
    { x: -1150, y: -2250, radius: 260, count: 7, sprites: ['autumn_yellow_tree', 'olive_tree'] },
    {
      x: -50,
      y: -2150,
      radius: 320,
      count: 9,
      sprites: ['pine_tree', 'autumn_red_tree', 'olive_tree'],
    },
    { x: 1350, y: -2200, radius: 320, count: 9, sprites: ['pine_tree', 'autumn_yellow_tree'] },
    { x: 2350, y: -2250, radius: 260, count: 7, sprites: ['pine_tree', 'olive_tree'] },
    { x: 2450, y: -750, radius: 200, count: 5, sprites: ['autumn_yellow_tree', 'pine_tree'] },
    { x: -2300, y: -150, radius: 260, count: 7, sprites: ['pine_tree', 'autumn_red_tree'] },
    {
      x: -2150,
      y: 2050,
      radius: 360,
      count: 10,
      sprites: ['autumn_yellow_tree', 'pine_tree', 'olive_tree'],
    },
    {
      x: 100,
      y: 2300,
      radius: 320,
      count: 8,
      sprites: ['pine_tree', 'autumn_red_tree', 'autumn_yellow_tree'],
    },
    { x: 1250, y: 760, radius: 150, count: 3, sprites: ['autumn_yellow_tree', 'olive_tree'] },
    {
      x: -1000,
      y: -330,
      radius: 150,
      count: 3,
      sprites: ['autumn_yellow_tree', 'autumn_red_tree'],
    },
    { x: 620, y: 720, radius: 140, count: 3, sprites: ['olive_tree', 'bare_tree'] },
    { x: -1750, y: 1350, radius: 200, count: 4, sprites: ['pine_tree', 'autumn_yellow_tree'] },
    { x: 1350, y: -950, radius: 130, count: 3, sprites: ['autumn_red_tree', 'olive_tree'] },
    {
      x: 2350,
      y: 900,
      radius: 260,
      count: 6,
      sprites: ['pine_tree', 'autumn_yellow_tree', 'olive_tree'],
    },
    { x: 2500, y: 1800, radius: 230, count: 5, sprites: ['autumn_red_tree', 'pine_tree'] },
    { x: -400, y: -1150, radius: 140, count: 3, sprites: ['pine_tree', 'bare_tree'] },
  ],
};

/** Landmarks whose ground is solid for movement. */
export const ORKHON_FOOTPRINTS = ORKHON_VALLEY.landmarks.filter(
  (landmark): landmark is OrkhonLandmark & { footprint: number } =>
    'footprint' in landmark && typeof landmark.footprint === 'number',
);

/** Field objectives use these sites, in order, before the generic ring around the camp. */
export const ORKHON_FIELD_SITES: readonly TerrainPoint[] = ORKHON_VALLEY.landmarks
  .filter((landmark) => landmark.role === 'field-site')
  .map(({ x, y }) => ({ x, y }));

/** Ordinary arrivals approach from the direction of these raider camps. */
export const ORKHON_ENEMY_CAMPS: readonly TerrainPoint[] = ORKHON_VALLEY.landmarks
  .filter((landmark) => landmark.role === 'enemy-camp')
  .map(({ x, y }) => ({ x, y }));
