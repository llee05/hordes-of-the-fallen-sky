import { describe, expect, it } from 'vitest';
import { OTGONTENGER_MOUNTAINS } from '../../src/game/data/terrainBiomes';
import { MountainTerrain, terrainWeights } from '../../src/game/terrain/MountainTerrain';
import { TerrainNavigation } from '../../src/game/terrain/TerrainNavigation';
import { coherentNoise, terrainSeed } from '../../src/game/terrain/noise';
import { GAME } from '../../src/game/config';

const region = OTGONTENGER_MOUNTAINS;

describe('seeded mountain terrain', () => {
  it('reproduces samples and chunks regardless of request order, including negative noise coordinates', () => {
    const a = new MountainTerrain(region);
    const b = new MountainTerrain(region);
    a.getChunk(4, 4);
    b.getChunk(8, 2);
    expect(a.getChunk(2, 3)).toEqual(b.getChunk(2, 3));
    expect(a.sample(-10.5, 130.25)).toEqual(b.sample(-10.5, 130.25));
    expect(a.sample(600, 600)).not.toEqual(
      new MountainTerrain({ ...region, seed: 'another range' }).sample(600, 600),
    );
    const seed = terrainSeed(region.seed);
    expect(
      Math.abs(coherentNoise(-1.00001, 0.7, seed) - coherentNoise(-0.99999, 0.7, seed)),
    ).toBeLessThan(0.0001);
  });

  it('shares exact elevation, slope, material weights, and shading at adjacent chunk borders', () => {
    const terrain = new MountainTerrain(region);
    const a = terrain.getChunk(2, 2);
    const b = terrain.getChunk(3, 2);
    for (let row = 0; row <= a.rows; row++)
      expect(a.vertices[row * (a.columns + 1) + a.columns]).toEqual(
        b.vertices[row * (b.columns + 1)],
      );
    const c = terrain.getChunk(2, 3);
    for (let column = 0; column <= a.columns; column++)
      expect(a.vertices[a.rows * (a.columns + 1) + column]).toEqual(c.vertices[column]);
  });

  it('bounds chunk caching and clips the last partial chunk without changing regenerated data', () => {
    const terrain = new MountainTerrain(region);
    const first = terrain.getChunk(0, 0);
    for (let row = 0; row < 11; row++)
      for (let column = 0; column < 11; column++) terrain.getChunk(column, row);
    expect(terrain.cachedChunks).toBe(GAME.terrain.maxCachedChunks);
    expect(terrain.getChunk(0, 0)).toEqual(first);
    const last = terrain.getChunk(10, 10);
    expect(last.x + last.width).toBe(GAME.worldSize);
    expect(last.y + last.height).toBe(GAME.worldSize);
    expect(() => terrain.getChunk(-1, 0)).toThrow(RangeError);
  });

  it('covers all five materials smoothly and leaves broad connected camp and pass space', () => {
    const terrain = new MountainTerrain(region);
    let min = 1;
    let max = 0;
    let steep = 0;
    let flatUpland = 0;
    const materials = new Set<number>();
    for (let y = 32; y < GAME.worldSize; y += 64)
      for (let x = 32; x < GAME.worldSize; x += 64) {
        const sample = terrain.sample(x, y);
        expect(sample.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
        expect(sample.weights.every((weight) => weight >= 0 && weight <= 1)).toBe(true);
        min = Math.min(min, sample.elevation);
        max = Math.max(max, sample.elevation);
        if (sample.slope >= region.biome.cliffSlope) steep++;
        if (sample.elevation > 0.53 && sample.slope < 0.15) flatUpland++;
        materials.add(sample.weights.indexOf(Math.max(...sample.weights)));
      }
    expect({ min, max, steep, flatUpland, materials: materials.size }).toMatchObject({
      materials: 5,
    });
    expect(max - min).toBeGreaterThan(0.55);
    expect(steep).toBeGreaterThan(50);
    expect(steep).toBeLessThan(1600);
    expect(flatUpland).toBeGreaterThan(10);
    for (let x = 32; x < GAME.worldSize - 32; x += 32)
      expect(terrain.sample(x, terrain.passCenter(x)).slope).toBeLessThan(0.1);
    for (let x = GAME.worldSize / 2 - 250; x <= GAME.worldSize / 2 + 1400; x += 32)
      for (let y = -210; y <= 210; y += 70)
        expect(terrain.sample(x, GAME.worldSize / 2 + y).slope).toBeLessThan(0.01);
    const before = terrainWeights(0.4 - 0.0001, 0.1, region);
    const after = terrainWeights(0.4 + 0.0001, 0.1, region);
    expect(Math.max(...before.map((weight, i) => Math.abs(weight - after[i]!)))).toBeLessThan(0.01);
  });
});

describe('mountain traversal', () => {
  const terrain = new MountainTerrain(region);
  const navigation = new TerrainNavigation(terrain);

  it('keeps the camp and entire caravan crossing open, with most walkable ground connected', () => {
    const center = GAME.worldSize / 2;
    for (let x = center; x <= center + 1150; x += 32)
      for (let y = -200; y <= 200; y += 50)
        expect(navigation.isWalkable(x, center + y, 24, true)).toBe(true);
    const walkable = navigation.blocked.filter((value) => !value).length;
    expect(navigation.reachable.filter(Boolean).length / walkable).toBeGreaterThan(0.94);
    for (let x = 128; x < GAME.worldSize - 128; x += 128) {
      for (const offset of [-96, 0, 96])
        expect(navigation.isWalkable(x, terrain.passCenter(x) + offset, 24, true)).toBe(true);
    }
  });

  it('uses collision rectangles that cover exactly the steep cells and no quiet combat cells', () => {
    const boxes = navigation.collisionBounds();
    expect(boxes.length).toBeGreaterThan(0);
    expect(boxes.length).toBeLessThan(navigation.blocked.filter(Boolean).length);
    for (let row = 0; row < navigation.rows; row++)
      for (let column = 0; column < navigation.columns; column++) {
        const cell = terrain.cell(column, row);
        const covered = boxes.some(
          (box) =>
            cell.sample.x >= box.x &&
            cell.sample.x < box.x + box.width &&
            cell.sample.y >= box.y &&
            cell.sample.y < box.y + box.height,
        );
        expect(covered).toBe(cell.blocked);
      }
  });

  it('relocates blocked spawns, routes around cliffs, and prevents followers tunnelling', () => {
    const index = navigation.blocked.findIndex(Boolean);
    const cell = terrain.cell(index % navigation.columns, Math.floor(index / navigation.columns));
    const spawn = navigation.nearestWalkable(cell.sample)!;
    expect(navigation.isWalkable(spawn.x, spawn.y, 24, true)).toBe(true);
    expect(navigation.isWalkable(cell.sample.x, cell.sample.y)).toBe(false);
    const stopped = navigation.slide(spawn, cell.sample);
    expect(navigation.isWalkable(stopped.x, stopped.y, 18)).toBe(true);
    const target = { x: GAME.worldSize / 2, y: GAME.worldSize / 2 };
    let point = spawn;
    for (let step = 0; step < 500; step++) {
      const next = navigation.waypoint(point, target);
      if (Math.hypot(next.x - point.x, next.y - point.y) < 0.01) break;
      expect(navigation.lineClear(point, next, 18)).toBe(true);
      point = next;
      if (Math.hypot(point.x - target.x, point.y - target.y) < 1) break;
    }
    expect(Math.hypot(point.x - target.x, point.y - target.y)).toBeLessThan(1);
    expect(navigation.cachedFlows).toBeLessThanOrEqual(GAME.terrain.flowCacheSize);
  });
});
