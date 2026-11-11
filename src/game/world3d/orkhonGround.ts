import { clamp01, smoothstep } from '../terrain/noise';
import type { TerrainPoint } from '../terrain/types';
import type { ComposedTerrain } from './ComposedTerrain';
import { habitatFields, habitatMoisture } from './terrainHabitat';

/**
 * Orkhon Valley material masks, evaluated per fragment instead of per mesh vertex.
 *
 * The 32-unit terrain mesh is coarser than a trail's worn edge, so masks interpolated between
 * vertices traced the triangles. The smooth inputs of those masks (distance to the nearest trail,
 * the broad moisture noise, nearness to the river) are baked once into a world-space texture; the
 * shader filters them linearly and applies every threshold per pixel. Ramps are few, so the shader
 * reads them from uniforms. `orkhonGroundWeights` mirrors the shader so tests can check that, at
 * any point, the per-pixel weights equal the per-vertex rule in `authoredMaterialWeights`.
 */
export const ORKHON_GROUND_MASK = {
  /** Texels per side over the whole battlefield (about 5 units per texel). */
  size: 1024,
  /** Trail distances are stored up to this many world units (beyond the widest worn edge). */
  trailRange: 48,
  /** Broad noise and shore change slowly; they are evaluated every this many texels and interpolated. */
  coarse: 4,
} as const;

export interface GroundRamp {
  foot: TerrainPoint;
  top: TerrainPoint;
  halfWidth: number;
  shoulder?: number;
}

type Segment = readonly [TerrainPoint, TerrainPoint];

/** Camp-relative trail segments. */
export function trailSegments(terrain: ComposedTerrain): Segment[] {
  const segments: Segment[] = [];
  for (const path of terrain.region.scene.ground?.paths ?? [])
    for (let i = 1; i < path.length; i++) segments.push([path[i - 1]!, path[i]!]);
  return segments;
}

function segmentDistance([a, b]: Segment, x: number, z: number): number {
  const dx = b.x - a.x,
    dz = b.y - a.y;
  const t = clamp01(((x - a.x) * dx + (z - a.y) * dz) / (dx * dx + dz * dz || 1));
  return Math.hypot(x - a.x - dx * t, z - a.y - dz * t);
}

/**
 * RGBA mask over world coordinates [0, worldSize]²: R distance to the nearest trail (0 to
 * `trailRange`), G broad moisture noise, B river nearness, A unused (opaque). Row j, column i is
 * the texel centred on world point ((i + 0.5)·cell, (j + 0.5)·cell).
 */
export function bakeOrkhonGroundMask(
  terrain: ComposedTerrain,
  size: number = ORKHON_GROUND_MASK.size,
): Uint8Array {
  const { trailRange, coarse } = ORKHON_GROUND_MASK;
  const cell = terrain.worldSize / size;
  const center = terrain.worldSize / 2;
  const data = new Uint8Array(size * size * 4);
  const distance = new Float32Array(size * size).fill(trailRange);
  // Trails touch few texels: visit each segment's widened bounding box only.
  for (const segment of trailSegments(terrain)) {
    const [a, b] = segment;
    const index = (world: number) => Math.floor((world + center) / cell);
    const i0 = Math.max(0, index(Math.min(a.x, b.x) - trailRange));
    const i1 = Math.min(size - 1, index(Math.max(a.x, b.x) + trailRange));
    const j0 = Math.max(0, index(Math.min(a.y, b.y) - trailRange));
    const j1 = Math.min(size - 1, index(Math.max(a.y, b.y) + trailRange));
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const d = segmentDistance(segment, (i + 0.5) * cell - center, (j + 0.5) * cell - center);
        const k = j * size + i;
        if (d < distance[k]!) distance[k] = d;
      }
  }
  // Broad noise and shore on a coarse lattice, interpolated to every texel.
  const lattice = Math.ceil(size / coarse) + 1;
  const broad = new Float32Array(lattice * lattice);
  const shore = new Float32Array(lattice * lattice);
  for (let j = 0; j < lattice; j++)
    for (let i = 0; i < lattice; i++) {
      const fields = habitatFields(
        terrain,
        Math.min(i * coarse + 0.5, size) * cell,
        Math.min(j * coarse + 0.5, size) * cell,
      );
      broad[j * lattice + i] = fields.broad;
      shore[j * lattice + i] = fields.shore;
    }
  const lerp = (field: Float32Array, i: number, j: number) => {
    const fi = (i % coarse) / coarse,
      fj = (j % coarse) / coarse;
    const k = Math.floor(j / coarse) * lattice + Math.floor(i / coarse);
    const top = field[k]! + (field[k + 1]! - field[k]!) * fi;
    const bottom = field[k + lattice]! + (field[k + lattice + 1]! - field[k + lattice]!) * fi;
    return top + (bottom - top) * fj;
  };
  const byte = (value: number) => Math.round(clamp01(value) * 255);
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const k = j * size + i;
      data[k * 4] = byte(distance[k]! / trailRange);
      data[k * 4 + 1] = byte(lerp(broad, i, j));
      data[k * 4 + 2] = byte(lerp(shore, i, j));
      data[k * 4 + 3] = 255;
    }
  return data;
}

