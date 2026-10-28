import { describe, expect, it } from 'vitest';
import { SYNERGIES, NOMADIC_SYNERGIES } from '../../src/game/data/synergies';
import { nomadicBuilding } from '../../src/game/data/nomadicCamp';
import { createRun as createNomadicRun } from '../../src/game/state/run';
import { purchaseNomadicBuilding } from '../../src/game/state/nomadicCamp';
import { synergyContent } from '../../src/ui/synergyContent';
import { UPGRADES } from '../../src/game/data/upgrades';
import { applyUpgrade } from '../../src/game/state/run';
import { createLegacyCampRun as createRun } from '../support/legacyCamp';
import { buildingCost, buildStructure } from '../../src/game/state/clan';
import { synergyProgress, nomadicSynergyProgress } from '../../src/game/state/synergies';
import { ENCAMPMENT_TIERS } from '../../src/game/data/campEstate';
import { estateCost } from '../../src/game/state/campEstate';

describe('discoverable combinations', () => {
  it('includes missing camp establishments, current discounts, workers, and exclusive ancestors', () => {
    const run = createRun();
    run.phase = 'building';
    run.clan.materials = 1000;
    run.clan.spirit = 100;
    run.patrons.guardian.cost = 0.8;
    const recipe = SYNERGIES[0]!;
    const before = structuredClone(run);
    const plan = synergyProgress(run, recipe);
    const costs = [
      buildingCost(run, 'archery'),
      buildingCost(run, 'archery', 'fire-arrows'),
      buildingCost(run, 'archery', 'level-2'),
      buildingCost(run, 'archery', 'level-3'),
      buildingCost(run, 'sanctuary'),
      buildingCost(run, 'sanctuary', 'wind-shamans'),
      buildingCost(run, 'sanctuary', 'level-2'),
      buildingCost(run, 'sanctuary', 'level-3'),
      buildingCost(run, 'ger', 'level-2'),
      buildingCost(run, 'ger', 'level-3'),
      ...ENCAMPMENT_TIERS.slice(1, 4).map((tier) => estateCost(run, tier)),
    ];
    expect(plan.price.materials).toBe(costs.reduce((sum, c) => sum + c.materials, 0));
    expect(plan.price.spirit).toBe(costs.reduce((sum, c) => sum + c.spirit, 0));
    expect(plan.price.workers).toBe(5);
    expect(run).toEqual(before);
    expect(buildStructure(run, 'archery')).toBe(true);
    // A previously learned alternative still closes the recipe on legacy import.
    run.clan.paths.archery = ['veteran-riders'];
    expect(synergyProgress(run, recipe).closed).toBe(true);
  });
  it('does not charge imported camps for level gates or camp tiers introduced later', () => {
    const run = createRun();
    delete run.clan.estate;
    const recipe = SYNERGIES[0]!;
    const costs = [
      buildingCost(run, 'archery'),
      buildingCost(run, 'archery', 'fire-arrows'),
      buildingCost(run, 'sanctuary'),
      buildingCost(run, 'sanctuary', 'wind-shamans'),
    ];
    expect(synergyProgress(run, recipe).price.materials).toBe(
      costs.reduce((sum, c) => sum + c.materials, 0),
    );
    run.clan.buildings.archery = 2;
    run.clan.buildings.sanctuary = 2;
    run.clan.paths.archery = ['fire-arrows'];
    run.clan.paths.sanctuary = ['wind-shamans'];
    expect(synergyProgress(run, recipe)).toMatchObject({
      complete: true,
      price: { materials: 0, spirit: 0, workers: 0 },
    });
  });
  it('subtracts completed ranks and recognizes active combinations without another purchase', () => {
    const run = createRun();
    run.phase = 'upgrade';
    run.pendingUpgrades = 10;
    const recipe = SYNERGIES.find((r) => r.id === 'remembered-bow')!;
    expect(synergyProgress(run, recipe).price.knowledge).toBe(3);
    for (const id of ['power', 'ancestral-companion', 'remembered-aim'])
      expect(
        applyUpgrade(
          run,
          UPGRADES.find((u) => u.id === id)!,
        ),
      ).toBe(true);
    const progress = synergyProgress(run, recipe);
    expect(progress.complete).toBe(true);
    expect(progress.price.knowledge).toBe(0);
  });
});

