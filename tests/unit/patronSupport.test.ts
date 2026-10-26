import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import { PatronSupportClock } from '../../src/game/state/patronSupportClock';
import { createRun } from '../../src/game/state/run';
import { damageKhan } from '../../src/game/state/khan';
import type { RunPhase } from '../../src/game/types';

function enabledRun() {
  const run = createRun();
  run.phase = 'playing';
  run.patrons.ancestors.count = 3;
  run.patrons.water.pulseDamage = 0.75;
  run.patrons.guardian.wardDamage = 0.65;
  return run;
}

const allFire = { ancestorCount: 3, releaseAncestors: true, pulseWater: true, ward: true };
const noneFire = { ancestorCount: 3, releaseAncestors: false, pulseWater: false, ward: false };

describe('patron support cadence', () => {
  it('freezes every timer and release outside playing', () => {
    const phases: RunPhase[] = [
      'ready',
      'intro',
      'story',
      'epilogue',
      'story-log',
      'paused',
      'upgrade',
      'building',
      'route',
      'journal',
      'settings',
      'help',
      'dead',
      'won',
    ];
    const run = enabledRun();
    const clock = new PatronSupportClock();
    clock.update(run, 0.25);
    const before = clock.capture();
    for (const phase of phases) {
      run.phase = phase;
      expect(clock.update(run, 100)).toBeUndefined();
      expect(clock.capture()).toEqual(before);
    }
    run.phase = 'playing';
    expect(clock.update(run, 0.25)).toEqual(noneFire);
  });

  it.each([NaN, Infinity, -Infinity, 0, -1])('ignores invalid dt %s', (dt) => {
    const run = enabledRun();
    const clock = new PatronSupportClock();
    const before = clock.capture();
    expect(clock.update(run, dt)).toBeUndefined();
    expect(clock.capture()).toEqual(before);
    expect(clock.update(run, 0.25)).toEqual(allFire);
  });

  it('releases ancestors immediately, then at the configured active-second interval', () => {
    const run = enabledRun();
    run.patrons.ancestors.interval = 1.5;
    const clock = new PatronSupportClock();
    expect(clock.update(run, 0.25)?.releaseAncestors).toBe(true);
    for (let cycle = 0; cycle < 3; cycle++) {
      for (let tick = 0; tick < 5; tick++)
        expect(clock.update(run, 0.25)?.releaseAncestors).toBe(false);
      expect(clock.update(run, 0.25)?.releaseAncestors).toBe(true);
    }
    run.patrons.ancestors.interval = 0.5;
    expect(clock.update(run, 1.5)?.releaseAncestors).toBe(true);
    expect(clock.capture().ancestorTimer).toBe(0.5);
    expect(clock.update(run, 0.25)?.releaseAncestors).toBe(false);
    expect(clock.update(run, 0.25)?.releaseAncestors).toBe(true);
  });

  it('bounds ancestors and resets their timer while none are present', () => {
    const run = enabledRun();
    const clock = new PatronSupportClock();
    run.patrons.ancestors.count = 999;
    expect(clock.update(run, 0.25)?.ancestorCount).toBe(GAME.patrons.ancestors.maximum);
    run.patrons.ancestors.count = 0;
    expect(clock.update(run, 0.25)).toMatchObject({ ancestorCount: 0, releaseAncestors: false });
    expect(clock.capture().ancestorTimer).toBe(0);
    run.patrons.ancestors.count = 1;
    expect(clock.update(run, 0.25)?.releaseAncestors).toBe(true);
  });

  it('fires water and wards on their own cadences', () => {
    const run = enabledRun();
    const clock = new PatronSupportClock();
    expect(clock.update(run, 0.25)).toEqual(allFire);
    for (let tick = 1; tick <= 32; tick++) {
      const step = clock.update(run, 0.25);
      expect(step?.pulseWater).toBe((tick * 0.25) % GAME.patrons.water.pulseEvery === 0);
      expect(step?.ward).toBe((tick * 0.25) % GAME.patrons.guardian.wardEvery === 0);
    }
  });

  it('suppresses water during succession while ancestors and camp wards continue', () => {
    const run = enabledRun();
    const clock = new PatronSupportClock();
    expect(clock.update(run, 0.25)).toEqual(allFire);
    expect(damageKhan(run, 1000)).toBe('fallen');
    expect(clock.update(run, 10)).toEqual({ ...allFire, pulseWater: false });
    expect(clock.capture().waterTimer).toBe(GAME.patrons.water.pulseEvery - 10);
    // Neither healing alone nor an expired timer alone makes the Khan active.
    run.health = run.stats.maxHealth;
    expect(clock.update(run, 0.25)?.pulseWater).toBe(false);
    run.health = 0;
    run.khan.successionRemaining = 0;
    expect(clock.update(run, 0.25)?.pulseWater).toBe(false);
    run.health = run.stats.maxHealth;
    expect(clock.update(run, 0.25)?.pulseWater).toBe(true);
    expect(clock.capture().waterTimer).toBe(GAME.patrons.water.pulseEvery);
  });

  it('keeps disabled water and wards counting down and fires when they become enabled', () => {
    const run = createRun();
    run.phase = 'playing';
    const clock = new PatronSupportClock();
    expect(clock.update(run, 10)).toEqual({ ...noneFire, ancestorCount: 0 });
    expect(clock.capture()).toEqual({ ancestorTimer: 0, waterTimer: -10, guardianTimer: -10 });
    Object.assign(run.patrons, enabledRun().patrons);
    expect(clock.update(run, 0.25)).toEqual(allFire);
  });

  it('fires at most once per step and resets full intervals without retaining overshoot', () => {
    const run = enabledRun();
    const clock = new PatronSupportClock();
    expect(clock.update(run, 100)).toEqual(allFire);
    expect(clock.capture()).toEqual({
      ancestorTimer: run.patrons.ancestors.interval,
      waterTimer: GAME.patrons.water.pulseEvery,
      guardianTimer: GAME.patrons.guardian.wardEvery,
    });
    expect(clock.update(run, 0.25)).toEqual(noneFire);
  });

  it('captures independent snapshots and restores the exact remaining cadence', () => {
    const run = enabledRun();
    const clock = new PatronSupportClock();
    clock.update(run, 0.25);
    clock.update(run, 0.75);
    const saved = clock.capture();
    const restored = new PatronSupportClock();
    restored.restore(saved);
    saved.waterTimer = 999;
    expect(restored.capture()).toEqual(clock.capture());
    for (const dt of [0.25, 0.5, 0.25, 1, 2, 0.25]) {
      expect(restored.update(run, dt)).toEqual(clock.update(run, dt));
      expect(restored.capture()).toEqual(clock.capture());
    }
    run.health = 0;
    restored.update(run, 10);
    clock.restore(restored.capture());
    expect(clock.capture().waterTimer).toBeLessThan(0);
    run.health = run.stats.maxHealth;
    expect(clock.update(run, 0.25)).toEqual(restored.update(run, 0.25));
  });
});
