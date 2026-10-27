import { resolveStory } from '../../src/game/state/story';
import { storyEncounter } from '../../src/game/data/story';
import { storyConsequence } from '../../src/game/data/storyConsequences';
import { describe, expect, it } from 'vitest';
import { createRun, gainExperience } from '../../src/game/state/run';
import { createLegacyCampRun } from '../support/legacyCamp';
import { buildStructure, advanceClan } from '../../src/game/state/clan';
import { captureCampArchive, runFromCampArchive } from '../../src/game/state/campArchive';
import { isCampArchive, normalizeCampArchive } from '../../src/shared/campArchive';
import { migrateLegacyNomadicCamp } from '../../src/game/state/nomadicCampMigration';
import { purchaseEstate } from '../../src/game/state/campEstate';
import {
  nomadicBuildingLevel,
  nomadicPopulationCapacity,
  purchaseNomadicBuilding,
  nomadicAssignedWorkers,
} from '../../src/game/state/nomadicCamp';
import { economyRates } from '../../src/game/state/economy';
import { applyUpgrade } from '../../src/game/state/run';
import { UPGRADES } from '../../src/game/data/upgrades';
import { nomadicEffectDescriptions } from '../../src/ui/nomadicCampModel';
import { nomadicBuilding } from '../../src/game/data/nomadicCamp';
function funded() {
  const run = createRun();
  run.phase = 'building';
  run.clan.materials = 10000;
  run.clan.spirit = 1000;
  return run;
}
describe('nomadic foundations, effects and persistence', () => {
  it('starts five permanent cores with their actual ongoing food, care and transport benefits', () => {
    const run = createRun();
    expect(run.clan.estate).toBeUndefined();
    expect(run.clan.nomadicCamp!.slots).toEqual([null, null, null, null, null]);
    expect(Object.values(run.clan.nomadicCamp!.core)).toEqual([1, 1, 1, 1, 1]);
    expect(nomadicAssignedWorkers(run.clan.nomadicCamp!)).toBe(0);
    expect(nomadicPopulationCapacity(run)).toBe(40);
    expect(economyRates(run).foodNet).toBeCloseTo(1.24);
    expect(economyRates(run).materials).toBeCloseTo(0.4664);
    expect(run.clan.campEffects.bonuses.commanderRecovery).toBeGreaterThan(0);
  });
  it('does not let the permanent hearth revive a clan that has already fallen', () => {
    const run = createRun();
    run.phase = 'playing';
    run.clan.integrity = 0;
    const before = structuredClone(run);
    expect(advanceClan(run, 1)).toBe('lost');
    expect(run).toEqual(before);
  });
  it('preserves every existing patron modifier when a building adds its independent effect', () => {
    const run = funded();
    run.pendingUpgrades = 20;
    const upgrade = UPGRADES.find((u) => u.id === 'power')!;
    expect(applyUpgrade(run, upgrade)).toBe(true);
    const damage = run.stats.damage,
      bow = structuredClone(run.patrons.bow);
    expect(purchaseNomadicBuilding(run, 'archery-range')).toBe(true);
    expect(run.stats.damage).toBe(damage + 1);
    expect(run.patrons.bow).toEqual(bow);
  });
  it('raises headquarters capacity to the existing world limit and banks every earned knowledge point', () => {
    const run = funded();
    expect(purchaseNomadicBuilding(run, 'khans-ger')).toBe(true);
    expect(nomadicPopulationCapacity(run)).toBe(80);
    expect(purchaseNomadicBuilding(run, 'khans-ger')).toBe(true);
    expect(nomadicPopulationCapacity(run)).toBe(120);
    expect(purchaseNomadicBuilding(run, 'storytellers-hearth')).toBe(true);
    run.pendingUpgrades = 7;
    expect(gainExperience(run, 10)).toBe(true);
    expect(run.pendingUpgrades).toBe(8);
    expect(run.xp).toBeCloseTo(3);
    expect(run.phase).toBe('building');
  });
  it('does not resurrect a fallen Khan or bypass active-time succession through a healer purchase', () => {
    const run = funded();
    run.health = 0;
    run.khan.successionRemaining = 6;
    run.patrons.hearth.revives = 0;
    const maximum = run.stats.maxHealth;
    expect(purchaseNomadicBuilding(run, 'healers-ger')).toBe(true);
    expect(run.stats.maxHealth).toBe(maximum + 5);
    expect(run.health).toBe(0);
    expect(run.khan.successionRemaining).toBe(6);
    expect(run.patrons.hearth.revives).toBe(0);
  });
  it('saves choices and all ranks, reconstructs effects once and never replays arrival gifts', () => {
    const source = funded();
    for (let level = 2; level <= 3; level++)
      expect(purchaseNomadicBuilding(source, 'khans-ger')).toBe(true);
    expect(purchaseNomadicBuilding(source, 'healers-ger', 4)).toBe(true);
    expect(purchaseNomadicBuilding(source, 'healers-ger', 4)).toBe(true);
    expect(purchaseNomadicBuilding(source, 'healers-ger', 4)).toBe(true);
    expect(purchaseNomadicBuilding(source, 'trading-post', 0)).toBe(true);
    const archive = captureCampArchive(source);
    expect(isCampArchive(archive)).toBe(true);
    expect(normalizeCampArchive(archive)?.nomadicCamp).toEqual(source.clan.nomadicCamp);
    const restored = runFromCampArchive(archive)!;
    expect(restored.clan.nomadicCamp).toEqual(source.clan.nomadicCamp);
    expect(restored.clan.campEffects).toEqual(source.clan.campEffects);
    expect(restored.stats).toEqual(source.stats);
    expect(restored.clan.materials).toBe(source.clan.materials);
    expect(restored.clan.food).toBe(source.clan.food);
    expect(restored.clan.population).toBe(source.clan.population);
    const twice = runFromCampArchive(captureCampArchive(restored))!;
    expect(twice.clan.campEffects).toEqual(restored.clan.campEffects);
    expect(twice.stats).toEqual(restored.stats);
  });
  it('rejects malformed new checkpoint ownership rather than importing duplicate workplaces', () => {
    const archive = captureCampArchive(funded());
    archive.nomadicCamp!.slots[0] = { id: 'archery-range', level: 1 };
    archive.nomadicCamp!.slots[1] = { id: 'archery-range', level: 2 };
    expect(isCampArchive(archive)).toBe(false);
    expect(runFromCampArchive(archive)).toBeUndefined();
  });
  it('labels unsupported future benefits honestly while showing real capacity and experience effects', () => {
    expect(
      nomadicEffectDescriptions(nomadicBuilding('horse-lines').levels[0]!.effects).some((s) =>
        s.includes('Planned · mount'),
      ),
    ).toBe(true);
    expect(nomadicEffectDescriptions(nomadicBuilding('khans-ger').levels[0]!.effects)).toContain(
      'Population capacity +40',
    );
    expect(
      nomadicEffectDescriptions(nomadicBuilding('storytellers-hearth').levels[0]!.effects),
    ).toContain('Experience gained +10%');
  });
});
describe('legacy camp migration', () => {
  it('maps known facilities, retains earned levels and refunds removed tiers and internals exactly once', () => {
    const old = createLegacyCampRun();
    old.phase = 'building';
    old.clan.materials = 10000;
    old.clan.spirit = 1000;
    expect(purchaseEstate(old, 'encampment', 'encampment-2', 2)).toBe(true);
    expect(buildStructure(old, 'ger', 'level-2')).toBe(true);
    expect(purchaseEstate(old, 'encampment', 'encampment-3', 3)).toBe(true);
    expect(buildStructure(old, 'archery')).toBe(true);
    expect(buildStructure(old, 'archery', 'level-2')).toBe(true);
    expect(purchaseEstate(old, 'internal', 'clan-council', 1)).toBe(true);
    const oldStores = {
      food: old.clan.food,
      materials: old.clan.materials,
      spirit: old.clan.spirit,
      people: old.clan.population,
      herd: old.clan.herd,
    };
    const restored = runFromCampArchive(captureCampArchive(old))!;
    expect(restored.clan.nomadicCamp!.core['khans-ger']).toBe(2);
    expect(nomadicBuildingLevel(restored.clan.nomadicCamp!, 'archery-range')).toBe(2);
    expect(restored.clan.nomadicCamp!.slots.filter(Boolean)).toHaveLength(1);
    expect(restored.clan.nomadicCamp!.slots).toHaveLength(5);
    expect(restored.clan.estate).toBeUndefined();
    expect(restored.clan.materials).toBeGreaterThan(oldStores.materials);
    expect(restored.clan.spirit).toBeGreaterThan(oldStores.spirit);
    expect(restored.clan.food).toBe(oldStores.food);
    expect(restored.clan.population).toBe(oldStores.people);
    expect(restored.clan.herd).toBe(oldStores.herd);
    const before = structuredClone(restored);
    expect(migrateLegacyNomadicCamp(restored)).toEqual({ materials: 0, spirit: 0 });
    expect(restored).toEqual(before);
  });
  it('refunds old exclusive crafts without granting phantom level upgrades or repeating immediate gifts', () => {
    const old = createLegacyCampRun();
    delete old.clan.estate;
    old.phase = 'building';
    old.clan.materials = 500;
    old.clan.spirit = 100;
    expect(buildStructure(old, 'archery')).toBe(true);
    expect(buildStructure(old, 'archery', 'fire-arrows')).toBe(true);
    const materials = old.clan.materials;
    const restored = runFromCampArchive(captureCampArchive(old))!;
    expect(nomadicBuildingLevel(restored.clan.nomadicCamp!, 'archery-range')).toBe(1);
    expect(restored.clan.materials).toBe(materials + 36);
    expect(restored.clan.paths.archery ?? []).not.toContain('fire-arrows');
    expect(restored.clan.population).toBe(old.clan.population);
  });
  it('retains lasting story modifiers while retiring and replacing only the old camp contributions', () => {
    const old = createLegacyCampRun();
    old.phase = 'building';
    old.clan.materials = 1000;
    old.story.active = storyEncounter(old, 'fire');
    expect(resolveStory(old, 'share-work')).toBe(true);
    const storyMultiplier =
      storyConsequence('share-work')!.lasting!.effects.multipliers!.materialProduction!;
    expect(purchaseEstate(old, 'encampment', 'encampment-2', 2)).toBe(true);
    const records = structuredClone(old.story.records);
    migrateLegacyNomadicCamp(old);
    expect(old.story.records).toEqual(records);
    expect(old.clan.campEffects.multipliers.materialProduction).toBeCloseTo(storyMultiplier * 1.1);
  });
  it('keeps banked progression, health, succession and over-cap households during a full-run migration', () => {
    const old = createLegacyCampRun();
    old.pendingUpgrades = 9;
    old.xp = 3;
    old.health = 0;
    old.khan.successionRemaining = 7;
    old.patrons.hearth.revives = 0;
    old.clan.population = 100;
    const legacy = structuredClone(old.legacy);
    migrateLegacyNomadicCamp(old);
    expect(old.pendingUpgrades).toBe(9);
    expect(old.xp).toBe(3);
    expect(old.health).toBe(0);
    expect(old.khan.successionRemaining).toBe(7);
    expect(old.patrons.hearth.revives).toBe(0);
    expect(old.clan.population).toBe(100);
    expect(old.legacy).toEqual(legacy);
  });
});
