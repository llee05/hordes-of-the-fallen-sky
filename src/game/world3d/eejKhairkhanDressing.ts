import { EEJ_KHAIRKHAN, EEJ_KHAIRKHAN_FOOTPRINTS } from '../data/eejKhairkhan';
import { terrainSeed } from '../terrain/noise';
import type { TerrainBounds, TerrainPoint } from '../terrain/types';
import type { SceneDressing, SceneProp } from './sceneDressing';

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

/** True when optional desert dressing leaves authored movement and combat ground clear. */
export function eejKhairkhanDressingClear(point: TerrainPoint, margin = 70): boolean {
  const { minX, minY, width, height, camp, campClearRadius } = EEJ_KHAIRKHAN.world;
  if (
    point.x < minX + 50 ||
    point.x > minX + width - 50 ||
    point.y < minY + 50 ||
    point.y > minY + height - 50
  )
    return false;
  if (Math.hypot(point.x - camp.x, point.y - camp.y) < campClearRadius + margin) return false;
  if (
    EEJ_KHAIRKHAN.paths.some(
      (path) => polylineDistance(point, path) < EEJ_KHAIRKHAN.pathWidth / 2 + margin,
    )
  )
    return false;
  if (
    EEJ_KHAIRKHAN.plateaus[0]!.ramps.some(
      (ramp) => segmentDistance(point, ramp.foot, ramp.top) < ramp.shoulder + margin,
    )
  )
    return false;
  const pool = EEJ_KHAIRKHAN.spring.water.sourcePool;
  if (Math.hypot(point.x - pool.x, point.y - pool.y) < pool.radius + margin) return false;
  return EEJ_KHAIRKHAN_FOOTPRINTS.every(
    (formation) =>
      Math.hypot(point.x - formation.x, point.y - formation.y) >= formation.footprint + margin,
  );
}

/**
 * Sparse authored granite-desert dressing, generated once across the whole level before chunk
 * clipping so its placement remains stable at camera boundaries.
 */
export function eejKhairkhanDressing(
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
  const center = EEJ_KHAIRKHAN.world.terrainSize / 2;
  const result: SceneDressing[] = [];
  const random = (key: string) => (offset: number) =>
    terrainSeed(`${seed}:eej-khairkhan:${key}:${offset}`) / 4294967295;
  const place = (
    x: number,
    y: number,
    kind: SceneProp,
    width: number,
    frame: string,
    texture: 'tapestry-scenery' | 'steppe-ground-details',
    flip: boolean,
    shadow = false,
    site?: SceneDressing['site'],
  ) => {
    result.push({
      x: center + x,
      z: center + y,
      kind,
      width,
      flip,
      tint: 0xffffff,
      heightScale: 1,
      texture,
      frame,
      shadow,
      ...(site ? { site } : {}),
    });
  };

  for (const formation of EEJ_KHAIRKHAN.formations)
    place(
      formation.x,
      formation.y,
      formation.frame === 'crag' ? 'crag' : 'boulders',
      formation.width,
      formation.frame,
      'tapestry-scenery',
      formation.flip ?? false,
      true,
    );

  const pool = EEJ_KHAIRKHAN.spring.water.sourcePool;
  const springRing = [
    [-145, -35],
    [-120, 75],
    [-55, 135],
    [30, 145],
    [110, 95],
    [145, 10],
    [115, -95],
    [35, -140],
    [-55, -135],
  ] as const;
  for (const [index, [dx, dy]] of springRing.entries()) {
    const r = random(`spring:${index}`);
    place(
      pool.x + dx,
      pool.y + dy,
      index % 3 === 0 ? 'scrub' : 'reeds',
      index % 3 === 0 ? 52 + r(1) * 18 : 26 + r(1) * 10,
      index % 3 === 0 ? 'scrub' : 'reeds',
      index % 3 === 0 ? 'tapestry-scenery' : 'steppe-ground-details',
      r(2) > 0.5,
      index % 3 === 0,
      'spring-bank',
    );
  }

  // The rest of the battlefield stays intentionally sparse: low ground marks dominate, with
  // occasional manuscript boulders only near quiet peripheral ground.
  const step = 390;
  for (let row = 0; row * step < EEJ_KHAIRKHAN.world.height; row++)
    for (let column = 0; column * step < EEJ_KHAIRKHAN.world.width; column++) {
      const r = random(`scatter:${column}:${row}`);
      const point = {
        x: EEJ_KHAIRKHAN.world.minX + 120 + column * step + (r(1) - 0.5) * 260,
        y: EEJ_KHAIRKHAN.world.minY + 120 + row * step + (r(2) - 0.5) * 260,
      };
      if (!eejKhairkhanDressingClear(point, 72)) continue;
      const choice = r(3);
      if (choice < 0.58) {
        place(
          point.x,
          point.y,
          'dry-grass',
          20 + r(4) * 13,
          'dry-grass',
          'steppe-ground-details',
          r(5) > 0.5,
        );
      } else if (choice < 0.82) {
        place(
          point.x,
          point.y,
          'pebbles',
          22 + r(4) * 20,
          'pebbles',
          'steppe-ground-details',
          r(5) > 0.5,
        );
      } else if (choice < 0.94) {
        place(
          point.x,
          point.y,
          'scrub',
          45 + r(4) * 28,
          'scrub',
          'tapestry-scenery',
          r(5) > 0.5,
          true,
        );
      } else {
        place(
          point.x,
          point.y,
          'boulders',
          54 + r(4) * 42,
          'boulder',
          'tapestry-scenery',
          r(5) > 0.5,
          true,
        );
      }
    }

  return result.sort((a, b) => a.z - b.z || a.x - b.x);
}
