import { appendCliffFace } from './cliffGeometry';
import type { TerrainBounds } from '../terrain/types';
import { terrainHabitat, terrainMaterialWeights } from './terrainHabitat';
import { ComposedTerrain } from './ComposedTerrain';
import type { HeightNode } from './MountainHeightfield';
import type { MountainGeometry, WorldGeometry } from './mountainGeometry';
import { WORLD_3D } from './worldProjection';

type LayerNode = HeightNode & { layers: NonNullable<HeightNode['layers']> };
interface Region {
  polygon: LayerNode[];
  mask: number;
}
const empty = (): WorldGeometry => ({ positions: [], normals: [], weights: [], occlusion: [] });

function intersection(a: LayerNode, b: LayerNode, layer: number): LayerNode {
  if (a.x > b.x || (a.x === b.x && a.z > b.z)) return intersection(b, a, layer);
  const t = a.layers[layer]!.field / (a.layers[layer]!.field - b.layers[layer]!.field);
  const lerp = (x: number, y: number) => x + (y - x) * t;
  const layers = a.layers.map((value, i) => ({
    field: i === layer ? 0 : lerp(value.field, b.layers[i]!.field),
    rise: lerp(value.rise, b.layers[i]!.rise),
  }));
  return {
    x: lerp(a.x, b.x),
    z: lerp(a.z, b.z),
    base: lerp(a.base, b.base),
    field: 0,
    rise: 0,
    layers,
  };
}

function clip(polygon: LayerNode[], layer: number, upper: boolean): LayerNode[] {
  const result: LayerNode[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    const inside = upper ? a.layers[layer]!.field >= 0 : a.layers[layer]!.field <= 0;
    const next = upper ? b.layers[layer]!.field >= 0 : b.layers[layer]!.field <= 0;
    if (inside) result.push(a);
    if (inside !== next) result.push(intersection(a, b, layer));
  }
  return result;
}

/** Split the same world triangles at every geological layer, then join their exposed vertical sides. */
export function sceneGeometry(terrain: ComposedTerrain, bounds: TerrainBounds): MountainGeometry {
  const surface = empty();
  const walls = empty();
  const emit = (
    geometry: WorldGeometry,
    node: LayerNode,
    mask: number,
    normal?: readonly [number, number, number],
    ao = 1,
  ): void => {
    const y =
      node.base +
      node.layers.reduce((sum, layer, i) => sum + (mask & (1 << i) ? layer.rise : 0), 0);
    const n = normal ?? terrain.normalOn(node.x, node.z, mask);
    geometry.positions.push(node.x, y, node.z);
    geometry.normals.push(...n);
    geometry.occlusion.push(ao);
    const habitat = terrainHabitat(terrain, node.x, node.z, y, n[1]);
    geometry.weights.push(...terrainMaterialWeights(terrain, y, n[1], habitat));
  };
  for (let z = bounds.y; z < bounds.y + bounds.height; z += WORLD_3D.meshStep)
    for (let x = bounds.x; x < bounds.x + bounds.width; x += WORLD_3D.meshStep) {
      const x1 = Math.min(x + WORLD_3D.meshStep, bounds.x + bounds.width);
      const z1 = Math.min(z + WORLD_3D.meshStep, bounds.y + bounds.height);
      const [a, b, c, d] = [
        terrain.node(x, z),
        terrain.node(x1, z),
        terrain.node(x1, z1),
        terrain.node(x, z1),
      ] as LayerNode[];
      for (const triangle of [
        [a!, c!, b!],
        [a!, d!, c!],
      ]) {
        let regions: Region[] = [{ polygon: triangle, mask: 0 }];
        for (let layer = 0; layer < a!.layers.length; layer++) {
          const next: Region[] = [];
          for (const region of regions)
            for (const upper of [false, true]) {
              const polygon = clip(region.polygon, layer, upper);
              if (polygon.length >= 3)
                next.push({ polygon, mask: region.mask | (upper ? 1 << layer : 0) });
            }
          regions = next;
        }
        for (const { polygon, mask } of regions) {
          for (let i = 1; i + 1 < polygon.length; i++)
            for (const node of [polygon[0]!, polygon[i]!, polygon[i + 1]!]) {
              const contact = node.layers.some(
                (layer, j) => !(mask & (1 << j)) && Math.abs(layer.field) < 35 && layer.rise > 90,
              )
                ? 0.78
                : 1;
              emit(surface, node, mask, undefined, contact);
            }
          for (let edge = 0; edge < polygon.length; edge++) {
            const p = polygon[edge]!;
            const q = polygon[(edge + 1) % polygon.length]!;
            for (let layer = 0; layer < p.layers.length; layer++) {
              if (
                !(mask & (1 << layer)) ||
                Math.abs(p.layers[layer]!.field) > 1e-7 ||
                Math.abs(q.layers[layer]!.field) > 1e-7 ||
                Math.max(p.layers[layer]!.rise, q.layers[layer]!.rise) < 0.1 ||
                Math.hypot(p.x - q.x, p.z - q.z) < 1e-8
              )
                continue;
              const lower = mask & ~(1 << layer);
              const normal = terrain.cliffNormal(p.x, p.z, layer);
              // Front-face winding must agree with the outward normal; otherwise
              // double-sided lighting flips the visible cliff into permanent darkness.
              const forward = (q.z - p.z) * normal[0] - (q.x - p.x) * normal[2] >= 0;
              const a = forward ? p : q;
              const b = forward ? q : p;
              const anchor = (node: LayerNode) => {
                const bottom =
                  node.base +
                  node.layers.reduce(
                    (sum, value, i) => sum + (lower & (1 << i) ? value.rise : 0),
                    0,
                  );
                return { x: node.x, z: node.z, bottom, top: bottom + node.layers[layer]!.rise };
              };
              appendCliffFace(walls, terrain, anchor(a), anchor(b), layer);
            }
          }
        }
      }
    }
  return { surface, walls };
}
