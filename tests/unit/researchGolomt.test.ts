import { describe, expect, it } from 'vitest';
import { createRun } from '../../src/game/state/run';
import { damageKhan } from '../../src/game/state/khan';
import { advancePatrons } from '../../src/game/state/patrons';
import { clanDamageMultiplier } from '../../src/game/state/clan';
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
    recordWaveEnded(r);
    expect(r.health).toBeCloseTo(55 + (r.stats.maxHealth - 55) * 0.03);
    expect(r.clan.integrity).toBe(52);
    r.health = 0;
    r.khan.successionRemaining = 5;
    recordWaveEnded(r);
    expect(r.health).toBe(0);
    r.phase = 'paused';
    const resolve = r.clan.integrity;
    recordWaveEnded(r);
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
