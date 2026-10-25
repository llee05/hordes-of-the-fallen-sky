import { describe, expect, it } from 'vitest';
import { createRun } from '../../src/game/state/run';
import {
  buildStructure,
  buildingBlocker,
  assignedWorkers,
  beginMigration,
  advanceClan,
} from '../../src/game/state/clan';
import {
  buildingLevel,
  campSlots,
  encampment,
  estateBlocker,
  purchaseEstate,
} from '../../src/game/state/campEstate';
import { BUILDINGS } from '../../src/game/data/clan';
import { ENCAMPMENT_TIERS } from '../../src/game/data/campEstate';
function richCamp() {
  const run = createRun();
  run.phase = 'building';
  Object.assign(run.clan, { materials: 10000, spirit: 1000, population: 30 });
  return run;
}
function raiseCamp(run: ReturnType<typeof createRun>, to: number) {
  for (let tier = encampment(run).tier + 1; tier <= to; tier++) {
    for (const requirement of ENCAMPMENT_TIERS[tier - 1]!.requiresBuildings ?? [])
      for (
        let level = buildingLevel(run, requirement.building) + 1;
        level <= requirement.level;
        level++
      )
        expect(buildStructure(run, requirement.building, `level-${level}`)).toBe(true);
    expect(purchaseEstate(run, 'encampment', `encampment-${tier}`, tier)).toBe(true);
  }
}
describe('portable clan estate progression', () => {
  it('starts with two building slots, an independent internal allowance, and permanent family shelters', () => {
    const run = richCamp();
    expect(encampment(run)).toMatchObject({ tier: 1, slots: 2, internalSlots: 1 });
    expect(campSlots(run).slice(0, 2)).toEqual(['ger', null]);
    expect(buildStructure(run, 'archery', undefined, 1)).toBe(true);
    const before = structuredClone(run);
    expect(buildStructure(run, 'wagon')).toBe(false);
    expect(buildingBlocker(run, 'wagon')).toContain('No building slots');
    expect(buildStructure(run, 'herd', undefined, 5)).toBe(false);
    expect(run).toEqual(before);
    expect(purchaseEstate(run, 'internal', 'clan-council', 1)).toBe(true);
    expect(assignedWorkers(run)).toBe(4);
    expect(run.clan.campEffects.multipliers.consumption).toBe(0.95);
    expect(purchaseEstate(run, 'internal', 'master-craftsmen', 1)).toBe(false);
  });
  it('unlocks all five camp tiers, six plots, and higher facility levels with exact one-time effects', () => {
    const run = richCamp();
    expect(buildStructure(run, 'felt')).toBe(false);
    raiseCamp(run, 5);
    expect(encampment(run)).toMatchObject({ tier: 5, slots: 6, internalSlots: 6 });
    expect(buildingLevel(run, 'ger')).toBe(3);
    const before = structuredClone(run);
    expect(purchaseEstate(run, 'encampment', 'encampment-5', 5)).toBe(false);
    expect(purchaseEstate(run, 'encampment', 'encampment-6', 6)).toBe(false);
    expect(run).toEqual(before);
    expect(buildStructure(run, 'felt')).toBe(true);
    expect(buildStructure(run, 'felt', 'level-3')).toBe(false);
    expect(buildStructure(run, 'felt', 'level-2')).toBe(true);
    expect(buildStructure(run, 'felt', 'level-3')).toBe(true);
    expect(buildStructure(run, 'felt', 'reinforced-felt')).toBe(true);
    expect(buildingLevel(run, 'felt')).toBe(4);
    expect(buildStructure(run, 'felt', 'fine-felt')).toBe(false);
    expect(run.clan.campEffects.multipliers.clanProtection).toBeCloseTo(0.95 * 0.85 * 0.85);
  });
  it('enforces rank, resource, worker, camp-tier and building prerequisites without partial spending', () => {
    const run = richCamp();
    expect(purchaseEstate(run, 'encampment', 'encampment-3', 3)).toBe(false);
    expect(estateBlocker(run, 'internal', 'war-council', 1)).toContain('camp tier 2');
    run.clan.population = 0;
    const before = structuredClone(run);
    expect(purchaseEstate(run, 'internal', 'ancestral-hearth', 1)).toBe(false);
    expect(run).toEqual(before);
    run.clan.population = 30;
    run.clan.materials = 0;
    expect(purchaseEstate(run, 'internal', 'ancestral-hearth', 1)).toBe(false);
    run.clan.materials = 10000;
    run.patrons.guardian.cost = 0.9;
    const materials = run.clan.materials;
    expect(purchaseEstate(run, 'encampment', 'encampment-2', 2)).toBe(true);
    expect(run.clan.materials).toBe(materials - Math.ceil(45 * 0.9));
    expect(estateBlocker(run, 'encampment', 'encampment-3', 3)).toContain('Family gers level 2');
  });
  it('keeps slots, levels, effects, and internal improvements across migration and blocks packed purchases', () => {
    const run = richCamp();
    raiseCamp(run, 3);
    buildStructure(run, 'archery');
    buildStructure(run, 'archery', 'level-2');
    purchaseEstate(run, 'internal', 'ancestral-hearth', 1);
    const estate = structuredClone(run.clan.estate),
      paths = structuredClone(run.clan.paths),
      effects = structuredClone(run.clan.campEffects);
    run.phase = 'route';
    run.clan.stageTime = 45;
    expect(beginMigration(run, 'river')).toBe(true);
    run.phase = 'building';
    expect(purchaseEstate(run, 'internal', 'clan-council', 1)).toBe(false);
    expect(buildStructure(run, 'archery', 'level-3')).toBe(false);
    run.phase = 'playing';
    expect(advanceClan(run, 100)).toBe('arrived');
    expect(run.clan.estate).toEqual(estate);
    expect(run.clan.paths).toEqual(paths);
    expect(run.clan.campEffects).toEqual(effects);
    expect(buildingLevel(run, 'archery')).toBe(2);
  });
  it('keeps existing workplaces usable after casualties while blocking new worker reservations', () => {
    const run = richCamp();
    raiseCamp(run, 3);
    expect(buildStructure(run, 'herd')).toBe(true);
    expect(purchaseEstate(run, 'internal', 'clan-council', 1)).toBe(true);
    run.clan.population = 1;
    expect(assignedWorkers(run)).toBeGreaterThan(run.clan.population);
    expect(buildStructure(run, 'herd', 'level-2')).toBe(true);
    expect(purchaseEstate(run, 'internal', 'clan-council', 2)).toBe(true);
    expect(purchaseEstate(run, 'encampment', 'encampment-4', 4)).toBe(false);
    // This tier still requires Family gers level 3, but does not require new workers.
    expect(buildStructure(run, 'ger', 'level-3')).toBe(true);
    run.clan.population = 1;
    expect(purchaseEstate(run, 'encampment', 'encampment-4', 4)).toBe(true);
    expect(buildingBlocker(run, 'archery')).toBe('More families needed');
    expect(estateBlocker(run, 'internal', 'master-craftsmen', 1)).toBe('More families needed');
  });
  it('authors multiple facility levels while retaining every original facility and stable craft IDs', () => {
    expect(BUILDINGS).toHaveLength(8);
    for (const b of BUILDINGS) {
      expect(b.paths.find((p) => p.level === 2)).toBeDefined();
      expect(b.paths.find((p) => p.level === 3)).toBeDefined();
      expect(new Set(b.paths.map((p) => p.id)).size).toBe(b.paths.length);
    }
    expect(
      BUILDINGS.find((b) => b.id === 'archery')!.paths.some((p) => p.id === 'fire-arrows'),
    ).toBe(true);
  });
});
