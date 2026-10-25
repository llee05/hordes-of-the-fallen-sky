import { describe, expect, it } from 'vitest';
import { createRun } from '../../src/game/state/run';
import { advanceClan, beginMigration, damageClan } from '../../src/game/state/clan';
import {
  chooseSuccessor,
  damageKhan,
  advanceSuccession,
  khanSpeedMultiplier,
} from '../../src/game/state/khan';
import type { SuccessorTrait } from '../../src/game/data/successors';

describe('readable clan survival', () => {
  it('distinguishes combat, eruptions and starvation without changing protection or counting invincible losses', () => {
    const r = createRun();
    r.phase = 'playing';
    r.clan.formation = 'encircle';
    damageClan(r, 25);
    expect(r.safety.combatLosses).toBe(1);
    expect(r.safety.lastDamage).toMatchObject({ cause: 'attack', people: 1, amount: 25 });
    damageClan(r, 25, undefined, 'eruption');
    expect(r.safety.lastDamage?.cause).toBe('eruption');
    expect(r.safety.combatLosses).toBe(2);
    const before = structuredClone(r);
    damageClan(r, 1000, { invincible: true }, 'seer');
    expect(r).toEqual(before);
    r.clan.food = 0;
    r.clan.pasture = 0;
    r.clan.stageTime = 11.99;
    advanceClan(r, 0.02);
    expect(r.safety.starvationLosses).toBeGreaterThanOrEqual(1);
    expect(r.safety.lastDamage?.cause).toBe('starvation');
    expect(r.safety.combatLosses + r.safety.starvationLosses).toBe(r.story.peopleLost);
  });
  it('remembers casualty-free crossings without mistaking refugee growth for protection', () => {
    for (const casualty of [false, true]) {
      const r = createRun();
      r.phase = 'route';
      r.clan.stageTime = 45;
      beginMigration(r, 'refuge');
      r.phase = 'playing';
      if (casualty) {
        r.story.peopleLost++;
        r.clan.population--;
      }
      advanceClan(r, 100);
      expect(r.safety.protectedCrossings).toBe(casualty ? 0 : 1);
      expect(r.legacy.memories.some((m) => m.title === 'Every household arrived')).toBe(!casualty);
    }
  });
});
describe('optional successor choices', () => {
  it('respects the active countdown, applies a modest generation-specific trait and never stacks inherited stats', () => {
    const r = createRun();
    r.phase = 'playing';
    const stats = structuredClone(r.stats);
    expect(chooseSuccessor(r, 'outrider')).toBe(false);
    damageKhan(r, 1000);
    r.phase = 'paused';
    expect(chooseSuccessor(r, 'outrider')).toBe(false);
    r.phase = 'playing';
    expect(chooseSuccessor(r, 'invalid' as SuccessorTrait)).toBe(false);
    expect(chooseSuccessor(r, 'outrider')).toBe(true);
    expect(chooseSuccessor(r, 'hearthguard')).toBe(false);
    expect(advanceSuccession(r, 9)).toBe(false);
    expect(r.health).toBe(0);
    expect(advanceSuccession(r, 1)).toBe(true);
    expect(khanSpeedMultiplier(r)).toBe(1.05);
    expect(r.stats).toEqual(stats);
    expect(r.legacy.khans.at(-1)?.trait).toBe('outrider');
    damageKhan(r, 1000);
    chooseSuccessor(r, 'hearthguard');
    advanceSuccession(r, 10);
    expect(khanSpeedMultiplier(r)).toBe(1);
    damageKhan(r, 10);
    expect(r.health).toBeCloseTo(90.8);
    expect(r.stats).toEqual(stats);
    expect(r.patrons.hearth.revives).toBe(0);
  });
  it('returns an unmodified successor if no preference was made', () => {
    const r = createRun();
    r.phase = 'playing';
    damageKhan(r, 1000);
    advanceSuccession(r, 10);
    expect(r.khan.trait).toBeUndefined();
    expect(r.health).toBe(100);
    expect(khanSpeedMultiplier(r)).toBe(1);
  });
});
