import { MountainTerrain } from './MountainTerrain';
import { TERRAIN_MATERIALS, type TerrainArt, type TerrainChunk, type TerrainSample } from './types';

export interface TerrainLayerGeometry {
  material: (typeof TERRAIN_MATERIALS)[number];
  texture: string;
  vertices: number[];
  uvs: number[];
  indices: number[];
  colors: number[];
  alphas: number[];
}

export function shadedColor(color: number, shade: number): number {
  const channel = (shift: number) =>
    Math.max(0, Math.min(255, Math.round(((color >>> shift) & 255) * shade)));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

function coordinates(start: number, length: number, cellSize: number, repeat: number): number[] {
  const points = new Set([start, start + length]);
  for (let point = start + cellSize; point < start + length; point += cellSize) points.add(point);
  // Split faces at texture wrap boundaries. This also supports non-power-of-two source PNGs
  // without resizing them or relying on unsupported WebGL 1 repeat modes.
  for (let tile = Math.floor(start / repeat) + 1; tile * repeat < start + length; tile++)
    points.add(tile * repeat);
  return [...points].sort((a, b) => a - b);
}

/** Existing images only: static 2D triangles, global UV registration, and interpolated material alpha. */
export function terrainSurface(
  terrain: MountainTerrain,
  chunk: TerrainChunk,
  art: TerrainArt,
  sizes: Readonly<Record<string, { width: number; height: number }>>,
): readonly TerrainLayerGeometry[] {
  const samples = new Map(chunk.vertices.map((sample) => [`${sample.x},${sample.y}`, sample]));
  const sampleAt = (x: number, y: number): TerrainSample => {
    const key = `${x},${y}`;
    let sample = samples.get(key);
    if (!sample) {
      sample = terrain.sample(x, y);
      samples.set(key, sample);
    }
    return sample;
  };
  return TERRAIN_MATERIALS.flatMap((material, layer) => {
    const definition = art.materials[material];
    const texture = definition.texture ?? '__WHITE';
    const dimensions = sizes[texture] ?? { width: 1254, height: 1254 };
    const repeatX = dimensions.width * art.tileScale;
    const repeatY = dimensions.height * art.tileScale;
    const xs = coordinates(chunk.x, chunk.width, terrain.cellSize, repeatX);
    const ys = coordinates(chunk.y, chunk.height, terrain.cellSize, repeatY);
    const geometry: TerrainLayerGeometry = {
      material,
      texture,
      vertices: [],
      uvs: [],
      indices: [],
      colors: [],
      alphas: [],
    };
    for (let row = 0; row < ys.length - 1; row++)
      for (let column = 0; column < xs.length - 1; column++) {
        const left = xs[column]!;
        const right = xs[column + 1]!;
        const top = ys[row]!;
        const bottom = ys[row + 1]!;
        const corners = [
          sampleAt(left, top),
          sampleAt(right, top),
          sampleAt(left, bottom),
          sampleAt(right, bottom),
        ];
        const alpha = corners.map((sample) => {
          if (!layer) return 1;
          const sum = sample.weights.slice(0, layer + 1).reduce((a, b) => a + b, 0);
          return sum > 0 ? sample.weights[layer]! / sum : 0;
        });
        if (alpha.every((value) => value === 0)) continue;
        const tileX = Math.floor((left + right) / 2 / repeatX) * repeatX;
        const tileY = Math.floor((top + bottom) / 2 / repeatY) * repeatY;
        const base = geometry.vertices.length / 2;
        for (let corner = 0; corner < corners.length; corner++) {
          const sample = corners[corner]!;
          geometry.vertices.push(
            sample.x - chunk.x - chunk.width / 2,
            -(sample.y - chunk.y - chunk.height / 2),
          );
          geometry.uvs.push(
            definition.texture ? (sample.x - tileX) / repeatX : 0.5,
            definition.texture ? (sample.y - tileY) / repeatY : 0.5,
          );
          geometry.colors.push(
            shadedColor(definition.texture ? 0xffffff : definition.color, sample.shade),
          );
          geometry.alphas.push(alpha[corner]!);
        }
        geometry.indices.push(base, base + 2, base + 1, base + 2, base + 3, base + 1);
      }
    return geometry.indices.length ? [geometry] : [];
  });
}
