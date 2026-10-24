import { MountainTerrain } from '../terrain/MountainTerrain';
import { clamp01, coherentNoise, mix, smoothstep } from '../terrain/noise';
import type { MountainRegion, TerrainCell, TerrainSample } from '../terrain/types';
import { WORLD_3D } from './worldProjection';

export interface HeightNode {
  x: number;
  z: number;
  base: number;
  rise: number;
  field: number;
}

/** A continuous mountain field with one fractured shelf, rather than repeated elevation rings. */
export class MountainHeightfield extends MountainTerrain {
  private readonly nodes = new Map<string, HeightNode>();
  private readonly normals = new Map<string, readonly [number, number, number]>();

  constructor(region: MountainRegion, worldSize?: number) {
    super(region, worldSize);
    const geometry = region.geometry;
    if (geometry) {
      const { shelf, ramp } = geometry;
      if (
        ![geometry.walkSlope, ...Object.values(shelf), ...Object.values(ramp)].every(
          Number.isFinite,
        ) ||
        geometry.walkSlope <= 0 ||
        shelf.width <= 0 ||
        shelf.depth <= 0 ||
        shelf.rise < 0 ||
        shelf.flatten < 0 ||
        shelf.flatten > 1 ||
        ramp.wavelength <= 0 ||
        ramp.length <= 0 ||
        ramp.halfWidth <= 0 ||
        ramp.shoulder <= ramp.halfWidth
      )
        throw new Error('Invalid 3D mountain shelf, ramp or traversal configuration');
    }
  }

  override terraceStrength(x: number, z: number): number {
    return clamp01(this.nodeValue(x, z).rise / (this.region.geometry?.shelf.rise || 1));
  }

  private nodeValue(x: number, z: number): HeightNode {
    const center = this.worldSize / 2;
    const protectedGround = this.protection(x, z);
    const raw = super.rawHeight(x, z);
    const geometry = this.region.geometry;
    if (!geometry) return { x, z, base: raw * this.region.biome.heightScale, rise: 0, field: -1 };
    const { shelf, ramp: approach } = geometry;
    const warp = coherentNoise(x / 260, z / 260, this.seed + 71) - 0.5;
    const field =
      1 -
      Math.pow((x - center - shelf.x) / shelf.width, 2) -
      Math.pow((z - center - shelf.z) / shelf.depth, 2) +
      warp * shelf.fracture;
    // A broad winding route grades from the camp basin to the western shelf.
    // Grade the base as well as removing the wall, so the approach really connects.
    const rampX =
      center + approach.x + Math.sin((z - center) / approach.wavelength) * approach.bend;
    const ramp = 1 - smoothstep(approach.halfWidth, approach.shoulder, Math.abs(x - rampX));
    const rampHeight = mix(
      this.region.biome.valleyElevation,
      approach.elevation,
      smoothstep(0, 1, (center + approach.start - z) / approach.length),
    );
    const rise = shelf.rise * (1 - ramp) * (1 - protectedGround);
    const flatten = smoothstep(-0.5, 0.45, field) * shelf.flatten;
    let base = mix(raw, shelf.elevation + (raw - shelf.elevation) * 0.18, flatten);
    base = mix(base, rampHeight, ramp);
    // Broad foothills survive below the shelf and the connected high ridges remain continuous.
    base = mix(base, this.region.biome.valleyElevation, protectedGround);
    return { x, z, base: base * this.region.biome.heightScale, rise, field };
  }

  node(x: number, z: number): HeightNode {
    const key = `${x},${z}`;
    let node = this.nodes.get(key);
    if (!node) {
      node = this.nodeValue(x, z);
      this.nodes.set(key, node);
      if (this.nodes.size > 32768) this.nodes.delete(this.nodes.keys().next().value!);
    }
    return node;
  }

  get cachedHeightNodes(): number {
    return this.nodes.size;
  }

  cellNodes(x: number, z: number): readonly [HeightNode, HeightNode, HeightNode, HeightNode] {
    const step = WORLD_3D.meshStep;
    const x0 = Math.floor(x / step) * step;
    const z0 = Math.floor(z / step) * step;
    const x1 = x0 < this.worldSize ? Math.min(this.worldSize, x0 + step) : x0 + step;
    const z1 = z0 < this.worldSize ? Math.min(this.worldSize, z0 + step) : z0 + step;
    return [this.node(x0, z0), this.node(x1, z0), this.node(x1, z1), this.node(x0, z1)];
  }

