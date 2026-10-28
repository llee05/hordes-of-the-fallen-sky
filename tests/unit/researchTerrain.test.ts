import { describe, expect, it } from 'vitest';
import { createRun } from '../../src/game/state/run';
import {
  claimTerrainWave,
  claimWaterPush,
  inRidgePatch,
  landWaterActive,
  researchEnemySlow,
  researchEnemySlowed,
  researchKnockback,
  resolveResearchEruption,
  terrainDodgeSpeed,
  terrainWarningBonus,
} from '../../src/game/state/researchTerrain';
function run(...ids: string[]) {
  const r = createRun();
  r.phase = 'playing';
  r.patrons.water.slow = 0.24;
  for (const id of ids) r.upgrades[id] = 1;
  return r;
}
describe('Lus terrain mechanics', () => {
  it('Floodplain preserves a slow for one second after exit without transferring between pool spawns', () => {
    const r = run('lu-floodplain');
    expect(researchEnemySlow(r, 0, 1, 10, 0.1)).toBe(0.76);
    r.elapsed = 0.5;
    expect(researchEnemySlow(r, 0, 1, 1000, 0.5)).toBe(0.76);
    expect(researchEnemySlow(r, 0, 2, 1000, 0.5)).toBe(1);
    r.elapsed = 1;
    expect(researchEnemySlow(r, 0, 1, 1000, 0.5)).toBe(1);
  });
  it('Frozen Bank roots after continuous slow and Deep Current ramps strength, exempting bosses', () => {
    const r = run('lu-frozen-bank', 'lu-deep-current');
    researchEnemySlow(r, 0, 1, 10, 1);
    r.elapsed = 1;
    expect(researchEnemySlow(r, 0, 1, 10, 1)).toBeCloseTo(0.68);
    r.elapsed = 2;
    expect(researchEnemySlow(r, 0, 1, 10, 1)).toBe(0);
    expect(researchEnemySlow(r, 1, 1, 10, 3, true)).toBeCloseTo(0.64);
    r.elapsed = 2.6;
    expect(researchEnemySlow(r, 0, 1, 10, 0.6)).toBeCloseTo(0.64);
    r.elapsed = 10;
    expect(researchEnemySlow(r, 0, 1, 1000, 1)).toBe(1);
  });
  it('Stone and Stream boosts slowed-target force, Undertow and Floodgate share per-pulse cooldowns', () => {
    const r = run('lu-stone-and-stream', 'lu-undertow', 'lu-floodgate');
    expect(researchKnockback(r, true, false)).toBe(1.2);
    expect(researchKnockback(r, true, true)).toBe(0);
    expect(claimWaterPush(r)).toEqual({ pull: 50, damage: 1.6 });
    expect(claimWaterPush(r)).toEqual({ pull: 0, damage: 1 });
    r.elapsed = 6;
    expect(claimWaterPush(r)).toEqual({ pull: 0, damage: 1.6 });
    r.elapsed = 8;
    expect(claimWaterPush(r).pull).toBe(50);
  });
  it('Geomancer highlights earlier; Warning Signs grants a bounded dodge burst and Shifting Ridge expires', () => {
    const r = run('lu-geomancers-eye', 'lu-warning-signs', 'lu-shifting-ridge');
    expect(terrainWarningBonus(r)).toBe(1);
    resolveResearchEruption(r, 0, 0, 70, { x: 80, y: 0 }, false, true);
    expect(terrainDodgeSpeed(r)).toBe(1.2);
    expect(inRidgePatch(r, 70, 0)).toBe(true);
    r.elapsed = 3;
    expect(terrainDodgeSpeed(r)).toBe(1);
    r.elapsed = 4;
    expect(inRidgePatch(r, 70, 0)).toBe(false);
  });
  it('Eye of the Mountain grants crossing immunity and throttles rock arcs; distant misses do not count as dodges', () => {
    const r = run('lu-eye-of-the-mountain', 'lu-geomancers-eye');
    expect(resolveResearchEruption(r, 0, 0, 70, { x: 0, y: 0 }, true, true)).toEqual({
      immune: true,
      rock: true,
    });
    expect(resolveResearchEruption(r, 0, 0, 70, { x: 0, y: 0 }, true, true)).toEqual({
      immune: true,
      rock: false,
    });
    r.elapsed = 10;
    expect(resolveResearchEruption(r, 0, 0, 70, { x: 0, y: 0 }, true, true).rock).toBe(true);
    r.elapsed = 20;
    resolveResearchEruption(r, 0, 0, 70, { x: 1000, y: 0 }, false, false);
    expect(terrainDodgeSpeed(r)).toBe(1);
  });
  it('River That Remembers and Land in Motion use active-second bounded pulses', () => {
    const r = run('lu-river-that-remembers', 'lu-land-in-motion');
    expect(landWaterActive(r)).toBe(true);
    expect(claimTerrainWave(r)).toEqual({ wave: false, stone: false });
    r.elapsed = 10;
    expect(claimTerrainWave(r)).toEqual({ wave: true, stone: true });
    expect(claimTerrainWave(r)).toEqual({ wave: false, stone: false });
    r.phase = 'paused';
    r.elapsed = 20;
    expect(claimTerrainWave(r)).toEqual({ wave: false, stone: false });
    r.phase = 'playing';
    expect(claimTerrainWave(r).wave).toBe(true);
  });
});

