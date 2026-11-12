import type { OrkhonSprite } from '../assets/orkhonValleyArt';
import { ART_SPEC } from './artSpec';
import { terrainSeed } from '../terrain/noise';
import type { TerrainPoint } from '../terrain/types';

/**
 * Authored Orkhon Valley (Ulaan Tsutgalan) level, following the approved manuscript layout.
 * Coordinates are level-centre-relative world units: +x is east and +y is south. The playable
 * battlefield is 6400 by 4000 units. Its 6400-unit terrain square leaves an off-screen band north
 * and south so the existing chunk, elevation and navigation geometry can remain square.
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
  world: {
    width: number;
    height: number;
    terrainSize: number;
    minX: number;
    minY: number;
    /** The live clan camp, relative to the level centre. */
    camp: TerrainPoint;
  };
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
const FALLS = p(2250, -300);

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
    const pieces = Math.floor(length / 240);
    const n = { x: (b.y - a.y) / length, y: -(b.x - a.x) / length };
    for (let k = 1; k < pieces; k++) {
      const t = (k + (random() - 0.5) * 0.5) / pieces;
      const at = p(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
      const step = (k % 2 ? 1 : -1) * (18 + random() * 30);
      if (Math.abs(at.x) > 3250 || Math.abs(at.y) > 2050) continue;
      const offset = keep.some((q) => Math.hypot(q.x - at.x, q.y - at.y) < 330) ? 0 : step;
      result.push(p(Math.round(at.x + n.x * offset), Math.round(at.y + n.y * offset)));
    }
  }
  return { id, outline: result, ramps };
}

