import {
  ORKHON_LANDMARK_SCALE,
  ORKHON_PROP_SCALE,
  ORKHON_SPRITE_SCALE,
  ORKHON_SPRITES,
  orkhonAtlasOf,
  type OrkhonSprite,
} from '../assets/orkhonValleyArt';
import { OTGONTENGER, OTGONTENGER_FOOTPRINTS, type OtgontengerLandmark } from '../data/otgontenger';
import { terrainSeed } from '../terrain/noise';
import type { TerrainBounds, TerrainPoint } from '../terrain/types';
import { outlineField } from './ComposedTerrain';
import type { SceneDressing, SceneProp } from './sceneDressing';

interface Cluster {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  count: number;
  tier: 'lower' | 'upper';
  kind: 'rock' | 'larch';
}

const CLUSTERS: readonly Cluster[] = [
  // Cliff-foot moraine and upper-bench rock fields frame the two ramps and overlooks.
  { x: -2700, y: -720, radiusX: 360, radiusY: 170, count: 18, tier: 'lower', kind: 'rock' },
  { x: -1050, y: -620, radiusX: 390, radiusY: 130, count: 20, tier: 'lower', kind: 'rock' },
  { x: 250, y: -500, radiusX: 410, radiusY: 120, count: 20, tier: 'lower', kind: 'rock' },
  { x: 2050, y: -650, radiusX: 420, radiusY: 150, count: 20, tier: 'lower', kind: 'rock' },
  { x: -2500, y: -1450, radiusX: 420, radiusY: 170, count: 18, tier: 'upper', kind: 'rock' },
  { x: -850, y: -1650, radiusX: 430, radiusY: 130, count: 18, tier: 'upper', kind: 'rock' },
  { x: 700, y: -1650, radiusX: 450, radiusY: 140, count: 18, tier: 'upper', kind: 'rock' },
  { x: 2350, y: -1450, radiusX: 430, radiusY: 170, count: 18, tier: 'upper', kind: 'rock' },
  { x: -2920, y: 1600, radiusX: 250, radiusY: 180, count: 15, tier: 'lower', kind: 'rock' },
  { x: 2950, y: 1660, radiusX: 260, radiusY: 160, count: 15, tier: 'lower', kind: 'rock' },
  // Sparse larch follows the western hollow and tarn outflow, away from the central arena.
  { x: -2770, y: 1210, radiusX: 380, radiusY: 310, count: 24, tier: 'lower', kind: 'larch' },
  { x: -3020, y: 250, radiusX: 170, radiusY: 320, count: 12, tier: 'lower', kind: 'larch' },
  { x: 2990, y: 920, radiusX: 180, radiusY: 390, count: 16, tier: 'lower', kind: 'larch' },
];

const ROCKS: readonly OrkhonSprite[] = [
  'prop_cliff_scree',
  'small_boulder',
  'loose_pebbles',
  'small_boulder',
];
const SHRUBS: readonly OrkhonSprite[] = [
  'shrub_olive',
  'shrub_green',
  'white_wildflowers',
  'shrub_mix',
];
const bench = OTGONTENGER.plateaus[0]!;
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

const outflowPoints = (): TerrainPoint[] => {
  const points: TerrainPoint[] = [];
  for (let index = 0; index < OTGONTENGER.tarn.outflow.course.length; index += 2)
    points.push({
      x: OTGONTENGER.tarn.outflow.course[index]!,
      y: OTGONTENGER.tarn.outflow.course[index + 1]!,
    });
  return points;
};

/** True when visual dressing leaves the camp, routes, ramps, tarn and combat floor clear. */
export function otgontengerDressingClear(point: TerrainPoint, margin = 80): boolean {
  const { minX, minY, width, height, camp, campClearRadius } = OTGONTENGER.world;
  if (
    point.x < minX + 55 ||
    point.x > minX + width - 55 ||
    point.y < minY + 55 ||
    point.y > minY + height - 55
  )
    return false;
  if (Math.hypot(point.x - camp.x, point.y - camp.y) < campClearRadius + margin) return false;
  if (
    OTGONTENGER.paths.some(
      (path) => polylineDistance(point, path) < OTGONTENGER.pathWidth / 2 + margin,
    )
  )
    return false;
  if (
    bench.ramps.some((ramp) => segmentDistance(point, ramp.foot, ramp.top) < ramp.shoulder + margin)
  )
    return false;
  const pool = OTGONTENGER.tarn.outflow.sourcePool;
  if (Math.hypot(point.x - pool.x, point.y - pool.y) < pool.radius + margin) return false;
  if (
    polylineDistance(point, outflowPoints()) <
    OTGONTENGER.tarn.outflow.width / 2 + Math.max(50, margin)
  )
    return false;
  return OTGONTENGER_FOOTPRINTS.every(
    (landmark) =>
      Math.hypot(point.x - landmark.x, point.y - landmark.y) >= landmark.footprint + margin,
  );
}

