import { describe, expect, it } from 'vitest';
import { SpatialHash } from '../../src/game/systems/SpatialHash';

describe('spatial targeting', () => {
  it('finds a target across cell boundaries and negative coordinates', () => {
    const grid = new SpatialHash(96);
    const closest = { x: -1, y: 0, active: true };
    grid.rebuild([closest, { x: 100, y: 0, active: true }]);
    expect(grid.nearest(1, 0, 120)).toBe(closest);
  });

  it('uses a circular radius and excludes inactive enemies', () => {
    const grid = new SpatialHash();
    grid.rebuild([
      { x: 1, y: 1, active: false },
      { x: 9, y: 9, active: true },
    ]);
    expect(grid.nearest(0, 0, 10)).toBeUndefined();
  });

  it('drops old targets when rebuilt and checks deactivated pooled objects', () => {
    const grid = new SpatialHash();
    const item = { x: 0, y: 0, active: true };
    grid.rebuild([item]);
    item.active = false;
    expect(grid.nearest(0, 0, 10)).toBeUndefined();
    item.active = true;
    grid.rebuild([]);
    expect(grid.nearest(0, 0, 10)).toBeUndefined();
  });
});
