import { describe, expect, it } from 'vitest';
import { advanceEncounters } from '../../src/game/state/encounters';
import { createRun } from '../../src/game/state/run';
import { damageKhan } from '../../src/game/state/khan';
import { advancePatrons } from '../../src/game/state/patrons';
import { GAME } from '../../src/game/config';
import { advanceClan, beginMigration, clanDamageMultiplier } from '../../src/game/state/clan';
import {
  claimAshBornPulse,
  claimFlameRefusesPulse,
  eternalHearthPush,
  healKhan,
  recordWaveEnded,
  updateCampfireVigil,
} from '../../src/game/state/researchRuntime';
function run(...ids: string[]) {
  const r = createRun();
  r.phase = 'playing';
  r.clan.campEffects.bonuses.commanderRecovery = 0;
  for (const id of ids) r.upgrades[id] = 1;
  return r;
}
describe('Golomt runtime effects', () => {
  it('Warm Ashes and Shelter the Wounded recover once on wave completion, never resurrect', () => {
    const r = run('go-warm-ashes', 'go-shelter-the-wounded');
    r.health = 50;
    r.clan.integrity = 50;
    recordWaveEnded(r, false);
    expect(r.health).toBeCloseTo(55 + (r.stats.maxHealth - 55) * 0.03);
    expect(r.clan.integrity).toBe(52);
    r.health = 0;
    r.khan.successionRemaining = 5;
    recordWaveEnded(r, false);
    expect(r.health).toBe(0);
    r.phase = 'paused';
    const resolve = r.clan.integrity;
    recordWaveEnded(r, false);
    expect(r.clan.integrity).toBe(resolve);
  });
  it('Embers Return heals surviving low-health hits with an active-time cooldown', () => {
    const r = run('go-embers-return');
    r.health = 20;
    damageKhan(r, 1);
    expect(r.health).toBe(29);
    damageKhan(r, 1);
    expect(r.health).toBe(28);
    r.elapsed = 12;
    damageKhan(r, 1);
    expect(r.health).toBe(37);
  });
  it('Campfire Vigil heals and protects only while stationary near camp', () => {
    const r = run('go-campfire-vigil');
    r.health = 50;
    const base = clanDamageMultiplier(r);
    updateCampfireVigil(r, true);
    advancePatrons(r, 1);
    expect(r.health).toBeCloseTo(50.4);
    expect(clanDamageMultiplier(r)).toBeCloseTo(base * 0.95);
    updateCampfireVigil(r, false);
    advancePatrons(r, 1);
    expect(r.health).toBeCloseTo(50.4);
  });
  it('Ash-Born and Flame That Refuses trigger only after Last Ember, with three delayed pulses', () => {
    const r = run('go-ash-born', 'go-flame-that-refuses');
    r.patrons.hearth.revives = 1;
    expect(damageKhan(r, 1000)).toBe('revived');
    expect(claimAshBornPulse(r)).toEqual({ radius: 140, push: 75 });
    expect(claimAshBornPulse(r)).toBeUndefined();
    const hp = r.health;
    expect(damageKhan(r, 1000)).toBeUndefined();
    advancePatrons(r, 1);
    expect(r.health).toBeCloseTo(hp + r.stats.maxHealth * 0.01);
    for (const time of [1, 2, 3]) {
      r.elapsed = time;
      expect(claimFlameRefusesPulse(r)?.damage).toBeCloseTo(r.stats.damage * 1.2);
      expect(claimFlameRefusesPulse(r)).toBeUndefined();
    }
    r.elapsed = 10;
    advancePatrons(r, 1);
    expect(claimFlameRefusesPulse(r)).toBeUndefined();
  });
  it('Firebreak halves qualifying hits at most once per 15 active seconds', () => {
    const r = run('go-firebreak');
    damageKhan(r, 20);
    expect(r.health).toBe(90);
    damageKhan(r, 20);
    expect(r.health).toBe(70);
    r.elapsed = 15;
    damageKhan(r, 20);
    expect(r.health).toBe(60);
  });
  it('Household Oath converts overheal once per ten seconds and Fortress reduces all healing', () => {
    const r = run('go-household-oath', 'go-fortress-of-felt');
    r.clan.integrity = 50;
    healKhan(r, 5);
    healKhan(r, 5);
    expect(r.clan.integrity).toBe(51);
    r.elapsed = 10;
    healKhan(r, 5);
    expect(r.clan.integrity).toBe(52);
    r.health = 20;
    healKhan(r, 10);
    expect(r.health).toBe(28);
    damageKhan(r, 8);
    expect(r.health).toBe(22);
  });
  it('Eternal Hearth starts at 60 seconds, heals during its window and excludes bosses from push', () => {
    const r = run('go-eternal-hearth');
    r.health = 50;
    advancePatrons(r, 1);
    expect(r.health).toBe(50);
    r.elapsed = 60;
    r.clan.integrity = 50;
    advancePatrons(r, 1);
    expect(r.clan.integrity).toBe(50);
    updateCampfireVigil(r, false, 100);
    advancePatrons(r, 1);
    expect(r.clan.integrity).toBeCloseTo(50.15);
    expect(r.health).toBe(51);
    expect(eternalHearthPush(r, 50)).toBe(28);
    expect(eternalHearthPush(r, 50, true)).toBe(0);
    r.elapsed = 70;
    expect(eternalHearthPush(r, 50)).toBe(0);
  });
});

