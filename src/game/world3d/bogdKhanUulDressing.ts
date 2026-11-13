import {
  ORKHON_LANDMARK_SCALE,
  ORKHON_PROP_SCALE,
  ORKHON_SPRITE_SCALE,
  ORKHON_SPRITES,
  orkhonAtlasOf,
  type OrkhonSprite,
} from '../assets/orkhonValleyArt';
import {
  BOGD_KHAN_UUL,
  BOGD_KHAN_UUL_FOOTPRINTS,
  type BogdKhanUulLandmark,
} from '../data/bogdKhanUul';
import { terrainSeed } from '../terrain/noise';
import type { TerrainBounds, TerrainPoint } from '../terrain/types';
import type { SceneDressing, SceneProp } from './sceneDressing';

interface Grove {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  count: number;
  larch?: boolean;
}

// Groves frame the play space and southern shoulder while leaving the connected combat floor open.
const GROVES: readonly Grove[] = [
  { x: -2920, y: -780, radiusX: 210, radiusY: 430, count: 25 },
  { x: -2820, y: 420, radiusX: 280, radiusY: 400, count: 24, larch: true },
  { x: -2450, y: 1500, radiusX: 460, radiusY: 250, count: 27 },
  { x: -1650, y: 1650, radiusX: 440, radiusY: 210, count: 25, larch: true },
  { x: -650, y: 1720, radiusX: 430, radiusY: 180, count: 24 },
  { x: 450, y: 1680, radiusX: 430, radiusY: 210, count: 25 },
  { x: 1420, y: 1700, radiusX: 390, radiusY: 210, count: 24, larch: true },
  { x: 2600, y: 1600, radiusX: 390, radiusY: 250, count: 27 },
  { x: 2940, y: 680, radiusX: 210, radiusY: 390, count: 24 },
  { x: 2920, y: -420, radiusX: 220, radiusY: 360, count: 23, larch: true },
  { x: 2780, y: -1240, radiusX: 260, radiusY: 210, count: 19 },
  { x: 1750, y: -1180, radiusX: 330, radiusY: 170, count: 20, larch: true },
  { x: 720, y: -980, radiusX: 360, radiusY: 220, count: 22, larch: true },
  { x: -420, y: -1040, radiusX: 370, radiusY: 200, count: 21 },
  { x: -1450, y: -1080, radiusX: 320, radiusY: 180, count: 20, larch: true },
  { x: -2600, y: -1640, radiusX: 420, radiusY: 120, count: 18 },
  { x: -1450, y: -1780, radiusX: 420, radiusY: 100, count: 18 },
  { x: -250, y: -1760, radiusX: 430, radiusY: 100, count: 19 },
  { x: 980, y: -1780, radiusX: 430, radiusY: 100, count: 19, larch: true },
  { x: 2200, y: -1750, radiusX: 410, radiusY: 110, count: 18 },
  { x: -2050, y: 850, radiusX: 280, radiusY: 190, count: 18 },
  { x: 2450, y: 700, radiusX: 300, radiusY: 180, count: 20 },
];

const PINES: readonly OrkhonSprite[] = ['pine_tree', 'pine_tree', 'pine_tree', 'olive_tree'];
const LARCHES: readonly OrkhonSprite[] = [
  'autumn_yellow_tree',
  'autumn_yellow_tree',
  'autumn_red_tree',
  'pine_tree',
];
const SHRUBS: readonly OrkhonSprite[] = ['shrub_olive', 'shrub_mix', 'shrub_gold'];
const cache = new Map<string | number, readonly SceneDressing[]>();

function segmentDistance(point: TerrainPoint, a: TerrainPoint, b: TerrainPoint): number {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
  );
  return Math.hypot(point.x - a.x - dx * t, point.y - a.y - dy * t);
}

const polylineDistance = (point: TerrainPoint, line: readonly TerrainPoint[]): number =>
  Math.min(...line.slice(1).map((end, index) => segmentDistance(point, line[index]!, end)));

const riverPoints = (): TerrainPoint[] => {
  const points: TerrainPoint[] = [];
  for (let index = 0; index < BOGD_KHAN_UUL.river.course.length; index += 2)
    points.push({
      x: BOGD_KHAN_UUL.river.course[index]!,
      y: BOGD_KHAN_UUL.river.course[index + 1]!,
    });
  return points;
};

/** True when woodland dressing preserves the camp, roads, ramps, Tuul and named sites. */
export function bogdKhanUulDressingClear(point: TerrainPoint, margin = 80): boolean {
  const { minX, minY, width, height, camp, campClearRadius } = BOGD_KHAN_UUL.world;
  if (
    point.x < minX + 55 ||
    point.x > minX + width - 55 ||
    point.y < minY + 55 ||
    point.y > minY + height - 55
  )
    return false;
  if (Math.hypot(point.x - camp.x, point.y - camp.y) < campClearRadius + margin) return false;
  if (
    BOGD_KHAN_UUL.paths.some(
      (path) => polylineDistance(point, path) < BOGD_KHAN_UUL.pathWidth / 2 + margin,
    )
  )
    return false;
  if (
    BOGD_KHAN_UUL.plateaus[0]!.ramps.some(
      (ramp) => segmentDistance(point, ramp.foot, ramp.top) < ramp.shoulder + margin,
    )
  )
    return false;
  if (polylineDistance(point, riverPoints()) < BOGD_KHAN_UUL.river.width / 2 + Math.max(65, margin))
    return false;
  return BOGD_KHAN_UUL_FOOTPRINTS.every(
    (landmark) =>
      Math.hypot(point.x - landmark.x, point.y - landmark.y) >= landmark.footprint + margin,
  );
}

