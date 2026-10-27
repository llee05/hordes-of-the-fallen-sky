import { describe, expect, it } from 'vitest';
import { MountainTerrain } from '../../src/game/terrain/MountainTerrain';
import { OTGONTENGER_MOUNTAINS } from '../../src/game/data/terrainBiomes';
import { terrainDressing } from '../../src/game/terrain/terrainDressing';

describe('mountain landform geometry and dressing', () => {
  it('retains more snow in a sheltered shelf depression at the same height and slope', () => {
    const terrain = new MountainTerrain(OTGONTENGER_MOUNTAINS);
    terrain.height = (x) => (x < 0 ? 0.9 : 0.7);
    terrain.rawHeight = () => 0.7;
    terrain.protection = () => 0;
    const sheltered = terrain.sample(64, 0);
    const exposed = terrain.sample(240, 0);
    expect(sheltered.elevation).toBe(exposed.elevation);
    expect(sheltered.slope).toBe(exposed.slope);
    expect(sheltered.depression).toBeGreaterThan(exposed.depression);
    expect(sheltered.weights[4]).toBeGreaterThan(exposed.weights[4] + 0.1);
  });
  it('keeps deterministic bounded clusters below cliffs and on suitable shelves, away from combat clearings', () => {
    const terrain = new MountainTerrain(OTGONTENGER_MOUNTAINS);
    const kinds = new Set<string>();
    let props = 0;
    for (let row = 0; row < 11; row++)
      for (let column = 0; column < 11; column++) {
        const chunk = terrain.getChunk(column, row);
        const dressing = terrainDressing(terrain, chunk);
        expect(dressing).toEqual(terrainDressing(terrain, chunk));
        expect(dressing.length).toBeLessThanOrEqual(9);
        for (const prop of dressing) {
          props++;
          kinds.add(prop.kind);
          const sample = terrain.sample(prop.x, prop.y);
          expect(terrain.protection(prop.x, prop.y)).toBeLessThanOrEqual(0.05);
          expect(sample.slope).toBeLessThanOrEqual(0.7);
          if (prop.kind === 'conifer') {
            expect(sample.level).toBeLessThan(2);
            expect(sample.weights[4]).toBeLessThan(0.1);
          } else if (prop.kind === 'scrub') {
            expect(sample.landform).toBe('shelf');
          } else {
            expect(
              Array.from({ length: 9 }, (_, i) => (i - 4) * 32).some((dx) =>
                Array.from({ length: 9 }, (_, i) => (i - 4) * 32).some(
                  (dy) =>
                    Math.hypot(dx, dy) <= 128 &&
                    terrain.height(prop.x + dx, prop.y + dy) - sample.elevation > 0.06,
                ),
              ),
            ).toBe(true);
          }
        }
      }
    expect(kinds).toEqual(new Set(['rubble', 'scrub', 'conifer']));
    expect(props).toBeGreaterThan(50);
  });
});
