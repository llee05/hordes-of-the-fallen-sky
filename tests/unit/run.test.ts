import { describe, expect, it } from 'vitest';
import { UPGRADES, upgradeChoices } from '../../src/game/data/upgrades';
import { chooseEnemy, spawnInterval } from '../../src/game/data/enemies';
import { applyUpgrade, createRun, formatTime, gainExperience } from '../../src/game/state/run';

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

  it('never offers a maxed blessing and never duplicates a choice', () => {
    const run = createRun();
    const power = UPGRADES.find((upgrade) => upgrade.id === 'power')!;
    run.upgrades.power = power.maxStacks;
    run.pendingUpgrades = 1;
    expect(applyUpgrade(run, power)).toBe(false);
    const choices = upgradeChoices(run, () => 0.5);
    expect(choices).toHaveLength(3);
    expect(new Set(choices.map((choice) => choice.id)).size).toBe(3);
    expect(choices.some((choice) => choice.id === 'power')).toBe(false);
  });

  it('allows exhausting the upgrade pool without an invalid choice', () => {
    const run = createRun();
    for (const upgrade of UPGRADES) run.upgrades[upgrade.id] = upgrade.maxStacks;
    expect(upgradeChoices(run)).toEqual([]);
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