export function bogdKhanUulDressing(seed: string | number, bounds: TerrainBounds): SceneDressing[] {
  let all = cache.get(seed);
  if (!all) {
    all = buildDressing(seed);
    cache.set(seed, all);
  }
  return all.filter(
    (prop) =>
      prop.x >= bounds.x &&
      prop.z >= bounds.y &&
      prop.x < bounds.x + bounds.width &&
      prop.z < bounds.y + bounds.height,
  );
}

function buildDressing(seed: string | number): SceneDressing[] {
  const center = BOGD_KHAN_UUL.world.terrainSize / 2;
  const result: SceneDressing[] = [];
  const random = (key: string) => (offset: number) =>
    terrainSeed(`${seed}:bogd-khan-uul:${key}:${offset}`) / 4294967295;
  const place = (
    sprite: OrkhonSprite,
    x: number,
    y: number,
    kind: SceneProp,
    scale: number,
    flip: boolean,
  ) => {
    const metrics = ORKHON_SPRITES[sprite];
    result.push({
      x: center + x,
      z: center + y,
      kind,
      width: metrics.width * ORKHON_SPRITE_SCALE * scale,
      flip,
      tint: 0xffffff,
      heightScale: 1,
      texture: orkhonAtlasOf(sprite),
      frame: sprite,
      // The batched tree paintings already carry soft ground contact. Only singular landmarks
      // enter the shared shadow map; casting hundreds of alpha-tested tree quads is wasteful.
      shadow: kind === 'landmark',
      originY: metrics.anchorY,
    });
  };
  const occupied = (point: TerrainPoint, separation: number) =>
    result.some(
      (prop) =>
        prop.kind !== 'landmark' &&
        Math.hypot(prop.x - center - point.x, prop.z - center - point.y) < separation,
    );

  for (const landmark of BOGD_KHAN_UUL.landmarks)
    place(
      landmark.sprite,
      landmark.x,
      landmark.y,
      'landmark',
      landmark.scale ?? ORKHON_LANDMARK_SCALE[landmark.sprite] ?? 1,
      landmark.flip ?? false,
    );

  for (const [groveIndex, grove] of GROVES.entries()) {
    const target = Math.ceil(grove.count * 1.3);
    let placed = 0;
    for (let candidate = 0; candidate < target * 12 && placed < target; candidate++) {
      const r = random(`grove:${groveIndex}:${candidate}`);
      const angle = r(1) * Math.PI * 2;
      const radius = Math.sqrt(r(2));
      const point = {
        x: grove.x + Math.cos(angle) * grove.radiusX * radius,
        y: grove.y + Math.sin(angle) * grove.radiusY * radius,
      };
      if (!bogdKhanUulDressingClear(point, 90) || occupied(point, 70)) continue;
      const sprites = grove.larch ? LARCHES : PINES;
      const sprite = sprites[Math.floor(r(3) * sprites.length)]!;
      const kind: SceneProp = sprite === 'pine_tree' ? 'pine' : 'larch';
      place(
        sprite,
        point.x,
        point.y,
        kind,
        ORKHON_PROP_SCALE.tree * (0.95 + r(4) * 0.28),
        r(5) > 0.5,
      );
      placed++;

      if (r(6) > 0.38) {
        const nearby = {
          x: point.x + (r(7) - 0.5) * 130,
          y: point.y + (r(8) - 0.5) * 100,
        };
        if (bogdKhanUulDressingClear(nearby, 72) && !occupied(nearby, 32))
          place(
            SHRUBS[Math.floor(r(9) * SHRUBS.length)]!,
            nearby.x,
            nearby.y,
            'scrub',
            ORKHON_PROP_SCALE.scrub * (0.9 + r(10) * 0.24),
            r(11) > 0.5,
          );
      }
    }
  }

  // Low rock and shrub scatter gives the broad horde floor detail without closing it in.
  for (let row = 0; row < 9; row++)
    for (let column = 0; column < 14; column++) {
      const r = random(`scatter:${column}:${row}`);
      const point = {
        x: -3000 + column * 455 + (r(1) - 0.5) * 280,
        y: -1800 + row * 450 + (r(2) - 0.5) * 260,
      };
      if (!bogdKhanUulDressingClear(point, 72) || occupied(point, 34)) continue;
      const rock = r(3) < 0.38;
      const sprite: OrkhonSprite = rock
        ? r(4) < 0.65
          ? 'loose_pebbles'
          : 'small_boulder'
        : SHRUBS[Math.floor(r(4) * SHRUBS.length)]!;
      place(
        sprite,
        point.x,
        point.y,
        rock ? 'boulders' : 'scrub',
        rock ? 0.65 + r(5) * 0.22 : ORKHON_PROP_SCALE.scrub * (0.88 + r(5) * 0.2),
        r(6) > 0.5,
      );
    }

  return result.sort((a, b) => a.z - b.z || a.x - b.x);
}

export const bogdKhanUulLandmarkAt = (prop: SceneDressing): BogdKhanUulLandmark | undefined => {
  const center = BOGD_KHAN_UUL.world.terrainSize / 2;
  return BOGD_KHAN_UUL.landmarks.find(
    (landmark) => landmark.x + center === prop.x && landmark.y + center === prop.z,
  );
};
