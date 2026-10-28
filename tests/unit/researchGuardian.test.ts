import { describe, expect, it } from 'vitest';
import { createLegacyCampRun as createRun } from '../support/legacyCamp';
import { buildingCost, buildStructure } from '../../src/game/state/clan';
import {
  claimArrowPlatform,
  claimWardEntries,
  circlingVolley,
  constructionMaterials,
  recordConstruction,
  wagonDamageMultiplier,
  wagonRangeMultiplier,
} from '../../src/game/state/researchGuardian';
function run(...ids: string[]) {
  const r = createRun();
  r.phase = 'playing';
  for (const id of ids) r.upgrades[id] = 1;
  return r;
}
describe('Guardian runtime mechanics', () => {
  it('Arrow Platforms require the real Wagon circle and release at most every six active seconds', () => {
    const r = run('gu-arrow-platforms');
    expect(claimArrowPlatform(r)).toBe(false);
    r.clan.buildings.wagon = 1;
    expect(claimArrowPlatform(r)).toBe(true);
    expect(claimArrowPlatform(r)).toBe(false);
    r.elapsed = 6;
    expect(claimArrowPlatform(r)).toBe(true);
    r.phase = 'paused';
    r.elapsed = 12;
    expect(claimArrowPlatform(r)).toBe(false);
  });
  it('Circling Volley rolls fifteen percent once, excluding bosses', () => {
    const r = run('gu-circling-volley');
    expect(circlingVolley(r, false, 0.149)).toBe(true);
    expect(circlingVolley(r, false, 0.15)).toBe(false);
    expect(circlingVolley(r, true, 0)).toBe(false);
  });
  it('Defended Passage distinguishes entry, continuous presence, reentry and reused pool slots', () => {
    const r = run('gu-defended-passage');
    expect(claimWardEntries(r, ['1:1'])).toEqual(['1:1']);
    expect(claimWardEntries(r, ['1:1'])).toEqual([]);
    expect(claimWardEntries(r, ['1:2'])).toEqual(['1:2']);
    claimWardEntries(r, []);
    expect(claimWardEntries(r, ['1:2'])).toEqual(['1:2']);
    r.phase = 'paused';
    expect(claimWardEntries(r, [])).toEqual([]);
    expect(r.researchRuntime?.wardInside).toEqual(['1:2']);
  });
  it('Iron-Rimmed Wagons extends guard shot range and increases damage only during migration', () => {
    const r = run('gu-iron-rimmed-wagons');
    expect(wagonRangeMultiplier(r)).toBe(1.1);
    expect(wagonDamageMultiplier(r)).toBe(1);
    r.clan.stage = 'migration';
    expect(wagonDamageMultiplier(r)).toBe(1.2);
  });
  it('Fast Unpacking discounts only the first new structure after a move, never developments or preview mutations', () => {
    const r = run('gu-fast-unpacking');
    expect(constructionMaterials(r, true, 100)).toBe(100);
    r.story.crossings.push({} as never);
    expect(constructionMaterials(r, true, 100)).toBe(80);
    expect(constructionMaterials(r, false, 100)).toBe(100);
    expect(r.researchRuntime).toBeUndefined();
    recordConstruction(r);
    expect(constructionMaterials(r, true, 100)).toBe(100);
  });
  it('City of Felt and Wood caps the free material amount and consumes it only after a successful construction', () => {
    const r = run('gu-city-of-felt-and-wood');
    expect(constructionMaterials(r, true, 60)).toBe(20);
    expect(constructionMaterials(r, true, 30)).toBe(0);
    r.phase = 'building';
    r.clan.materials = 1000;
    r.clan.spirit = 1000;
    r.clan.population = 100;
    const cost = buildingCost(r, 'archery');
    expect(buildStructure(r, 'archery')).toBe(true);
    expect(r.clan.materials).toBe(1000 - cost.materials);
    expect(constructionMaterials(r, true, 60)).toBe(60);
    expect(buildStructure(r, 'archery')).toBe(false);
  });
});

import { createRun as createNomadicRun } from '../../src/game/state/run';
import { nomadicBuildingCost, purchaseNomadicBuilding } from '../../src/game/state/nomadicCamp';
it('current nomadic purchases apply first-construction discounts and the craftspeople refund in one transaction', () => {
  const r = createNomadicRun();
  r.phase = 'building';
  r.clan.materials = 1000;
  r.clan.spirit = 1000;
  r.clan.population = 100;
  r.upgrades['gu-city-of-felt-and-wood'] = 1;
  r.upgrades['ee-camp-of-craftspeople'] = 1;
  const cost = nomadicBuildingCost(r, 'artisans-ger')!;
  expect(purchaseNomadicBuilding(r, 'artisans-ger')).toBe(true);
  expect(r.clan.materials).toBe(1000 - cost.materials + Math.floor(cost.materials * 0.15));
  expect(r.researchRuntime?.firstConstructionCrossing).toBe(0);
  expect(r.researchRuntime?.craftspeopleRefundedCrossing).toBeUndefined();
  expect(purchaseNomadicBuilding(r, 'archery-range')).toBe(true);
  expect(r.researchRuntime?.firstConstructionCrossing).toBe(0);
  expect(r.researchRuntime?.craftspeopleRefundedCrossing).toBe(0);
});