/** Bilinear lookup of a baked mask, as the GPU's linear filter reads it, in 0–1 per channel. */
export function sampleGroundMask(
  mask: Uint8Array,
  worldSize: number,
  x: number,
  z: number,
  size: number = ORKHON_GROUND_MASK.size,
): [number, number, number] {
  const u = Math.max(0, Math.min(size - 1, (x / worldSize) * size - 0.5));
  const v = Math.max(0, Math.min(size - 1, (z / worldSize) * size - 0.5));
  const i = Math.min(size - 2, Math.floor(u)),
    j = Math.min(size - 2, Math.floor(v));
  const fu = u - i,
    fv = v - j;
  const at = (ii: number, jj: number, c: number) => mask[(jj * size + ii) * 4 + c]! / 255;
  const channel = (c: number) =>
    (at(i, j, c) * (1 - fu) + at(i + 1, j, c) * fu) * (1 - fv) +
    (at(i, j + 1, c) * (1 - fu) + at(i + 1, j + 1, c) * fu) * fv;
  return [channel(0), channel(1), channel(2)];
}

/**
 * Worn earth on a ramp, mirroring the shader: full across the graded width, from just below the
 * foot to just past the top. `along` is the distance from the foot along the ramp.
 */
export function orkhonRampWear(
  ramps: readonly GroundRamp[],
  x: number,
  z: number,
): { wear: number; along: number } {
  let wear = 0,
    along = 0;
  for (const ramp of ramps) {
    const dx = ramp.top.x - ramp.foot.x,
      dz = ramp.top.y - ramp.foot.y;
    const length = Math.hypot(dx, dz) || 1;
    const s = ((x - ramp.foot.x) * dx + (z - ramp.foot.y) * dz) / length;
    const lateral = Math.abs(((x - ramp.foot.x) * -dz + (z - ramp.foot.y) * dx) / length);
    if (lateral > (ramp.shoulder ?? ramp.halfWidth) + 40 || s < -0.3 * length || s > 1.3 * length)
      continue;
    const t = s / length;
    const distance = segmentDistance([ramp.foot, ramp.top], x, z);
    const own =
      (1 - smoothstep(ramp.halfWidth * 0.6, ramp.halfWidth * 0.95, distance)) *
      smoothstep(-0.2, 0.05, t) *
      (1 - smoothstep(0.95, 1.2, t));
    wear = Math.max(wear, own);
    along = s;
  }
  return { wear, along };
}

/** Per-pixel inputs of the Orkhon ground weights. */
export interface GroundPoint {
  /** World position and height. */
  x: number;
  z: number;
  y: number;
  normalY: number;
  /** Cliff-foot nearness, interpolated from the mesh vertices (it changes over 135 units). */
  cliffFoot: number;
  /** Mask values: distance to the nearest trail in world units, broad noise, river nearness. */
  trail: number;
  broad: number;
  shore: number;
}

/**
 * The shader's Orkhon ground weights: valley grass (calm with olive regions), trail dirt, scree,
 * sun-cured straw and plateau moss. Mirrors `authoredMaterialWeights` (Orkhon has no desert term).
 */
export function orkhonGroundWeights(
  terrain: ComposedTerrain,
  point: GroundPoint,
): [number, number, number, number, number] {
  const scene = terrain.region.scene;
  const ground = scene.ground!;
  const center = terrain.worldSize / 2;
  const cx = point.x - center,
    cz = point.z - center;
  const elevation = point.y - scene.floor;
  const rise = Math.max(1, ...scene.shelves.map((shelf) => shelf.rise));
  const top = smoothstep(rise * 0.55, rise * 0.85, elevation);
  const stone = clamp01(
    smoothstep(0.3, 0.62, 1 - point.normalY) + Math.pow(point.cliffFoot, 4) * (1 - top) * 0.6,
  );
  const radius = Math.hypot(cx, cz);
  const hearth = (1 - smoothstep(60, 180, radius)) * 0.7;
  const clearing = 1 - smoothstep(750, 1000, radius);
  const trail = 1 - smoothstep(ground.width * 0.2, ground.width * 0.8, point.trail);
  const ramp = orkhonRampWear(ground.ramps ?? [], cx, cz).wear;
  const wear = Math.max(hearth, Math.max(trail, ramp) * 0.9);
  const { moisture } = habitatMoisture(
    point.broad,
    point.shore,
    elevation,
    point.normalY,
    scene.vegetation === 'desert',
  );
  const soil = (1 - stone) * wear;
  const cover = (1 - stone) * (1 - wear);
  const dry = (1 - smoothstep(0.24, 0.3, moisture)) * (1 - top) * (1 - clearing);
  const grass = cover * (1 - dry);
  return [grass * (1 - top), soil, stone, cover * dry, grass * top];
}

/** Ramp uniforms: foot (world) and unit direction, then length, graded half width and shoulder. */
export function orkhonRampUniforms(terrain: ComposedTerrain): {
  axis: [number, number, number, number][];
  size: [number, number, number, number][];
} {
  const center = terrain.worldSize / 2;
  const ramps: readonly GroundRamp[] = terrain.region.scene.ground?.ramps ?? [];
  return {
    axis: ramps.map((ramp) => {
      const dx = ramp.top.x - ramp.foot.x,
        dz = ramp.top.y - ramp.foot.y;
      const length = Math.hypot(dx, dz) || 1;
      return [ramp.foot.x + center, ramp.foot.y + center, dx / length, dz / length];
    }),
    size: ramps.map((ramp) => [
      Math.hypot(ramp.top.x - ramp.foot.x, ramp.top.y - ramp.foot.y),
      ramp.halfWidth,
      ramp.shoulder ?? ramp.halfWidth,
      0,
    ]),
  };
}
