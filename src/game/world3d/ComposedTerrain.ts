import type { ComposedRegion, SceneShelf } from '../data/worldRegions';
import { coherentNoise, fractalNoise, smoothstep } from '../terrain/noise';
import type { TerrainBounds } from '../terrain/types';
import { MountainHeightfield, type HeightNode } from './MountainHeightfield';
import type { RiverDefinition } from '../assets/riverGeometry';
import { WorldRiver } from './WorldRiver';

/** Multiple overlapping geological shelves with authored approaches and a protected battle floor. */
export class ComposedTerrain extends MountainHeightfield {
  declare readonly region: ComposedRegion;
  private readonly surfaceNormals = new Map<string, readonly [number, number, number]>();
  readonly river?: WorldRiver;
  constructor(region: ComposedRegion, water?: RiverDefinition) {
    super(region);
    if (water) this.river = new WorldRiver(water, this.worldSize / 2, region.scene.floor);
    if (region.scene.shelves.length > 8)
      throw new Error('A composed scene supports up to eight shelf layers');
    for (const shelf of region.scene.shelves)
      if (
        shelf.width <= 0 ||
        shelf.depth <= 0 ||
        shelf.rise < 0 ||
        !Object.values(shelf)
          .filter((value) => typeof value === 'number')
          .every(Number.isFinite)
      )
        throw new Error('Invalid scene shelf');
  }

  override protection(x: number, z: number): number {
    const cx = x - this.worldSize / 2;
    const cz = z - this.worldSize / 2;
    const camp = 1 - smoothstep(350, 470, Math.hypot(cx, cz));
    const roadX = Math.max(-320, Math.min(this.region.biome.caravan.length, cx));
    const distance = Math.hypot(cx - roadX, Math.max(0, Math.abs(cz) - 240));
    return Math.max(camp, 1 - smoothstep(0, 110, distance));
  }

  private field(shelf: SceneShelf, x: number, z: number): number {
    const turn = (shelf.turn * Math.PI) / 180;
    const dx = x - this.worldSize / 2 - shelf.x;
    const dz = z - this.worldSize / 2 - shelf.z;
    const u = dx * Math.cos(turn) + dz * Math.sin(turn);
    const v = -dx * Math.sin(turn) + dz * Math.cos(turn);
    const fracture =
      (coherentNoise(x / 170, z / 170, this.seed + shelf.rise) - 0.5) * shelf.fracture;
    // Broad chamfered masses expose front and side planes at the diagonal camera.
    return (
      Math.min(
        shelf.width - Math.abs(u),
        shelf.depth - Math.abs(v),
        (shelf.width + shelf.depth) * 0.88 - Math.abs(u) - Math.abs(v),
      ) + fracture
    );
  }

  private exposedField(shelf: SceneShelf, x: number, z: number): number {
    return Math.min(
      this.field(shelf, x, z),
      (this.river?.distance(x, z) ?? Infinity) - (this.river?.definition.width ?? 0) * 0.9 - 40,
    );
  }

  protected override nodeValue(x: number, z: number): HeightNode {
    const scene = this.region.scene;
    const protection = this.protection(x, z);
    const wx = x + (coherentNoise(x / 1700, z / 1700, this.seed + 3) - 0.5) * 180;
    const wz = z + (coherentNoise(x / 1700, z / 1700, this.seed + 7) - 0.5) * 180;
    const ridge = fractalNoise(wx / 1000, wz / 600, this.seed + 19, true);
    const hill =
      (coherentNoise(wx / 380, wz / 380, this.seed + 41) - 0.5) * 20 + (ridge - 0.5) * 32;
    const riverDistance = this.river?.distance(x, z) ?? Infinity;
    const bank = this.river
      ? smoothstep(
          this.river.definition.width * 0.6 + 24,
          this.river.definition.width * 0.9 + 64,
          riverDistance,
        )
      : 1;
    let base = scene.floor + hill * (1 - protection) * bank - 8 * (1 - bank);
    const layers = scene.shelves.map((shelf) => {
      const shelter = shelf.camp ? 0 : protection;
      const field = this.exposedField(shelf, x, z);
      let ramp = 0;
      let grade = 0;
      for (const approach of [shelf.ramp, ...(shelf.approaches ?? [])]) {
        if (!approach) continue;
        const a = approach.start;
        const b = approach.end;
        const px = x - this.worldSize / 2 - a.x;
        const pz = z - this.worldSize / 2 - a.y;
        const dx = b.x - a.x;
        const dz = b.y - a.y;
        const t = Math.max(0, Math.min(1, (px * dx + pz * dz) / (dx * dx + dz * dz)));
        const distance = Math.hypot(px - dx * t, pz - dz * t);
        const strength = 1 - smoothstep(approach.halfWidth, approach.shoulder, distance);
        if (strength > ramp) {
          ramp = strength;
          grade = smoothstep(0, 1, t);
        }
      }
      const peak =
        (shelf.peak ?? 0) *
        (0.55 + ridge * 0.45) *
        Math.pow(Math.max(0, Math.min(1, field / Math.min(shelf.width, shelf.depth))), 1.3);
      const weathering = shelf.camp
        ? 1
        : 1 + (coherentNoise(x / 240, z / 270, this.seed + 719) - 0.5) * 0.07;
      const height = shelf.rise * weathering + peak;
      base += height * ramp * grade * (1 - shelter) * bank;
      return { field, rise: height * (1 - ramp) * (1 - shelter) };
    });
    const strongest = layers.reduce((a, b) => (a.field > b.field ? a : b), {
      field: -1e6,
      rise: 0,
    });
    return { x, z, base, rise: strongest.rise, field: strongest.field, layers };
  }

