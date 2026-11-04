import { describe, expect, it } from 'vitest';
import { chooseEnemy, spawnInterval } from '../../src/game/data/enemies';
import { createRun, formatTime, gainExperience } from '../../src/game/state/run';

describe('run progression', () => {
  it('creates independent runs, including nested stats', () => {
    const first = createRun();
    first.stats.damage = 99;
    expect(createRun().stats.damage).toBe(16);
  });

  it('carries excess XP across multiple levels and keeps every earned level', () => {
    const run = createRun();
    expect(gainExperience(run, 27)).toBe(true);
    expect(run).toMatchObject({ level: 3, xp: 5, nextLevelXp: 20 });
    expect(run).not.toHaveProperty('pendingUpgrades');
    expect(run).not.toHaveProperty('upgrades');
  });

  it('handles the exact level boundary and ignores negative XP', () => {
    const run = createRun();
    expect(gainExperience(run, -10)).toBe(false);
    expect(gainExperience(run, 8)).toBe(true);
    expect(run.xp).toBe(0);
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
