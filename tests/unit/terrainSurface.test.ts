import { describe, expect, it } from 'vitest';
import { MountainTerrain } from '../../src/game/terrain/MountainTerrain';
import { OTGONTENGER_MOUNTAINS } from '../../src/game/data/terrainBiomes';
import { terrainSurface } from '../../src/game/terrain/terrainSurface';
import type { TerrainArt } from '../../src/game/terrain/types';

const art: TerrainArt = {
  tileScale: 0.65,
  materials: {
    grassland: { texture: 'grass', color: 0xa7ad72 },
    'rocky-soil': { texture: 'soil', color: 0xb49672 },
    stone: { color: 0x92958e },
    tundra: { texture: 'tundra', color: 0xa3ad9c },
    snow: { texture: 'snow', color: 0xe2e9e8 },
  },
  cliff: { color: 0x5c625e, rim: 0xbbbca8 },
};
const sizes = Object.fromEntries(
  ['grass', 'soil', 'tundra', 'snow'].map((key) => [key, { width: 1254, height: 1254 }]),
);

describe('terrain material meshes', () => {
  it('keeps finite registered geometry and UVs inside non-power-of-two source textures', () => {
    const terrain = new MountainTerrain(OTGONTENGER_MOUNTAINS);
    let blendedVertices = 0;
    for (const [column, row] of [
      [0, 0],
      [1, 1],
      [3, 2],
      [10, 10],
    ] as const) {
      const chunk = terrain.getChunk(column, row);
      const layers = terrainSurface(terrain, chunk, art, sizes);
      expect(layers[0]?.material).toBe('grassland');
      for (const layer of layers) {
        const count = layer.vertices.length / 2;
        expect(layer.uvs.length).toBe(layer.vertices.length);
        expect(layer.alphas.length).toBe(count);
        expect(layer.colors.length).toBe(count);
        expect(layer.vertices.every(Number.isFinite)).toBe(true);
        expect(layer.uvs.every((uv) => uv >= -0.000001 && uv <= 1.000001)).toBe(true);
        expect(layer.indices.every((index) => index >= 0 && index < count)).toBe(true);
        expect(layer.alphas.every((alpha) => alpha >= 0 && alpha <= 1)).toBe(true);
        if (layer.material === 'grassland')
          expect(layer.alphas.every((alpha) => alpha === 1)).toBe(true);
        else blendedVertices += layer.alphas.filter((alpha) => alpha > 0 && alpha < 1).length;
        for (let vertex = 0; vertex < count; vertex++) {
          expect(Math.abs(layer.vertices[vertex * 2]!)).toBeLessThanOrEqual(chunk.width / 2);
          expect(Math.abs(layer.vertices[vertex * 2 + 1]!)).toBeLessThanOrEqual(chunk.height / 2);
        }
      }
    }
    expect(blendedVertices).toBeGreaterThan(20);
  });

  it('matches interpolated opacity and shading at independently rendered chunk edges', () => {
    const terrain = new MountainTerrain(OTGONTENGER_MOUNTAINS);
    const a = terrain.getChunk(0, 0);
    const b = terrain.getChunk(1, 0);
    const left = terrainSurface(terrain, a, art, sizes);
    const right = terrainSurface(terrain, b, art, sizes);
    for (const layer of left) {
      const other = right.find((entry) => entry.material === layer.material);
      for (let vertex = 0; vertex < layer.alphas.length; vertex++) {
        if (layer.vertices[vertex * 2] !== a.width / 2 || layer.alphas[vertex] === 0) continue;
        expect(other).toBeDefined();
        const y = layer.vertices[vertex * 2 + 1];
        const match =
          other!.vertices.findIndex(
            (coordinate, index) =>
              index % 2 === 0 && coordinate === -b.width / 2 && other!.vertices[index + 1] === y,
          ) / 2;
        expect(match).toBeGreaterThanOrEqual(0);
        expect(other!.alphas[match]).toBe(layer.alphas[vertex]);
        expect(other!.colors[match]).toBe(layer.colors[vertex]);
      }
    }
  });
});
