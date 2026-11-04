import { describe, expect, it } from 'vitest';
import { buildStructure, clanDamageMultiplier } from '../../src/game/state/clan';
import { campStatPreview } from '../../src/game/state/progressionPreview';
import { createLegacyCampRun as createRun } from '../support/legacyCamp';
describe('exact progression previews', () => {
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
