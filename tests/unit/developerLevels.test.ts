import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import { ROUTES } from '../../src/game/data/clan';
import { DEVELOPER_LEVELS, createDeveloperRun } from '../../src/game/dev/levels';
import { advanceClan, beginMigration, canMigrate } from '../../src/game/state/clan';
import { travelDuration } from '../../src/game/state/economy';
import { availableDestinations, currentLocation } from '../../src/game/state/journey';
import { createRun } from '../../src/game/state/run';

describe('developer level checkpoints', () => {
  it('lists exactly the eight real places, one entry each, and nothing else', () => {
    expect(DEVELOPER_LEVELS.map((level) => level.locationId)).toEqual([
      'otgontenger',
      'bogd-khan-uul',
      'altai-tavan-bogd',
      'khan-tengri',
      'belukha',
      'altan-ovoo',
      'eej-khairkhan',
      'orkhon-valley',
    ]);
    expect(DEVELOPER_LEVELS.map((level) => level.title)).toEqual([
      'Mount Otgontenger',
      'Bogd Khan Uul',
      'Altai Tavan Bogd',
      'Khan Tengri Peak',
      'Mount Belukha (Üch-Sümer)',
      'Altan Ovoo',
      'Eej Khairkhan',
      'Orkhon Valley',
    ]);
    expect(new Set(DEVELOPER_LEVELS.map((level) => level.id)).size).toBe(8);
    for (const level of DEVELOPER_LEVELS) {
      expect(level.id).toBe(`place:${level.locationId}`);
      expect(`${level.title} ${level.description}`).not.toMatch(/chapter|crossing/i);
    }
  });

  it.each(DEVELOPER_LEVELS)('starts $id as a healthy, independently playable camp', (level) => {
    const run = createDeveloperRun(level.id)!;
    expect(run.phase).toBe('playing');
    expect(run.clan.stage).toBe('camp');
    expect(currentLocation(run).id).toBe(level.locationId);
    expect(run.legacy.khans[0]!.locationId).toBe(level.locationId);
    expect(run.health).toBe(run.stats.maxHealth);
    expect(run.khan).toEqual({ generation: 1, successionRemaining: 0 });
    expect(run.clan.population).toBe(GAME.developer.population);
    expect(run.clan.integrity).toBe(100);
    expect(run.clan.food).toBeGreaterThan(0);
    expect(run.clan.materials).toBeGreaterThanOrEqual(GAME.developer.materials);
    expect(run.level).toBe(GAME.developer.experienceLevels + 1);
    expect(run.legacy.crossings).toHaveLength(0);
    expect(canMigrate(run)).toBe(true);
    const next = availableDestinations(run)[0]!;
    expect(next.id).not.toBe(level.locationId);
    run.phase = 'route';
    expect(beginMigration(run, 'river', next.id)).toBe(true);
    run.phase = 'playing';
    expect(advanceClan(run, travelDuration(run, ROUTES[0]))).toBe('arrived');
    expect(currentLocation(run).id).toBe(next.id);
    expect(createDeveloperRun(level.id)).not.toEqual(run);
  });

  it('rejects unknown and retired checkpoints and keeps normal new games unchanged', () => {
    for (const id of ['unknown', '', 'chapter:golden-pasture', 'crossing:broken-pass:river'])
      expect(createDeveloperRun(id)).toBeUndefined();
    const normal = createRun();
    createDeveloperRun('place:khan-tengri');
    expect(createRun()).toEqual(normal);
    expect(normal.phase).toBe('ready');
    expect(normal.guidance.enabled).toBe(true);
    expect(normal.clan.locationId).toBe('otgontenger');
  });
});
