import { describe, expect, it } from 'vitest';
import { SYNERGIES } from '../../src/game/data/synergies';
import { UPGRADES } from '../../src/game/data/upgrades';
import { createRun, applyUpgrade } from '../../src/game/state/run';
import { buildingCost, buildStructure } from '../../src/game/state/clan';
import { synergyProgress } from '../../src/game/state/synergies';

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
    ];
    expect(plan.price.materials).toBe(costs.reduce((sum, c) => sum + c.materials, 0));
    expect(plan.price.workers).toBe(5);
    expect(run).toEqual(before);
    expect(buildStructure(run, 'archery')).toBe(true);
    // A previously learned alternative still closes the recipe on legacy import.
    run.clan.paths.archery = ['veteran-riders'];
    expect(synergyProgress(run, recipe).closed).toBe(true);
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
