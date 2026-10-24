import { describe, expect, it } from 'vitest';
import { sceneDressing } from '../../src/game/world3d/sceneDressing';
import { ComposedTerrain } from '../../src/game/world3d/ComposedTerrain';
import { composedRegion } from '../../src/game/data/worldRegions';
import { LANDSCAPES } from '../../src/game/data/landscapes';

describe('clustered landscape ecology', () => {
  it('keeps the same objects when a neighborhood is streamed as separate chunks', () => {
    const terrain = new ComposedTerrain(
      composedRegion('golden-pasture'),
      LANDSCAPES['golden-pasture'].water,
    );
    const whole = sceneDressing(terrain, { x: 1536, y: 1536, width: 1024, height: 1024 });
    const parts = [1536, 2048].flatMap((x) =>
      [1536, 2048].flatMap((y) => sceneDressing(terrain, { x, y, width: 512, height: 512 })),
    );
    const sort = (items: typeof whole) => items.map((p) => JSON.stringify(p)).sort();
    expect(sort(parts)).toEqual(sort(whole));
    expect(new Set(whole.map((p) => `${p.x},${p.z}`)).size).toBe(whole.length);
    expect(whole.length).toBeGreaterThan(15);
  });
  it('leaves camp/road, water, steep ground, and snow clear while keeping varied groups', () => {
    const terrain = new ComposedTerrain(
      composedRegion('golden-pasture'),
      LANDSCAPES['golden-pasture'].water,
    );
    const items = sceneDressing(terrain, { x: 1024, y: 1024, width: 3072, height: 3072 });
    const trees = items.filter((p) => ['willow', 'pine', 'larch'].includes(p.kind));
    expect(trees.length).toBeGreaterThan(6);
    const clustered = trees.filter((p) =>
      trees.some((q) => q !== p && Math.hypot(p.x - q.x, p.z - q.z) < 180),
    );
    expect(clustered.length / trees.length).toBeGreaterThan(0.7);
    expect(new Set(items.map((p) => p.kind)).size).toBeGreaterThan(5);
    for (const p of items) {
      expect(terrain.protection(p.x, p.z)).toBeLessThanOrEqual(0.15);
      expect(terrain.river!.sample(p.x, p.z).shoreDistance).toBeGreaterThanOrEqual(5);
      expect(terrain.sample(p.x, p.z).slope).toBeLessThanOrEqual(0.62);
    }
    const high = new ComposedTerrain(composedRegion('otgontenger'));
    for (const p of sceneDressing(high, { x: 1024, y: 1024, width: 3072, height: 3072 }))
      expect(high.snowAt(high.height(p.x, p.z) * 1000, 1)).toBeLessThanOrEqual(0.65);
  });
});
