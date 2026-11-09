import { describe, expect, it } from 'vitest';
import { ROUTES } from '../../src/game/data/clan';
import { advanceClan, beginMigration, buildStructure } from '../../src/game/state/clan';
import { travelForecast, economyForecast, economyRates } from '../../src/game/state/economy';
import { createLegacyCampRun as createRun } from '../support/legacyCamp';

describe('economy forecasts', () => {
  it('uses the simulation rates with regional, pasture, and camp modifiers', () => {
    const run = createRun();
    run.phase = 'building';
    run.clan.materials = 500;
    buildStructure(run, 'herd');
    buildStructure(run, 'herd', 'winter-stores');
    buildStructure(run, 'herd', 'dairy-reserves');
    run.clan.region = 1;
    run.clan.pasture = 60;
    run.clan.campEffects.multipliers.consumption = 0.9;
    const rates = economyRates(run);
    expect(rates.foodProduction).toBeCloseTo(1.3 * 0.6 * 0.7 * 1.2);
    expect(rates.foodConsumption).toBeCloseTo(8 * 0.025 * 0.5 * 0.9);
    expect(rates.materials).toBeCloseTo((0.28 + 8 * 0.018) * 0.6);
    run.phase = 'playing';
    run.clan.campEffects.multipliers.pastureUse = 0;
    const before = structuredClone(run);
    advanceClan(run, 1);
    expect(run.clan.food - before.clan.food).toBeCloseTo(rates.foodNet);
    expect(run.clan.materials - before.clan.materials).toBeCloseTo(rates.materials);
  });

  it('predicts eventual depletion even while food currently increases', () => {
    const run = createRun();
    const forecast = economyForecast(run);
    expect(forecast.foodNet).toBeCloseTo(0.45);
    expect(forecast.foodSeconds).toBeCloseTo(691.25);
    run.phase = 'playing';
    let elapsed = 0;
    while (run.clan.food > 0 && elapsed < 800) {
      advanceClan(run, 0.02);
      elapsed += 0.02;
    }
    expect(Math.abs(elapsed - forecast.foodSeconds!)).toBeLessThan(0.1);
  });

  it('finds depletion before pasture is exhausted', () => {
    const run = createRun();
    run.clan.population = 40;
    run.clan.food = 5;
    const seconds = economyForecast(run).foodSeconds!;
    expect(seconds).toBeGreaterThan(13);
    expect(seconds).toBeLessThan(15);
    run.phase = 'playing';
    for (let elapsed = 0; elapsed < seconds - 0.1; elapsed += 0.02) advanceClan(run, 0.02);
    expect(run.clan.food).toBeGreaterThan(0);
    advanceClan(run, 0.2);
    expect(run.clan.food).toBe(0);
  });

  it('handles exhausted and constant pasture, zero consumption, and empty stores', () => {
    const run = createRun();
    run.clan.pasture = 0;
    expect(economyForecast(run).foodSeconds).toBeCloseTo(350);
    run.clan.pasture = 100;
    run.clan.campEffects.multipliers.pastureUse = 0;
    expect(economyForecast(run).foodSeconds).toBeUndefined();
    run.clan.population = 40;
    expect(economyForecast(run).foodSeconds).toBeCloseTo(200);
    run.clan.population = 0;
    expect(economyForecast(run).foodSeconds).toBeUndefined();
    run.clan.food = 0;
    expect(economyForecast(run).foodSeconds).toBe(0);
  });

  it('estimates each crossing using current mobility and pays rewards only at arrival', () => {
    for (const route of ROUTES) {
      const run = createRun();
      run.clan.region = 1;
      run.clan.herd = 10;
      run.clan.campEffects.multipliers.mobility = 1.1;
      run.clan.campEffects.bonuses.arrivalFood = 15;
      const forecast = travelForecast(run, route);
      expect(forecast.duration).toBeCloseTo((60 * route.duration) / (1.12 * 0.8 * 1.1));
      expect(forecast.foodNeeded).toBeCloseTo(forecast.duration * 0.2);
      expect(forecast.foodAfterArrival).toBeCloseTo(70 - forecast.foodNeeded + route.food + 15);
      run.phase = 'route';
      run.clan.stageTime = 45;
      expect(beginMigration(run, route.id)).toBe(true);
      run.phase = 'playing';
      expect(economyRates(run)).toMatchObject({ foodProduction: 0, materials: 0, foodNet: -0.2 });
      advanceClan(run, forecast.duration);
      expect(run.clan.stage).toBe('camp');
      expect(run.clan.food).toBeCloseTo(forecast.foodAfterArrival);
    }
  });

  it('warns about shortages even when an arrival reward would refill stores', () => {
    const run = createRun();
    run.clan.food = 1;
    const forecast = travelForecast(run, ROUTES[0]);
    expect(forecast.shortfall).toBeGreaterThan(0);
    expect(forecast.foodBeforeArrival).toBe(0);
    expect(forecast.foodAfterArrival).toBe(35);
    run.clan.stage = 'migration';
    run.clan.routeId = 'river';
    expect(economyForecast(run).foodSeconds).toBe(5);
  });

  it('forecasts only the remaining crossing and includes camp consumption and remounts', () => {
    const run = createRun();
    run.phase = 'building';
    run.clan.materials = 500;
    buildStructure(run, 'herd');
    buildStructure(run, 'herd', 'remount-herds');
    run.clan.campEffects.multipliers.consumption = 0.5;
    run.clan.stage = 'migration';
    run.clan.routeId = 'ridge';
    run.clan.stageTime = 10;
    const forecast = travelForecast(run, ROUTES[1]);
    expect(forecast.remaining).toBeCloseTo(48 / (1.084 * 1.2) - 10);
    expect(forecast.foodNeeded).toBeCloseTo(forecast.remaining * 0.1);
    expect(economyForecast(run).foodSeconds).toBeUndefined();
    run.clan.food = 0.5;
    expect(economyForecast(run).foodSeconds).toBe(5);
  });

  it('leaves a paused run unchanged and returns the same forecast in every menu', () => {
    const run = createRun();
    run.phase = 'building';
    const before = structuredClone(run);
    const forecast = economyForecast(run);
    travelForecast(run, ROUTES[0]);
    expect(run).toEqual(before);
    for (const phase of ['playing', 'paused', 'route', 'journal'] as const) {
      run.phase = phase;
      expect(economyForecast(run)).toEqual(forecast);
    }
  });
});
