import { clamp01, smoothstep } from '../terrain/noise';
import type { TerrainPoint } from '../terrain/types';
import type { ComposedTerrain } from './ComposedTerrain';
import { habitatFields, habitatMoisture, rampWear, shoreNearness } from './terrainHabitat';

/**
 * Orkhon Valley material masks, evaluated per pixel instead of per mesh vertex.
 *
 * The 32-unit terrain mesh is coarser than a trail's worn edge, so masks interpolated between
 * vertices traced the triangles. The masks that depend only on ground position (worn earth on
 * trails, ramps and the hearth; how dry the grass is) are baked once into a world-space texture
 * at about 5 units per texel, finer than any of their edges, and filtered linearly. The shader
 * adds what depends on the drawn surface: plateau tops from height, scree from slope and
 * cliff-foot nearness. `orkhonGroundWeights` mirrors the shader so tests can check that, at any
 * point, the per-pixel weights equal the per-vertex rule in `authoredMaterialWeights`.
 */
export const ORKHON_GROUND_MASK = {
  /** Texels per side over the whole battlefield (about 5 units per texel). */
  size: 1024,
  /** Moisture changes slowly; it is evaluated every this many texels (about 40 units). */
  coarse: 8,
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

/** A ramp's frame: distance `s` from the foot along it, `lateral` distance from its centre line. */
function rampFrame(ramp: GroundRamp, x: number, z: number) {
  const dx = ramp.top.x - ramp.foot.x,
    dz = ramp.top.y - ramp.foot.y;
  const length = Math.hypot(dx, dz) || 1;
  return {
    length,
    s: ((x - ramp.foot.x) * dx + (z - ramp.foot.y) * dz) / length,
    lateral: Math.abs(((x - ramp.foot.x) * -dz + (z - ramp.foot.y) * dx) / length),
  };
}

/** Whether a camp-relative point lies where a ramp's wear (`rampWear`) or flanks can reach. */
function nearRamp(ramp: GroundRamp, x: number, z: number, margin = 0): boolean {
  const { length, s, lateral } = rampFrame(ramp, x, z);
  return (
    lateral <= (ramp.shoulder ?? ramp.halfWidth) + 40 + margin &&
    s >= -0.3 * length - margin &&
    s <= 1.3 * length + margin
  );
}

/** Ground-position masks as the bake stores them, for a world point. */
export interface GroundFields {
  /** Worn earth: trails, ramps and the hearth (`TerrainHabitat.wear`). */
  wear: number;
  /** Straw before plateau tops are excluded: dry ground away from the camp clearing. */
  dry: number;
}

/** Worn earth at a camp-relative point, given the distance to the nearest trail. */
function wearAt(terrain: ComposedTerrain, cx: number, cz: number, trail: number): number {
  const ground = terrain.region.scene.ground!;
  const hearth = (1 - smoothstep(60, 180, Math.hypot(cx, cz))) * 0.7;
  const worn = 1 - smoothstep(ground.width * 0.2, ground.width * 0.8, trail);
  const ramp = rampWear(ground.ramps ?? [], cx, cz);
  return Math.max(hearth, Math.max(worn, ramp) * 0.9);
}

/** Dry-grass potential from moisture at a camp-relative point. */
function dryAt(cx: number, cz: number, moisture: number): number {
  const clearing = 1 - smoothstep(750, 1000, Math.hypot(cx, cz));
  return (1 - smoothstep(0.24, 0.3, moisture)) * (1 - clearing);
}

/** Moisture at a world point on a surface of the given height and slope. */
function moistureAt(
  terrain: ComposedTerrain,
  x: number,
  z: number,
  height: number,
  normalY: number,
): number {
  const scene = terrain.region.scene;
  const { broad, shore } = habitatFields(terrain, x, z);
  return habitatMoisture(broad, shore, height - scene.floor, normalY, scene.vegetation === 'desert')
    .moisture;
}

/** Exact ground fields at a world point on a surface of the given height and slope. */
export function orkhonGroundFields(
  terrain: ComposedTerrain,
  x: number,
  z: number,
  height: number,
  normalY: number,
): GroundFields {
  const center = terrain.worldSize / 2;
  const cx = x - center,
    cz = z - center;
  const trail = Math.min(
    ...trailSegments(terrain).map((segment) => segmentDistance(segment, cx, cz)),
  );
  return {
    wear: wearAt(terrain, cx, cz, trail),
    dry: dryAt(cx, cz, moistureAt(terrain, x, z, height, normalY)),
  };
}

/**
 * Height and up-component of the normal of the ground at a world point, on the level it belongs
 * to, as terrain mesh vertices compute them (`sceneGeometry`): beside a cliff, each side keeps its
 * own level's slope rather than the wall's.
 */
export function groundSurface(terrain: ComposedTerrain, x: number, z: number): [number, number] {
  const node = terrain.node(x, z);
  let mask = 0,
    height = node.base;
  node.layers!.forEach((layer, i) => {
    if (layer.field >= 0) {
      mask |= 1 << i;
      height += layer.rise;
    }
  });
  return [height, terrain.normalOn(x, z, mask)[1]];
}

/**
 * RGBA mask over world coordinates [0, worldSize]²: R worn earth, G dry-grass potential, B 1 near
 * a ramp (where the shader looks for ramp flanks), A unused. Moisture uses the visible ground's
 * height and slope. Row j, column i is the texel centred on world point ((i + 0.5)·cell,
 * (j + 0.5)·cell).
 */
export function bakeOrkhonGroundMask(
  terrain: ComposedTerrain,
  size: number = ORKHON_GROUND_MASK.size,
): Uint8Array {
  const { coarse } = ORKHON_GROUND_MASK;
  const ground = terrain.region.scene.ground;
  const ramps: readonly GroundRamp[] = ground?.ramps ?? [];
  const cell = terrain.worldSize / size;
  const center = terrain.worldSize / 2;
  const data = new Uint8Array(size * size * 4);
  const worldOf = (index: number) => (index + 0.5) * cell - center;
  const index = (world: number) => Math.floor((world + center) / cell);
  /** Visit texels whose centres lie in a camp-relative box. */
  const box = (
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    visit: (k: number, x: number, z: number) => void,
  ) => {
    for (let j = Math.max(0, index(z0)); j <= Math.min(size - 1, index(z1)); j++)
      for (let i = Math.max(0, index(x0)); i <= Math.min(size - 1, index(x1)); i++)
        visit(j * size + i, worldOf(i), worldOf(j));
  };
  // Worn earth: trails within reach of their segments, ramps, the hearth.
  const wear = new Float32Array(size * size);
  const near = new Uint8Array(size * size);
  if (ground) {
    const reach = ground.width * 0.8;
    for (const segment of trailSegments(terrain)) {
      const [a, b] = segment;
      box(
        Math.min(a.x, b.x) - reach,
        Math.min(a.y, b.y) - reach,
        Math.max(a.x, b.x) + reach,
        Math.max(a.y, b.y) + reach,
        (k, x, z) => {
          const worn = 1 - smoothstep(ground.width * 0.2, reach, segmentDistance(segment, x, z));
          wear[k] = Math.max(wear[k]!, worn * 0.9);
        },
      );
    }
    for (const ramp of ramps) {
      const { length } = rampFrame(ramp, ramp.top.x, ramp.top.y);
      const extent = 0.8 * length + (ramp.shoulder ?? ramp.halfWidth) + 40 + 2 * cell;
      const mx = (ramp.foot.x + ramp.top.x) / 2,
        mz = (ramp.foot.y + ramp.top.y) / 2;
      box(mx - extent, mz - extent, mx + extent, mz + extent, (k, x, z) => {
        if (!nearRamp(ramp, x, z, 2 * cell)) return;
        near[k] = 1;
        wear[k] = Math.max(wear[k]!, rampWear([ramp], x, z) * 0.9);
      });
    }
    box(-180, -180, 180, 180, (k, x, z) => {
      wear[k] = Math.max(wear[k]!, (1 - smoothstep(60, 180, Math.hypot(x, z))) * 0.7);
    });
  }
  // Moisture on a coarse lattice, from each point's own level: one terrain node per point, with
  // the slope taken from the neighbours' heights on that same level.
  const lattice = Math.ceil(size / coarse) + 1;
  const step = coarse * cell;
  const nodes = Array.from({ length: lattice * lattice }, (_, k) =>
    terrain.node(
      Math.min((k % lattice) * coarse + 0.5, size) * cell,
      Math.min(Math.floor(k / lattice) * coarse + 0.5, size) * cell,
    ),
  );
  const levelHeight = (k: number, mask: number) =>
    nodes[k]!.base +
    nodes[k]!.layers!.reduce((sum, layer, i) => sum + (mask & (1 << i) ? layer.rise : 0), 0);
  // Moisture inputs per lattice point, interpolated to each texel before its thresholds: the
  // shore distance and the slope are smooth even where the dry edge they produce is sharp.
  const fields = Array.from({ length: 4 }, () => new Float32Array(lattice * lattice));
  const [broad, shore, elevation, normalY] = fields;
  for (let j = 0; j < lattice; j++)
    for (let i = 0; i < lattice; i++) {
      const k = j * lattice + i;
      const mask = nodes[k]!.layers!.reduce(
        (bits, layer, l) => bits | (layer.field >= 0 ? 1 << l : 0),
        0,
      );
      const at = (ii: number, jj: number) =>
        levelHeight(
          Math.min(lattice - 1, Math.max(0, jj)) * lattice + Math.min(lattice - 1, Math.max(0, ii)),
          mask,
        );
      const dx = (at(i + 1, j) - at(i - 1, j)) / (2 * step);
      const dz = (at(i, j + 1) - at(i, j - 1)) / (2 * step);
      const position = habitatFields(
        terrain,
        Math.min(i * coarse + 0.5, size) * cell,
        Math.min(j * coarse + 0.5, size) * cell,
      );
      broad![k] = position.broad;
      shore![k] = Math.min(1000, position.shoreDistance);
      elevation![k] = levelHeight(k, mask) - terrain.region.scene.floor;
      normalY![k] = 1 / Math.hypot(dx, 1, dz);
    }
  const lerp = (field: Float32Array, i: number, j: number) => {
    const fi = (i % coarse) / coarse,
      fj = (j % coarse) / coarse;
    const k = Math.floor(j / coarse) * lattice + Math.floor(i / coarse);
    const top = field[k]! + (field[k + 1]! - field[k]!) * fi;
    const bottom = field[k + lattice]! + (field[k + lattice + 1]! - field[k + lattice]!) * fi;
    return top + (bottom - top) * fj;
  };
  const desert = terrain.region.scene.vegetation === 'desert';
  const river = terrain.river !== undefined;
  const moistureOf = (i: number, j: number) =>
    habitatMoisture(
      lerp(broad!, i, j),
      river ? shoreNearness(lerp(shore!, i, j)) : 0,
      lerp(elevation!, i, j),
      lerp(normalY!, i, j),
      desert,
    ).moisture;
  const byte = (value: number) => Math.round(clamp01(value) * 255);
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const k = j * size + i;
      data[k * 4] = byte(wear[k]!);
      data[k * 4 + 1] = byte(dryAt(worldOf(i), worldOf(j), moistureOf(i, j)));
      data[k * 4 + 2] = near[k]! * 255;
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
): [number, number, number, number] {
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
  return [channel(0), channel(1), channel(2), channel(3)];
}

/** Per-pixel inputs of the Orkhon ground weights. */
export interface GroundPoint extends GroundFields {
  /** Height of the drawn surface. */
  y: number;
  normalY: number;
  /** Cliff-foot nearness, interpolated from the mesh vertices (it changes over 135 units). */
  cliffFoot: number;
}

/**
 * The shader's Orkhon ground weights: valley grass (calm with olive regions), trail dirt, scree,
 * sun-cured straw and plateau moss. Mirrors `authoredMaterialWeights`.
 */
export function orkhonGroundWeights(
  terrain: ComposedTerrain,
  point: GroundPoint,
): [number, number, number, number, number] {
  const scene = terrain.region.scene;
  const rise = Math.max(1, ...scene.shelves.map((shelf) => shelf.rise));
  const top = smoothstep(rise * 0.55, rise * 0.85, point.y - scene.floor);
  const stone = clamp01(
    smoothstep(0.3, 0.62, 1 - point.normalY) + Math.pow(point.cliffFoot, 4) * (1 - top) * 0.6,
  );
  const soil = (1 - stone) * point.wear;
  const cover = (1 - stone) * (1 - point.wear);
  const dry = point.dry * (1 - top);
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
      const { length } = rampFrame(ramp, ramp.top.x, ramp.top.y);
      return [
        ramp.foot.x + center,
        ramp.foot.y + center,
        (ramp.top.x - ramp.foot.x) / length,
        (ramp.top.y - ramp.foot.y) / length,
      ];
    }),
    size: ramps.map((ramp) => [
      rampFrame(ramp, ramp.top.x, ramp.top.y).length,
      ramp.halfWidth,
      ramp.shoulder ?? ramp.halfWidth,
      0,
    ]),
  };
}

