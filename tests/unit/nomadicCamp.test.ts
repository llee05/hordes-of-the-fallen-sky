import { describe, expect, it } from 'vitest';
import {
  CORE_CAMP_BUILDINGS,
  createNomadicCamp,
  isNomadicCamp,
} from '../../src/shared/nomadicCamp';
import { NOMADIC_BUILDINGS, OPTIONAL_NOMADIC_BUILDINGS } from '../../src/game/data/nomadicCamp';
import { campBuildingArt } from '../../src/ui/campScene';
import { createRun } from '../../src/game/state/run';
import {
  nomadicBuildingBlocker,
  nomadicBuildingLevel,
  nomadicFutureEffects,
  purchaseNomadicBuilding,
} from '../../src/game/state/nomadicCamp';
function campRun() {
  const run = createRun();
  run.clan.nomadicCamp = createNomadicCamp();
  run.phase = 'building';
  run.clan.materials = 10000;
  run.clan.spirit = 1000;
  return run;
}
describe('nomadic camp registry and transactions', () => {
  it('starts five permanent households and five empty optional locations from a 19-building registry', () => {
    const camp = createNomadicCamp();
    expect(isNomadicCamp(camp)).toBe(true);
    expect(Object.keys(camp.core)).toHaveLength(5);
    expect(Object.values(camp.core)).toEqual([1, 1, 1, 1, 1]);
    expect(camp.slots).toEqual([null, null, null, null, null]);
    expect(NOMADIC_BUILDINGS).toHaveLength(19);
    expect(new Set(NOMADIC_BUILDINGS.map((b) => b.id)).size).toBe(19);
    expect(OPTIONAL_NOMADIC_BUILDINGS).toHaveLength(14);
    for (const definition of NOMADIC_BUILDINGS) {
      expect(definition.levels.map((level) => level.level)).toEqual([1, 2, 3]);
      expect(
        new Set(definition.levels.map((level) => campBuildingArt(definition.id, level.level))).size,
      ).toBe(3);
    }
  });
  it('constructs once in the selected location, deducts the real cost and prevents duplicates or replacement', () => {
    const run = campRun();
    const before = structuredClone(run);
    expect(nomadicBuildingBlocker(run, 'archery-range', 3)).toBeUndefined();
    expect(run).toEqual(before);
    expect(purchaseNomadicBuilding(run, 'archery-range', 3)).toBe(true);
    expect(run.clan.nomadicCamp!.slots[3]).toEqual({ id: 'archery-range', level: 1 });
    expect(run.clan.materials).toBe(before.clan.materials - 24);
    expect(run.stats.damage).toBe(before.stats.damage + 1);
    expect(purchaseNomadicBuilding(run, 'archery-range', 1)).toBe(false);
    expect(purchaseNomadicBuilding(run, 'smiths-forge', 3)).toBe(false);
    expect(run.clan.nomadicCamp!.slots.filter(Boolean)).toHaveLength(1);
  });
  it('gates ranks by the headquarters, applies each level once and stops at the catalog maximum', () => {
    const run = campRun();
    purchaseNomadicBuilding(run, 'archery-range');
    expect(nomadicBuildingBlocker(run, 'archery-range')).toContain("Khan's Ger level 2");
    expect(purchaseNomadicBuilding(run, 'khans-ger')).toBe(true);
    expect(purchaseNomadicBuilding(run, 'archery-range')).toBe(true);
    expect(purchaseNomadicBuilding(run, 'khans-ger')).toBe(true);
    expect(purchaseNomadicBuilding(run, 'archery-range')).toBe(true);
    const completed = structuredClone(run);
    expect(purchaseNomadicBuilding(run, 'archery-range')).toBe(false);
    expect(run).toEqual(completed);
    expect(nomadicBuildingLevel(run.clan.nomadicCamp!, 'archery-range')).toBe(3);
  });
  it('bounds the five choices, resources, phase, slot indices and travel without partial purchases', () => {
    const run = campRun();
    for (const b of OPTIONAL_NOMADIC_BUILDINGS.slice(0, 5))
      expect(purchaseNomadicBuilding(run, b.id)).toBe(true);
    const full = structuredClone(run);
    expect(purchaseNomadicBuilding(run, 'hunting-lodge')).toBe(false);
    expect(run).toEqual(full);
    for (const slot of [-1, 5, 0.5, NaN])
      expect(purchaseNomadicBuilding(campRun(), 'archery-range', slot)).toBe(false);
    const poor = campRun();
    poor.clan.materials = 0;
    expect(purchaseNomadicBuilding(poor, 'archery-range')).toBe(false);
    const travelling = campRun();
    travelling.clan.stage = 'migration';
    expect(purchaseNomadicBuilding(travelling, 'archery-range')).toBe(false);
    const paused = campRun();
    paused.phase = 'paused';
    expect(purchaseNomadicBuilding(paused, 'archery-range')).toBe(false);
  });
  it('validates portable ownership and rejects duplicate types, missing cores and invalid levels', () => {
    const camp = createNomadicCamp();
    camp.slots[0] = { id: 'trading-post', level: 2 };
    expect(isNomadicCamp(JSON.parse(JSON.stringify(camp)))).toBe(true);
    camp.slots[1] = { id: 'trading-post', level: 1 };
    expect(isNomadicCamp(camp)).toBe(false);
    const missing = createNomadicCamp();
    delete (missing.core as Partial<typeof missing.core>)[CORE_CAMP_BUILDINGS[0]];
    expect(isNomadicCamp(missing)).toBe(false);
    const invalid = createNomadicCamp();
    invalid.core['khans-ger'] = 4;
    expect(isNomadicCamp(invalid)).toBe(false);
  });
  it('records future trade and mount benefits without creating resources or companion subsystems', () => {
    const run = campRun();
    const before = { food: run.clan.food, herd: run.clan.herd, population: run.clan.population };
    expect(purchaseNomadicBuilding(run, 'trading-post')).toBe(true);
    expect(nomadicFutureEffects(run.clan.nomadicCamp!).tradeRates).toBeGreaterThan(0);
    expect(nomadicFutureEffects(run.clan.nomadicCamp!).mountSpeed).toBeGreaterThan(0);
    expect({ food: run.clan.food, herd: run.clan.herd, population: run.clan.population }).toEqual(
      before,
    );
  });
});
