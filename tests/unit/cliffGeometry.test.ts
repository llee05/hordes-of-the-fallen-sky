import { expect, it } from 'vitest';
import { ComposedTerrain } from '../../src/game/world3d/ComposedTerrain';
import { composedRegion } from '../../src/game/data/worldRegions';
import {
  appendCliffFace,
  CLIFF_RELIEF,
  type CliffAnchor,
} from '../../src/game/world3d/cliffGeometry';
import type { WorldGeometry } from '../../src/game/world3d/mountainGeometry';
const empty = (): WorldGeometry => ({ positions: [], normals: [], weights: [], occlusion: [] });
it('registers weathered faces at unchanged feet/tops and shares relief across chunk edges', () => {
  const terrain = new ComposedTerrain(composedRegion('golden-pasture'));
  const a: CliffAnchor = { x: 2500, z: 1900, bottom: 65, top: 230 };
  const seam: CliffAnchor = { ...a, x: 2560 };
  const b: CliffAnchor = { ...a, x: 2600 };
  const left = empty(),
    right = empty();
  appendCliffFace(left, terrain, a, seam, 1);
  appendCliffFace(right, terrain, seam, b, 1);
  const atSeam = (g: WorldGeometry) => {
    const result = new Set<string>();
    for (let i = 0; i < g.positions.length; i += 3)
      if (Math.abs(g.positions[i]! - 2560) <= CLIFF_RELIEF + 0.001)
        result.add(
          [...g.positions.slice(i, i + 3), ...g.normals.slice(i, i + 3)]
            .map((n) => n.toFixed(7))
            .join(','),
        );
    return [...result].sort();
  };
  expect(atSeam(left)).toEqual(atSeam(right));
  for (let i = 0; i < left.positions.length; i += 3) {
    const h = left.positions[i + 1]!;
    if (h === 65 || h === 230) expect([2500, 2560]).toContain(left.positions[i]);
    const nearest = Math.min(
      Math.abs(left.positions[i]! - 2500),
      Math.abs(left.positions[i]! - 2560),
    );
    expect(nearest).toBeLessThanOrEqual(CLIFF_RELIEF);
    expect(Math.hypot(...left.normals.slice(i, i + 3))).toBeCloseTo(1, 7);
  }
  expect(new Set(left.positions.filter((_, i) => i % 3 === 1)).size).toBeGreaterThan(2);
});
