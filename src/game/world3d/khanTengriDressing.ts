import { ORKHON_SPRITES, orkhonAtlasOf, type OrkhonSprite } from '../assets/orkhonValleyArt';
import { KHAN_TENGRI, KHAN_TENGRI_FOOTPRINTS, type KhanTengriLandmark } from '../data/khanTengri';
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

const meltwaterPoints = (): TerrainPoint[] => {
  const points: TerrainPoint[] = [];
  for (let index = 0; index < KHAN_TENGRI.meltwater.course.length; index += 2)
    points.push({
      x: KHAN_TENGRI.meltwater.course[index]!,
      y: KHAN_TENGRI.meltwater.course[index + 1]!,
    });
  return points;
};

/** True when sparse rock dressing leaves the camp, routes, ramps, water and sites clear. */
export function khanTengriDressingClear(point: TerrainPoint, margin = 76): boolean {
  const { minX, minY, width, height, camp, campClearRadius } = KHAN_TENGRI.world;
  if (
    point.x < minX + 60 ||
    point.x > minX + width - 60 ||
    point.y < minY + 60 ||
    point.y > minY + height - 60
  )
    return false;
  if (Math.hypot(point.x - camp.x, point.y - camp.y) < campClearRadius + margin) return false;
  if (
    KHAN_TENGRI.paths.some(
      (path) => polylineDistance(point, path) < KHAN_TENGRI.pathWidth / 2 + margin,
    )
  )
    return false;
  if (
    KHAN_TENGRI.plateaus.some((plateau) =>
      plateau.ramps.some(
        (ramp) => segmentDistance(point, ramp.foot, ramp.top) < ramp.shoulder + margin,
      ),
    )
  )
    return false;
  if (
    polylineDistance(point, meltwaterPoints()) <
    KHAN_TENGRI.meltwater.width / 2 + Math.max(48, margin)
  )
    return false;
  return KHAN_TENGRI_FOOTPRINTS.every(
    (landmark) =>
      Math.hypot(point.x - landmark.x, point.y - landmark.y) >= landmark.footprint + margin,
  );
}

/** Deterministic sparse glacier-margin scenery, built globally before chunk clipping. */
export function khanTengriDressing(seed: string | number, bounds: TerrainBounds): SceneDressing[] {
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
  const center = KHAN_TENGRI.world.terrainSize / 2;
  const result: SceneDressing[] = [];
  const random = (key: string) => (offset: number) =>
    terrainSeed(`${seed}:khan-tengri:${key}:${offset}`) / 4294967295;
  const occupied = (point: TerrainPoint, radius: number) =>
    result.some(
      (prop) =>
        prop.kind !== 'landmark' &&
        Math.hypot(prop.x - center - point.x, prop.z - center - point.y) < radius,
    );
  const placeOrkhon = (
    sprite: OrkhonSprite,
    point: TerrainPoint,
    kind: SceneProp,
    width: number,
    flip: boolean,
  ) => {
    const metrics = ORKHON_SPRITES[sprite];
    result.push({
      x: center + point.x,
      z: center + point.y,
      kind,
      width,
      flip,
      tint: 0xe8e9ee,
      heightScale: 1,
      texture: orkhonAtlasOf(sprite),
      frame: sprite,
      shadow: kind === 'crag' || (kind === 'boulders' && width > 74),
      originY: metrics.anchorY,
    });
  };

  for (const landmark of KHAN_TENGRI.landmarks)
    result.push({
      x: center + landmark.x,
      z: center + landmark.y,
      kind: 'landmark',
      width: landmark.width,
      flip: landmark.flip ?? false,
      tint: 0xffffff,
      heightScale: 1,
      texture: landmark.texture,
      frame: landmark.frame,
      shadow: landmark.shadow ?? false,
      originY:
        landmark.texture === 'steppe-scenery'
          ? 0.9
          : ORKHON_SPRITES[landmark.frame as OrkhonSprite]?.anchorY,
    });

  // One quiet candidate per 250-unit cell preserves broad combat lanes while breaking up the
  // moraine with irregular boulders, scree fans and rare silver-sage cushions.
  const step = 250;
  for (let row = 0; row * step < KHAN_TENGRI.world.height - 180; row++)
    for (let column = 0; column * step < KHAN_TENGRI.world.width - 180; column++) {
      const r = random(`scatter:${column}:${row}`);
      if (r(0) < 0.32) continue;
      const point = {
        x: KHAN_TENGRI.world.minX + 90 + column * step + (r(1) - 0.5) * 190,
        y: KHAN_TENGRI.world.minY + 90 + row * step + (r(2) - 0.5) * 190,
      };
      if (!khanTengriDressingClear(point, 78) || occupied(point, 44)) continue;
      const roll = r(3);
      const sprite: OrkhonSprite = roll > 0.91 ? 'prop_cliff_scree' : 'loose_pebbles';
      const kind: SceneProp = sprite === 'prop_cliff_scree' ? 'crag' : 'boulders';
      const width = sprite === 'prop_cliff_scree' ? 86 + r(4) * 58 : 22 + r(4) * 22;
      placeOrkhon(sprite, point, kind, width, r(5) > 0.5);

      if (r(6) > 0.88) {
        const angle = r(7) * Math.PI * 2;
        const cushion = {
          x: point.x + Math.cos(angle) * (54 + r(8) * 40),
          y: point.y + Math.sin(angle) * (54 + r(8) * 40),
        };
        if (khanTengriDressingClear(cushion, 74) && !occupied(cushion, 38))
          placeOrkhon('shrub_olive', cushion, 'scrub', 30 + r(9) * 15, r(10) > 0.5);
      }
    }

  return result.sort((a, b) => a.z - b.z || a.x - b.x);
}

/** Landmark entries retain their authored semantic roles for later systems integration. */
export const khanTengriLandmarkAt = (prop: SceneDressing): KhanTengriLandmark | undefined => {
  const center = KHAN_TENGRI.world.terrainSize / 2;
  return KHAN_TENGRI.landmarks.find(
    (landmark) => landmark.x + center === prop.x && landmark.y + center === prop.z,
  );
};
