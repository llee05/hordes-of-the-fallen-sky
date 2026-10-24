import { describe, expect, it } from 'vitest';
import { MountainHeightfield } from '../../src/game/world3d/MountainHeightfield';
import { mountainGeometry } from '../../src/game/world3d/mountainGeometry';
import { OTGONTENGER_MOUNTAINS } from '../../src/game/data/terrainBiomes';
import { TerrainNavigation } from '../../src/game/terrain/TerrainNavigation';

describe('three dimensional mountain slice', () => {
  it('is seeded, query-order independent, and interpolates the same triangles as the mesh', () => {
    const a = new MountainHeightfield(OTGONTENGER_MOUNTAINS);
    const b = new MountainHeightfield(OTGONTENGER_MOUNTAINS);
    b.height(4800, 300);
    for (const [x, z] of [
      [-10, 20],
      [1200, 1400],
      [3000, 1550],
      [2600, 2600],
      [5198, 5199],
    ]) {
      expect(a.height(x!, z!)).toBe(b.height(x!, z!));
    }
    const geometry = mountainGeometry(a, { x: 3072, y: 1536, width: 512, height: 512 });
    let checks = 0;
    for (let i = 0; i < geometry.surface.positions.length; i += 9) {
      const p = geometry.surface.positions;
      const x = (p[i]! + p[i + 3]! + p[i + 6]!) / 3;
      const z = (p[i + 2]! + p[i + 5]! + p[i + 8]!) / 3;
      const y = (p[i + 1]! + p[i + 4]! + p[i + 7]!) / 3;
      expect(a.height(x, z) * a.region.biome.heightScale).toBeCloseTo(y, 6);
      checks++;
    }
    expect(checks).toBeGreaterThan(500);
  });

  it('joins adjacent chunk positions and normals exactly, including clipped wall endpoints', () => {
    const terrain = new MountainHeightfield(OTGONTENGER_MOUNTAINS);
    const a = mountainGeometry(terrain, { x: 2560, y: 1536, width: 512, height: 512 });
    const b = mountainGeometry(terrain, { x: 3072, y: 1536, width: 512, height: 512 });
    const seam = (data: typeof a): string[] =>
      [
        ...new Set(
          [data.surface, data.walls].flatMap((part) => {
            const values: string[] = [];
            for (let i = 0; i < part.positions.length; i += 3)
              if (part.positions[i] === 3072)
                values.push(
                  [...part.positions.slice(i, i + 3), ...part.normals.slice(i, i + 3)]
                    .map((n) => n.toFixed(6))
                    .join(','),
                );
            return values;
          }),
        ),
      ].sort();
    expect(seam(a)).toEqual(seam(b));
    expect(seam(a).length).toBeGreaterThan(16);
  });

  it('builds genuinely vertical rock walls and finite normalized terrain normals', () => {
    const terrain = new MountainHeightfield(OTGONTENGER_MOUNTAINS);
    const geometry = mountainGeometry(terrain, { x: 3072, y: 2048, width: 512, height: 512 });
    expect(geometry.walls.positions.length).toBeGreaterThan(0);
    for (let i = 0; i < geometry.walls.positions.length; i += 18) {
      const p = geometry.walls.positions;
      expect(p[i]).toBe(p[i + 3]);
      expect(p[i + 2]).toBe(p[i + 5]);
      expect(p[i + 4]! - p[i + 1]!).toBeGreaterThan(0);
      expect(geometry.walls.normals[i + 1]).toBe(0);
    }
    for (let i = 0; i < geometry.surface.normals.length; i += 3)
      expect(Math.hypot(...geometry.surface.normals.slice(i, i + 3))).toBeCloseTo(1, 10);
    expect(geometry.surface.weights.every((n) => Number.isFinite(n) && n >= 0 && n <= 1)).toBe(
      true,
    );
  });

  it('protects combat and caravan space while connecting the raised shelf through a ramp', () => {
    const terrain = new MountainHeightfield(OTGONTENGER_MOUNTAINS);
    const nav = new TerrainNavigation(terrain);
    expect(nav.isWalkable(2600, 2600, 100, true)).toBe(true);
    for (let x = 2600; x < 4000; x += 64) expect(nav.isWalkable(x, 2600, 80, true)).toBe(true);
    const shelf = nav.nearestWalkable({ x: 3000, y: 1650 });
    expect(shelf).toBeDefined();
    expect(terrain.height(shelf!.x, shelf!.y)).toBeGreaterThan(0.5);
    let position = { x: 2600, y: 2600 };
    for (
      let step = 0;
      step < 1000 && Math.hypot(position.x - shelf!.x, position.y - shelf!.y) > 40;
      step++
    ) {
      const next = nav.waypoint(position, shelf!);
      const length = Math.hypot(next.x - position.x, next.y - position.y);
      if (length === 0) break;
      position = nav.slide(
        position,
        {
          x: position.x + ((next.x - position.x) / length) * 16,
          y: position.y + ((next.y - position.y) / length) * 16,
        },
        18,
      );
    }
    expect(Math.hypot(position.x - shelf!.x, position.y - shelf!.y)).toBeLessThan(40);
    expect(nav.blocked.reduce((sum, n) => sum + n, 0)).toBeGreaterThan(50);
    expect(nav.reachable.reduce((sum, n) => sum + n, 0) / nav.blocked.length).toBeGreaterThan(0.5);
  });
});
