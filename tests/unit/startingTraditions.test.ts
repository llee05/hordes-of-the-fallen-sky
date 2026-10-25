import { expect, it } from 'vitest';
import { STARTING_TRADITIONS } from '../../src/game/data/clan';
import { UPGRADES } from '../../src/game/data/upgrades';
import { createRun, applyUpgrade } from '../../src/game/state/run';
import { riderCount, clanDamageMultiplier } from '../../src/game/state/clan';
import { migrationMobility } from '../../src/game/state/economy';
import { captureCampArchive, runFromCampArchive } from '../../src/game/state/campArchive';

it('keeps the original opening and gives every alternative a real provision or construction cost', () => {
  const baseline = createRun();
  expect(baseline.clan).toMatchObject({ population: 8, herd: 3, food: 70, materials: 50 });
  expect(riderCount(baseline)).toBe(1);
  for (const entry of STARTING_TRADITIONS.slice(1)) {
    const run = createRun(entry.id);
    expect(run.clan.population).toBe(8);
    expect(run.clan.herd).toBe(3);
    expect(run.clan.food + run.clan.materials).toBeLessThan(120);
    expect(run.clan.estate).toEqual(baseline.clan.estate);
    expect(run.upgrades).toEqual({});
  }
  expect(riderCount(createRun('outriders'))).toBe(2);
  expect(
    clanDamageMultiplier(createRun('hearthkeepers')) / clanDamageMultiplier(baseline),
  ).toBeCloseTo(0.85);
  const scouts = createRun('pathfinders');
  expect(scouts.stats.speed / baseline.stats.speed).toBeCloseTo(1.07);
  expect(scouts.stats.pickupRadius / baseline.stats.pickupRadius).toBeCloseTo(1.15);
  expect(migrationMobility(scouts) / migrationMobility(baseline)).toBeCloseTo(1.1);
});

it('keeps every patron foundation open, stacks camp improvements, and does not grant extra building plots', () => {
  for (const entry of STARTING_TRADITIONS) {
    const run = createRun(entry.id);
    run.pendingUpgrades = 1000;
    for (const upgrade of UPGRADES.filter((u) => !u.requires?.length && !u.exclusiveGroup))
      expect(applyUpgrade(run, upgrade)).toBe(true);
    const initial = riderCount(run);
    run.clan.buildings.archery = 1;
    expect(riderCount(run)).toBe(initial + 3);
    run.clan.region = 2;
    run.khan.generation = 3;
    expect(run.startingTradition).toBe(entry.id);
    expect(run.clan.estate?.tier).toBe(1);
    expect(run.clan.estate?.slots).toEqual(createRun().clan.estate?.slots);
  }
});

it('treats old expeditions and portable camp continuations as the neutral arrangement', () => {
  const legacy = createRun();
  delete legacy.startingTradition;
  expect(riderCount(legacy)).toBe(1);
  expect(clanDamageMultiplier(legacy)).toBeCloseTo(0.7);
  const source = createRun('outriders');
  const restored = runFromCampArchive(captureCampArchive(source))!;
  expect(restored.clan.food).toBe(source.clan.food);
  expect(riderCount(restored)).toBe(1);
  expect(restored.startingTradition).toBe('shared-hearth');
});
