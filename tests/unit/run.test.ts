import { describe, expect, it } from 'vitest';
import { UPGRADES } from '../../src/game/data/upgrades';
import { chooseEnemy, spawnInterval } from '../../src/game/data/enemies';
import {
  applyUpgrade,
  createRun,
  formatTime,
  gainExperience,
  redeemMasteredResearch,
  upgradeBlocker,
} from '../../src/game/state/run';

describe('run progression', () => {
  it('creates independent runs, including nested stats and upgrades', () => {
    const first = createRun();
    first.stats.damage = 99;
    first.upgrades.power = 2;
    expect(createRun().stats.damage).toBe(16);
    expect(createRun().upgrades).toEqual({});
  });

  it('carries excess XP across multiple levels and grants every earned choice', () => {
    const run = createRun();
    expect(gainExperience(run, 27)).toBe(true);
    expect(run).toMatchObject({ level: 3, xp: 5, nextLevelXp: 20, pendingUpgrades: 2 });
  });

  it('handles the exact level boundary and ignores negative XP', () => {
    const run = createRun();
    expect(gainExperience(run, -10)).toBe(false);
    expect(gainExperience(run, 8)).toBe(true);
    expect(run.xp).toBe(0);
  });

  it('consumes one pending choice per upgrade and applies its effect once', () => {
    const run = createRun();
    const power = UPGRADES.find((upgrade) => upgrade.id === 'power')!;
    expect(applyUpgrade(run, power)).toBe(false);
    gainExperience(run, 8);
    expect(applyUpgrade(run, power)).toBe(true);
    expect(run.stats.damage).toBe(20);
    expect(run.upgrades.power).toBe(1);
    expect(run.pendingUpgrades).toBe(0);
    expect(applyUpgrade(run, power)).toBe(false);
  });

  it('rejects maxed ranks, skipped ranks, stale duplicate purchases, and invalid rank values', () => {
    const run = createRun();
    const power = UPGRADES.find((upgrade) => upgrade.id === 'power')!;
    run.pendingUpgrades = 3;
    expect(applyUpgrade(run, power, 2)).toBe(false);
    expect(applyUpgrade(run, power, NaN)).toBe(false);
    expect(applyUpgrade(run, power, 1)).toBe(true);
    expect(applyUpgrade(run, power, 1)).toBe(false);
    expect(run.pendingUpgrades).toBe(2);
    expect(run.stats.damage).toBe(20);
    run.upgrades.power = power.maxStacks;
    expect(applyUpgrade(run, power)).toBe(false);
    expect(run.pendingUpgrades).toBe(2);
  });

  it('supports data-defined prerequisites and keeps banked points when a branch is locked', () => {
    const run = createRun();
    const power = UPGRADES.find((upgrade) => upgrade.id === 'power')!;
    const advanced = { ...power, id: 'advanced', requires: [{ id: 'power', rank: 2 }] };
    run.pendingUpgrades = 5;
    expect(upgradeBlocker(run, advanced)).toContain('Horn-and-sinew bows rank 2');
    expect(applyUpgrade(run, advanced)).toBe(false);
    applyUpgrade(run, power, 1);
    applyUpgrade(run, power, 2);
    expect(applyUpgrade(run, advanced)).toBe(true);
    expect(run.pendingUpgrades).toBe(2);
  });

  it('converts every banked point only after all branches are mastered, exactly once', () => {
    const run = createRun();
    run.pendingUpgrades = 3;
    expect(redeemMasteredResearch(run)).toBe(false);
    expect(run.pendingUpgrades).toBe(3);
    for (const upgrade of UPGRADES) run.upgrades[upgrade.id] = upgrade.maxStacks;
    run.health = 1;
    expect(redeemMasteredResearch(run)).toBe(true);
    expect(run.clan.food).toBe(130);
    expect(run.clan.materials).toBe(95);
    expect(run.health).toBe(run.stats.maxHealth);
    expect(redeemMasteredResearch(run)).toBe(false);
    expect(run.pendingUpgrades).toBe(0);
  });

  it('vitality increases the cap and heals without exceeding it', () => {
    const run = createRun();
    run.pendingUpgrades = 1;
    applyUpgrade(
      run,
      UPGRADES.find((upgrade) => upgrade.id === 'vitality')!,
    );
    expect(run.health).toBe(120);
    expect(run.stats.maxHealth).toBe(120);
  });

  it('formats elapsed time without rounding up', () => {
    expect(formatTime(59.99)).toBe('00:59');
    expect(formatTime(180)).toBe('03:00');
    expect(formatTime(-4)).toBe('00:00');
  });
});

describe('encounter pacing', () => {
  it('only spawns unlocked enemies', () => {
    expect(chooseEnemy(0, () => 0.99).id).toBe('wisp');
    expect(chooseEnemy(25, () => 0.99).id).toBe('bat');
    expect(chooseEnemy(60, () => 0.99).id).toBe('brute');
  });

  it('increases pressure while bounding the spawn rate', () => {
    expect(spawnInterval(100)).toBeLessThan(spawnInterval(0));
    expect(spawnInterval(10000)).toBe(0.14);
  });
});