export const ORKHON_VALLEY: OrkhonValleyLayout = {
  world: {
    width: 6400,
    height: 4000,
    terrainSize: 6400,
    minX: -3200,
    minY: -2000,
    camp: p(-550, 420),
  },
  rise: RISE,
  plateaus: [
    plateau(
      'spirit-heights',
      [
        p(-3300, -2100),
        p(-1500, -2100),
        p(-1480, -1540),
        p(-1680, -1240),
        p(-2100, -1130),
        p(-2600, -1220),
        p(-3300, -1080),
      ],
      [ramp(p(-1850, -1195), 'west')],
    ),
    plateau(
      'falls-plateau',
      [
        p(900, -2100),
        p(3300, -2100),
        p(3300, 520),
        p(2900, 520),
        p(2660, 300),
        p(2510, -80),
        p(2380, -250),
        FALLS,
        p(2090, -250),
        p(1850, -100),
        p(1600, -300),
        p(1220, -650),
        p(900, -1120),
      ],
      [ramp(p(3000, 520), 'north')],
    ),
    plateau(
      'ruins-shelf',
      [
        p(-3300, -260),
        p(-2450, -360),
        p(-2020, -120),
        p(-1980, 720),
        p(-2260, 1040),
        p(-3300, 1120),
      ],
      [ramp(p(-1994, 430), 'west')],
    ),
    plateau(
      'southwest-shelf',
      [p(-3300, 1420), p(-2450, 1380), p(-2050, 1600), p(-1840, 2100), p(-3300, 2100)],
      [ramp(p(-1987, 1750), 'west')],
    ),
    plateau(
      'southern-outcrops',
      [p(100, 1520), p(980, 1460), p(1260, 1700), p(1320, 2100), p(-80, 2100), p(-180, 1770)],
      [ramp(p(1282, 1850), 'west')],
    ),
    plateau(
      'gorge-shelf',
      [p(1320, 650), p(2140, 560), p(2460, 820), p(2380, 1320), p(1780, 1440), p(1260, 1110)],
      [ramp(p(2000, 1396), 'north')],
    ),
  ],
  river: {
    course: [
      2250, -260, 2050, -380, 1780, -520, 1400, -690, 980, -850, 520, -1050, 20, -1190, -520, -1300,
      -1120, -1420, -1740, -1510, -2380, -1660, -3260, -1830,
    ],
    width: 130,
    rapids: 520,
    /** The crossing sits on the eastern bend below the falls. */
    bridges: [{ x: 520, y: -1050, angle: -Math.PI / 2.7, length: 390, width: 150 }],
  },
  waterfall: FALLS,
  paths: [
    [p(-550, 420), p(-180, 140), p(-500, -360)],
    [p(-550, 420), p(-1000, 400), p(-1500, 420), p(-1823, 454)],
    [p(-550, 420), p(-220, 20), p(80, -420), p(360, -800), p(520, -1050)],
    [p(720, -1030), p(1260, -700), p(1760, -480), p(2150, -320), FALLS],
    [p(-450, 620), p(300, 700), p(1100, 740), p(2000, 720), p(2600, 690), p(2914, 670)],
    [p(-620, 520), p(-980, 930), p(-1550, 1320), p(-1816, 1774)],
    [p(-420, 560), p(180, 820), p(900, 1050), p(1500, 1280), p(1700, 1600), p(1453, 1874)],
    [p(-660, 260), p(-1050, -180), p(-1500, -720), p(-1679, -1171)],
    [
      p(-350, 600),
      p(200, 500),
      p(900, 400),
      p(1500, 300),
      p(2300, 450),
      p(2700, 900),
      p(2600, 1600),
      p(1914, 1546),
    ],
  ],
  pathWidth: 46,
  landmarks: [
    {
      id: 'northwest-raiders',
      sprite: 'enemy_camp_palisade',
      x: -2650,
      y: -1900,
      role: 'enemy-camp',
      footprint: 115,
    },
    {
      id: 'northeast-raiders',
      sprite: 'enemy_camp_tents',
      x: 2700,
      y: -1420,
      role: 'enemy-camp',
      footprint: 115,
    },
    {
      id: 'southwest-raiders',
      sprite: 'enemy_camp_ger',
      x: -2600,
      y: 1740,
      role: 'enemy-camp',
      footprint: 115,
    },
    {
      id: 'southeast-raiders',
      sprite: 'enemy_camp_palisade',
      x: 2050,
      y: 1080,
      role: 'enemy-camp',
      footprint: 115,
      flip: true,
    },
    {
      id: 'ancient-ruins',
      sprite: 'stone_ruins',
      x: -2450,
      y: 450,
      role: 'field-site',
      footprint: 95,
    },
    {
      id: 'sacred-ovoo',
      sprite: 'sacred_ovoo',
      x: -500,
      y: -360,
      role: 'field-site',
      footprint: 120,
    },
    {
      id: 'spirit-grove-fire',
      sprite: 'relic_fire',
      x: -2450,
      y: -850,
      role: 'field-site',
      footprint: 40,
    },
    {
      id: 'spirit-grove-stone',
      sprite: 'relic_fire',
      x: -2250,
      y: -930,
      role: 'shrine',
      footprint: 40,
    },
    {
      id: 'spirit-stone-west',
      sprite: 'standing_stone',
      x: -2580,
      y: -910,
      role: 'shrine',
      footprint: 30,
    },
    {
      id: 'spirit-stone-east',
      sprite: 'standing_stone',
      x: -2310,
      y: -980,
      role: 'shrine',
      footprint: 30,
      flip: true,
    },
    {
      id: 'ruins-standing-stone',
      sprite: 'standing_stone',
      x: -2320,
      y: 560,
      role: 'shrine',
      footprint: 30,
    },
    { id: 'northwest-banner', sprite: 'red_enemy_banner', x: -2470, y: -1950, role: 'scenery' },
    { id: 'northwest-rack', sprite: 'spear_rack', x: -2820, y: -1940, role: 'scenery' },
    { id: 'northeast-banner', sprite: 'red_enemy_banner', x: 2520, y: -1310, role: 'scenery' },
    { id: 'southwest-banner', sprite: 'red_enemy_banner', x: -2420, y: 1840, role: 'scenery' },
    { id: 'southwest-rack', sprite: 'spear_rack', x: -2780, y: 1850, role: 'scenery' },
    { id: 'southeast-banner', sprite: 'red_enemy_banner', x: 1870, y: 1180, role: 'scenery' },
    { id: 'southeast-rack', sprite: 'wooden_rack', x: 2230, y: 1190, role: 'scenery' },
    {
      id: 'west-pillar',
      sprite: 'landmark_basalt_pillar',
      x: -1880,
      y: 820,
      role: 'scenery',
      footprint: 50,
    },
    {
      id: 'gorge-pillar',
      sprite: 'landmark_basalt_pillar',
      x: 2600,
      y: -80,
      role: 'scenery',
      footprint: 50,
    },
    {
      id: 'east-pillar',
      sprite: 'landmark_basalt_pillar',
      x: 2380,
      y: 1380,
      role: 'scenery',
      footprint: 50,
    },
    // Sacred stones on gravel islets in the river, on its course; the water is already impassable.
    { id: 'river-islet-east', sprite: 'prop_river_islet', x: 1400, y: -690, role: 'scenery' },
    { id: 'river-islet-west', sprite: 'prop_river_islet', x: -520, y: -1300, role: 'scenery' },
    {
      id: 'outskirts-ger',
      sprite: 'player_ger_small',
      x: -960,
      y: 250,
      role: 'camp-outskirts',
      footprint: 60,
    },
    {
      id: 'outskirts-ger-east',
      sprite: 'player_ger_medium',
      x: -180,
      y: 120,
      role: 'camp-outskirts',
      footprint: 50,
      flip: true,
    },
    { id: 'outskirts-cart', sprite: 'camp_supply_cart', x: -20, y: 720, role: 'camp-outskirts' },
    { id: 'outskirts-canopy', sprite: 'camp_canopy', x: -1080, y: 700, role: 'camp-outskirts' },
    { id: 'outskirts-fire', sprite: 'camp_fire', x: -920, y: 820, role: 'camp-outskirts' },
    { id: 'outskirts-rack', sprite: 'wooden_rack', x: -1120, y: 400, role: 'camp-outskirts' },
    {
      id: 'outskirts-banner-west',
      sprite: 'blue_camp_banner',
      x: -930,
      y: 20,
      role: 'camp-outskirts',
    },
    {
      id: 'outskirts-banner-east',
      sprite: 'blue_camp_banner',
      x: -40,
      y: 300,
      role: 'camp-outskirts',
      flip: true,
    },
  ],
  groves: [
    {
      x: -2450,
      y: -850,
      radius: 420,
      count: 16,
      sprites: ['pine_tree', 'autumn_yellow_tree', 'pine_tree'],
    },
    { x: -1550, y: -1750, radius: 260, count: 7, sprites: ['autumn_yellow_tree', 'olive_tree'] },
    {
      x: -450,
      y: -1650,
      radius: 320,
      count: 9,
      sprites: ['pine_tree', 'autumn_red_tree', 'olive_tree'],
    },
    { x: 1150, y: -1650, radius: 320, count: 9, sprites: ['pine_tree', 'autumn_yellow_tree'] },
    { x: 2550, y: -1650, radius: 260, count: 7, sprites: ['pine_tree', 'olive_tree'] },
    { x: 2720, y: -620, radius: 200, count: 5, sprites: ['autumn_yellow_tree', 'pine_tree'] },
    { x: -2750, y: 200, radius: 260, count: 7, sprites: ['pine_tree', 'autumn_red_tree'] },
    {
      x: -2650,
      y: 1650,
      radius: 360,
      count: 10,
      sprites: ['autumn_yellow_tree', 'pine_tree', 'olive_tree'],
    },
    {
      x: 450,
      y: 1700,
      radius: 320,
      count: 8,
      sprites: ['pine_tree', 'autumn_red_tree', 'autumn_yellow_tree'],
    },
    { x: 1450, y: 820, radius: 150, count: 3, sprites: ['autumn_yellow_tree', 'olive_tree'] },
    {
      x: -1300,
      y: -420,
      radius: 150,
      count: 3,
      sprites: ['autumn_yellow_tree', 'autumn_red_tree'],
    },
    { x: 520, y: 760, radius: 140, count: 3, sprites: ['olive_tree', 'bare_tree'] },
    { x: -1850, y: 1250, radius: 200, count: 4, sprites: ['pine_tree', 'autumn_yellow_tree'] },
    { x: 1350, y: -1050, radius: 130, count: 3, sprites: ['autumn_red_tree', 'olive_tree'] },
    {
      x: 2550,
      y: 900,
      radius: 260,
      count: 6,
      sprites: ['pine_tree', 'autumn_yellow_tree', 'olive_tree'],
    },
    { x: 2650, y: 1650, radius: 230, count: 5, sprites: ['autumn_red_tree', 'pine_tree'] },
    { x: -250, y: -1250, radius: 140, count: 3, sprites: ['pine_tree', 'bare_tree'] },
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
