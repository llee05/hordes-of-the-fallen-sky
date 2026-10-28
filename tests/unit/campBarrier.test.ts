import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import { createLegacyCampRun as createRun } from '../support/legacyCamp';
import { barrierContact, campBoundary } from '../../src/game/state/campBarrier';
import { CAMP_SITES, campShelters } from '../../src/game/state/campLife';

describe('the portable camp boundary', () => {
  it('keeps the original attack and ward reach around the starting households', () => {
    const run = createRun();
    const before = structuredClone(run);
    expect(campBoundary(run)).toEqual({ radius: 108, attackRange: 120, wardRadius: 125 });
    expect(run).toEqual(before);
  });

  it('encloses growing households and outlying crafts, keeping wards in reach of their attackers', () => {
    const run = createRun();
    run.clan.population = 32;
    const households = campBoundary(run);
    expect(households.radius).toBeGreaterThan(108);
    run.clan.buildings.felt = 1;
    run.clan.buildings.provisions = 1;
    run.clan.buildings.relay = 1;
    const expanded = campBoundary(run);
    expect(expanded.radius).toBeGreaterThan(households.radius);
    for (const site of [
      ...campShelters(run),
      CAMP_SITES.felt,
      CAMP_SITES.provisions,
      CAMP_SITES.relay,
    ])
      expect(
        (Math.hypot(site.x, site.y) + GAME.camp.barrier.groundClearance) * GAME.camp.visualScale,
      ).toBeLessThan(expanded.radius);
    expect(expanded.attackRange).toBe(expanded.radius + GAME.camp.barrier.attackReach);
    expect(expanded.wardRadius).toBeGreaterThan(expanded.attackRange);
    run.clan.stage = 'migration';
    expect(campBoundary(run)).toEqual(expanded);
  });

  it('locates impacts on the same boundary from all directions, after relocation and from inside', () => {
    const camp = { x: 3100, y: 2600 };
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI) / 8;
      for (const distance of [30, 120, 300]) {
        const point = barrierContact(
          camp,
          { x: camp.x + Math.cos(angle) * distance, y: camp.y + Math.sin(angle) * distance },
          108,
        );
        expect(Math.hypot(point.x - camp.x, point.y - camp.y)).toBeCloseTo(108);
        expect(point.x).toBeCloseTo(camp.x + Math.cos(angle) * 108);
        expect(point.y).toBeCloseTo(camp.y + Math.sin(angle) * 108);
      }
    }
    expect(barrierContact(camp, camp, 108)).toEqual({ x: camp.x + 108, y: camp.y });
  });
});
