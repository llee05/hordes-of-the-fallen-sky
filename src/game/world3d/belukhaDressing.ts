import { BELUKHA } from '../data/belukha';
import { terrainSeed } from '../terrain/noise';
import type { TerrainBounds, TerrainPoint } from '../terrain/types';
import type { SceneDressing, SceneProp } from './sceneDressing';

interface Cluster {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  count: number;
  kind: 'pine' | 'larch' | 'rock';
}

const CLUSTERS: readonly Cluster[] = [
  { x: -2860, y: -820, radiusX: 240, radiusY: 470, count: 18, kind: 'pine' },
  { x: -2550, y: 350, radiusX: 330, radiusY: 360, count: 17, kind: 'larch' },
  { x: -2920, y: 1500, radiusX: 210, radiusY: 300, count: 13, kind: 'pine' },
  { x: -800, y: 1740, radiusX: 520, radiusY: 130, count: 14, kind: 'larch' },
  { x: 410, y: 1720, radiusX: 500, radiusY: 130, count: 14, kind: 'pine' },
  { x: 2780, y: -590, radiusX: 290, radiusY: 390, count: 19, kind: 'larch' },
  { x: 2920, y: 620, radiusX: 210, radiusY: 340, count: 15, kind: 'pine' },
  { x: 2700, y: 1480, radiusX: 280, radiusY: 260, count: 13, kind: 'larch' },
  { x: -2150, y: -980, radiusX: 500, radiusY: 170, count: 24, kind: 'rock' },
  { x: 50, y: -1240, radiusX: 650, radiusY: 130, count: 28, kind: 'rock' },
  { x: 2200, y: -1040, radiusX: 500, radiusY: 160, count: 22, kind: 'rock' },
  { x: 1720, y: 1600, radiusX: 440, radiusY: 140, count: 18, kind: 'rock' },
];

const cache = new Map<string | number, readonly SceneDressing[]>();

function segmentDistance(point: TerrainPoint, a: TerrainPoint, b: TerrainPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
  );
  return Math.hypot(point.x - a.x - dx * t, point.y - a.y - dy * t);
}

const polylineDistance = (point: TerrainPoint, line: readonly TerrainPoint[]): number =>
  Math.min(...line.slice(1).map((end, index) => segmentDistance(point, line[index]!, end)));

const waterPoints = (): TerrainPoint[] => {
  const points: TerrainPoint[] = [];
  for (let index = 0; index < BELUKHA.water.course.length; index += 2)
    points.push({ x: BELUKHA.water.course[index]!, y: BELUKHA.water.course[index + 1]! });
  return points;
};

/** Keeps authored scenery outside the camp, roads, ramps and glacial water. */
export function belukhaDressingClear(point: TerrainPoint, margin = 80): boolean {
  const { minX, minY, width, height, camp, campClearRadius } = BELUKHA.world;
  if (
    point.x < minX + 60 ||
    point.x > minX + width - 60 ||
    point.y < minY + 60 ||
    point.y > minY + height - 60
  )
    return false;
  if (Math.hypot(point.x - camp.x, point.y - camp.y) < campClearRadius + margin) return false;
  if (BELUKHA.paths.some((path) => polylineDistance(point, path) < BELUKHA.pathWidth / 2 + margin))
    return false;
  if (
    BELUKHA.plateaus
      .flatMap((plateau) => plateau.ramps)
      .some((ramp) => segmentDistance(point, ramp.foot, ramp.top) < ramp.shoulder + margin)
  )
    return false;
  const pool = BELUKHA.water.sourcePool;
  if (Math.hypot(point.x - pool.x, point.y - pool.y) < pool.radius + margin) return false;
  return polylineDistance(point, waterPoints()) >= BELUKHA.water.width / 2 + Math.max(65, margin);
}

/** Deterministic conifer margins, moraine stone and landmark silhouettes for the authored valley. */
export function belukhaDressing(seed: string | number, bounds: TerrainBounds): SceneDressing[] {
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
  const center = BELUKHA.world.terrainSize / 2;
  const result: SceneDressing[] = [];
  const random = (key: string) => (offset: number) =>
    terrainSeed(`${seed}:belukha:${key}:${offset}`) / 4294967295;
  const place = (
    point: TerrainPoint,
    kind: SceneProp,
    texture: string,
    frame: string,
    width: number,
    flip = false,
    shadow = true,
    originY = 0.9,
  ) =>
    result.push({
      x: center + point.x,
      z: center + point.y,
      kind,
      width,
      flip,
      tint: 0xffffff,
      heightScale: 1,
      texture,
      frame,
      shadow,
      originY,
    });

  place({ x: 0, y: -1760 }, 'landmark', 'steppe-scenery', 'twin-summit', 1260, false, true, 0.86);
  place({ x: -650, y: -1430 }, 'landmark', 'steppe-scenery', 'glacier', 420, false, false);
  place({ x: 650, y: -1450 }, 'landmark', 'steppe-scenery', 'glacier', 440, true, false);

  for (const [clusterIndex, cluster] of CLUSTERS.entries()) {
    let placed = 0;
    for (let candidate = 0; candidate < cluster.count * 8 && placed < cluster.count; candidate++) {
      const r = random(`${clusterIndex}:${candidate}`);
      const angle = r(1) * Math.PI * 2;
      const radius = Math.sqrt(r(2));
      const point = {
        x: cluster.x + Math.cos(angle) * cluster.radiusX * radius,
        y: cluster.y + Math.sin(angle) * cluster.radiusY * radius,
      };
      if (!belukhaDressingClear(point, cluster.kind === 'rock' ? 72 : 94)) continue;
      if (
        result.some(
          (other) =>
            other.kind !== 'landmark' &&
            Math.hypot(other.x - center - point.x, other.z - center - point.y) <
              (cluster.kind === 'rock' ? 34 : 70),
        )
      )
        continue;
      if (cluster.kind === 'rock')
        place(
          point,
          r(3) > 0.7 ? 'boulders' : 'pebbles',
          r(3) > 0.7 ? 'tapestry-scenery' : 'steppe-ground-details',
          r(3) > 0.7 ? 'boulder' : 'pebbles',
          30 + r(4) * 55,
          r(5) > 0.5,
          false,
        );
      else
        place(
          point,
          cluster.kind,
          'tapestry-scenery',
          cluster.kind,
          100 + r(4) * 55,
          r(5) > 0.5,
          true,
        );
      placed++;
    }
  }
  return result.sort((a, b) => a.z - b.z || a.x - b.x);
}
