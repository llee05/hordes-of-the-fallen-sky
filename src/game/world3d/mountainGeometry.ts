import { MountainHeightfield, type HeightNode } from './MountainHeightfield';
import { WORLD_3D } from './worldProjection';
import type { TerrainBounds } from '../terrain/types';

export interface WorldGeometry {
  positions: number[];
  normals: number[];
  weights: number[];
  occlusion: number[];
}
export interface MountainGeometry {
  surface: WorldGeometry;
  walls: WorldGeometry;
}
const empty = (): WorldGeometry => ({ positions: [], normals: [], weights: [], occlusion: [] });

/** Canonical edge interpolation gives identical cliff endpoints on either side of a chunk seam. */
function crossing(a: HeightNode, b: HeightNode): HeightNode {
  if (a.x > b.x || (a.x === b.x && a.z > b.z)) return crossing(b, a);
  const t = a.field / (a.field - b.field);
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
    base: a.base + (b.base - a.base) * t,
    rise: a.rise + (b.rise - a.rise) * t,
    field: 0,
  };
}

function clip(nodes: readonly HeightNode[], upper: boolean): HeightNode[] {
  const result: HeightNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]!;
    const b = nodes[(i + 1) % nodes.length]!;
    const inside = upper ? a.field >= 0 : a.field <= 0;
    const next = upper ? b.field >= 0 : b.field <= 0;
    if (inside) result.push(a);
    if (inside !== next) result.push(crossing(a, b));
  }
  return result;
}

export function mountainGeometry(
  terrain: MountainHeightfield,
  bounds: TerrainBounds,
): MountainGeometry {
  const result = { surface: empty(), walls: empty() };
  const scale = terrain.region.biome.heightScale;
  const samples = new Map<string, ReturnType<MountainHeightfield['sample']>>();
  const emit = (
    geometry: WorldGeometry,
    node: HeightNode,
    upper: boolean,
    normal?: readonly number[],
    ao = 1,
  ): void => {
    const h = node.base + (upper ? node.rise : 0);
    geometry.positions.push(node.x, h, node.z);
    const n = normal ?? terrain.normal(node.x, node.z, upper);
    geometry.normals.push(n[0]!, n[1]!, n[2]!);
    const key = `${node.x},${node.z},${upper}`;
    let sample = samples.get(key);
    if (!sample) {
      sample = terrain.sample(node.x, node.z);
      samples.set(key, sample);
    }
    const elevation = h / scale;
    const snow =
      Math.max(0, Math.min(1, (elevation - 0.55) / 0.3)) * Math.pow(Math.max(0, n[1]!), 2);
    const rock = Math.min(1, (1 - Math.max(0, n[1]!)) * 3);
    const soil = Math.max(0, 1 - (elevation - 0.2) / 0.2);
    const tundra = 1 - soil;
    const sheltered = sample.depression * 0.2;
    const ice = Math.min(1, Math.max(0, (elevation - 0.83) / 0.15) * 0.6);
    const scree = !upper && Math.abs(node.field) < 0.13 ? 0.35 : 0;
    const s = Math.min(1, snow + sheltered * (1 - snow));
    geometry.weights.push(
      (1 - s) * (1 - rock) * soil * 0.7,
      (1 - s) * (1 - rock) * soil * 0.3,
      (1 - s) * rock,
      (1 - s) * (1 - rock) * tundra,
      s * (1 - ice),
      s * ice,
      scree,
    );
    geometry.occlusion.push(ao);
  };
  for (let z = bounds.y; z < bounds.y + bounds.height; z += WORLD_3D.meshStep)
    for (let x = bounds.x; x < bounds.x + bounds.width; x += WORLD_3D.meshStep) {
      const x1 = Math.min(x + WORLD_3D.meshStep, bounds.x + bounds.width);
      const z1 = Math.min(z + WORLD_3D.meshStep, bounds.y + bounds.height);
      const a = terrain.node(x, z);
      const b = terrain.node(x1, z);
      const c = terrain.node(x1, z1);
      const d = terrain.node(x, z1);
      for (const triangle of [
        [a, c, b],
        [a, d, c],
      ]) {
        for (const upper of [false, true]) {
          const polygon = clip(triangle, upper);
          for (let i = 1; i + 1 < polygon.length; i++)
            for (const node of [polygon[0]!, polygon[i]!, polygon[i + 1]!]) {
              const contact = !upper
                ? 1 -
                  Math.max(0, 1 - Math.abs(node.field) / 0.07) * Math.min(1, node.rise / 160) * 0.22
                : 1;
              emit(result.surface, node, upper, undefined, contact);
            }
        }
        const edge: HeightNode[] = [];
        for (let i = 0; i < 3; i++) {
          const p = triangle[i]!;
          const q = triangle[(i + 1) % 3]!;
          if (p.field < 0 !== q.field < 0) edge.push(crossing(p, q));
        }
        if (edge.length !== 2 || Math.max(edge[0]!.rise, edge[1]!.rise) < 0.1) continue;
        let [p, q] = edge as [HeightNode, HeightNode];
        // Face outward from the high polygon, with a true vertical normal.
        const high = triangle.find((node) => node.field >= 0)!;
        if ((q.z - p.z) * (high.x - p.x) - (q.x - p.x) * (high.z - p.z) > 0) [p, q] = [q, p];
        const length = Math.hypot(q.x - p.x, q.z - p.z);
        const normal = [(q.z - p.z) / length, 0, -(q.x - p.x) / length];
        for (const [node, upper] of [
          [p, false],
          [p, true],
          [q, true],
          [p, false],
          [q, true],
          [q, false],
        ] as const)
          emit(result.walls, node, upper, normal, upper ? 1 : 0.62);
      }
    }
  return result;
}
