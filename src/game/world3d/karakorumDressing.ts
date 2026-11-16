import {
  ORKHON_LANDMARK_SCALE,
  ORKHON_PROP_SCALE,
  ORKHON_SPRITE_SCALE,
  ORKHON_SPRITES,
  orkhonAtlasOf,
  type OrkhonSprite,
} from '../assets/orkhonValleyArt';
import { KARAKORUM, KARAKORUM_FOOTPRINTS, type KarakorumLandmark } from '../data/karakorum';
import { terrainSeed } from '../terrain/noise';
import type { TerrainBounds, TerrainPoint } from '../terrain/types';
import type { SceneDressing, SceneProp } from './sceneDressing';

const TREES: readonly OrkhonSprite[] = [
  'olive_tree',
  'autumn_yellow_tree',
  'olive_tree',
  'bare_tree',
];
const SHRUBS: readonly OrkhonSprite[] = [
  'shrub_olive',
  'shrub_green',
  'shrub_mix',
  'white_wildflowers',
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

const riverPoints = (): TerrainPoint[] => {
  const points: TerrainPoint[] = [];
  for (let index = 0; index < KARAKORUM.river.course.length; index += 2)
    points.push({
      x: KARAKORUM.river.course[index]!,
      y: KARAKORUM.river.course[index + 1]!,
    });
  return points;
};

/** True when ambient dressing leaves the camp, roads, river and solid city footprints clear. */
export function karakorumDressingClear(point: TerrainPoint, margin = 80): boolean {
  const { minX, minY, width, height, camp, campClearRadius } = KARAKORUM.world;
  if (
    point.x < minX + 55 ||
    point.x > minX + width - 55 ||
    point.y < minY + 55 ||
    point.y > minY + height - 55
  )
    return false;
  if (Math.hypot(point.x - camp.x, point.y - camp.y) < campClearRadius + margin) return false;
  if (
    KARAKORUM.paths.some((path) => polylineDistance(point, path) < KARAKORUM.pathWidth / 2 + margin)
  )
    return false;
  if (polylineDistance(point, riverPoints()) < KARAKORUM.river.width / 2 + Math.max(60, margin))
    return false;
  return KARAKORUM_FOOTPRINTS.every(
    (landmark) =>
      Math.hypot(point.x - landmark.x, point.y - landmark.y) >= landmark.footprint + margin,
  );
}

/** Deterministic placeholder city and pasture dressing, clipped after the full map is built. */
export function karakorumDressing(seed: string | number, bounds: TerrainBounds): SceneDressing[] {
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
  const centre = KARAKORUM.world.terrainSize / 2;
  const result: SceneDressing[] = [];
  const random = (key: string) => (offset: number) =>
    terrainSeed(`${seed}:karakorum:${key}:${offset}`) / 4294967295;
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
      x: centre + x,
      z: centre + y,
      kind,
      width: metrics.width * ORKHON_SPRITE_SCALE * scale,
      flip,
      tint: 0xffffff,
      heightScale: 1,
      texture: orkhonAtlasOf(sprite),
      frame: sprite,
      shadow: kind === 'landmark' || kind === 'larch',
      originY: metrics.anchorY,
    });
  };
  const occupied = (point: TerrainPoint, separation: number) =>
    result.some(
      (prop) =>
        prop.kind !== 'landmark' &&
        Math.hypot(prop.x - centre - point.x, prop.z - centre - point.y) < separation,
    );

  for (const landmark of KARAKORUM.landmarks) {
    const scale = landmark.scale ?? ORKHON_LANDMARK_SCALE[landmark.sprite] ?? 1;
    place(landmark.sprite, landmark.x, landmark.y, 'landmark', scale, landmark.flip ?? false);
  }

  // Small groves frame the pasture and river edge while leaving every road and combat floor open.
  for (const [groveIndex, grove] of KARAKORUM.groves.entries()) {
    let placed = 0;
    for (let candidate = 0; candidate < grove.count * 12 && placed < grove.count; candidate++) {
      const r = random(`grove:${groveIndex}:${candidate}`);
      const angle = r(1) * Math.PI * 2;
      const radius = Math.sqrt(r(2));
      const point = {
        x: grove.x + Math.cos(angle) * grove.radiusX * radius,
        y: grove.y + Math.sin(angle) * grove.radiusY * radius,
      };
      if (!karakorumDressingClear(point, 94) || occupied(point, 82)) continue;
      const sprite = TREES[Math.floor(r(3) * TREES.length)]!;
      place(
        sprite,
        point.x,
        point.y,
        'larch',
        ORKHON_PROP_SCALE.tree * (0.92 + r(4) * 0.17),
        r(5) > 0.5,
      );
      placed++;
    }
  }

  // Restrained all-map accents keep the manuscript ground quiet beneath riders and warnings.
  const step = 410;
  for (let row = 0; row * step < KARAKORUM.world.height - 260; row++)
    for (let column = 0; column * step < KARAKORUM.world.width - 260; column++) {
      const r = random(`scatter:${column}:${row}`);
      const point = {
        x: KARAKORUM.world.minX + 130 + column * step + (r(1) - 0.5) * 300,
        y: KARAKORUM.world.minY + 130 + row * step + (r(2) - 0.5) * 300,
      };
      if (!karakorumDressingClear(point, 88) || occupied(point, 46) || r(3) > 0.58) continue;
      const sprite = SHRUBS[Math.floor(r(4) * SHRUBS.length)]!;
      place(
        sprite,
        point.x,
        point.y,
        'scrub',
        ORKHON_PROP_SCALE.scrub * (0.9 + r(5) * 0.2),
        r(6) > 0.5,
      );
    }

  return result;
}

/** Landmark metadata retained for tests and later prologue integration. */
export function karakorumLandmarkAt(
  prop: Pick<SceneDressing, 'x' | 'z' | 'frame'>,
): KarakorumLandmark | undefined {
  const centre = KARAKORUM.world.terrainSize / 2;
  return KARAKORUM.landmarks.find(
    (landmark) =>
      landmark.sprite === prop.frame &&
      Math.abs(landmark.x - (prop.x - centre)) < 0.01 &&
      Math.abs(landmark.y - (prop.z - centre)) < 0.01,
  );
}