it.each(['lu-geomancers-eye', 'lu-warning-signs'])(
  '%s requires entering and safely leaving the warning',
  (id) => {
    const r = run(id);
    resolveResearchEruption(r, 0, 0, 70, { x: 80, y: 0 }, false, false);
    expect(terrainDodgeSpeed(r)).toBe(1);
    resolveResearchEruption(r, 0, 0, 70, { x: 0, y: 0 }, false, true);
    expect(terrainDodgeSpeed(r)).toBe(1);
    resolveResearchEruption(r, 0, 0, 70, { x: 400, y: 0 }, false, true);
    expect(terrainDodgeSpeed(r)).toBeGreaterThan(1);
  },
);

it('Shifting Ridge waits for resolution, then creates a patch for distant misses', () => {
  const r = run('lu-shifting-ridge', 'lu-eye-of-the-mountain');
  resolveResearchEruption(r, 0, 0, 70, { x: 0, y: 0 }, true, true, false);
  expect(inRidgePatch(r, 70, 0)).toBe(false);
  resolveResearchEruption(r, 0, 0, 70, { x: 1000, y: 0 }, false, true);
  expect(r.researchRuntime?.ridgePatches).toHaveLength(1);
  expect(inRidgePatch(r, 70, 0)).toBe(true);
  r.elapsed = 4;
  expect(inRidgePatch(r, 70, 0)).toBe(false);
});

it('all pushes recognise current, lingering and patch slows while bosses resist displacement', () => {
  const r = run('lu-stone-and-stream', 'lu-floodplain');
  expect(researchEnemySlowed(r, 0, 1, 10, { x: 0, y: 0 })).toBe(true);
  researchEnemySlow(r, 0, 1, 10, 0.1);
  r.elapsed = 0.5;
  expect(researchEnemySlowed(r, 0, 1, 1000, { x: 1000, y: 0 })).toBe(true);
  expect(researchEnemySlowed(r, 0, 2, 1000, { x: 1000, y: 0 })).toBe(false);
  r.elapsed = 1;
  expect(researchEnemySlowed(r, 0, 1, 1000, { x: 1000, y: 0 })).toBe(false);
  r.researchRuntime!.ridgePatches = [{ x: 1000, y: 0, until: 5 }];
  const slowed = researchEnemySlowed(r, 0, 1, 1000, { x: 1000, y: 0 });
  expect(researchKnockback(r, slowed, false)).toBe(1.2);
  expect(researchKnockback(r, slowed, true)).toBe(0);
});

it('Frozen Bank keeps a root for its full duration after a push outside the field', () => {
  const r = run('lu-frozen-bank');
  researchEnemySlow(r, 0, 1, 10, 1);
  r.elapsed = 1;
  researchEnemySlow(r, 0, 1, 10, 1);
  r.elapsed = 2;
  expect(researchEnemySlow(r, 0, 1, 10, 1)).toBe(0);
  r.elapsed = 2.1;
  expect(researchEnemySlow(r, 0, 1, 1000, 0.1)).toBe(0);
  expect(researchEnemySlow(r, 0, 2, 1000, 0.1)).toBe(1);
  r.elapsed = 2.6;
  expect(researchEnemySlow(r, 0, 1, 1000, 0.5)).toBe(1);
});

it('Floodplain preserves continuous Frozen Bank and Deep Current progress across exit and reentry', () => {
  const r = run('lu-floodplain', 'lu-frozen-bank', 'lu-deep-current');
  researchEnemySlow(r, 0, 1, 10, 1);
  r.elapsed = 1;
  researchEnemySlow(r, 0, 1, 10, 1);
  const since = r.researchRuntime!.slowSince!['0:1'];
  r.elapsed = 1.5;
  expect(researchEnemySlow(r, 0, 1, 1000, 0.5)).toBeCloseTo(0.66);
  r.elapsed = 1.6;
  expect(researchEnemySlow(r, 0, 1, 10, 0.1)).toBeCloseTo(0.656);
  expect(r.researchRuntime!.slowSince!['0:1']).toBe(since);
  r.elapsed = 2;
  expect(researchEnemySlow(r, 0, 1, 10, 0.4)).toBe(0);
  r.elapsed = 4;
  expect(researchEnemySlow(r, 0, 1, 1000, 2)).toBe(1);
  r.elapsed = 4.1;
  expect(researchEnemySlow(r, 0, 1, 10, 0.1)).toBeCloseTo(0.756);
});
