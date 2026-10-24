import { describe, expect, it } from 'vitest';
import { ComposedTerrain } from '../../src/game/world3d/ComposedTerrain';
import { composedRegion } from '../../src/game/data/worldRegions';
import { terrainHabitat, terrainMaterialWeights } from '../../src/game/world3d/terrainHabitat';
import { LANDSCAPES } from '../../src/game/data/landscapes';

describe('shared material and ecology masks', () => {
  it('keeps all cover weights finite and normalized across biomes, elevations, and slopes', () => {
    for (const id of ['golden-pasture', 'eej-khairkhan', 'otgontenger'] as const) {
      const t = new ComposedTerrain(composedRegion(id), LANDSCAPES[id].water);
      for (let x = 2000; x < 3400; x += 137)
        for (const h of [65, 215, 430, 900])
          for (const up of [0, 0.6, 1]) {
            const habitat = terrainHabitat(t, x, 2200, h, up),
              weights = terrainMaterialWeights(t, h, up, habitat);
            expect(weights.every((w) => Number.isFinite(w) && w >= 0 && w <= 1)).toBe(true);
            expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
          }
    }
  });
  it('creates coherent patches, damp river margins, and exposed rocky shelves without changing geometry', () => {
    const dry = new ComposedTerrain(composedRegion('golden-pasture'));
    const wet = new ComposedTerrain(
      composedRegion('golden-pasture'),
      LANDSCAPES['golden-pasture'].water,
    );
    const p = wet.river!.channels[0]!.sections[100]!;
    const x = p.x + 2600,
      z = p.y + 2600;
    const a = terrainHabitat(dry, x, z, 65, 1),
      b = terrainHabitat(wet, x, z, 65, 1);
    expect(b.moisture).toBeGreaterThan(a.moisture);
    expect(b.shore).toBeGreaterThan(0.9);
    expect(terrainMaterialWeights(wet, 65, 1, b)[6]).toBeGreaterThan(
      terrainMaterialWeights(dry, 65, 1, a)[6]!,
    );
    const nearby = terrainHabitat(dry, x + 1, z + 1, 65, 1);
    expect(Math.abs(a.patch - nearby.patch)).toBeLessThan(0.02);
    const before = dry.height(x, z);
    terrainMaterialWeights(dry, 800, 0.2, a);
    expect(dry.height(x, z)).toBe(before);
  });
});