/** Global deterministic dressing, clipped only after complete clusters have been built. */
export function otgontengerDressing(seed: string | number, bounds: TerrainBounds): SceneDressing[] {
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
  const center = OTGONTENGER.world.terrainSize / 2;
  const result: SceneDressing[] = [];
  const random = (key: string) => (offset: number) =>
    terrainSeed(`${seed}:otgontenger:${key}:${offset}`) / 4294967295;
  const place = (
    sprite: OrkhonSprite,
    x: number,
    y: number,
    kind: SceneProp,
    scale: number,
    flip: boolean,
    site?: SceneDressing['site'],
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
      shadow: kind === 'landmark' || kind === 'crag',
      originY: metrics.anchorY,
      ...(site ? { site } : {}),
    });
  };
  const placeRegional = (
    frame: 'larch' | 'foothill' | 'snow-dome',
    x: number,
    y: number,
    width: number,
    flip: boolean,
    kind: SceneProp,
  ) =>
    result.push({
      x: center + x,
      z: center + y,
      kind,
      width,
      flip,
      tint: 0xffffff,
      heightScale: 1,
      texture: 'steppe-scenery',
      frame,
      shadow: frame !== 'snow-dome',
      originY: 0.9,
    });
  const occupied = (point: TerrainPoint, kind: SceneProp) =>
    result.some((prop) => {
      if (prop.kind === 'landmark' || prop.frame === 'snow-dome') return false;
      const separation = kind === 'larch' && prop.kind === 'larch' ? 82 : 36;
      return Math.hypot(prop.x - center - point.x, prop.z - center - point.y) < separation;
    });

  // Existing mountain cutouts make the sacred summit a distant frame, never a walkable site.
  placeRegional('snow-dome', -1780, -1910, 540, false, 'crag');
  placeRegional('snow-dome', -180, -1950, 680, false, 'crag');
  placeRegional('snow-dome', 1650, -1900, 530, true, 'crag');
  placeRegional('foothill', -2900, -1740, 520, false, 'crag');
  placeRegional('foothill', 2860, -1710, 540, true, 'crag');

  for (const landmark of OTGONTENGER.landmarks) {
    const scale = landmark.scale ?? ORKHON_LANDMARK_SCALE[landmark.sprite] ?? 1;
    place(landmark.sprite, landmark.x, landmark.y, 'landmark', scale, landmark.flip ?? false);
  }

  // Pale stones and low meadow growth articulate the tarn without closing its western approach.
  const bankStones: readonly TerrainPoint[] = [
    { x: 2010, y: 300 },
    { x: 2110, y: 190 },
    { x: 2380, y: 180 },
    { x: 2500, y: 270 },
    { x: 2540, y: 500 },
    { x: 2470, y: 690 },
    { x: 2180, y: 750 },
  ];
  for (const [index, point] of bankStones.entries())
    place(
      index % 3 ? 'loose_pebbles' : 'small_boulder',
      point.x,
      point.y,
      'boulders',
      index % 3 ? 0.8 : 0.58,
      random(`tarn-stone:${index}`)(1) > 0.5,
      'tarn-bank',
    );

  // Sparse all-map accents keep the ground alive while preserving the deliberately open meadow.
  const scatterStep = 480;
  for (let row = 0; row * scatterStep < OTGONTENGER.world.height - 300; row++)
    for (let column = 0; column * scatterStep < OTGONTENGER.world.width - 300; column++) {
      const r = random(`scatter:${column}:${row}`);
      const point = {
        x: OTGONTENGER.world.minX + 150 + column * scatterStep + (r(1) - 0.5) * 390,
        y: OTGONTENGER.world.minY + 150 + row * scatterStep + (r(2) - 0.5) * 390,
      };
      if (!otgontengerDressingClear(point, 100)) continue;
      const sprite = r(3) < 0.42 ? 'small_boulder' : SHRUBS[Math.floor(r(4) * SHRUBS.length)]!;
      const kind: SceneProp = sprite === 'small_boulder' ? 'boulders' : 'scrub';
      if (occupied(point, kind)) continue;
      place(
        sprite,
        point.x,
        point.y,
        kind,
        sprite === 'small_boulder'
          ? 0.52 + r(5) * 0.16
          : ORKHON_PROP_SCALE.scrub * (0.9 + r(5) * 0.2),
        r(6) > 0.5,
      );
    }

  for (const [clusterIndex, cluster] of CLUSTERS.entries()) {
    let placed = 0;
    for (let candidate = 0; candidate < cluster.count * 10 && placed < cluster.count; candidate++) {
      const r = random(`cluster:${clusterIndex}:${candidate}`);
      const angle = r(1) * Math.PI * 2;
      const radius = Math.sqrt(r(2));
      const point = {
        x: cluster.x + Math.cos(angle) * cluster.radiusX * radius,
        y: cluster.y + Math.sin(angle) * cluster.radiusY * radius,
      };
      const field = outlineField(bench.outline, point.x, point.y);
      if (
        (cluster.tier === 'upper' ? field < 80 : field > -80) ||
        !otgontengerDressingClear(point, cluster.kind === 'larch' ? 95 : 82)
      )
        continue;
      const kind: SceneProp = cluster.kind === 'larch' ? 'larch' : 'boulders';
      if (occupied(point, kind)) continue;
      if (cluster.kind === 'larch') {
        placeRegional('larch', point.x, point.y, 92 + r(3) * 34, r(4) > 0.5, 'larch');
      } else {
        const sprite = ROCKS[Math.floor(r(3) * ROCKS.length)]!;
        const scale =
          sprite === 'prop_cliff_scree'
            ? ORKHON_PROP_SCALE.scree * (0.95 + r(4) * 0.28)
            : 0.55 + r(4) * 0.22;
        place(sprite, point.x, point.y, 'boulders', scale, r(5) > 0.5);
      }
      placed++;
    }
  }

  return result.sort((a, b) => a.z - b.z || a.x - b.x);
}

/** Landmark entries retain their authored semantic roles for later systems integration. */
export const otgontengerLandmarkAt = (prop: SceneDressing): OtgontengerLandmark | undefined => {
  const center = OTGONTENGER.world.terrainSize / 2;
  return OTGONTENGER.landmarks.find(
    (landmark) => landmark.x + center === prop.x && landmark.y + center === prop.z,
  );
};
