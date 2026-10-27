import { describe, expect, it } from 'vitest';
import { createLegacyCampRun as createRun } from '../support/legacyCamp';
import {
  advanceClan,
  beginMigration,
  buildingCost,
  damageClan,
  riderCount,
} from '../../src/game/state/clan';
import {
  advancePatrons,
  friendlyDamageMultiplier,
  gallopCooldown,
  rewardPatronKill,
  terrainSpeedMultiplier,
} from '../../src/game/state/patrons';
import { damageKhan } from '../../src/game/state/khan';
import type { RunPhase } from '../../src/game/types';

describe('patron simulation', () => {
  it('creates independent neutral effects and preserves baseline combat and costs', () => {
    const run = createRun();
    expect(gallopCooldown(run)).toBe(3);
    expect(friendlyDamageMultiplier(run, 0.2)).toBe(1);
    expect(buildingCost(run, 'archery')).toEqual({ materials: 24, spirit: 0 });
    run.patrons.land.food = 9;
    run.patrons.hearth.revives = 1;
    expect(createRun().patrons.land.food).toBe(1);
    expect(createRun().patrons.hearth.revives).toBe(0);
  });

  it('rewards active hunting while keeping movement and execution conditions explicit', () => {
    const run = createRun();
    run.phase = 'playing';
    run.patrons.hunt = {
      movingDamage: 1.3225,
      executeDamage: 1.3,
      gallopCooldown: 0.75,
      killHeal: 2,
    };
    expect(friendlyDamageMultiplier(run, 0.9)).toBe(1);
    run.clan.momentum = 1;
    expect(friendlyDamageMultiplier(run, 0.9)).toBeCloseTo(1.3225);
    expect(friendlyDamageMultiplier(run, 0.2)).toBeCloseTo(1.71925);
    expect(gallopCooldown(run)).toBe(2.25);
    run.health = 50;
    rewardPatronKill(run);
    expect(run.health).toBe(52);
    run.health = 100;
    rewardPatronKill(run);
    expect(run.health).toBe(100);
  });

  it('sustains the camp with slower grazing, better production, and lower consumption', () => {
    const baseline = createRun();
    const sustained = createRun();
    baseline.phase = sustained.phase = 'playing';
    sustained.patrons.land = {
      food: 1.3225,
      materials: 1.25,
      consumption: 0.8,
      pastureUse: 0.7225,
      pastureRecovery: 0.12,
    };
    advanceClan(baseline, 30);
    advanceClan(sustained, 30);
    expect(sustained.clan.pasture).toBeGreaterThan(baseline.clan.pasture);
    expect(sustained.clan.food).toBeGreaterThan(baseline.clan.food);
    expect(sustained.clan.materials).toBeGreaterThan(baseline.clan.materials);
    sustained.patrons.land.pastureRecovery = 100;
    advanceClan(sustained, 1);
    expect(sustained.clan.pasture).toBe(100);
  });

  it('regenerates only during active time and revives the commander once per expedition', () => {
    const run = createRun();
    run.phase = 'playing';
    run.health = 50;
    run.patrons.hearth = { regeneration: 0.3, damageTaken: 0.85, revives: 1 };
    advancePatrons(run, 10);
    expect(run.health).toBe(53);
    expect(damageKhan(run, 10)).toBe('hit');
    expect(run.health).toBe(44.5);
    expect(damageKhan(run, 1000)).toBe('revived');
    expect(run.health).toBe(40);
    expect(run.patrons.hearth.revives).toBe(0);
    expect(damageKhan(run, 1000)).toBe('fallen');
    advancePatrons(run, 100);
    expect(run.health).toBe(0);
  });

  it('freezes passive healing, lethal protection, and kill rewards in every menu phase', () => {
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
    for (const phase of phases) {
      const run = createRun();
      run.phase = phase;
      run.health = 50;
      run.patrons.hearth = { regeneration: 10, damageTaken: 0.5, revives: 1 };
      const before = structuredClone(run);
      advancePatrons(run, 10);
      damageKhan(run, 1000);
      rewardPatronKill(run);
      expect(run).toEqual(before);
    }
  });

  it('confines terrain slowing to its field and prevents invalid time from healing', () => {
    const run = createRun();
    run.patrons.water.slow = 0.24;
    expect(terrainSpeedMultiplier(run, 100)).toBe(0.76);
    expect(terrainSpeedMultiplier(run, 300)).toBe(1);
    run.phase = 'playing';
    run.health = 1;
    run.patrons.hearth.regeneration = 10;
    for (const dt of [NaN, Infinity, -1]) advancePatrons(run, dt);
    expect(run.health).toBe(1);
  });

  it('strengthens leadership through riders, kill resolve, and faster crossings', () => {
    const run = createRun();
    run.patrons.banner.riders = 4;
    expect(riderCount(run)).toBe(5);
    run.patrons.banner.riders = 99;
    expect(riderCount(run)).toBe(16);
    run.phase = 'playing';
    run.clan.integrity = 50;
    run.patrons.banner.resolveOnKill = 0.15;
    rewardPatronKill(run);
    expect(run.clan.integrity).toBe(50.15);
    const crossing = (mobility: number): number => {
      const traveler = createRun();
      traveler.phase = 'route';
      traveler.clan.stageTime = 45;
      traveler.patrons.banner.mobility = mobility;
      beginMigration(traveler, 'river');
      traveler.phase = 'playing';
      advanceClan(traveler, 10);
      return traveler.clan.migrationProgress;
    };
    expect(crossing(1.15)).toBeCloseTo(crossing(1) * 1.15);
  });

  it('discounts construction with rounded material costs and protects the clan multiplicatively', () => {
    const run = createRun();
    run.patrons.guardian.cost = 0.81;
    expect(buildingCost(run, 'archery').materials).toBe(20);
    expect(buildingCost(run, 'sanctuary', 'wind-shamans')).toEqual({ materials: 25, spirit: 18 });
    run.patrons.guardian.protection = 0.648;
    damageClan(run, 20);
    expect(run.clan.integrity).toBeCloseTo(100 - 20 * 0.7 * 0.648);
  });
});