it('arrival healing scales base and camp bonuses, converts overheal and preserves succession', () => {
  for (const fallen of [false, true]) {
    const r = run('go-fortress-of-felt', 'go-household-oath');
    r.clan.food = 10000;
    r.clan.stageTime = GAME.clan.minimumCamp;
    r.clan.campEffects.bonuses.arrivalHealth = 10;
    r.phase = 'route';
    expect(beginMigration(r, 'refuge')).toBe(true);
    r.phase = 'playing';
    r.health = fallen ? 0 : 20;
    r.khan.successionRemaining = fallen ? 5 : 0;
    expect(advanceClan(r, 100)).toBe('arrived');
    expect(r.health).toBe(fallen ? 0 : 20 + (GAME.clan.arrival.health + 10) * 0.8);
    if (fallen) expect(r.khan.successionRemaining).toBe(5);
  }
  const r = run('go-household-oath');
  r.clan.food = 10000;
  r.clan.stageTime = GAME.clan.minimumCamp;
  r.phase = 'route';
  expect(beginMigration(r, 'refuge')).toBe(true);
  r.phase = 'playing';
  r.clan.integrity = 40;
  r.health = r.stats.maxHealth;
  const before = r.clan.integrity;
  expect(advanceClan(r, 100)).toBe('arrived');
  expect(r.clan.integrity).toBe(before + GAME.clan.arrival.resolve + GAME.crossings.safeResolve + 1);
});

it('retains Warm Ashes through combat and menus, then pays once without another recovery transition', () => {
  const r = run('go-warm-ashes');
  r.health = 50;
  r.clan.stageTime = 64;
  advanceEncounters(r, true);
  expect(r.health).toBe(50);
  expect(r.researchRuntime?.warmAshesPending).toBe(true);
  r.clan.stageTime += 1;
  advanceEncounters(r, true);
  expect(r.health).toBe(50);
  r.phase = 'paused';
  advanceEncounters(r, false);
  expect(r.health).toBe(50);
  expect(r.researchRuntime?.warmAshesPending).toBe(true);
  r.phase = 'playing';
  advanceEncounters(r, false);
  expect(r.health).toBe(55);
  expect(r.researchRuntime?.warmAshesPending).toBe(false);
  advanceEncounters(r, false);
  expect(r.health).toBe(55);
});
