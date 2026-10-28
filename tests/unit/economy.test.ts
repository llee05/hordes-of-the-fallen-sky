import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import { ROUTES } from '../../src/game/data/clan';
import { advanceClan, beginMigration, buildStructure } from '../../src/game/state/clan';
import { crossingForecast, economyForecast, economyRates } from '../../src/game/state/economy';
import { createRun, applyResearch } from '../../src/game/state/run';

describe('economy forecasts', () => {
  it.each([
    { recovering: false, food: 5 },
    { recovering: false, food: 100 },
    { recovering: true, food: 5 },
    { recovering: true, food: 100 },
  ])('integrates Deep Roots before and beyond pasture boundaries: %o', ({ recovering, food }) => {
    const run = createRun();
    run.pendingUpgrades = 20;
    for (const id of ['tended-pasture', 'tended-pasture', 'shared-labour', 'ee-deep-roots'])
      expect(applyResearch(run, id)).toBe(true);
    run.clan.pasture = 5;
    run.clan.population = 40;
    run.clan.food = food;
    if (recovering) {
      run.patrons.land.pastureUse = 0;
      run.patrons.land.pastureRecovery = 1;
    }
    const before = structuredClone(run);
    const seconds = economyForecast(run).foodSeconds!;
    expect(run).toEqual(before);
    expect(seconds).toBeGreaterThan(0);
    run.phase = 'playing';
    let elapsed = 0;
    while (run.clan.food > 0 && elapsed < 1000) {
      advanceClan(run, 0.001);
      elapsed += 0.001;
    }
    expect(elapsed).toBeCloseTo(seconds, 1);
  });

  it('uses the simulation rates with regional, patron, pasture, and camp modifiers', () => {
    const run = createRun();
    run.phase = 'building';
    run.clan.materials = 500;
    buildStructure(run, 'herd');
    buildStructure(run, 'herd', 'winter-stores');
    buildStructure(run, 'herd', 'dairy-reserves');
    run.clan.region = 1;
    run.clan.pasture = 60;
    run.patrons.land.food = 1.15;
    run.patrons.land.consumption = 0.8;
    run.patrons.land.materials = 1.25;
    run.clan.campEffects.multipliers.consumption = 0.9;
    const rates = economyRates(run);
    expect(rates.foodProduction).toBeCloseTo(1.3 * 0.6 * 0.7 * 1.15 * 1.2);
    expect(rates.foodConsumption).toBeCloseTo(8 * 0.025 * 0.5 * 0.8 * 0.9);
    expect(rates.materials).toBeCloseTo((0.28 + 8 * 0.018) * 0.6 * 1.25);
    run.phase = 'playing';
    run.patrons.land.pastureUse = 0;
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
    run.patrons.land.pastureUse = 0;
    run.clan.pasture = 100;
    expect(economyForecast(run).foodSeconds).toBeUndefined();
    run.clan.population = 40;
    expect(economyForecast(run).foodSeconds).toBeCloseTo(200);
    run.clan.population = 0;
    expect(economyForecast(run).foodSeconds).toBeUndefined();
    run.clan.food = 0;
    expect(economyForecast(run).foodSeconds).toBe(0);
  });

  it('handles recovering pasture, including a shortage before recovery and a capped recovery', () => {
    const run = createRun();
    run.clan.pasture = 0;
    run.patrons.land.pastureUse = 0;
    run.patrons.land.pastureRecovery = 1;
    expect(economyForecast(run).foodSeconds).toBeUndefined();
    run.clan.food = 1;
    const seconds = economyForecast(run).foodSeconds!;
    expect(seconds).toBeGreaterThan(5);
    expect(seconds).toBeLessThan(6);
    run.clan.food = 70;
    run.clan.population = 40;
    // Recovery reaches 100% after 100s, with 2.5 food left and a -0.35/s steady rate.
    expect(economyForecast(run).foodSeconds).toBeCloseTo(100 + 2.5 / 0.35);
    run.clan.pasture = 100;
    expect(economyForecast(run).foodSeconds).toBeCloseTo(200);
  });

  it('limits final-stand forecasts to the time until the passage opens', () => {
    const run = createRun();
    run.clan.stage = 'final';
    run.clan.pasture = 0;
    run.clan.stageTime = GAME.clan.finalDuration - 20;
    expect(economyForecast(run).foodSeconds).toBeUndefined();
    run.clan.food = 2;
    expect(economyForecast(run).foodSeconds).toBeCloseTo(10);
  });

  it('estimates each crossing using current mobility and pays rewards only at arrival', () => {
    for (const route of ROUTES) {
      const run = createRun();
      run.clan.region = 1;
      run.clan.herd = 10;
      run.patrons.banner.mobility = 1.15;
      run.clan.campEffects.multipliers.mobility = 1.1;
      run.clan.campEffects.bonuses.arrivalFood = 15;
      const forecast = crossingForecast(run, route);
      expect(forecast.duration).toBeCloseTo((60 * route.duration) / (1.12 * 0.8 * 1.15 * 1.1));
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
    const forecast = crossingForecast(run, ROUTES[0]);
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
    const forecast = crossingForecast(run, ROUTES[1]);
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
    crossingForecast(run, ROUTES[0]);
    expect(run).toEqual(before);
    for (const phase of ['playing', 'paused', 'route', 'journal', 'story'] as const) {
      run.phase = phase;
      expect(economyForecast(run)).toEqual(forecast);
    }
  });
});
