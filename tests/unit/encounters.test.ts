import { describe, expect, it } from 'vitest';
import { createRun } from '../../src/game/state/run';
import { advanceEncounters, encounterPlan, encounterEnemy } from '../../src/game/state/encounters';

describe('readable encounter pacing', () => {
  it('preserves the gentle opening, telegraphs assaults, and gives a real recovery window', () => {
    const r = createRun();
    r.phase = 'playing';
    expect(encounterPlan(r).phase).toBe('probing');
    r.clan.stageTime = 18;
    expect(advanceEncounters(r)).toBe(true);
    expect(advanceEncounters(r)).toBe(false);
    const direction = encounterPlan(r).angle;
    r.clan.stageTime = 26;
    expect(encounterPlan(r).phase).toBe('assault');
    expect(encounterPlan(r).angle).toBe(direction);
    const attack = encounterPlan(r).interval;
    r.clan.stageTime = 64;
    expect(encounterPlan(r).phase).toBe('recovery');
    expect(encounterPlan(r).interval).toBeGreaterThan(attack * 3);
    const rested = encounterPlan(r).interval;
    r.clan.pasture = 0;
    expect(encounterPlan(r).interval).toBeLessThan(rested);
  });
  it('never consumes a warning while paused or selects locked enemies, and allows only one featured elite per cycle', () => {
    const r = createRun();
    r.clan.stageTime = 53;
    r.elapsed = 56;
    const before = structuredClone(r);
    expect(advanceEncounters(r)).toBe(false);
    expect(r).toEqual(before);
    r.phase = 'playing';
    advanceEncounters(r);
    r.elapsed = 52;
    expect(encounterEnemy(r).elite).toBe(false);
    r.elapsed = 56;
    expect(encounterEnemy(r).elite).toBe(true);
    expect(encounterEnemy(r).definition.id).toBe('brute');
    r.encounters.eliteSpawned = true;
    expect(encounterEnemy(r).elite).toBe(false);
    for (let i = 0; i < 30; i++)
      expect(encounterEnemy(r).definition.unlockAt).toBeLessThanOrEqual(56);
    r.clan.stageTime += 70;
    advanceEncounters(r);
    expect(r.encounters.eliteSpawned).toBe(false);
  });
});
