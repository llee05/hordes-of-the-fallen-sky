import { describe, expect, it } from 'vitest';
import { ComposedTerrain } from '../../src/game/world3d/ComposedTerrain';
import { composedRegion } from '../../src/game/data/worldRegions';
import { terrainHabitat, terrainMaterialWeights } from '../../src/game/world3d/terrainHabitat';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import { MEADOW_STREAM } from './fixtures/stream';

describe('shared material and ecology masks', () => {
  it('keeps all cover weights finite and normalized across biomes, elevations, and slopes', () => {
    for (const id of ['orkhon-valley', 'eej-khairkhan', 'otgontenger'] as const) {
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
  it('creates coherent patches, detects damp river margins, and keeps geometry unchanged', () => {
    const dry = new ComposedTerrain(composedRegion('orkhon-valley'));
    const wet = new ComposedTerrain(composedRegion('orkhon-valley'), MEADOW_STREAM);
    const p = wet.river!.channels[0]!.sections[100]!;
    const center = wet.worldSize / 2;
    const x = p.x + center,
      z = p.y + center;
    const a = terrainHabitat(dry, x, z, 65, 1),
      b = terrainHabitat(wet, x, z, 65, 1);
    expect(b.moisture).toBeGreaterThan(a.moisture);
    expect(b.shore).toBeGreaterThan(0.9);
    // Orkhon's river margins are painted by the terrain kit's bank bands (`orkhonBanks`), not a
    // gravel channel; the margin is still detected, and its ground stays on the grass channels.
    const margin = terrainMaterialWeights(wet, 65, 1, b);
    expect(margin[6]).toBe(0);
    expect(margin[0]! + margin[3]!).toBeGreaterThan(0.5);
    const nearby = terrainHabitat(dry, x + 1, z + 1, 65, 1);
    expect(Math.abs(a.patch - nearby.patch)).toBeLessThan(0.02);
    const before = dry.height(x, z);
    terrainMaterialWeights(dry, 800, 0.2, a);
    expect(dry.height(x, z)).toBe(before);
  });
});
