import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import { LOCATIONS, ROUTES } from '../../src/game/data/clan';
import { advanceClan, beginMigration } from '../../src/game/state/clan';
import { currentLocation, availableDestinations, locationById } from '../../src/game/state/journey';
import { crossingForecast, economyRates } from '../../src/game/state/economy';
import { createRun } from '../../src/game/state/run';
import { damageKhan, advanceSuccession } from '../../src/game/state/khan';
import { openNextStory, resolveStory } from '../../src/game/state/story';

const places = LOCATIONS.filter((location) => location.context);

describe('named migration destinations', () => {
  it('offers all eight requested places, with unique stable IDs and separate cultural context', () => {
    expect(places.map((place) => place.name)).toEqual([
      'Mount Otgontenger',
      'Bogd Khan Uul',
      'Altai Tavan Bogd',
      'Khan Tengri Peak',
      'Mount Belukha (Üch-Sümer)',
      'Altan Ovoo',
      'Eej Khairkhan',
      'Orkhon Valley',
    ]);
    expect(new Set(LOCATIONS.map((place) => place.id)).size).toBe(LOCATIONS.length);
    const run = createRun();
    const before = structuredClone(run);
    expect(availableDestinations(run)).toHaveLength(9);
    expect(currentLocation(run).id).toBe('golden-pasture');
    expect(run).toEqual(before);
  });

  it('validates destinations without changing phase, supplies, or memories on rejected input', () => {
    const run = createRun();
    run.phase = 'route';
    run.clan.stageTime = 45;
    const before = structuredClone(run);
    for (const id of ['unknown', 'golden-pasture', 'heart-of-the-steppe', 'broken-pass']) {
      expect(beginMigration(run, 'river', id)).toBe(false);
      expect(run).toEqual(before);
    }
    run.phase = 'paused';
    expect(beginMigration(run, 'river', 'orkhon-valley')).toBe(false);
  });

  it('reaches every destination by all three routes, awarding only the actual completed crossing', () => {
    for (const place of places)
      for (const route of ROUTES) {
        const run = createRun();
        run.phase = 'route';
        run.clan.stageTime = 45;
        const before = structuredClone(run);
        const forecast = crossingForecast(run, route, place);
        expect(beginMigration(run, route.id, place.id)).toBe(true);
        expect(currentLocation(run).id).toBe('golden-pasture');
        expect(run.clan.food).toBe(before.clan.food);
        expect(run.clan.population).toBe(before.clan.population);
        expect(run.story.crossings).toHaveLength(0);
        expect(beginMigration(run, route.id, place.id)).toBe(false);
        run.phase = 'playing';
        expect(advanceClan(run, forecast.duration / 2)).toBeUndefined();
        expect(run.clan.migrationProgress).toBeCloseTo(0.5);
        const paused = structuredClone(run);
        run.phase = 'building';
        expect(advanceClan(run, 100)).toBeUndefined();
        expect(run.clan).toEqual(paused.clan);
        run.phase = 'playing';
        expect(advanceClan(run, forecast.duration / 2 + 0.001)).toBe('arrived');
        expect(currentLocation(run).id).toBe(place.id);
        expect(run.clan.destinationId).toBeUndefined();
        expect(run.clan.food).toBeCloseTo(forecast.foodAfterArrival, 2);
        expect(run.clan.population).toBe(before.clan.population + route.population);
        expect(run.story.crossings).toEqual([
          { route: route.id, region: 1, population: run.clan.population, locationId: place.id },
        ]);
        expect(run.legacy.memories.at(-1)?.detail).toContain(place.name);
        run.clan.stageTime = 45;
        expect(availableDestinations(run).some((location) => location.id === place.id)).toBe(false);
      }
  });

  it('applies location gathering and onward travel modifiers without altering inherited camp effects', () => {
    const run = createRun();
    const neutral = economyRates(run);
    run.clan.locationId = 'orkhon-valley';
    run.patrons.land.food = 1.15;
    run.clan.campEffects.multipliers.foodProduction = 1.2;
    expect(economyRates(run).foodProduction).toBeCloseTo(
      neutral.foodProduction * 1.25 * 1.15 * 1.2,
    );
    expect(economyRates(run).materials).toBeCloseTo(neutral.materials * 1.05);
    const destination = locationById('khan-tengri')!;
    expect(crossingForecast(run, ROUTES[0], destination).duration).toBeCloseTo(
      (72 * 1.25) / (1.036 * 1.05),
    );
    run.clan.stage = 'migration';
    expect(economyRates(run)).toMatchObject({ foodProduction: 0, materials: 0 });
  });

  it('keeps story choices and succession in the actual places, then finishes at the fictional refuge', () => {
    const run = createRun();
    run.story.enabled = false;
    for (const destination of ['orkhon-valley', 'otgontenger', 'heart-of-the-steppe']) {
      run.phase = 'route';
      run.clan.stageTime = 45;
      expect(beginMigration(run, 'river', destination)).toBe(true);
      run.phase = 'playing';
      expect(advanceClan(run, 150)).toBe('arrived');
      if (run.clan.region < 3) {
        openNextStory(run);
        const beat = run.clan.region === 1 ? 'river' : 'promise';
        expect(
          run.story.records.find((record) => record.encounter.id === beat)?.encounter.setting,
        ).toContain(currentLocation(run).name);
      }
      if (run.clan.region === 1) {
        damageKhan(run, 1000);
        expect(run.legacy.khans[0]?.fallenLocationId).toBe('orkhon-valley');
        advanceSuccession(run, GAME.khan.successionDelay);
        expect(run.legacy.khans.at(-1)?.locationId).toBe('orkhon-valley');
      }
      if (run.clan.region === 2)
        expect(availableDestinations(run).map((location) => location.id)).toEqual([
          'heart-of-the-steppe',
        ]);
    }
    expect(currentLocation(run).id).toBe('heart-of-the-steppe');
    expect(run.clan.stage).toBe('final');
    expect(availableDestinations(run)).toEqual([]);
    expect(advanceClan(run, GAME.clan.finalDuration)).toBe('saved');
    expect(resolveStory(run, 'repeat-choice')).toBe(false);
  });
});