describe('nomadic combination locations', () => {
  const recipe = NOMADIC_SYNERGIES.find((r) => r.id === 'burning-tempest')!;
  function campRun(occupied = 0) {
    const run = createNomadicRun();
    run.phase = 'building';
    Object.assign(run.clan, { materials: 10000, spirit: 1000, population: 40 });
    const buildings = ['smiths-forge', 'scouts-watchpost', 'healers-ger', 'trading-post'] as const;
    for (const id of buildings.slice(0, occupied)) {
      expect(purchaseNomadicBuilding(run, id)).toBe(true);
    }
    return run;
  }

  it('closes a two-building route with one free location and preserves routes that fit', () => {
    const run = campRun(4);
    const before = structuredClone(run);
    expect(nomadicSynergyProgress(run, recipe)).toMatchObject({ complete: false, closed: true });
    expect(synergyContent(run)).toContain('No optional location available');
    expect(synergyContent(run)).not.toContain('Plan a combination</small><h4>Burning Tempest');
    expect(run).toEqual(before);

    const viable = campRun(3);
    expect(nomadicSynergyProgress(viable, recipe).closed).toBe(false);
    expect(purchaseNomadicBuilding(viable, 'fletchers-workshop')).toBe(true);
    expect(nomadicSynergyProgress(viable, recipe).closed).toBe(false);
    expect(purchaseNomadicBuilding(viable, 'shamans-ger')).toBe(true);
    expect(purchaseNomadicBuilding(viable, 'khans-ger')).toBe(true);
    expect(purchaseNomadicBuilding(viable, 'fletchers-workshop')).toBe(true);
    expect(purchaseNomadicBuilding(viable, 'khans-ger')).toBe(true);
    expect(purchaseNomadicBuilding(viable, 'fletchers-workshop')).toBe(true);
    for (const id of ['remembered-bow', 'sustained-pasture'])
      expect(
        nomadicSynergyProgress(
          viable,
          NOMADIC_SYNERGIES.find((r) => r.id === id)!,
        ).closed,
      ).toBe(false);
    expect(nomadicSynergyProgress(viable, recipe)).toMatchObject({
      complete: true,
      closed: false,
      price: { knowledge: 0, materials: 0, spirit: 0, workers: 0 },
    });
  });

  it('counts distinct optional prerequisites in the closure, including shared dependencies', () => {
    const fletcher = nomadicBuilding('fletchers-workshop').levels[0]!;
    const shaman = nomadicBuilding('shamans-ger').levels[0]!;
    const originalFletcher = fletcher.requires;
    const originalShaman = shaman.requires;
    fletcher.requires = shaman.requires = [{ building: 'archery-range', level: 1 }];
    try {
      expect(nomadicSynergyProgress(campRun(3), recipe).closed).toBe(true);
      const run = campRun(2);
      const progress = nomadicSynergyProgress(run, recipe);
      expect(progress.closed).toBe(false);
      const missing = [
        ...nomadicBuilding('fletchers-workshop').levels,
        shaman,
        ...nomadicBuilding('khans-ger').levels.slice(1),
        nomadicBuilding('archery-range').levels[0]!,
      ];
      expect(progress.price.materials).toBe(
        missing.reduce((total, level) => total + level.cost.materials, 0),
      );
      expect(progress.price.spirit).toBe(
        missing.reduce((total, level) => total + level.cost.spirit, 0),
      );
      expect(progress.price.workers).toBe(
        (['fletchers-workshop', 'shamans-ger', 'archery-range'] as const).reduce(
          (total, id) => total + nomadicBuilding(id).workers,
          0,
        ),
      );
    } finally {
      fletcher.requires = originalFletcher;
      shaman.requires = originalShaman;
    }
  });
});
