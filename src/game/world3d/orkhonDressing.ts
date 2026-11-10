import {
  ORKHON_ATLAS,
  ORKHON_LANDMARK_SCALE,
  ORKHON_PROP_SCALE,
  ORKHON_SPRITE_SCALE,
  ORKHON_SPRITES,
  type OrkhonSprite,
} from '../assets/orkhonValleyArt';
import { ART_SPEC } from '../data/artSpec';
import { ORKHON_VALLEY } from '../data/orkhonValley';
import { outlineField } from './ComposedTerrain';
import type { ComposedTerrain } from './ComposedTerrain';
import type { SceneDressing, SceneProp } from './sceneDressing';
import { terrainSeed } from '../terrain/noise';
import type { TerrainBounds, TerrainPoint } from '../terrain/types';
import { CAMERA_DIRECTION } from './orkhonOverlay';
import { terrainHabitat } from './terrainHabitat';

const FOOT_ROCKS: readonly OrkhonSprite[] = [
  'rock_single',
  'rock_pair',
  'small_stones',
  'fallen_rocks',
  'small_boulder',
  'rock_cluster_large',
  'rock_cluster_round',
];
const SCATTER: readonly OrkhonSprite[] = [
  'shrub_olive',
  'shrub_gold',
  'shrub_green',
  'shrub_mix',
  'white_wildflowers',
  'red_wildflowers',
  'loose_pebbles',
  'small_boulder',
];

const JITTER = ART_SPEC.orkhon.jitter;
/** A size factor within `[min, max]` for a random value in [0, 1). */
const spread = ([min, max]: readonly [number, number], random: number) =>
  min + random * (max - min);

const RIM_TREES: readonly OrkhonSprite[] = ['pine_tree', 'autumn_yellow_tree', 'olive_tree'];
const RIM_SCRUB: readonly OrkhonSprite[] = ['shrub_olive', 'shrub_gold', 'shrub_green'];

function segmentDistance(point: TerrainPoint, a: TerrainPoint, b: TerrainPoint): number {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
  );
  return Math.hypot(point.x - a.x - dx * t, point.y - a.y - dy * t);
}

const cache = new WeakMap<ComposedTerrain, readonly SceneDressing[]>();

/** Distance in world units to the nearest plateau cliff line. */
function cliffDistance(x: number, y: number): number {
  return Math.min(
    ...ORKHON_VALLEY.plateaus.map((plateau) => Math.abs(outlineField(plateau.outline, x, y))),
  );
}

/**
 * The complete authored Orkhon scene: landmarks, groves and sparse scatter, all supplied pack
 * sprites at their painted colours. It is built once per terrain and clipped into chunks.
 */
export function orkhonDressing(terrain: ComposedTerrain, bounds: TerrainBounds): SceneDressing[] {
  let all = cache.get(terrain);
  if (!all) {
    all = buildDressing(terrain);
    cache.set(terrain, all);
  }
  return all.filter(
    (prop) =>
      prop.x >= bounds.x &&
      prop.z >= bounds.y &&
      prop.x < bounds.x + bounds.width &&
      prop.z < bounds.y + bounds.height,
  );
}