  override rawHeight(x: number, z: number): number {
    return this.height(x, z);
  }
  override actorHeight(x: number, z: number): number {
    return Math.max(
      this.height(x, z),
      (this.river?.bridgeHeight(x, z) ?? -Infinity) / this.region.biome.heightScale,
    );
  }
  override terraceStrength(x: number, z: number): number {
    const node = this.node(x, z);
    return Math.max(0, ...node.layers!.map((layer) => Math.min(1, layer.rise / 120)));
  }

  normalOn(x: number, z: number, mask: number): readonly [number, number, number] {
    const key = `${x},${z},${mask}`;
    const old = this.surfaceNormals.get(key);
    if (old) return old;
    const h = (px: number, pz: number) => {
      const node = this.node(px, pz);
      return (
        node.base +
        node.layers!.reduce((sum, layer, i) => sum + (mask & (1 << i) ? layer.rise : 0), 0)
      );
    };
    const dx = (h(x + 32, z) - h(x - 32, z)) / 64;
    const dz = (h(x, z + 32) - h(x, z - 32)) / 64;
    const length = Math.hypot(dx, 1, dz);
    const normal = [-dx / length, 1 / length, -dz / length] as const;
    this.surfaceNormals.set(key, normal);
    if (this.surfaceNormals.size > 32768)
      this.surfaceNormals.delete(this.surfaceNormals.keys().next().value!);
    return normal;
  }

  cliffNormal(x: number, z: number, layer: number): readonly [number, number, number] {
    const shelf = this.region.scene.shelves[layer]!;
    const dx = this.exposedField(shelf, x + 8, z) - this.exposedField(shelf, x - 8, z);
    const dz = this.exposedField(shelf, x, z + 8) - this.exposedField(shelf, x, z - 8);
    const length = Math.hypot(dx, dz) || 1;
    return [-dx / length, 0, -dz / length];
  }

  heightRange(bounds: TerrainBounds): { min: number; max: number } {
    let max = this.region.scene.floor + 12;
    for (const shelf of this.region.scene.shelves) {
      const turn = (shelf.turn * Math.PI) / 180;
      const ex =
        Math.abs(Math.cos(turn)) * shelf.width + Math.abs(Math.sin(turn)) * shelf.depth + 32;
      const ez =
        Math.abs(Math.sin(turn)) * shelf.width + Math.abs(Math.cos(turn)) * shelf.depth + 32;
      const cx = this.worldSize / 2 + shelf.x;
      const cz = this.worldSize / 2 + shelf.z;
      if (
        bounds.x + bounds.width >= cx - ex &&
        bounds.x <= cx + ex &&
        bounds.y + bounds.height >= cz - ez &&
        bounds.y <= cz + ez
      )
        max += shelf.rise * 1.04 + (shelf.peak ?? 0);
    }
    return { min: this.region.scene.floor - 24, max };
  }

  get reliefHeight(): number {
    return this.region.scene.shelves.reduce(
      (sum, shelf) => sum + shelf.rise * 1.04 + (shelf.peak ?? 0),
      0,
    );
  }
  snowAt(height: number, normalY: number): number {
    return (
      smoothstep(this.region.scene.snowLine - 75, this.region.scene.snowLine + 140, height) *
      Math.max(0, normalY)
    );
  }
}
