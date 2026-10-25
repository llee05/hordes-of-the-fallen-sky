import { describe, expect, it } from 'vitest';
import { defaultProfile, isProfile, normalizeProfile } from '../../src/shared/profile';
import { isCampArchive } from '../../src/shared/campArchive';
import { createRun } from '../../src/game/state/run';
import { captureCampArchive, runFromCampArchive } from '../../src/game/state/campArchive';
import { buildStructure } from '../../src/game/state/clan';
import { purchaseEstate } from '../../src/game/state/campEstate';

describe('durable portable camp records', () => {
  it('rebuilds levels, plots, branches, internal ranks, and their effects exactly once', () => {
    const run = createRun();
    run.phase = 'building';
    run.clan.materials = 1000;
    run.clan.spirit = 200;
    purchaseEstate(run, 'encampment', 'encampment-2', 2);
    buildStructure(run, 'ger', 'level-2');
    purchaseEstate(run, 'encampment', 'encampment-3', 3);
    buildStructure(run, 'herd', undefined, 2);
    buildStructure(run, 'herd', 'winter-stores');
    purchaseEstate(run, 'internal', 'ancestral-hearth', 1);
    const saved = captureCampArchive(run),
      fresh = runFromCampArchive(JSON.parse(JSON.stringify(saved)))!;
    expect(fresh.clan.estate).toEqual(run.clan.estate);
    expect(fresh.clan.paths).toEqual(run.clan.paths);
    expect(fresh.clan.campEffects).toEqual(run.clan.campEffects);
    expect(fresh.clan.food).toBe(run.clan.food);
    expect(fresh.clan.population).toBe(run.clan.population);
    expect(fresh.patrons.ancestors.spiritGain).toBe(1);
    expect(fresh.elapsed).toBe(0);
    expect(runFromCampArchive(saved)).toEqual(fresh);
    saved.paths.ger!.push('made-up-craft');
    expect(fresh.clan.paths.ger).not.toContain('made-up-craft');
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
    const saved = captureCampArchive(createRun());
    saved.buildings.push('archery', 'removed-facility');
    saved.paths.archery = ['fire-arrows', 'veteran-riders', 'arban-drills', 'removed-craft'];
    const restored = runFromCampArchive(saved)!;
    expect(restored.clan.paths.archery).toEqual(['fire-arrows']);
    expect(restored.clan.estate?.slots).toContain('archery');
    expect(restored.clan.estate?.slots).not.toContain('removed-facility');
  });
});
