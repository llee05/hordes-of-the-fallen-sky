import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import { advanceClan, beginMigration, buildStructure, damageClan } from '../../src/game/state/clan';
import { advanceSuccession, beginSuccession, damageKhan } from '../../src/game/state/khan';
import { journeyResults, rememberClan } from '../../src/game/state/legacy';
import { clanMemories, khanRecords } from '../../src/ui/legacyContent';
import { createLegacyCampRun as createRun } from '../support/legacyCamp';

describe('the clan’s lived history', () => {
  it('does not invent another casualty when damage reaches an already empty clan', () => {
    const run = createRun();
    run.phase = 'playing';
    run.clan.population = 1;
    damageClan(run, 40);
    expect(run.clan.population).toBe(0);
    const count = run.legacy.totalMemories;
    damageClan(run, 40);
    expect(run.legacy.totalMemories).toBe(count);
  });

  it('records actual Khan lifetimes, host victories, and inheritance exactly once', () => {
    const run = createRun();
    run.phase = 'playing';
    run.elapsed = 42;
    run.kills = 12;
    damageKhan(run, 1000);
    expect(beginSuccession(run)).toBe(false);
    expect(run.legacy.khans[0]).toMatchObject({ chosenAt: 0, fallenAt: 42, killsAtFall: 12 });
    run.phase = 'journal';
    const frozen = structuredClone(run.legacy);
    expect(advanceSuccession(run, 20)).toBe(false);
    expect(run.legacy).toEqual(frozen);
    run.phase = 'playing';
    run.elapsed = 52;
    run.kills = 16;
    advanceSuccession(run, 10);
    expect(run.legacy.khans[1]).toMatchObject({ generation: 2, chosenAt: 52, killsAtStart: 16 });
    expect(khanRecords(run)).toContain('00:42 in the saddle');
    expect(khanRecords(run)).toContain('12 banished by the host');
    expect(advanceSuccession(run, 10)).toBe(false);
    expect(run.legacy.khans).toHaveLength(2);
    expect(createRun().legacy.khans).toHaveLength(1);
  });

  it('remembers validated crafts, actual migrations, and losses without replaying rewards', () => {
    const run = createRun();
    run.phase = 'building';
    buildStructure(run, 'archery');
    buildStructure(run, 'archery');
    expect(run.legacy.memories).toHaveLength(1);
    run.elapsed = 10;
    damageClan(run, 40);
    expect(run.legacy.memories.at(-1)!.title).toBe('A place left empty');
    run.clan.stageTime = 45;
    run.phase = 'route';
    beginMigration(run, 'refuge');
    expect(run.legacy.crossings).toHaveLength(0);
    run.phase = 'playing';
    run.elapsed = 100;
    advanceClan(run, 100);
    expect(run.legacy.memories.at(-1)!.title).toBe('New households at the fire');
    expect(clanMemories(run)).not.toContain('<blockquote>');
    const before = structuredClone(run);
    clanMemories(run);
    khanRecords(run);
    expect(run).toEqual(before);
  });

  it('bounds memories and keeps completed expedition status when viewing the record', () => {
    const run = createRun();
    for (let i = 0; i < GAME.legacy.memoryLimit + 10; i++) {
      rememberClan(run, `Moment ${i}`, 'Fact.');
    }
    expect(run.legacy.memories).toHaveLength(GAME.legacy.memoryLimit);
    expect(run.legacy.totalMemories).toBe(GAME.legacy.memoryLimit + 10);
    run.legacy.outcome = 'dead';
    run.phase = 'dead';
    expect(khanRecords(run)).toContain('With the clan at the journey’s end');
  });

  it('reports factual journey results for a lost clan', () => {
    const run = createRun();
    run.elapsed = 215;
    run.clan.population = 0;
    run.clan.herd = 6;
    run.clan.stage = 'migration';
    run.clan.locationId = 'belukha';
    run.legacy.crossings = [
      { route: 'river', population: 10, locationId: 'orkhon-valley' },
      { route: 'ridge', population: 12, locationId: 'belukha' },
    ];
    run.legacy.peopleLost = 2;
    run.legacy.khans[0]!.fallenAt = 90;
    run.legacy.khans[0]!.fallenLocationId = 'orkhon-valley';
    run.legacy.outcome = 'dead';
    run.phase = 'dead';

    expect(journeyResults(run)).toEqual({
      location: 'Mount Belukha (Üch-Sümer)',
      stage: 'Migration',
      elapsed: 215,
      survivors: 0,
      herd: 6,
      pastures: 3,
      crossings: 2,
      peopleLost: 2,
      fallenKhans: 1,
    });

    const defeated = createRun();
    defeated.elapsed = 64;
    defeated.clan.population = 0;
    defeated.clan.herd = 1;
    defeated.legacy.outcome = 'dead';
    defeated.phase = 'dead';
    expect(journeyResults(defeated)).toMatchObject({
      location: 'Mount Otgontenger',
      stage: 'Encampment',
      survivors: 0,
      herd: 1,
      pastures: 1,
      fallenKhans: 0,
    });
  });
});
