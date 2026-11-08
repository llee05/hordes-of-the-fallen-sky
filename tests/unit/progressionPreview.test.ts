import { describe, expect, it } from 'vitest';
import { CHARACTER_CLASSES } from '../../src/shared/characterProfile';
import { buildStructure, clanDamageMultiplier } from '../../src/game/state/clan';
import { campStatPreview } from '../../src/game/state/progressionPreview';
import { createLegacyCampRun as createRun } from '../support/legacyCamp';
describe('exact progression previews', () => {
  it.each(CHARACTER_CLASSES)(
    '%s previews its spacing when unlocking Burning Tempest',
    (classId) => {
      const run = createRun();
      delete run.clan.estate;
      run.character!.classId = classId;
      run.stats.projectiles = 3;
      run.phase = 'building';
      run.clan.materials = 1000;
      run.clan.spirit = 1000;
      run.clan.buildings.archery = 1;
      run.clan.buildings.sanctuary = 1;
      run.clan.paths.archery = ['fire-arrows'];
      const changes = campStatPreview(run, 'sanctuary', 'wind-shamans');
      expect(changes.find((c) => c.label === 'Khan arrows per volley')).toMatchObject({
        before: '3',
        after: '5',
      });
      const spacing = changes.find((c) => c.label === 'Khan wide-volley spacing');
      if (classId === 'mounted-archer') {
        expect(spacing).toMatchObject({ before: '6.875°', after: '16.043°' });
      } else {
        expect(spacing).toBeUndefined();
      }
    },
  );

  it('uses combined current protection and respects worker and prerequisite gates', () => {
    const run = createRun();
    delete run.clan.estate; // Legacy craft-price and effect contract.
    run.phase = 'building';
    run.clan.materials = 1000;
    expect(buildStructure(run, 'wagon')).toBe(true);
    expect(clanDamageMultiplier(run)).toBeCloseTo(0.7);
    const before = structuredClone(run),
      changes = campStatPreview(run, 'wagon', 'felt-armor');
    expect(changes.find((c) => c.label === 'Clan damage reduction')).toMatchObject({
      before: '30%',
      after: '65%',
    });
    expect(run).toEqual(before);
    expect(campStatPreview(run, 'archery', 'resin-preparation')).toEqual([]);
  });
});
