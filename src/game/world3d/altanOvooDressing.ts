import {
  ORKHON_LANDMARK_SCALE,
  ORKHON_PROP_SCALE,
  ORKHON_SPRITE_SCALE,
  ORKHON_SPRITES,
  orkhonAtlasOf,
  type OrkhonSprite,
} from '../assets/orkhonValleyArt';
import { ALTAN_OVOO, ALTAN_OVOO_FOOTPRINTS, type AltanOvooLandmark } from '../data/altanOvoo';
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
}

const ROCK_CLUSTERS: readonly Cluster[] = [
  { x: -1860, y: -1320, radiusX: 310, radiusY: 150, count: 17, tier: 'upper' },
  { x: -870, y: -1580, radiusX: 330, radiusY: 130, count: 16, tier: 'upper' },
  { x: 360, y: -1570, radiusX: 360, radiusY: 140, count: 18, tier: 'upper' },
  { x: 1420, y: -1120, radiusX: 360, radiusY: 160, count: 19, tier: 'upper' },
  { x: 1920, y: -420, radiusX: 250, radiusY: 180, count: 15, tier: 'upper' },
  { x: 540, y: 220, radiusX: 350, radiusY: 130, count: 16, tier: 'upper' },
  { x: -1880, y: -260, radiusX: 270, radiusY: 160, count: 15, tier: 'upper' },
  { x: -2880, y: -1020, radiusX: 220, radiusY: 330, count: 16, tier: 'lower' },
  { x: -2840, y: 820, radiusX: 260, radiusY: 250, count: 16, tier: 'lower' },
  { x: 2800, y: -850, radiusX: 220, radiusY: 350, count: 18, tier: 'lower' },
  { x: 2860, y: 420, radiusX: 220, radiusY: 300, count: 16, tier: 'lower' },
  { x: 420, y: 1580, radiusX: 520, radiusY: 150, count: 20, tier: 'lower' },
  { x: 2480, y: 1510, radiusX: 380, radiusY: 150, count: 17, tier: 'lower' },
];

const AUTUMN_CLUSTERS: readonly Cluster[] = [
  { x: -1660, y: -1110, radiusX: 250, radiusY: 190, count: 12, tier: 'upper' },
  { x: -850, y: -1030, radiusX: 260, radiusY: 180, count: 11, tier: 'upper' },
  { x: 390, y: -1190, radiusX: 270, radiusY: 180, count: 12, tier: 'upper' },
  { x: 1260, y: -620, radiusX: 250, radiusY: 210, count: 11, tier: 'upper' },
  { x: 720, y: 70, radiusX: 290, radiusY: 170, count: 12, tier: 'upper' },
  { x: -1900, y: 0, radiusX: 210, radiusY: 170, count: 9, tier: 'upper' },
  { x: -2890, y: 940, radiusX: 210, radiusY: 220, count: 9, tier: 'lower' },
  { x: -930, y: 1490, radiusX: 310, radiusY: 170, count: 11, tier: 'lower' },
  { x: 800, y: 1370, radiusX: 320, radiusY: 190, count: 12, tier: 'lower' },
  { x: 2620, y: 250, radiusX: 210, radiusY: 260, count: 10, tier: 'lower' },
  { x: 2700, y: 1450, radiusX: 240, radiusY: 170, count: 9, tier: 'lower' },
];

const ROCKS: readonly OrkhonSprite[] = [
  'prop_cliff_scree',
  'small_boulder',
  'loose_pebbles',
  'small_boulder',
];
const TREES: readonly OrkhonSprite[] = [
  'autumn_yellow_tree',
  'autumn_red_tree',
  'olive_tree',
  'bare_tree',
];
const SHRUBS: readonly OrkhonSprite[] = ['shrub_gold', 'shrub_mix', 'shrub_olive', 'shrub_gold'];
const cone = ALTAN_OVOO.plateaus[0]!;
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

const streamPoints = (): TerrainPoint[] => {
  const points: TerrainPoint[] = [];
  for (let index = 0; index < ALTAN_OVOO.spring.stream.course.length; index += 2)
    points.push({
      x: ALTAN_OVOO.spring.stream.course[index]!,
      y: ALTAN_OVOO.spring.stream.course[index + 1]!,
    });
  return points;
};

/** True when visual dressing leaves the level's movement and combat space unobstructed. */
export function altanOvooDressingClear(point: TerrainPoint, margin = 80): boolean {
  const { minX, minY, width, height, camp, campClearRadius } = ALTAN_OVOO.world;
  if (
    point.x < minX + 60 ||
    point.x > minX + width - 60 ||
    point.y < minY + 60 ||
    point.y > minY + height - 60
  )
    return false;
  if (Math.hypot(point.x - camp.x, point.y - camp.y) < campClearRadius + margin) return false;
  if (
    ALTAN_OVOO.paths.some(
      (path) => polylineDistance(point, path) < ALTAN_OVOO.pathWidth / 2 + margin,
    )
  )
    return false;
  if (
    cone.ramps.some((ramp) => segmentDistance(point, ramp.foot, ramp.top) < ramp.shoulder + margin)
  )
    return false;
  if (
    Math.hypot(point.x - ALTAN_OVOO.spring.centre.x, point.y - ALTAN_OVOO.spring.centre.y) <
    ALTAN_OVOO.spring.radius + margin
  )
    return false;
  if (
    polylineDistance(point, streamPoints()) <
    ALTAN_OVOO.spring.stream.width / 2 + Math.max(55, margin)
  )
    return false;
  return ALTAN_OVOO_FOOTPRINTS.every(
    (landmark) =>
      Math.hypot(point.x - landmark.x, point.y - landmark.y) >= landmark.footprint + margin,
  );
}

