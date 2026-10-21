import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import { BUILDINGS } from '../../src/game/data/clan';
import { createRun } from '../../src/game/state/run';
import {
  advanceClan,
  availableFormations,
  beginMigration,
  buildStructure,
  burningTempest,
  canMigrate,
  clanDoctrine,
  damageClan,
  riderCount,
} from '../../src/game/state/clan';
import type { RunState } from '../../src/game/types';

function builder(): RunState {
  const run = createRun();
  run.phase = 'building';
  run.clan.materials = 500;
  run.clan.spirit = 500;
  return run;
}

describe('a civilization that moves', () => {
  it('starts with an independent eight-person clan and its family gers', () => {
    const first = createRun();
    first.clan.buildings.archery = 1;
    first.clan.identity.iron = 10;
    expect(createRun().clan).toMatchObject({
      population: 8,
      herd: 3,
      buildings: { ger: 1, archery: 0 },
      identity: { iron: 0 },
    });
  });

  it('freezes every journey and economy clock in non-playing phases', () => {
    for (const phase of [
      'ready',
      'paused',
      'upgrade',
      'building',
      'route',
      'journal',
      'settings',
      'help',
      'dead',
      'won',
    ] as const) {
      const run = createRun();
      run.phase = phase;
      const before = structuredClone(run);
      advanceClan(run, 15);
      expect(run).toEqual(before);
    }
  });

  it('initially produces supplies, then depletes its pasture and consumes reserves', () => {
    const run = createRun();
    run.phase = 'playing';
    advanceClan(run, 30);
    expect(run.clan.food).toBeGreaterThan(70);
    expect(run.clan.materials).toBeGreaterThan(50);
    run.clan.pasture = 0;
    const food = run.clan.food;
    advanceClan(run, 10);
    expect(run.clan.food).toBeLessThan(food);
    expect(run.clan.threat).toBeGreaterThan(0);
  });

  it('charges resources once, enforces workers and two exclusive specialization paths', () => {
    const run = builder();
    run.clan.population = 2;
    expect(buildStructure(run, 'archery')).toBe(false);
    expect(run.clan.materials).toBe(500);
    run.clan.population = 8;
    expect(buildStructure(run, 'archery', 0)).toBe(false);
    expect(buildStructure(run, 'archery')).toBe(true);
    expect(run.clan.materials).toBe(476);
    expect(riderCount(run)).toBeGreaterThan(1);
    expect(availableFormations(run)).toContain('wedge');
    expect(buildStructure(run, 'archery')).toBe(false);
    expect(buildStructure(run, 'archery', 0)).toBe(true);
    expect(run.clan.materials).toBe(440);
    expect(buildStructure(run, 'archery', 1)).toBe(false);
    expect(run.clan.paths.archery).toBe(0);
    expect(clanDoctrine(run)).toBe('The Iron Horde');
  });

  it('unlocks the Burning Tempest only by combining both building specializations', () => {
    const run = builder();
    buildStructure(run, 'archery');
    buildStructure(run, 'archery', 0);
    expect(burningTempest(run)).toBe(false);
    buildStructure(run, 'sanctuary');
    buildStructure(run, 'sanctuary', 0);
    expect(burningTempest(run)).toBe(true);
    expect(BUILDINGS).toHaveLength(5);
    expect(BUILDINGS.every((b) => b.paths.length === 2)).toBe(true);
  });

  it('protects the clan through guard formation and caravan armor', () => {
    const guard = createRun();
    const exposed = createRun();
    exposed.clan.formation = 'wedge';
    damageClan(guard, 10);
    damageClan(exposed, 10);
    expect(guard.clan.population).toBe(8);
    expect(guard.clan.integrity).toBeGreaterThan(exposed.clan.integrity);
    const armor = createRun();
    armor.clan.paths.wagon = 1;
    damageClan(armor, 10);
    expect(armor.clan.integrity).toBeGreaterThan(guard.clan.integrity);
  });

  it('lets the player choose when to depart and awards route rewards only on arrival', () => {
    const run = createRun();
    run.phase = 'route';
    expect(beginMigration(run, 'refuge')).toBe(false);
    run.clan.stageTime = GAME.clan.minimumCamp;
    expect(canMigrate(run)).toBe(true);
    expect(beginMigration(run, 'invalid')).toBe(false);
    expect(beginMigration(run, 'refuge')).toBe(true);
    expect(run.clan.population).toBe(8);
    expect(buildStructure(run, 'herd')).toBe(false);
    run.phase = 'playing';
    expect(advanceClan(run, 30)).toBeUndefined();
    expect(run.clan.migrationProgress).toBeGreaterThan(0);
    expect(advanceClan(run, 30)).toBe('arrived');
    expect(run.clan).toMatchObject({
      stage: 'camp',
      region: 1,
      population: 16,
      pasture: 100,
      stageTime: 0,
    });
    expect(canMigrate(run)).toBe(false);
    expect(beginMigration(run, 'refuge')).toBe(false);
  });

  it('makes remounts faster and winter migration slower', () => {
    const progress = (region: number, remounts: boolean): number => {
      const run = createRun();
      run.clan.stageTime = 45;
      run.phase = 'route';
      beginMigration(run, 'river');
      run.phase = 'playing';
      run.clan.region = region;
      if (remounts) run.clan.paths.herd = 0;
      advanceClan(run, 10);
      return run.clan.migrationProgress;
    };
    expect(progress(0, true)).toBeGreaterThan(progress(0, false));
    expect(progress(1, false)).toBeLessThan(progress(0, false));
  });

  it('loses families and livestock when provisions are exhausted', () => {
    const run = createRun();
    run.phase = 'playing';
    run.clan.food = 0;
    run.clan.pasture = 0;
    advanceClan(run, 12);
    expect(run.clan.population).toBeLessThan(8);
    expect(run.clan.herd).toBeLessThan(3);
    expect(run.clan.integrity).toBeLessThan(100);
  });

  it('reaches the final region through three migrations and saves people without requiring boss kills', () => {
    const run = createRun();
    for (let region = 0; region < 3; region += 1) {
      run.phase = 'route';
      run.clan.stageTime = GAME.clan.minimumCamp;
      expect(beginMigration(run, 'river')).toBe(true);
      run.phase = 'playing';
      expect(advanceClan(run, 100)).toBe('arrived');
    }
    expect(run.clan).toMatchObject({ stage: 'final', region: 3 });
    expect(canMigrate(run)).toBe(false);
    expect(advanceClan(run, GAME.clan.finalDuration - 1)).toBeUndefined();
    expect(advanceClan(run, 1)).toBe('saved');
    expect(run.kills).toBe(0);
    expect(run.clan.finalBossDefeated).toBe(false);
    run.clan.integrity = 0;
    expect(advanceClan(run, 1)).toBe('lost');
  });
});
