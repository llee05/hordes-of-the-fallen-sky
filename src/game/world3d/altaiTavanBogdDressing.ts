import {
  ORKHON_PROP_SCALE,
  ORKHON_SPRITE_SCALE,
  ORKHON_SPRITES,
  orkhonAtlasOf,
  type OrkhonSprite,
} from '../assets/orkhonValleyArt';
import {
  ALTAI_TAVAN_BOGD,
  ALTAI_TAVAN_BOGD_FOOTPRINTS,
  type AltaiTavanBogdLandmark,
} from '../data/altaiTavanBogd';
import { terrainSeed } from '../terrain/noise';
import type { TerrainBounds, TerrainPoint } from '../terrain/types';
import type { SceneDressing, SceneProp } from './sceneDressing';

const cache = new Map<string | number, readonly SceneDressing[]>();

function segmentDistance(point: TerrainPoint, a: TerrainPoint, b: TerrainPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const denominator = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / denominator));
  return Math.hypot(point.x - a.x - dx * t, point.y - a.y - dy * t);
}

const polylineDistance = (point: TerrainPoint, line: readonly TerrainPoint[]): number =>
  Math.min(...line.slice(1).map((end, index) => segmentDistance(point, line[index]!, end)));

const lakePoints = (): TerrainPoint[] => {
  const result: TerrainPoint[] = [];
  for (let index = 0; index < ALTAI_TAVAN_BOGD.lake.course.length; index += 2)
    result.push({
      x: ALTAI_TAVAN_BOGD.lake.course[index]!,
      y: ALTAI_TAVAN_BOGD.lake.course[index + 1]!,
    });
  return result;
};

/** True where sparse alpine dressing leaves roads, water and the camp combat floor clear. */
export function altaiTavanBogdDressingClear(point: TerrainPoint, margin = 80): boolean {
  const { minX, minY, width, height, camp, campClearRadius } = ALTAI_TAVAN_BOGD.world;
  if (
    point.x < minX + 60 ||
    point.x > minX + width - 60 ||
    point.y < minY + 60 ||
    point.y > minY + height - 60
  )
    return false;
  if (Math.hypot(point.x - camp.x, point.y - camp.y) < campClearRadius + margin) return false;
  if (
    ALTAI_TAVAN_BOGD.paths.some(
      (path) => polylineDistance(point, path) < ALTAI_TAVAN_BOGD.pathWidth / 2 + margin,
    )
  )
    return false;
  if (
    ALTAI_TAVAN_BOGD.plateaus[0]!.ramps.some(
      (ramp) => segmentDistance(point, ramp.foot, ramp.top) < ramp.shoulder + margin,
    )
  )
    return false;
  if (
    polylineDistance(point, lakePoints()) <
    ALTAI_TAVAN_BOGD.lake.width / 2 + Math.max(60, margin)
  )
    return false;
  return ALTAI_TAVAN_BOGD_FOOTPRINTS.every(
    (landmark) =>
      Math.hypot(point.x - landmark.x, point.y - landmark.y) >= landmark.footprint + margin,
  );
}

export function altaiTavanBogdDressing(
  seed: string | number,
  bounds: TerrainBounds,
): SceneDressing[] {
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
  const centre = ALTAI_TAVAN_BOGD.world.terrainSize / 2;
  const result: SceneDressing[] = [];
  const placeLandmark = (landmark: AltaiTavanBogdLandmark) =>
    result.push({
      x: centre + landmark.x,
      z: centre + landmark.y,
      kind: 'landmark',
      width: landmark.width,
      flip: landmark.flip ?? false,
      tint: 0xffffff,
      heightScale: 1,
      texture: landmark.texture,
      frame: landmark.frame,
      shadow: landmark.role !== 'glacier' && landmark.role !== 'ridge-frame',
    });
  for (const landmark of ALTAI_TAVAN_BOGD.landmarks) placeLandmark(landmark);

  const sprites: readonly OrkhonSprite[] = [
    'small_boulder',
    'loose_pebbles',
    'shrub_olive',
    'shrub_mix',
    'prop_cliff_scree',
  ];
  const step = 360;
  for (let row = 0; row * step < ALTAI_TAVAN_BOGD.world.height - 220; row++)
    for (let column = 0; column * step < ALTAI_TAVAN_BOGD.world.width - 220; column++) {
      const key = `${seed}:altai-tavan-bogd:${column}:${row}`;
      const random = (offset: number) => terrainSeed(`${key}:${offset}`) / 4294967295;
      if (random(0) < 0.34) continue;
      const point = {
        x: ALTAI_TAVAN_BOGD.world.minX + 110 + column * step + (random(1) - 0.5) * 260,
        y: ALTAI_TAVAN_BOGD.world.minY + 110 + row * step + (random(2) - 0.5) * 260,
      };
      if (!altaiTavanBogdDressingClear(point, 86)) continue;
      const sprite = sprites[Math.floor(random(3) * sprites.length)]!;
      const metrics = ORKHON_SPRITES[sprite];
      const crag = sprite === 'prop_cliff_scree';
      const shrub = sprite === 'shrub_olive' || sprite === 'shrub_mix';
      const kind: SceneProp = crag ? 'crag' : shrub ? 'scrub' : 'boulders';
      const scale = crag
        ? ORKHON_PROP_SCALE.scree * (0.9 + random(4) * 0.35)
        : shrub
          ? ORKHON_PROP_SCALE.scrub * (0.82 + random(4) * 0.26)
          : 0.52 + random(4) * 0.26;
      result.push({
        x: centre + point.x,
        z: centre + point.y,
        kind,
        width: metrics.width * ORKHON_SPRITE_SCALE * scale,
        flip: random(5) > 0.5,
        tint: 0xffffff,
        heightScale: 1,
        texture: orkhonAtlasOf(sprite),
        frame: sprite,
        shadow: crag,
        originY: metrics.anchorY,
      });
    }
  return result.sort((a, b) => a.z - b.z || a.x - b.x);
}
