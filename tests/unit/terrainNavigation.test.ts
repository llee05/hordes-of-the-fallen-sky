import { describe, expect, it } from 'vitest';
import { TerrainNavigation } from '../../src/game/terrain/TerrainNavigation';
import type { MountainTerrain } from '../../src/game/terrain/MountainTerrain';
import { GAME } from '../../src/game/config';
import { ComposedTerrain } from '../../src/game/world3d/ComposedTerrain';
import { composedRegion, WORLD_REGIONS } from '../../src/game/data/worldRegions';
import { LANDSCAPES } from '../../src/game/data/landscapes';

function grid(blocked: (x: number, y: number) => boolean, water = (_x: number, _y: number) => 0) {
  return new TerrainNavigation({
    worldSize: 768,
    cellSize: 64,
    cell: (x: number, y: number) => ({
      blocked: blocked(x, y),
      sample: { x: x * 64 + 32, y: y * 64 + 32, slope: 0, weights: [1, 0, 0, 0, 0] },
    }),
    waterDepth: water,
  } as unknown as MountainTerrain);
}

describe('terrain-aware enemy navigation', () => {
  it('takes a broad dry detour instead of walking down an expensive riverbed', () => {
    const nav = grid(
      () => false,
      (x, y) => (x >= 192 && x <= 576 && y >= 256 && y < 448 ? 1 : 0),
    );
    let p = { x: 96, y: 352 };
    const target = { x: 672, y: 352 };
    const route = [p];
    for (let i = 0; i < 30 && Math.hypot(p.x - target.x, p.y - target.y) > 1; i++) {
      p = nav.waypoint(p, target, 'heavy');
      route.push(p);
    }
    expect(p).toEqual(target);
    expect(route.some((p) => p.y < 256 || p.y >= 448)).toBe(true);
    expect(route.every((p) => nav.isWalkable(p.x, p.y, 24, true))).toBe(true);
    expect(nav.travelCost({ x: 352, y: 352 }, 'heavy')).toBeGreaterThan(
      nav.travelCost({ x: 352, y: 352 }, 'pack'),
    );
  });
  it('routes through a real opening, never cuts blocked corners, and bounds cached fields', () => {
    const nav = grid((x, y) => x === 5 && y !== 8);
    let p = { x: 96, y: 96 };
    const target = { x: 672, y: 96 };
    for (let i = 0; i < 60 && Math.hypot(p.x - target.x, p.y - target.y) > 1; i++) {
      const next = nav.waypoint(p, target);
      expect(nav.lineClear(p, next)).toBe(true);
      p = next;
    }
    expect(p).toEqual(target);
    for (let x = 0; x < 12; x++)
      for (const profile of ['ground', 'pack', 'heavy'] as const)
        nav.waypoint(p, { x: x * 64 + 32, y: 672 }, profile);
    expect(nav.cachedFlows).toBeLessThanOrEqual(GAME.terrain.flowCacheSize);
    const sealed = grid((x) => x === 5);
    expect(sealed.waypoint({ x: 96, y: 96 }, target)).toEqual({ x: 96, y: 96 });
  });
  it.each(Object.keys(WORLD_REGIONS) as (keyof typeof WORLD_REGIONS)[])(
    'keeps valid routes and area-specific costs in %s',
    (id) => {
      const terrain = new ComposedTerrain(composedRegion(id), LANDSCAPES[id].water);
      const nav = new TerrainNavigation(terrain);
      const goal = { x: 2600, y: 2600 };
      let p = nav.nearestWalkable({ x: 1800, y: 1850 })!;
      expect(p).toBeDefined();
      for (let i = 0; i < 140 && Math.hypot(p.x - goal.x, p.y - goal.y) > 1; i++) {
        const next = nav.waypoint(p, goal, 'heavy');
        expect(nav.lineClear(p, next)).toBe(true);
        p = next;
      }
      expect(Math.hypot(p.x - goal.x, p.y - goal.y), id).toBeLessThan(1);
      for (const bridge of terrain.river?.bridges ?? [])
        expect(terrain.waterDepth(bridge.x, bridge.z)).toBe(0);
    },
  );
});
