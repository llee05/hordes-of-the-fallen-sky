import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import { OTGONTENGER_MOUNTAINS } from '../../src/game/data/terrainBiomes';
import { MountainTerrain } from '../../src/game/terrain/MountainTerrain';
import { terrainContours } from '../../src/game/terrain/terrainContours';
import { terrainLighting } from '../../src/game/terrain/terrainLighting';
import { terrainRelief } from '../../src/game/terrain/terrainRelief';
import type { TerrainArt } from '../../src/game/terrain/types';

const art: TerrainArt = {
  tileScale: 0.65,
  materials: {
    grassland: { color: 0xa7ad72 },
    'rocky-soil': { color: 0xb49672 },
    stone: { color: 0x92958e },
    tundra: { color: 0xa3ad9c },
    snow: { color: 0xe2e9e8 },
  },
  cliff: { color: 0x777b72, rim: 0xb7b79f },
};

describe('continuous terrain contours', () => {
  it('shares exact crossings across independently sampled chunks and clips partial edges', () => {
    const height = (x: number, y: number) => Math.sin(x / 1000) + y / 700;
    const levels = [0.5, 0.8, 1.1];
    const left = terrainContours({ x: 0, y: 0, width: 512, height: 512 }, 32, levels, height);
    const right = terrainContours({ x: 512, y: 0, width: 88, height: 512 }, 32, levels, height);
    const crossings = (segments: typeof left) =>
      segments
        .flatMap(({ a, b }) => [a, b])
        .filter((point) => point.x === 512)
        .sort((a, b) => a.y - b.y);
    expect(crossings(left).length).toBeGreaterThan(0);
    expect(crossings(right)).toEqual(crossings(left));
    expect(right.flatMap(({ a, b }) => [a.x, b.x]).every((x) => x >= 512 && x <= 600)).toBe(true);
    expect(left.some(({ a, b }) => a.x !== b.x && a.y !== b.y)).toBe(true);
  });

  it('resolves saddle topology deterministically and omits flat or zero-length contours', () => {
    const bounds = { x: 0, y: 0, width: 32, height: 32 };
    const saddle = terrainContours(bounds, 32, [0], (x, y) => (x === y ? 1 : -0.4));
    expect(saddle).toHaveLength(2);
    expect(saddle[0]!.a.y).toBe(0);
    expect(saddle[0]!.b.x).toBe(32);
    expect(saddle[1]!.a.y).toBe(32);
    expect(saddle[1]!.b.x).toBe(0);
    expect(terrainContours(bounds, 32, [0.5], () => 0.5)).toEqual([]);
    expect(terrainContours(bounds, 32, [0], (x, y) => x + y)).toEqual([]);
  });
});

describe('heightfield relief presentation', () => {
  it('joins face, rim, and fading shadow geometry exactly across chunk boundaries', () => {
    const terrain = new MountainTerrain(OTGONTENGER_MOUNTAINS, 1024);
    terrain.height = (_x, y) => 0.8 - y / 450;
    const a = terrain.getChunk(0, 0);
    const b = terrain.getChunk(1, 0);
    const left = terrainRelief(terrain, a, art);
    const right = terrainRelief(terrain, b, art);
    expect(left.map((layer) => layer.part)).toEqual(['shadow', 'face', 'rim']);
    for (const layer of left) {
      const other = right.find((candidate) => candidate.part === layer.part)!;
      expect(layer.vertices.every(Number.isFinite)).toBe(true);
      expect(layer.indices.every((i) => i >= 0 && i < layer.alphas.length)).toBe(true);
      expect(layer.alphas.every((alpha) => alpha >= 0 && alpha <= 1)).toBe(true);
      for (let i = 0; i < layer.alphas.length; i++) {
        if (layer.vertices[i * 2] !== a.width / 2) continue;
        const match =
          other.vertices.findIndex(
            (coordinate, index) =>
              index % 2 === 0 &&
              coordinate === -b.width / 2 &&
              other.vertices[index + 1] === layer.vertices[i * 2 + 1],
          ) / 2;
        expect(match).toBeGreaterThanOrEqual(0);
        expect(other.colors[match]).toBe(layer.colors[i]);
        expect(other.alphas[match]).toBe(layer.alphas[i]);
      }
      if (layer.part === 'shadow') expect(layer.alphas).toContain(0);
    }
  });

  it('leaves gentle combat ground free of ledges and keeps relief local to steep slopes', () => {
    const flat = new MountainTerrain(OTGONTENGER_MOUNTAINS);
    flat.height = () => 0.52;
    expect(terrainRelief(flat, flat.getChunk(0, 0), art)).toEqual([]);
    const terrain = new MountainTerrain(OTGONTENGER_MOUNTAINS);
    const chunk = terrain.getChunk(1, 1);
    const before = chunk.cells.map((cell) => cell.blocked);
    const relief = terrainRelief(terrain, chunk, art);
    expect(relief.find((layer) => layer.part === 'face')?.indices.length).toBeGreaterThan(0);
    expect(chunk.cells.map((cell) => cell.blocked)).toEqual(before);
    expect(GAME.terrain.surfaceStep).toBeLessThan(terrain.cellSize);
  });

  it('wraps existing cliff-face textures without stretching UVs across tile seams', () => {
    const terrain = new MountainTerrain(OTGONTENGER_MOUNTAINS, 1024);
    terrain.height = (_x, y) => 0.8 - y / 450;
    const painted: TerrainArt = {
      ...art,
      materials: {
        ...art.materials,
        stone: { ...art.materials.stone, texture: 'rock', tint: 0x96c0ec },
      },
    };
    const layers = terrainRelief(terrain, terrain.getChunk(1, 0), painted, {
      rock: { width: 1254, height: 1254 },
    });
    const face = layers.find((layer) => layer.part === 'face')!;
    expect(face.texture).toBe('rock');
    expect(face.uvs.every((uv) => uv >= 0 && uv <= 1)).toBe(true);
    expect(face.uvs.some((uv) => uv === 0)).toBe(true);
    expect(face.uvs.some((uv) => uv === 1)).toBe(true);
    expect(face.indices.every((index) => index < face.alphas.length)).toBe(true);
    for (let i = 0; i < face.vertices.length; i += 6) {
      const xs = [0, 2, 4].map((offset) => face.vertices[i + offset]! + 768);
      const us = [0, 2, 4].map((offset) => face.uvs[i + offset]!);
      // The same world-to-texture scale holds on both sides of the 815.1-unit wrap.
      expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(
        (Math.max(...us) - Math.min(...us)) * 1254 * painted.tileScale,
        6,
      );
    }
  });

  it('lights upper-left-facing landforms and preserves a readable ambient floor', () => {
    const terrain = new MountainTerrain(OTGONTENGER_MOUNTAINS);
    terrain.height = (x, y) => 0.5 + (x + y) / 2000;
    const lit = terrainLighting(terrain, terrain.sample(0, 0));
    terrain.height = (x, y) => 0.5 - (x + y) / 2000;
    const shaded = terrainLighting(terrain, terrain.sample(0, 0));
    expect(lit).toBeGreaterThan(shaded + 0.15);
    expect(shaded).toBeGreaterThanOrEqual(0.56);
    terrain.height = () => 0.2;
    const flat = terrainLighting(terrain, terrain.sample(0, 0));
    expect(flat).toBeGreaterThan(0.9);
    expect(flat).toBeLessThanOrEqual(1.06);
  });
});
