import { describe, expect, it } from 'vitest';
import { createRun } from '../../src/game/state/run';
import {
  claimGhostArrow,
  claimThousandArrows,
  ghostArrowModifier,
  recordHybridKill,
  rewardLivingWaters,
  wardRateMultiplier,
} from '../../src/game/state/researchHybrids';
import {
  markEnemy,
  recordResearchEnemyKill,
  recordWaveEnded,
} from '../../src/game/state/researchRuntime';
import { PatronSupportClock } from '../../src/game/state/patronSupportClock';
function run(...ids: string[]) {
  const r = createRun();
  r.phase = 'playing';
  for (const id of ids) r.upgrades[id] = 1;
  return r;
}
describe('Cross-patron runtime mechanics', () => {
  it('Ghost-Fletched Arrows releases every fifth actual echo attack, with one inherited modifier', () => {
    const r = run('hy-ghost-fletched-arrows');
    expect(Array.from({ length: 5 }, () => claimGhostArrow(r, 0))).toEqual([
      false,
      false,
      false,
      false,
      true,
    ]);
    expect(claimGhostArrow(r, 1)).toBe(false);
    r.patrons.bow.pierce = 2;
    r.clan.paths.archery = ['fire-arrows'];
    expect(ghostArrowModifier(r)).toEqual({ pierces: 2, fire: false });
    r.patrons.bow.pierce = 0;
    expect(ghostArrowModifier(r)).toEqual({ pierces: 0, fire: true });
    r.phase = 'paused';
    expect(claimGhostArrow(r, 0)).toBe(false);
  });
  it('Living Waters rewards a defeated wave with near-camp kills once, respecting cooldown and pasture cap', () => {
    const r = run('hy-living-waters');
    r.clan.pasture = 99;
    r.clan.food = 10;
    for (let i = 0; i < 3; i++) recordHybridKill(r, false, true);
    recordWaveEnded(r);
    expect(r.clan.food).toBe(12);
    expect(r.clan.pasture).toBe(100);
    expect(rewardLivingWaters(r)).toBe(false);
    for (let i = 0; i < 3; i++) recordHybridKill(r, false, true);
    expect(rewardLivingWaters(r)).toBe(false);
    r.elapsed = 20;
    for (let i = 0; i < 3; i++) recordHybridKill(r, false, true);
    expect(rewardLivingWaters(r)).toBe(true);
  });
  it('Thousand Arrows gates supporting volleys for eight active seconds', () => {
    const r = run('hy-thousand-arrows');
    expect(claimThousandArrows(r)).toBe(true);
    expect(claimThousandArrows(r)).toBe(false);
    r.elapsed = 8;
    expect(claimThousandArrows(r)).toBe(true);
    r.phase = 'paused';
    r.elapsed = 20;
    expect(claimThousandArrows(r)).toBe(false);
  });
  it('Last Stand of the Hearth accelerates real ward pulses for eight seconds and requires a new threshold crossing', () => {
    const r = run('hy-last-stand-of-hearth');
    r.patrons.guardian.wardDamage = 0.65;
    const clock = new PatronSupportClock();
    expect(clock.update(r, 0.1)?.ward).toBe(true);
    r.clan.integrity = 19;
    expect(wardRateMultiplier(r)).toBe(2);
    expect(clock.update(r, 1)?.ward).toBe(true);
    r.elapsed = 8;
    expect(wardRateMultiplier(r)).toBe(1);
    r.elapsed = 31;
    expect(wardRateMultiplier(r)).toBe(1);
    r.clan.integrity = 21;
    wardRateMultiplier(r);
    r.clan.integrity = 19;
    expect(wardRateMultiplier(r)).toBe(2);
  });
  it('Blood and Ember heals only marked elite finishers at most once per eight seconds, never successors', () => {
    const r = run('hy-blood-and-ember');
    r.health = 50;
    markEnemy(r, 0, 1);
    recordResearchEnemyKill(r, { slot: 0, spawn: 1, elite: true });
    expect(r.health).toBe(58);
    markEnemy(r, 0, 2);
    recordResearchEnemyKill(r, { slot: 0, spawn: 2, elite: true });
    expect(r.health).toBe(58);
    r.elapsed = 8;
    markEnemy(r, 0, 3);
    recordResearchEnemyKill(r, { slot: 0, spawn: 3, elite: false });
    expect(r.health).toBe(58);
    r.health = 0;
    r.khan.successionRemaining = 5;
    markEnemy(r, 0, 4);
    recordResearchEnemyKill(r, { slot: 0, spawn: 4, elite: true });
    expect(r.health).toBe(0);
  });
});
