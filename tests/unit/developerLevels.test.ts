import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import { LOCATIONS, REGIONS, ROUTES } from '../../src/game/data/clan';
import { DEVELOPER_LEVELS, createDeveloperRun } from '../../src/game/dev/levels';
import { advanceClan, beginMigration, canMigrate } from '../../src/game/state/clan';
import { crossingDuration } from '../../src/game/state/economy';
import {
  arrivalLocation,
  currentLocation,
  availableDestinations,
} from '../../src/game/state/journey';
import { createRun } from '../../src/game/state/run';
import { openNextStory } from '../../src/game/state/story';

describe('developer level checkpoints', () => {
  it('covers every chapter, every crossing approach, and each named camp in chapters 2 and 3', () => {
    expect(new Set(DEVELOPER_LEVELS.map((level) => level.id)).size).toBe(DEVELOPER_LEVELS.length);
    expect(
      DEVELOPER_LEVELS.filter((level) => level.group === 'chapters').map(
        (level) => level.locationId,
      ),
    ).toEqual(REGIONS.map((chapter) => chapter.id));
    expect(DEVELOPER_LEVELS.filter((level) => level.group === 'crossings')).toHaveLength(
      (REGIONS.length - 1) * ROUTES.length,
    );
    for (const region of [1, 2])
      expect(
        DEVELOPER_LEVELS.filter(
          (level) => level.group === 'destinations' && level.region === region,
        ).map((level) => level.locationId),
      ).toEqual(LOCATIONS.filter((location) => location.context).map((location) => location.id));
  });

  it.each(DEVELOPER_LEVELS)(
    'starts $id as a healthy, independently playable expedition',
    (level) => {
      const run = createDeveloperRun(level.id)!;
      expect(run.phase).toBe('playing');
      expect(run.clan.region).toBe(level.region);
      expect(currentLocation(run).id).toBe(level.locationId);
      expect(run.health).toBe(run.stats.maxHealth);
      expect(run.khan).toEqual({ generation: 1, successionRemaining: 0 });
      expect(run.clan.population).toBe(GAME.developer.population);
      expect(run.clan.integrity).toBe(100);
      expect(run.clan.food).toBeGreaterThan(0);
      expect(run.clan.materials).toBeGreaterThanOrEqual(GAME.developer.materials);
      expect(run.pendingUpgrades).toBe(GAME.developer.knowledgePoints);
      expect(run.level).toBe(GAME.developer.knowledgePoints + 1);
      expect(run.upgrades).toEqual({});
      expect(run.story.crossings).toHaveLength(level.region);
      expect(openNextStory(run)).toBe(false);
      expect(run.story.records.every((record) => record.status === 'passed')).toBe(true);
      if (level.routeId) {
        expect(run.clan.stage).toBe('migration');
        expect(run.clan.routeId).toBe(level.routeId);
        expect(run.clan.migrationProgress).toBe(0);
        const route = ROUTES.find((entry) => entry.id === level.routeId)!;
        const destination = arrivalLocation(run).id;
        expect(advanceClan(run, crossingDuration(run, route))).toBe('arrived');
        expect(run.story.crossings).toHaveLength(level.region + 1);
        expect(currentLocation(run).id).toBe(destination);
        expect(advanceClan(run, 0.01)).not.toBe('arrived');
      } else if (level.region === REGIONS.length - 1) {
        expect(run.clan.stage).toBe('final');
        expect(run.clan.stageTime).toBe(0);
        expect(run.clan.finalBossSpawned).toBe(false);
        expect(advanceClan(run, GAME.clan.finalDuration)).toBe('saved');
      } else {
        expect(canMigrate(run)).toBe(true);
        const next = availableDestinations(run)[0]!;
        run.phase = 'route';
        expect(beginMigration(run, 'river', next.id)).toBe(true);
        run.phase = 'playing';
        expect(advanceClan(run, crossingDuration(run, ROUTES[0]))).toBe('arrived');
        expect(currentLocation(run).id).toBe(next.id);
      }
      expect(createDeveloperRun(level.id)).not.toEqual(run);
    },
  );

  it('rejects unknown checkpoints and keeps normal new games and preferences unchanged', () => {
    expect(createDeveloperRun('unknown')).toBeUndefined();
    expect(createDeveloperRun('')).toBeUndefined();
    const normal = createRun();
    createDeveloperRun('chapter:heart-of-the-steppe');
    expect(createRun()).toEqual(normal);
    expect(normal.phase).toBe('ready');
    expect(normal.pendingUpgrades).toBe(0);
    expect(normal.story.enabled).toBe(true);
    expect(normal.guidance.enabled).toBe(true);
  });
});
