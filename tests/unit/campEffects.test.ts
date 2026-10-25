import { describe, expect, it } from 'vitest';
import { BUILDINGS, type BuildingDefinition } from '../../src/game/data/clan';
import { applyCampEffects } from '../../src/game/state/camp';
import { createRun } from '../../src/game/state/run';
import {
  advanceClan,
  beginMigration,
  buildStructure,
  damageClan,
  developmentExcluded,
} from '../../src/game/state/clan';
import { advancePatrons, gallopCooldown } from '../../src/game/state/patrons';

describe('portable camp development effects', () => {
  it('keeps new expeditions independent with neutral economy, combat, and arrival effects', () => {
    const first = createRun();
    first.clan.campEffects.multipliers.foodProduction = 2;
    first.clan.campEffects.bonuses.arrivalFood = 30;
    const second = createRun();
    expect(second.clan.campEffects.multipliers.foodProduction).toBe(1);
    expect(second.clan.campEffects.bonuses.arrivalFood).toBe(0);
    expect(gallopCooldown(second)).toBe(3);
  });

  it('applies authored establishment and deeper development effects once after valid purchases', () => {
    const definitions = BUILDINGS as BuildingDefinition[];
    const index = definitions.findIndex((entry) => entry.id === 'archery');
    const original = definitions[index]!;
    definitions[index] = {
      ...original,
      effects: { multipliers: { foodProduction: 1.2 } },
      paths: [
        ...original.paths,
        {
          id: 'tested-mastery',
          title: 'Tested mastery',
          description: '',
          requires: ['fire-arrows'],
          materials: 12,
          effects: { multipliers: { foodProduction: 1.1 }, bonuses: { range: 30 } },
        },
      ],
    };
    try {
      const run = createRun();
      delete run.clan.estate; // Legacy craft-price and effect contract.
      run.phase = 'building';
      run.clan.materials = 200;
      expect(buildStructure(run, 'archery', 'tested-mastery')).toBe(false);
      expect(buildStructure(run, 'archery')).toBe(true);
      expect(buildStructure(run, 'archery', 'tested-mastery')).toBe(false);
      expect(buildStructure(run, 'archery', 'fire-arrows')).toBe(true);
      expect(buildStructure(run, 'archery', 'tested-mastery')).toBe(true);
      expect(run.clan.campEffects.multipliers.foodProduction).toBeCloseTo(1.32);
      expect(run.clan.campEffects.bonuses.range).toBe(30);
      expect(run.clan.materials).toBe(128);
      const before = structuredClone(run);
      expect(buildStructure(run, 'archery', 'tested-mastery')).toBe(false);
      expect(buildStructure(run, 'archery')).toBe(false);
      expect(run).toEqual(before);
      const alternate = createRun();
      delete alternate.clan.estate;
      alternate.phase = 'building';
      alternate.clan.materials = 200;
      buildStructure(alternate, 'archery');
      buildStructure(alternate, 'archery', 'veteran-riders');
      expect(developmentExcluded(alternate, 'archery', 'tested-mastery')).toBe(true);
      expect(buildStructure(alternate, 'archery', 'tested-mastery')).toBe(false);
    } finally {
      definitions[index] = original;
    }
  });

  it('stacks craft and patron bonuses across gathering, food use, and pasture care', () => {
    const baseline = createRun();
    const improved = createRun();
    baseline.phase = improved.phase = 'playing';
    improved.patrons.land.food = 1.3225;
    applyCampEffects(improved.clan.campEffects, {
      multipliers: {
        foodProduction: 1.15,
        materialProduction: 1.2,
        consumption: 0.8,
        pastureUse: 0.85,
      },
    });
    advanceClan(baseline, 20);
    advanceClan(improved, 20);
    expect(improved.clan.food).toBeGreaterThan(baseline.clan.food);
    expect(improved.clan.materials).toBeGreaterThan(baseline.clan.materials);
    expect(improved.clan.pasture).toBeGreaterThan(baseline.clan.pasture);
    improved.phase = 'building';
    const paused = structuredClone(improved);
    advanceClan(improved, 60);
    expect(improved).toEqual(paused);
  });

  it('grants supplies and refugee bonuses only once at a completed crossing', () => {
    const run = createRun();
    run.phase = 'route';
    run.clan.stageTime = 45;
    run.clan.food = 100;
    run.health = 20;
    run.clan.integrity = 50;
    applyCampEffects(run.clan.campEffects, {
      bonuses: {
        arrivalFood: 15,
        arrivalMaterials: 10,
        arrivalHerd: 1,
        arrivalResolve: 8,
        arrivalHealth: 10,
        refugePeople: 3,
      },
    });
    expect(beginMigration(run, 'refuge')).toBe(true);
    expect(run.clan.population).toBe(8);
    expect(run.clan.materials).toBe(50);
    run.phase = 'playing';
    expect(advanceClan(run, 10)).toBeUndefined();
    expect(run.clan.population).toBe(8);
    expect(advanceClan(run, 90)).toBe('arrived');
    expect(run.clan).toMatchObject({
      population: 19,
      herd: 4,
      materials: 60,
      integrity: 70,
      food: 77,
    });
    expect(run.health).toBe(55);
    expect(run.story.crossings[0]?.population).toBe(19);
    advanceClan(run, 1);
    expect(run.clan.population).toBe(19);
    expect(run.clan.herd).toBe(4);
    expect(run.clan.materials).toBeLessThan(61);
  });

  it('combines transport, protection, and gallop benefits with patrons', () => {
    const run = createRun();
    run.patrons.guardian.protection = 0.648;
    run.patrons.hunt.gallopCooldown = 0.75;
    applyCampEffects(run.clan.campEffects, {
      multipliers: {
        clanProtection: 0.9,
        mobility: 1.1,
        gallopCooldown: 0.9,
      },
    });
    damageClan(run, 20);
    expect(run.clan.integrity).toBeCloseTo(100 - 20 * 0.7 * 0.648 * 0.9);
    expect(gallopCooldown(run)).toBeCloseTo(2.025);
    run.phase = 'route';
    run.clan.stageTime = 45;
    beginMigration(run, 'river');
    run.phase = 'playing';
    advanceClan(run, 10);
    expect(run.clan.migrationProgress).toBeCloseTo((10 * 1.036 * 1.1) / 72);
  });

  it('recovers health only during active time and resolve only while stationary', () => {
    const run = createRun();
    run.phase = 'playing';
    run.health = 50;
    run.clan.integrity = 50;
    applyCampEffects(run.clan.campEffects, {
      bonuses: { commanderRecovery: 0.15, resolveRecovery: 0.2 },
    });
    advanceClan(run, 10);
    advancePatrons(run, 10);
    expect(run.clan.integrity).toBe(52);
    expect(run.health).toBe(51.5);
    run.clan.stage = 'migration';
    run.clan.routeId = 'river';
    advanceClan(run, 1);
    expect(run.clan.integrity).toBe(52);
    run.phase = 'building';
    const before = structuredClone(run);
    advancePatrons(run, 10);
    advanceClan(run, 10);
    expect(run).toEqual(before);
  });
});
