import { describe, expect, it } from 'vitest';
import { BUILDINGS } from '../../src/game/data/clan';
import { GAME } from '../../src/game/config';
import { createRun } from '../../src/game/state/run';
import {
  advanceClan,
  assignedWorkers,
  beginMigration,
  buildStructure,
  developmentExcluded,
} from '../../src/game/state/clan';
import { campBranches } from '../../src/ui/campContent';
import { treeLevels } from '../../src/ui/progressionTree';

function builder() {
  const run = createRun();
  // A grandfathered camp snapshot; fresh-estate gates are tested in campEstate.test.ts.
  delete run.clan.estate;
  run.phase = 'building';
  run.clan.materials = run.clan.spirit = 10000;
  run.clan.population = 30;
  return run;
}

describe('Mongolian-inspired camp branches', () => {
  it('authors eight valid, reachable branches and fifty-five level and craft developments', () => {
    expect(BUILDINGS.map((building) => building.id)).toEqual([
      'ger',
      'archery',
      'herd',
      'sanctuary',
      'wagon',
      'felt',
      'provisions',
      'relay',
    ]);
    expect(BUILDINGS.reduce((sum, building) => sum + building.paths.length, 0)).toBe(55);
    expect(campBranches(createRun()).flatMap((branch) => branch.nodes)).toHaveLength(63);
    for (const branch of campBranches(createRun()))
      expect(treeLevels(branch.nodes).length).toBeGreaterThanOrEqual(3);
    for (const building of BUILDINGS) {
      expect(new Set(building.paths.map((path) => path.id)).size).toBe(building.paths.length);
      for (const target of building.paths) {
        const run = builder();
        if (!building.startsBuilt) expect(buildStructure(run, building.id)).toBe(true);
        const learn = (id: string) => {
          const node = building.paths.find((path) => path.id === id)!;
          expect(node).toBeDefined();
          for (const parent of node.requires ?? [])
            if (!run.clan.paths[building.id]?.includes(parent)) learn(parent);
          expect(buildStructure(run, building.id, id)).toBe(true);
        };
        learn(target.id);
      }
    }
  });

  it('lets shared crafts coexist with a chosen specialization and excludes its alternative descendants', () => {
    const run = builder();
    buildStructure(run, 'ger', 'hearthkeepers');
    expect(buildStructure(run, 'ger', 'felt-linings')).toBe(true);
    expect(buildStructure(run, 'ger', 'hospitality-circle')).toBe(true);
    expect(developmentExcluded(run, 'ger', 'household-apprentices')).toBe(true);
    expect(
      campBranches(run)
        .find((branch) => branch.id === 'ger')!
        .nodes.find((node) => node.id === 'ger-household-apprentices')!.status,
    ).toBe('excluded');
    expect(run.clan.campEffects.bonuses.arrivalHealth).toBe(10);
    expect(run.clan.campEffects.multipliers.clanProtection).toBe(0.9);
  });

  it('requires both felt crafts for mastery, charges once, and preserves worker requirements', () => {
    const run = builder();
    expect(buildStructure(run, 'felt')).toBe(true);
    expect(buildStructure(run, 'felt', 'master-feltmakers')).toBe(false);
    buildStructure(run, 'felt', 'wool-sorting');
    expect(buildStructure(run, 'felt', 'master-feltmakers')).toBe(false);
    buildStructure(run, 'felt', 'weatherproof-covers');
    expect(buildStructure(run, 'felt', 'master-feltmakers')).toBe(true);
    expect(run.clan.campEffects.multipliers.materialProduction).toBeCloseTo(1.3225);
    expect(run.clan.campEffects.multipliers.consumption).toBe(0.9);
    expect(assignedWorkers(run)).toBe(2);
    const before = structuredClone(run);
    expect(buildStructure(run, 'felt', 'master-feltmakers')).toBe(false);
    expect(run).toEqual(before);
  });

  it('welcomes households and grants preserved provisions once with population and resolve caps', () => {
    const run = builder();
    run.clan.population = 118;
    run.clan.integrity = 95;
    buildStructure(run, 'provisions');
    buildStructure(run, 'provisions', 'aaruul-drying');
    buildStructure(run, 'provisions', 'airag-hospitality');
    expect(run.clan.population).toBe(GAME.clan.maxPopulation);
    expect(run.clan.integrity).toBe(100);
    expect(run.clan.food).toBe(115);
    const before = structuredClone(run);
    expect(buildStructure(run, 'provisions', 'airag-hospitality')).toBe(false);
    expect(run).toEqual(before);
  });

  it('carries all learned crafts and relay rewards through a crossing without creating a new free payment', () => {
    const run = builder();
    buildStructure(run, 'provisions');
    for (const path of ['aaruul-drying', 'borts-stores', 'shared-provisions'])
      buildStructure(run, 'provisions', path);
    buildStructure(run, 'relay');
    for (const path of ['pasture-scouts', 'supply-caches', 'horse-relays', 'family-messengers'])
      buildStructure(run, 'relay', path);
    const effects = structuredClone(run.clan.campEffects);
    const materials = run.clan.materials;
    const paths = structuredClone(run.clan.paths);
    run.clan.food = 100;
    run.clan.herd = 39;
    run.health = 10;
    run.clan.integrity = 50;
    run.phase = 'route';
    run.clan.stageTime = 45;
    expect(beginMigration(run, 'refuge')).toBe(true);
    expect(run.clan.materials).toBe(materials);
    run.phase = 'playing';
    expect(advanceClan(run, 100)).toBe('arrived');
    expect(run.clan.materials).toBe(materials + 10);
    expect(run.clan.population).toBe(41);
    expect(run.clan.herd).toBe(40);
    expect(run.health).toBe(45);
    expect(run.clan.integrity).toBe(72);
    expect(run.clan.campEffects).toEqual(effects);
    expect(run.clan.paths).toEqual(paths);
    expect(createRun().clan.paths).toEqual({});
    expect(createRun().clan.campEffects.bonuses.arrivalFood).toBe(0);
  });

  it('needs thirteen workers for every base, unlocked by growing the starting households', () => {
    const run = builder();
    run.clan.population = 8;
    for (const id of ['archery', 'herd', 'sanctuary', 'wagon'] as const)
      expect(buildStructure(run, id)).toBe(true);
    expect(assignedWorkers(run)).toBe(8);
    expect(buildStructure(run, 'felt')).toBe(false);
    expect(buildStructure(run, 'ger', 'hearthkeepers')).toBe(true);
    for (const id of ['felt', 'provisions', 'relay'] as const)
      expect(buildStructure(run, id)).toBe(true);
    expect(run.clan.population).toBe(14);
    expect(assignedWorkers(run)).toBe(13);
    run.clan.population = 1;
    run.phase = 'playing';
    const materials = run.clan.materials;
    advanceClan(run, 1);
    expect(assignedWorkers(run)).toBe(13);
    expect(run.clan.materials).toBeGreaterThan(materials);
  });
});