  /** Exact piecewise-linear surface used by the mesh, including its clipped cliff boundary. */
  override height(x: number, z: number): number {
    const [a, b, c, d] = this.cellNodes(x, z);
    const u = (x - a.x) / (b.x - a.x);
    const v = (z - a.z) / (d.z - a.z);
    const vertices = v <= u ? [a, b, c] : [a, c, d];
    const weights = v <= u ? [1 - u, u - v, v] : [1 - v, u, v - u];
    const interpolate = (key: 'base' | 'rise' | 'field'): number =>
      vertices.reduce((sum, node, i) => sum + node[key] * weights[i]!, 0);
    return (
      (interpolate('base') + (interpolate('field') >= 0 ? interpolate('rise') : 0)) /
      this.region.biome.heightScale
    );
  }

  /** Normals use the same side of the wall; never average a top normal through a vertical face. */
  normal(x: number, z: number, upper: boolean): readonly [number, number, number] {
    const key = `${x},${z},${upper}`;
    const cached = this.normals.get(key);
    if (cached) return cached;
    const h = (px: number, pz: number): number => {
      const node = this.nodeValue(px, pz);
      return node.base + (upper ? node.rise : 0);
    };
    const dx = (h(x + 8, z) - h(x - 8, z)) / 16;
    const dz = (h(x, z + 8) - h(x, z - 8)) / 16;
    const length = Math.hypot(dx, 1, dz);
    const normal = [-dx / length, 1 / length, -dz / length] as const;
    this.normals.set(key, normal);
    if (this.normals.size > 32768) this.normals.delete(this.normals.keys().next().value!);
    return normal;
  }

  override sample(x: number, y: number): TerrainSample {
    const sample = super.sample(x, y);
    const { field, rise } = this.nodeValue(x, y);
    sample.rawElevation = sample.elevation;
    sample.level = this.region.biome.terraces.thresholds.filter(
      (threshold) => sample.elevation >= threshold,
    ).length;
    sample.cliff = (1 - smoothstep(0, 0.1, Math.abs(field))) * clamp01(rise / 160);
    sample.landform =
      this.protection(x, y) > 0.8
        ? 'basin'
        : sample.cliff > 0.4
          ? 'cliff'
          : field >= 0 && sample.slope < 0.5
            ? 'shelf'
            : sample.elevation > 0.68
              ? 'summit'
              : sample.elevation < 0.25
                ? 'pass'
                : 'ridge';
    return sample;
  }

  wallNormal(x: number, z: number): readonly [number, number, number] {
    const dx = this.nodeValue(x + 8, z).field - this.nodeValue(x - 8, z).field;
    const dz = this.nodeValue(x, z + 8).field - this.nodeValue(x, z - 8).field;
    const length = Math.hypot(dx, dz) || 1;
    return [-dx / length, 0, -dz / length];
  }

  override cell(column: number, row: number): TerrainCell {
    const cell = super.cell(column, row);
    // Conservative 16-unit probes cover a vertical face anywhere inside the 64-unit cell.
    // This shares the rendered discontinuity, rather than hoping its centre sample hits a wall.
    const heights: number[] = [];
    for (let j = 0; j <= cell.height; j += 16)
      for (let i = 0; i <= cell.width; i += 16)
        heights.push(this.height(cell.x + i, cell.y + j) * this.region.biome.heightScale);
    const columns = Math.floor(cell.width / 16) + 1;
    let steep = false;
    for (let i = 0; i < heights.length; i++) {
      if (
        i % columns &&
        Math.abs(heights[i]! - heights[i - 1]!) / 16 > (this.region.geometry?.walkSlope ?? 0.85)
      )
        steep = true;
      if (
        i >= columns &&
        Math.abs(heights[i]! - heights[i - columns]!) / 16 >
          (this.region.geometry?.walkSlope ?? 0.85)
      )
        steep = true;
    }
    cell.blocked = steep || cell.sample.slope > (this.region.geometry?.walkSlope ?? 0.85);
    return cell;
  }
}
