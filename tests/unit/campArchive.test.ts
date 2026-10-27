import { describe, expect, it } from 'vitest';
import { defaultProfile, isProfile, normalizeProfile } from '../../src/shared/profile';
import { isCampArchive } from '../../src/shared/campArchive';
import { createRun } from '../../src/game/state/run';
import { captureCampArchive, runFromCampArchive } from '../../src/game/state/campArchive';
import { purchaseNomadicBuilding } from '../../src/game/state/nomadicCamp';
import { createLegacyCampRun } from '../support/legacyCamp';

describe('durable portable camp records', () => {
  it('rebuilds permanent and optional ranks once without regranting supplies', () => {
    const run = createRun();
    run.phase = 'building';
    run.clan.materials = 1000;
    run.clan.spirit = 200;
    purchaseNomadicBuilding(run, 'khans-ger');
    purchaseNomadicBuilding(run, 'healers-ger', 2);
    purchaseNomadicBuilding(run, 'healers-ger', 2);
    const saved = captureCampArchive(run),
      fresh = runFromCampArchive(JSON.parse(JSON.stringify(saved)))!;
    expect(fresh.clan.nomadicCamp).toEqual(run.clan.nomadicCamp);
    expect(fresh.clan.campEffects).toEqual(run.clan.campEffects);
    expect(fresh.stats).toEqual(run.stats);
    expect(fresh.clan.food).toBe(run.clan.food);
    expect(fresh.clan.population).toBe(run.clan.population);
    expect(fresh.patrons.ancestors.spiritGain).toBe(1);
    expect(fresh.elapsed).toBe(0);
    expect(runFromCampArchive(saved)).toEqual(fresh);
    saved.nomadicCamp!.core['khans-ger'] = 3;
    expect(fresh.clan.nomadicCamp!.core['khans-ger']).toBe(2);
  });
  it('keeps existing profiles compatible and rejects malformed persistence payloads', () => {
    expect(normalizeProfile(defaultProfile())).toEqual(defaultProfile());
    const camp = captureCampArchive(createRun());
    const profile = { ...defaultProfile(), camp };
    expect(isCampArchive(camp)).toBe(true);
    expect(isProfile(profile)).toBe(true);
    expect(normalizeProfile(profile)).toEqual(profile);
    for (const broken of [
      { ...camp, tier: 6 },
      { ...camp, supplies: { ...camp.supplies, food: Infinity } },
      { ...camp, internals: { 'ancestral-hearth': 3 } },
      { ...camp, paths: { ger: ['a', 'a'] } },
    ]) {
      expect(isCampArchive(broken)).toBe(false);
      expect(runFromCampArchive(broken)).toBeUndefined();
      expect(isProfile({ ...profile, camp: broken })).toBe(false);
      expect(normalizeProfile({ ...profile, camp: broken })).toEqual(defaultProfile());
    }
  });
  it('retains known legacy craft IDs, ignores removed content, and never imports contradictory choices', () => {
    const saved = captureCampArchive(createLegacyCampRun());
    saved.buildings.push('archery', 'removed-facility');
    saved.paths.archery = ['fire-arrows', 'veteran-riders', 'arban-drills', 'removed-craft'];
    const restored = runFromCampArchive(saved)!;
    expect(restored.clan.nomadicCamp!.slots.filter(Boolean)).toEqual([
      { id: 'archery-range', level: 1 },
    ]);
    expect(restored.clan.paths.archery ?? []).not.toContain('fire-arrows');
    expect(restored.clan.materials).toBe(saved.supplies.materials + 36);
    expect(restored.clan.estate).toBeUndefined();
  });
});
