import { describe, expect, it } from 'vitest';
import { composedRegion } from '../../src/game/data/worldRegions';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import { ComposedTerrain } from '../../src/game/world3d/ComposedTerrain';
import { OTGONTENGER_MOUNTAINS } from '../../src/game/data/terrainBiomes';
import { heightNodeKey, MountainHeightfield } from '../../src/game/world3d/MountainHeightfield';

/** The previous allocation-heavy surface sample, kept as the exact reference. */
function referenceHeight(terrain: MountainHeightfield, x: number, z: number): number {
  const [a, b, c, d] = terrain.cellNodes(x, z);
  const u = (x - a.x) / (b.x - a.x);
  const v = (z - a.z) / (d.z - a.z);
  const vertices = v <= u ? [a, b, c] : [a, c, d];
  const weights = v <= u ? [1 - u, u - v, v] : [1 - v, u, v - u];
  const interpolate = (key: 'base' | 'rise' | 'field'): number =>
    vertices.reduce((sum, node, i) => sum + node[key] * weights[i]!, 0);
  if (a.layers) {
    let height = interpolate('base');
    for (let layer = 0; layer < a.layers.length; layer++) {
      const field = vertices.reduce(
        (sum, node, i) => sum + node.layers![layer]!.field * weights[i]!,
        0,
      );
      if (field >= 0)
        height += vertices.reduce(
          (sum, node, i) => sum + node.layers![layer]!.rise * weights[i]!,
          0,
        );
    }
    return height / terrain.region.biome.heightScale;
  }
  return (
    (interpolate('base') + (interpolate('field') >= 0 ? interpolate('rise') : 0)) /
    terrain.region.biome.heightScale
  );
}

describe('terrain height sampling', () => {
  const terrains: Record<string, () => MountainHeightfield> = {
    otgontenger: () =>
      new ComposedTerrain(composedRegion('otgontenger'), LANDSCAPES.otgontenger.water),
    'orkhon-valley': () =>
      new ComposedTerrain(composedRegion('orkhon-valley'), LANDSCAPES['orkhon-valley'].water),
    'single-shelf heightfield': () => new MountainHeightfield(OTGONTENGER_MOUNTAINS),
  };
  it.each(Object.keys(terrains))('matches the reference surface exactly in %s', (id) => {
    const terrain = terrains[id]!();
    let seed = 11;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let mismatches = 0;
    // Interior, mesh vertices and edges, the world border and the backdrop beyond it.
    const points: [number, number][] = [
      [0, 0],
      [32, 64],
      [2600, 2600],
      [terrain.worldSize, terrain.worldSize],
      [terrain.worldSize + 40, 300],
      [-90, 1200.5],
    ];
    for (let i = 0; i < 4000; i++)
      points.push([random() * (terrain.worldSize + 400) - 200, random() * terrain.worldSize]);
    for (const [x, z] of points) {
      const height = terrain.height(x, z);
      if (!(height === referenceHeight(terrain, x, z))) mismatches++;
    }
    expect(mismatches).toBe(0);
  });

  it('keys whole node coordinates by distinct numbers and others by text', () => {
    const keys = new Set<number | string>();
    for (let x = -64; x <= 64; x += 32)
      for (let z = -64; z <= 64; z += 32) keys.add(heightNodeKey(x, z));
    expect(keys.size).toBe(25);
    expect(typeof heightNodeKey(5200, 32)).toBe('number');
    expect(heightNodeKey(1, 2)).not.toBe(heightNodeKey(2, 1));
    expect(heightNodeKey(0.5, 2)).toBe('0.5,2');
    expect(heightNodeKey(2 ** 25, 0)).toBe(`${2 ** 25},0`);
  });
});