function buildDressing(terrain: ComposedTerrain): SceneDressing[] {
  const center = terrain.worldSize / 2;
  const random = (key: string) => (offset: number) =>
    terrainSeed(`${terrain.seed}:orkhon:${key}:${offset}`) / 4294967295;
  const result: SceneDressing[] = [];
  const solid = ORKHON_VALLEY.landmarks.filter((landmark) => landmark.footprint);
  const clear = (x: number, y: number, margin: number) =>
    x > -center + 40 &&
    y > -center + 40 &&
    x < center - 40 &&
    y < center - 40 &&
    solid.every((other) => Math.hypot(other.x - x, other.y - y) > (other.footprint ?? 0) + margin);
  const place = (
    sprite: OrkhonSprite,
    x: number,
    y: number,
    kind: SceneProp,
    options: { scale?: number; flip?: boolean } = {},
  ) => {
    const metrics = ORKHON_SPRITES[sprite];
    result.push({
      x: center + x,
      z: center + y,
      kind,
      width: metrics.width * ORKHON_SPRITE_SCALE * (options.scale ?? 1),
      flip: options.flip ?? false,
      tint: 0xffffff,
      heightScale: 1,
      texture: ORKHON_ATLAS,
      frame: sprite,
      shadow: kind === 'larch' || kind === 'landmark',
      originY: metrics.anchorY,
    });
  };
  const ground = (x: number, y: number) => {
    const sample = terrain.sample(center + x, center + y);
    const height = sample.elevation * terrain.region.biome.heightScale;
    return {
      slope: sample.slope,
      habitat: terrainHabitat(
        terrain,
        center + x,
        center + y,
        height,
        1 / Math.hypot(1, sample.slope),
      ),
      shore: terrain.river?.sample(center + x, center + y).shoreDistance ?? Infinity,
    };
  };

  for (const landmark of ORKHON_VALLEY.landmarks)
    place(landmark.sprite, landmark.x, landmark.y, 'landmark', {
      scale: landmark.scale ?? ORKHON_LANDMARK_SCALE[landmark.sprite] ?? 1,
      flip: landmark.flip,
    });

  for (const [index, grove] of ORKHON_VALLEY.groves.entries()) {
    let placed = 0;
    for (let i = 0; i < grove.count * 4 && placed < grove.count; i++) {
      const r = random(`grove:${index}:${i}`);
      const angle = r(1) * Math.PI * 2,
        radius = Math.sqrt(r(2)) * grove.radius;
      const x = grove.x + Math.cos(angle) * radius,
        y = grove.y + Math.sin(angle) * radius;
      const local = ground(x, y);
      if (
        cliffDistance(x, y) < 70 ||
        local.slope > 0.35 ||
        local.shore < 40 ||
        local.habitat.wear > 0.2 ||
        !clear(x, y, 50) ||
        result.some(
          (prop) =>
            prop.kind === 'larch' && Math.hypot(prop.x - center - x, prop.z - center - y) < 70,
        )
      )
        continue;
      const sprite = grove.sprites[Math.floor(r(3) * grove.sprites.length)]!;
      place(sprite, x, y, 'larch', {
        scale: ORKHON_PROP_SCALE.tree * spread(JITTER.groveTree, r(4)),
        flip: r(5) > 0.5,
      });
      placed++;
    }
  }

  let rocks = 0,
    scatter = 0;
  // Rubble and the odd shrub gather at the foot of camera-facing cliffs; a few trees and shrubs
  // stand back from every plateau rim, framing the edges as in the reference layout.
  for (const [index, plateau] of ORKHON_VALLEY.plateaus.entries()) {
    const outline = plateau.outline;
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i]!,
        b = outline[(i + 1) % outline.length]!;
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      const e = { x: (b.x - a.x) / length, y: (b.y - a.y) / length };
      let n = { x: e.y, y: -e.x };
      if (outlineField(outline, (a.x + b.x) / 2 + n.x * 6, (a.y + b.y) / 2 + n.y * 6) > 0)
        n = { x: -n.x, y: -n.y };
      const facing = n.x * CAMERA_DIRECTION.x + n.y * CAMERA_DIRECTION.y > 0.05;
      for (let d = 70; d < length - 70; d += 150) {
        const r = random(`edge:${index}:${i}:${d}`);
        const t = d + (r(1) - 0.5) * 90;
        const at = { x: a.x + e.x * t, y: a.y + e.y * t };
        if (
          plateau.ramps.some(
            (ramp) => segmentDistance(at, ramp.foot, ramp.top) < ramp.shoulder + 50,
          )
        )
          continue;
        const foot = 28 + r(3) * 45;
        const fx = at.x + n.x * foot,
          fy = at.y + n.y * foot;
        if (facing && r(2) < 0.75 && clear(fx, fy, 30) && cliffDistance(fx, fy) > 20) {
          const local = ground(fx, fy);
          if (local.shore > 30 && local.habitat.wear < 0.25 && local.slope < 0.5)
            r(4) < 0.22
              ? place(RIM_SCRUB[Math.floor(r(6) * RIM_SCRUB.length)]!, fx, fy, 'scrub', {
                  scale: ORKHON_PROP_SCALE.scrub,
                  flip: r(5) > 0.5,
                })
              : place(FOOT_ROCKS[rocks++ % FOOT_ROCKS.length]!, fx, fy, 'boulders', {
                  scale: ORKHON_PROP_SCALE.rock * spread(JITTER.footRock, r(7)),
                  flip: r(5) > 0.5,
                });
        }
        if (r(8) > 0.4) continue;
        const back = 75 + r(9) * 100;
        const tx = at.x - n.x * back,
          ty = at.y - n.y * back;
        if (outlineField(outline, tx, ty) < 60 || !clear(tx, ty, 50)) continue;
        const local = ground(tx, ty);
        if (local.habitat.wear > 0.2 || local.slope > 0.35 || local.shore < 40) continue;
        if (r(10) < 0.55)
          place(RIM_TREES[Math.floor(r(11) * RIM_TREES.length)]!, tx, ty, 'larch', {
            scale: ORKHON_PROP_SCALE.tree * spread(JITTER.rimTree, r(12)),
            flip: r(5) > 0.5,
          });
        else
          place(RIM_SCRUB[Math.floor(r(11) * RIM_SCRUB.length)]!, tx, ty, 'scrub', {
            scale: ORKHON_PROP_SCALE.scrub,
            flip: r(5) > 0.5,
          });
      }
    }
  }

  // Sparse scatter: rocks below cliffs, shrubs and flowers in the open, reeds on river banks.
  // Cycle the supplied sprites so every scatter painting appears across the level.
  const step = 230;
  for (let y = -center + step / 2; y < center; y += step)
    for (let x = -center + step / 2; x < center; x += step) {
      const r = random(`scatter:${x}:${y}`);
      const px = x + (r(1) - 0.5) * step * 0.8,
        py = y + (r(2) - 0.5) * step * 0.8;
      if (!clear(px, py, 40) || Math.hypot(px, py) < 470) continue;
      const local = ground(px, py);
      if (local.shore < 12 || local.slope > 0.5 || local.habitat.wear > 0.25) continue;
      const cliff = cliffDistance(px, py);
      if (local.habitat.cliffFoot > 0.35 && cliff > 45 && cliff < 120 && r(3) < 0.55) {
        place(FOOT_ROCKS[rocks++ % FOOT_ROCKS.length]!, px, py, 'boulders', {
          scale: ORKHON_PROP_SCALE.rock,
          flip: r(5) > 0.5,
        });
        continue;
      }
      if (local.shore < 70 && r(3) < 0.45) {
        place('reed_clump', px, py, 'reeds', { scale: ORKHON_PROP_SCALE.reed, flip: r(5) > 0.5 });
        continue;
      }
      if (cliff < 60 || r(3) > 0.14) continue;
      place(SCATTER[scatter++ % SCATTER.length]!, px, py, 'scrub', {
        scale: ORKHON_PROP_SCALE.scrub,
        flip: r(5) > 0.5,
      });
    }
  return result.sort((a, b) => a.z - b.z || a.x - b.x);
}
