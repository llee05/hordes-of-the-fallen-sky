import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import { advanceClan, damageClan } from '../../src/game/state/clan';
import { createLegacyCampRun as createRun } from '../support/legacyCamp';
import { createDeveloperRun } from '../../src/game/dev/levels';

describe('transient clan protection', () => {
  it('prevents resolve, population, livestock, and chronicle damage and resumes damage when disabled', () => {
    const run = createRun();
    run.phase = 'playing';
    const before = structuredClone(run);
    damageClan(run, 10000, { invincible: true });
    expect(run).toEqual(before);
    damageClan(run, 40, { invincible: false });
    expect(run.clan.integrity).toBeLessThan(before.clan.integrity);
    expect(run.clan.population).toBeLessThan(before.clan.population);
    expect(run.clan.herd).toBeLessThan(before.clan.herd);
  });

  it('prevents starvation losses while economy, threat, and active journey time continue', () => {
    const run = createRun();
    run.phase = 'playing';
    run.clan.food = 0;
    run.clan.pasture = 0;
    run.clan.stageTime = GAME.clan.starvationInterval - 0.05;
    const before = structuredClone(run);
    advanceClan(run, 0.1, { invincible: true });
    expect(run.clan.food).toBe(0);
    expect(run.clan.stageTime).toBeGreaterThan(before.clan.stageTime);
    expect(run.clan.threat).toBeGreaterThan(before.clan.threat);
    expect([run.clan.integrity, run.clan.population, run.clan.herd, run.story.peopleLost]).toEqual([
      before.clan.integrity,
      before.clan.population,
      before.clan.herd,
      before.story.peopleLost,
    ]);
    advanceClan(run, GAME.clan.starvationInterval);
    expect(run.clan.population).toBeLessThan(before.clan.population);
    expect(run.clan.herd).toBeLessThan(before.clan.herd);
  });

  it('allows crossings to arrive and refuses to resurrect an already lost clan', () => {
    const run = createDeveloperRun('crossing:golden-pasture:river')!;
    expect(advanceClan(run, 1000, { invincible: true })).toBe('arrived');
    expect(run.clan.region).toBe(1);
    run.clan.integrity = 0;
    expect(advanceClan(run, 0.1, { invincible: true })).toBe('lost');
  });
});