/** Band offset between ramps, so neighbouring ramps start their flanks on different bands. */
export const ORKHON_FLANK_OFFSET = 397;

/**
 * Distance along a ramp flank for its painted basalt bands, mirroring the shader's
 * `orkhonFlankAlong`: the nearest ramp's own arc length from its foot, so bands keep their
 * painted width along the whole flank. It increases along (−n.z, n.x) of the flank's outward
 * normal, as plateau walls do along their outline, so the painting is never mirrored. World
 * coordinates; `undefined` away from every ramp.
 */
export function orkhonFlankAlong(
  terrain: ComposedTerrain,
  x: number,
  z: number,
  nx: number,
  nz: number,
): number | undefined {
  const { axis, size } = orkhonRampUniforms(terrain);
  let best = Infinity,
    along: number | undefined;
  axis.forEach(([fx, fz, dx, dz], i) => {
    const [length, , shoulder] = size[i]!;
    const qx = x - fx,
      qz = z - fz;
    const s = qx * dx + qz * dz;
    const lateral = Math.abs(-qx * dz + qz * dx);
    if (lateral > shoulder + 40 || s < -0.3 * length || s > 1.3 * length || lateral >= best) return;
    best = lateral;
    along = (-nz * dx + nx * dz >= 0 ? s : -s) + i * ORKHON_FLANK_OFFSET;
  });
  return along;
}

/**
 * Painting coordinates of a steep pixel's side projections, mirroring the shader: x-facing
 * slopes use (∓height, z) and z-facing slopes (x, ∓height), signed so that each advances uphill
 * in the same direction as the top projection (x, z). The paintings are therefore never turned
 * or mirrored on the shoulders, and the painted light stays upper left. `n` is the unit normal.
 */
export function orkhonSideProjection(
  x: number,
  y: number,
  z: number,
  n: readonly [number, number, number],
): { x: [number, number]; z: [number, number] } {
  return { x: [(n[0] < 0 ? 1 : -1) * y, z], z: [x, (n[2] < 0 ? 1 : -1) * y] };
}