/**
 * Dense manuscript-style volcanic dressing, built globally before chunk clipping so camera-chunk
 * boundaries cannot change a cluster. Coordinates returned to the renderer are terrain-relative.
 */
export function altanOvooDressing(seed: string | number, bounds: TerrainBounds): SceneDressing[] {
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
  const center = ALTAN_OVOO.world.terrainSize / 2;
  const result: SceneDressing[] = [];
  const random = (key: string) => (offset: number) =>
    terrainSeed(`${seed}:altan-ovoo:${key}:${offset}`) / 4294967295;
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
      shadow: kind === 'larch' || kind === 'landmark' || kind === 'crag',
      originY: metrics.anchorY,
    });
  };
  const tierMatches = (cluster: Cluster, point: TerrainPoint) => {
    const field = outlineField(cone.outline, point.x, point.y);
    return cluster.tier === 'upper' ? field > 80 : field < -80;
  };
  const occupied = (point: TerrainPoint, kind: SceneProp) =>
    result.some((prop) => {
      if (prop.kind === 'landmark') return false;
      const separation = kind === 'larch' && prop.kind === 'larch' ? 72 : 34;
      return Math.hypot(prop.x - center - point.x, prop.z - center - point.y) < separation;
    });

  for (const landmark of ALTAN_OVOO.landmarks) {
    const scale = landmark.scale ?? ORKHON_LANDMARK_SCALE[landmark.sprite] ?? 1;
    place(landmark.sprite, landmark.x, landmark.y, 'landmark', scale, landmark.flip ?? false);
  }

  for (const [clusterIndex, cluster] of ROCK_CLUSTERS.entries()) {
    let placed = 0;
    for (let candidate = 0; candidate < cluster.count * 5 && placed < cluster.count; candidate++) {
      const r = random(`rock:${clusterIndex}:${candidate}`);
      const angle = r(1) * Math.PI * 2;
      const radius = Math.sqrt(r(2));
      const point = {
        x: cluster.x + Math.cos(angle) * cluster.radiusX * radius,
        y: cluster.y + Math.sin(angle) * cluster.radiusY * radius,
      };
      if (!tierMatches(cluster, point) || !altanOvooDressingClear(point, 86)) continue;
      const pillar = placed === 0 && r(3) > 0.45;
      const sprite = pillar ? 'landmark_basalt_pillar' : ROCKS[Math.floor(r(4) * ROCKS.length)]!;
      const kind: SceneProp = pillar ? 'crag' : 'boulders';
      if (occupied(point, kind)) continue;
      const base = pillar
        ? 0.42 + r(5) * 0.12
        : sprite === 'prop_cliff_scree'
          ? ORKHON_PROP_SCALE.scree * (0.86 + r(5) * 0.24)
          : 0.5 * (0.88 + r(5) * 0.28);
      place(sprite, point.x, point.y, kind, base, r(6) > 0.5);
      placed++;
    }
  }

  for (const [clusterIndex, cluster] of AUTUMN_CLUSTERS.entries()) {
    let placed = 0;
    for (let candidate = 0; candidate < cluster.count * 6 && placed < cluster.count; candidate++) {
      const r = random(`autumn:${clusterIndex}:${candidate}`);
      const angle = r(1) * Math.PI * 2;
      const radius = Math.sqrt(r(2));
      const point = {
        x: cluster.x + Math.cos(angle) * cluster.radiusX * radius,
        y: cluster.y + Math.sin(angle) * cluster.radiusY * radius,
      };
      const tree = r(3) < 0.64;
      const kind: SceneProp = tree ? 'larch' : 'scrub';
      if (
        !tierMatches(cluster, point) ||
        !altanOvooDressingClear(point, tree ? 105 : 82) ||
        occupied(point, kind)
      )
        continue;
      const sprite = tree
        ? TREES[Math.floor(r(4) * TREES.length)]!
        : SHRUBS[Math.floor(r(4) * SHRUBS.length)]!;
      const scale = tree
        ? ORKHON_PROP_SCALE.tree * (0.88 + r(5) * 0.2)
        : ORKHON_PROP_SCALE.scrub * (0.9 + r(5) * 0.2);
      place(sprite, point.x, point.y, kind, scale, r(6) > 0.5);
      placed++;
    }
  }

  return result.sort((a, b) => a.z - b.z || a.x - b.x);
}

/** Landmark entries retain their authored semantic roles for later systems integration. */
export const altanOvooLandmarkAt = (prop: SceneDressing): AltanOvooLandmark | undefined => {
  const center = ALTAN_OVOO.world.terrainSize / 2;
  return ALTAN_OVOO.landmarks.find(
    (landmark) => landmark.x + center === prop.x && landmark.y + center === prop.z,
  );
};
