import { volleyFactors } from '../../src/game/state/volley';
import { researchGallop } from '../../src/game/state/researchRuntime';
import { describe, expect, it } from 'vitest';
import {
  createRun as createNomadicRun,
  applyUpgrade,
  applyResearch,
  upgradeCost,
} from '../../src/game/state/run';
import { createLegacyCampRun as createRun } from '../support/legacyCamp';
import { UPGRADES } from '../../src/game/data/upgrades';
import {
  researchPreview,
  researchPreviewById,
  campStatPreview,
} from '../../src/game/state/progressionPreview';
import { buildStructure, clanDamageMultiplier } from '../../src/game/state/clan';
const upgrade = (id: string) => UPGRADES.find((u) => u.id === id)!;
describe('exact progression previews', () => {
  it.each([false, true])('matches firing factors during Barrage with Tempest=%s', (tempest) => {
    const run = createNomadicRun();
    run.pendingUpgrades = 20;
    for (const id of [
      'power',
      'power',
      'wide-quiver',
      'wolf-trail',
      'wolf-trail',
      'haste',
      'hy-galloping-barrage',
    ])
      expect(applyResearch(run, id)).toBe(true);
    if (tempest) {
      run.clan.paths.archery = ['fire-arrows'];
      run.clan.paths.sanctuary = ['wind-shamans'];
    }
    run.phase = 'playing';
    run.stats.damage = 20;
    run.stats.projectiles = 2;
    run.clan.formation = 'encircle';
    run.clan.momentum = 0.8;
    researchGallop(run);
    const before = structuredClone(run);
    const preview = researchPreviewById(run, 'km-feathered-fan');
    expect(run).toEqual(before);
    const spacing = (tempest ? 0.28 : 0.12) * run.patrons.bow.spread;
    const format = (n: number) => Number(n.toFixed(3)).toString();
    expect(preview.find((c) => c.label === 'Khan wide-volley damage')).toMatchObject({
      before: format(20 * 1.1 * 1.3),
      after: format(20 * 1.1 * 1.3 * 0.95),
    });
    expect(preview.find((c) => c.label === 'Khan wide-volley spacing')).toMatchObject({
      before: format((spacing * 180) / Math.PI) + '°',
      after: format((spacing * 1.1 * 180) / Math.PI) + '°',
    });
    expect(applyResearch(run, 'km-feathered-fan')).toBe(true);
    expect(volleyFactors(run, 2, true)).toMatchObject({
      count: tempest ? 4 : 2,
      spacing: spacing * 1.1,
      damage: 0.95 * 1.1 * 1.3,
      speed: 1.2,
    });
    expect(volleyFactors(run, 2, false).damage).toBe(1.3);
    expect(volleyFactors(run, 1, true).damage).toBeCloseTo(1.1 * 1.3);
    expect(volleyFactors(run, 2, false, true).spacing).toBe(tempest ? 0.28 : 0.12);
    run.elapsed = 2.01;
    expect(volleyFactors(run, 2, true).damage).toBeCloseTo(0.95 * 1.3);
    expect(volleyFactors(run, 2, true).speed).toBe(1);
  });

  it('projects the actual next rank without spending points or mutating any nested state', () => {
    const run = createRun();
    run.stats.damage = 20;
    const before = structuredClone(run),
      changes = researchPreview(run, upgrade('power'));
    expect(changes.find((c) => c.label === 'Shared attack damage')).toMatchObject({
      before: '20',
      after: '25',
    });
    expect(run).toEqual(before);
    run.upgrades['wolf-trail'] = 2;
    run.clan.campEffects.multipliers.gallopCooldown = 0.9;
    const gallop = researchPreview(run, upgrade('pursuit-gallop')).find(
      (c) => c.label === 'Gallop cooldown',
    );
    expect(gallop).toMatchObject({ before: '2.7s', after: '2.025s' });
  });
  it('uses combined current protection and respects worker and prerequisite gates', () => {
    const run = createRun();
    delete run.clan.estate; // Legacy craft-price and effect contract.
    run.phase = 'building';
    run.clan.materials = 1000;
    run.patrons.guardian.protection = 0.81;
    expect(buildStructure(run, 'wagon')).toBe(true);
    expect(clanDamageMultiplier(run)).toBeCloseTo(0.567);
    const before = structuredClone(run),
      changes = campStatPreview(run, 'wagon', 'felt-armor');
    expect(changes.find((c) => c.label === 'Clan damage reduction')).toMatchObject({
      before: '43.3%',
      after: '71.65%',
    });
    expect(run).toEqual(before);
    expect(campStatPreview(run, 'archery', 'resin-preparation')).toEqual([]);
  });
  it('preserves succession and handles wide-volley tradeoffs and capstone costs', () => {
    const run = createRun();
    run.pendingUpgrades = 10;
    run.khan.successionRemaining = 5;
    run.health = 0;
    expect(
      researchPreview(run, upgrade('vitality')).some((c) => c.label === 'Khan health now'),
    ).toBe(false);
    expect(applyUpgrade(run, upgrade('vitality'))).toBe(true);
    expect(run.health).toBe(0);
    run.upgrades.power = 2;
    const changes = researchPreview(run, upgrade('wide-quiver'));
    expect(changes.find((c) => c.label === 'Shared attack damage')?.improves).toBe(false);
    expect(changes.find((c) => c.label === 'Khan arrows per volley')).toMatchObject({
      before: '1',
      after: '2',
    });
    expect(upgradeCost(upgrade('sky-volley'))).toBe(2);
  });
});
