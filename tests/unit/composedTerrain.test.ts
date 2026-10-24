import { describe, expect, it } from 'vitest';
import { WORLD_REGIONS, composedRegion } from '../../src/game/data/worldRegions';
import { ComposedTerrain } from '../../src/game/world3d/ComposedTerrain';
import { sceneGeometry } from '../../src/game/world3d/sceneGeometry';
import { sceneDressing } from '../../src/game/world3d/sceneDressing';
import { TerrainNavigation } from '../../src/game/terrain/TerrainNavigation';
import { LANDSCAPES } from '../../src/game/data/landscapes';

describe('composed angled landscapes', () => {
  it('protects the camp and complete caravan route in every regional composition', () => {
    for (const id of Object.keys(WORLD_REGIONS) as (keyof typeof WORLD_REGIONS)[]) {
      const terrain = new ComposedTerrain(composedRegion(id));
      for (let x = 2400; x <= 2850; x += 100)
        for (const z of [2480, 2600, 2720])
          expect(terrain.height(x, z) * 1000).toBeCloseTo(terrain.region.scene.floor + 150, 6);
      const high = terrain.region.scene.shelves[0]!;
      expect(terrain.height(2600 + high.x, 2600 + high.z) * 1000).toBeGreaterThan(
        terrain.region.scene.floor + 90,
      );
    }
  });

  it('joins positions and normals across a chunk seam through stacked cliffs', () => {
    const terrain = new ComposedTerrain(composedRegion('golden-pasture'));
    const a = sceneGeometry(terrain, { x: 2048, y: 1536, width: 512, height: 512 });
    const b = sceneGeometry(terrain, { x: 2560, y: 1536, width: 512, height: 512 });
    const seam = (data: typeof a) =>
      [
        ...new Set(
          [data.surface, data.walls].flatMap((part) => {
            const result: string[] = [];
            for (let i = 0; i < part.positions.length; i += 3)
              if (Math.abs(part.positions[i]! - 2560) < 1e-8)
                result.push(
                  [...part.positions.slice(i, i + 3), ...part.normals.slice(i, i + 3)]
                    .map((n) => n.toFixed(5))
                    .join(','),
                );
            return result;
          }),
        ),
      ].sort();
    expect(seam(a)).toEqual(seam(b));
    expect(seam(a).length).toBeGreaterThan(15);
    expect(a.walls.positions.length + b.walls.positions.length).toBeGreaterThan(0);
  });

  it('samples exactly the split render surface and creates genuine vertical walls at different levels', () => {
    const terrain = new ComposedTerrain(composedRegion('otgontenger'));
    const data = sceneGeometry(terrain, { x: 2048, y: 1536, width: 1024, height: 1024 });
    for (let i = 0; i < data.surface.positions.length; i += 9) {
      const p = data.surface.positions;
      const x = (p[i]! + p[i + 3]! + p[i + 6]!) / 3;
      const z = (p[i + 2]! + p[i + 5]! + p[i + 8]!) / 3;
      expect(terrain.height(x, z) * 1000).toBeCloseTo((p[i + 1]! + p[i + 4]! + p[i + 7]!) / 3, 5);
    }
    let max = 0;
    const p = data.walls.positions;
    for (let i = 0; i < p.length; i += 72) {
      const heights = p.slice(i, i + 72).filter((_, j) => j % 3 === 1);
      max = Math.max(max, Math.max(...heights) - Math.min(...heights));
    }
    for (let i = 0; i < p.length; i += 9) {
      const ux = p[i + 3]! - p[i]!,
        uy = p[i + 4]! - p[i + 1]!,
        uz = p[i + 5]! - p[i + 2]!;
      const vx = p[i + 6]! - p[i]!,
        vy = p[i + 7]! - p[i + 1]!,
        vz = p[i + 8]! - p[i + 2]!;
      const n = data.walls.normals;
      expect(
        (uy * vz - uz * vy) * n[i]! +
          (uz * vx - ux * vz) * n[i + 1]! +
          (ux * vy - uy * vx) * n[i + 2]!,
      ).toBeGreaterThanOrEqual(-1e-6);
    }
    expect(max).toBeGreaterThan(200);
    expect(data.surface.weights.every((n) => Number.isFinite(n) && n >= 0)).toBe(true);
  });

  it('connects a raised shelf to open combat space and keeps grouped dressing out of the camp', () => {
    const terrain = new ComposedTerrain(composedRegion('golden-pasture'));
    const nav = new TerrainNavigation(terrain);
    expect(nav.isWalkable(2600, 2600, 120, true)).toBe(true);
    for (let x = 2600; x <= 4100; x += 32) expect(nav.isWalkable(x, 2600, 12, true)).toBe(true);
    const safe = nav.nearestWalkable({ x: 2100, y: 1750 });
    expect(safe).toBeDefined();
    expect(terrain.height(safe!.x, safe!.y) * 1000).toBeGreaterThan(150);
    const bounds = { x: 2048, y: 1536, width: 512, height: 512 };
    const props = sceneDressing(terrain, bounds);
    expect(props).toEqual(
      sceneDressing(new ComposedTerrain(composedRegion('golden-pasture')), bounds),
    );
    for (const prop of props) expect(terrain.protection(prop.x, prop.z)).toBeLessThanOrEqual(0.15);
    expect(
      sceneDressing(terrain, { x: 2560, y: 2560, width: 512, height: 512 }).every(
        (prop) => Math.hypot(prop.x - 2600, prop.z - 2600) > 350,
      ),
    ).toBe(true);
  });

  it('cuts water below the battle floor and shares bridge elevations with actor anchors', () => {
    const terrain = new ComposedTerrain(
      composedRegion('orkhon-valley'),
      LANDSCAPES['orkhon-valley'].water,
    );
    const river = terrain.river!;
    expect(river.bridges).toHaveLength(2);
    for (const bridge of river.bridges) {
      expect(river.distance(bridge.x, bridge.z)).toBeLessThan(8);
      expect(terrain.height(bridge.x, bridge.z) * 1000).toBeLessThan(river.floor - 1.5);
      expect(terrain.actorHeight(bridge.x, bridge.z) * 1000).toBeCloseTo(bridge.height);
      expect(
        river.bridgeHeight(bridge.x + bridge.nz * 100, bridge.z - bridge.nx * 100),
      ).toBeUndefined();
    }
    const frozen = new ComposedTerrain(
      composedRegion('silent-river'),
      LANDSCAPES['silent-river'].water,
    );
    expect(frozen.river!.bridges).toHaveLength(0);
  });
});
