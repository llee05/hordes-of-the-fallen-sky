import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import { LOCATIONS, ROUTES } from '../../src/game/data/clan';
import { advanceClan, beginMigration } from '../../src/game/state/clan';
import { travelForecast, economyRates } from '../../src/game/state/economy';
import { availableDestinations, currentLocation, locationById } from '../../src/game/state/journey';
import { advanceSuccession, damageKhan } from '../../src/game/state/khan';
import { createLegacyCampRun as createRun } from '../support/legacyCamp';

const places = LOCATIONS;

describe('real places', () => {
  it('offers exactly the eight real places, with unique stable IDs and cultural context', () => {
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
    expect(places.map((place) => place.short)).toEqual([
      'OTGONTENGER',
      'BOGD KHAN UUL',
      'ALTAI TAVAN BOGD',
      'KHAN TENGRI',
      'BELUKHA · ÜCH-SÜMER',
      'ALTAN OVOO',
      'EEJ KHAIRKHAN',
      'ORKHON VALLEY',
    ]);
    expect(new Set(LOCATIONS.map((place) => place.id)).size).toBe(LOCATIONS.length);
    expect(LOCATIONS.every((place) => place.context.length > 0)).toBe(true);
    const run = createRun();
    const before = structuredClone(run);
    expect(availableDestinations(run)).toHaveLength(7);
    expect(currentLocation(run).id).toBe('otgontenger');
    expect(currentLocation(run).short).toBe('OTGONTENGER');
    expect(run).toEqual(before);
  });

  it('validates destinations without changing phase, supplies, or memories on rejected input', () => {
    const run = createRun();
    run.phase = 'route';
    run.clan.stageTime = 45;
    const before = structuredClone(run);
    for (const id of ['unknown', 'otgontenger', 'golden-pasture', 'heart-of-the-steppe']) {
      expect(beginMigration(run, 'river', id)).toBe(false);
      expect(run).toEqual(before);
    }
    run.phase = 'paused';
    expect(beginMigration(run, 'river', 'orkhon-valley')).toBe(false);
  });

  it('reaches every other place by all three routes, awarding only the completed migration', () => {
    for (const place of places.filter((location) => location.id !== 'otgontenger'))
      for (const route of ROUTES) {
        const run = createRun();
        run.phase = 'route';
        run.clan.stageTime = 45;
        const before = structuredClone(run);
        const forecast = travelForecast(run, route, place);
        expect(beginMigration(run, route.id, place.id)).toBe(true);
        expect(currentLocation(run).id).toBe('otgontenger');
        expect(currentLocation(run).short).toBe('OTGONTENGER');
        expect(run.clan.food).toBe(before.clan.food);
        expect(run.clan.population).toBe(before.clan.population);
        expect(run.legacy.crossings).toHaveLength(0);
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
        expect(currentLocation(run).short).toBe(place.short);
        expect(run.clan.destinationId).toBeUndefined();
        expect(run.clan.food).toBeCloseTo(forecast.foodAfterArrival, 2);
        expect(run.clan.population).toBe(before.clan.population + route.population);
        expect(run.legacy.crossings).toEqual([
          { route: route.id, population: run.clan.population, locationId: place.id },
        ]);
        expect(run.legacy.memories.at(-1)?.detail).toContain(place.name);
        run.clan.stageTime = 45;
        expect(availableDestinations(run).map((location) => location.id)).toEqual(
          LOCATIONS.filter((location) => location.id !== place.id).map((location) => location.id),
        );
      }
  });

  it('applies location gathering and onward travel modifiers without altering inherited camp effects', () => {
    const run = createRun();
    const neutral = economyRates(run);
    run.clan.locationId = 'orkhon-valley';
    run.clan.campEffects.multipliers.foodProduction = 1.2;
    // The starting camp at Otgontenger gathers 0.85 food and 1.25 materials.
    expect(economyRates(run).foodProduction).toBeCloseTo(
      (neutral.foodProduction / 0.85) * 1.25 * 1.2,
    );
    expect(economyRates(run).materials).toBeCloseTo((neutral.materials / 1.25) * 1.05);
    const destination = locationById('khan-tengri')!;
    expect(travelForecast(run, ROUTES[0], destination).duration).toBeCloseTo(
      (72 * 1.25) / (1.036 * 1.05),
    );
    run.clan.stage = 'migration';
    expect(economyRates(run)).toMatchObject({ foodProduction: 0, materials: 0 });
  });

  it('keeps succession records in the actual place', () => {
    const run = createRun();
    run.phase = 'route';
    run.clan.stageTime = 45;
    expect(beginMigration(run, 'river', 'orkhon-valley')).toBe(true);
    run.phase = 'playing';
    expect(advanceClan(run, 150)).toBe('arrived');
    damageKhan(run, 1000);
    expect(run.legacy.khans[0]?.locationId).toBe('otgontenger');
    expect(run.legacy.khans[0]?.fallenLocationId).toBe('orkhon-valley');
    advanceSuccession(run, GAME.khan.successionDelay);
    expect(run.legacy.khans.at(-1)?.locationId).toBe('orkhon-valley');
    expect(run.clan.stage).toBe('camp');
  });
});
