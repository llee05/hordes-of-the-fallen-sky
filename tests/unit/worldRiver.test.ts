import { describe, expect, it } from 'vitest';
import { WorldRiver } from '../../src/game/world3d/WorldRiver';
import { waterGeometry } from '../../src/game/world3d/waterGeometry';
import { Water3D } from '../../src/game/world3d/Water3D';
import { ComposedTerrain } from '../../src/game/world3d/ComposedTerrain';
import { composedRegion } from '../../src/game/data/worldRegions';
import { riverPoint } from '../../src/game/assets/riverGeometry';
import { sourcePoolRadius } from '../../src/game/assets/riverGeometry';
import * as THREE from 'three';
import { MEADOW_STREAM } from './fixtures/stream';
import { LANDSCAPES } from '../../src/game/data/landscapes';

describe('integrated organic rivers', () => {
  it('shares repeatable variable-width shores with carving and moisture queries', () => {
    const def = MEADOW_STREAM;
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
    const terrain = new ComposedTerrain(composedRegion('altan-ovoo'), MEADOW_STREAM);
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

  it('can retain authored river carving while a registered ground painting supplies the surface', () => {
    const terrain = new ComposedTerrain(
      composedRegion('khan-tengri'),
      LANDSCAPES['khan-tengri'].water,
    );
    const bed = new THREE.Texture();
    const water = new Water3D(terrain.river!, terrain, bed, undefined, false, false);
    expect(water.group.getObjectByName('river-water')).toBeUndefined();
    expect(terrain.river?.definition.kind).toBe('glacial');
    water.destroy();
    bed.dispose();
  });

  it('answers bucketed shore queries exactly as a scan of every segment', () => {
    for (const water of [
      MEADOW_STREAM,
      ...Object.values(LANDSCAPES).flatMap((landscape) =>
        landscape.water ? [landscape.water] : [],
      ),
    ]) {
      const river = new WorldRiver(water, 2600, 60);
      const segments = river['segments'];
      for (let i = 0; i < 1500; i++) {
        const x = ((i * 7919) % 5300) - 50 + (i % 7) * 0.37,
          z = ((i * 104729) % 5300) - 50 + (i % 11) * 0.53;
        let best = Infinity,
          halfWidth = 1;
        for (const s of segments) {
          const px = x - 2600,
            pz = z - 2600;
          const t = Math.max(
            0,
            Math.min(1, ((px - s.a.x) * s.dx + (pz - s.a.y) * s.dz) / (s.lengthSquared || 1)),
          );
          const dx = px - s.a.x - s.dx * t,
            dz = pz - s.a.y - s.dz * t;
          if (dx * dx + dz * dz >= best) continue;
          best = dx * dx + dz * dz;
          halfWidth =
            dx * s.a.nx + dz * s.a.ny < 0
              ? s.a.left + (s.b.left - s.a.left) * t
              : s.a.right + (s.b.right - s.a.right) * t;
        }
        const pool = water.sourcePool;
        if (pool) {
          const poolX = x - 2600 - pool.x,
            poolZ = z - 2600 - pool.y,
            poolDistance = Math.hypot(poolX, poolZ),
            radius = sourcePoolRadius(pool, Math.atan2(poolZ, poolX));
          if (poolDistance - radius < Math.sqrt(best) - halfWidth) {
            best = poolDistance * poolDistance;
            halfWidth = radius;
          }
        }
        expect(river.sample(x, z)).toEqual({
          distance: Math.sqrt(best),
          halfWidth,
          shoreDistance: Math.sqrt(best) - halfWidth,
        });
      }
    }
  });
});
