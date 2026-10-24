import { describe, expect, it } from 'vitest';
import { WorldRiver } from '../../src/game/world3d/WorldRiver';
import { waterGeometry } from '../../src/game/world3d/waterGeometry';
import { Water3D } from '../../src/game/world3d/Water3D';
import { ComposedTerrain } from '../../src/game/world3d/ComposedTerrain';
import { composedRegion } from '../../src/game/data/worldRegions';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import { riverPoint } from '../../src/game/assets/riverGeometry';
import * as THREE from 'three';

describe('integrated organic rivers', () => {
  it('shares repeatable variable-width shores with carving and moisture queries', () => {
    const def = LANDSCAPES['golden-pasture'].water!;
    const river = new WorldRiver(def, 2600, 65, 123);
    expect(river.channels).toEqual(new WorldRiver(def, 2600, 65, 123).channels);
    expect(river.channels).not.toEqual(new WorldRiver(def, 2600, 65, 124).channels);
    const sections = river.channels[0]!.sections;
    const widths = sections.map((p) => p.left + p.right);
    expect(Math.max(...widths) / Math.min(...widths)).toBeGreaterThan(1.3);
    for (let i = 3; i < sections.length - 3; i += 11)
      for (const side of [-1, 1]) {
        const edge = riverPoint(sections[i]!, side);
        expect(Math.abs(river.sample(edge.x + 2600, edge.y + 2600).shoreDistance)).toBeLessThan(6);
      }
    expect(sections.filter((s) => Math.abs(s.x) < 100).every((s) => s.y <= -525)).toBe(true);
  });
  it('registers shallows against the actual bed and freezes reduced-motion water', () => {
    const terrain = new ComposedTerrain(
      composedRegion('golden-pasture'),
      LANDSCAPES['golden-pasture'].water,
    );
    const river = terrain.river!,
      geometry = waterGeometry(river, terrain);
    const shore: number[] = [],
      middle: number[] = [];
    for (let i = 0; i < geometry.depth.length; i++) {
      expect(geometry.positions[i * 3 + 1]).toBe(river.floor - 1.5);
      expect(geometry.depth[i]).toBeGreaterThanOrEqual(0);
      const u = geometry.uv[i * 2]!;
      if (u === 0 || u === 1) shore.push(geometry.depth[i]!);
      else if (u > 0.3 && u < 0.7) middle.push(geometry.depth[i]!);
    }
    const average = (items: number[]) => items.reduce((a, b) => a + b, 0) / items.length;
    expect(average(middle)).toBeGreaterThan(average(shore) + 1.5);
    const bed = new THREE.Texture(),
      water = new Water3D(river, terrain, bed);
    water.update(10, true);
    expect(water.time.value).toBe(0);
    expect(water.motion.value).toBe(0);
    water.update(11);
    expect(water.time.value).toBe(11);
    water.destroy();
    bed.dispose();
  });
});
