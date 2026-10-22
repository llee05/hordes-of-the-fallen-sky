import { describe, expect, it } from 'vitest';
import { PATRONS } from '../../src/game/data/patrons';
import { UPGRADES } from '../../src/game/data/upgrades';
import { applyUpgrade, createRun, upgradeBlocker } from '../../src/game/state/run';
import { buildingCost, riderCount } from '../../src/game/state/clan';
import type { PatronId } from '../../src/game/types';

function master(patron: PatronId) {
  const run = createRun();
  run.pendingUpgrades = 10;
  const path = UPGRADES.filter((entry) => entry.patron === patron);
  for (const upgrade of path)
    for (let rank = 1; rank <= upgrade.maxStacks; rank++)
      expect(applyUpgrade(run, upgrade, rank)).toBe(true);
  expect(run.pendingUpgrades).toBe(5);
  return run;
}

describe('the eight patron trees', () => {
  it('registers the requested roster with unique IDs, complete requirements, and forty ranks', () => {
    expect(PATRONS.map((patron) => patron.name)).toEqual([
      'Börte Chino',
      'Etügen Eke',
      'Khükhedei Mergen',
      'Golomt',
      'Lus',
      'Ongod',
      'Sülde',
      'Guardian of Burkhan Khaldun',
    ]);
    expect(new Set(PATRONS.map((entry) => entry.id)).size).toBe(PATRONS.length);
    expect(new Set(UPGRADES.map((entry) => entry.id)).size).toBe(32);
    expect(UPGRADES.reduce((sum, entry) => sum + entry.maxStacks, 0)).toBe(40);
    for (const upgrade of UPGRADES) {
      expect(PATRONS.some((patron) => patron.id === upgrade.patron)).toBe(true);
      for (const requirement of upgrade.requires ?? []) {
        const parent = UPGRADES.find((entry) => entry.id === requirement.id)!;
        expect(parent).toBeDefined();
        expect(requirement.rank).toBeLessThanOrEqual(parent.maxStacks);
        expect(parent.patron).toBe(upgrade.patron);
      }
    }
  });

  it('gates both practices behind foundation rank two and each capstone behind both practices', () => {
    for (const patron of PATRONS) {
      const [foundation, left, right, capstone] = UPGRADES.filter(
        (entry) => entry.patron === patron.id,
      );
      const run = createRun();
      run.pendingUpgrades = 10;
      expect(applyUpgrade(run, left!)).toBe(false);
      applyUpgrade(run, foundation!, 1);
      expect(applyUpgrade(run, left!)).toBe(false);
      applyUpgrade(run, foundation!, 2);
      expect(applyUpgrade(run, left!)).toBe(true);
      expect(applyUpgrade(run, capstone!)).toBe(false);
      expect(upgradeBlocker(run, capstone!)).toContain(right!.title);
      expect(applyUpgrade(run, right!)).toBe(true);
      expect(applyUpgrade(run, capstone!)).toBe(true);
      expect(applyUpgrade(run, capstone!)).toBe(false);
      expect(run.pendingUpgrades).toBe(5);
    }
  });

  it('makes every playstyle mechanically distinct and allows mixing independent patrons', () => {
    const wolf = master('borte-chino');
    expect(wolf.patrons.hunt.movingDamage).toBeCloseTo(1.3225);
    expect(wolf.patrons.hunt.killHeal).toBe(2);
    expect(wolf.patrons.hearth.revives).toBe(0);
    const earth = master('etugen-eke');
    expect(earth.patrons.land.food).toBeCloseTo(1.3225);
    expect(earth.patrons.land.consumption).toBe(0.8);
    const archer = master('khukhedei-mergen');
    expect(archer.stats.damage).toBe(25);
    expect(archer.patrons.bow).toEqual({ range: 60, pierce: 1 });
    expect(archer.stats.projectiles).toBe(3);
    const fire = master('golomt');
    expect(fire.stats.maxHealth).toBe(140);
    expect(fire.patrons.hearth.revives).toBe(1);
    const water = master('lus');
    expect(water.patrons.water).toMatchObject({
      slow: 0.24,
      radius: 230,
      hazardDamage: 0.5,
      warning: 1,
      pulseDamage: 0.75,
    });
    const ancestors = master('ongod');
    expect(ancestors.patrons.ancestors.count).toBe(3);
    expect(ancestors.patrons.ancestors.damage).toBeCloseTo(0.9);
    expect(ancestors.patrons.ancestors.interval).toBeCloseTo(0.77);
    const banner = master('sulde');
    expect(riderCount(banner)).toBe(5);
    expect(banner.patrons.banner.mobility).toBe(1.15);
    const guardian = master('burkhan-guardian');
    expect(buildingCost(guardian, 'archery').materials).toBe(20);
    expect(guardian.patrons.guardian.wardDamage).toBe(0.65);
    const root = UPGRADES.find((entry) => entry.id === 'wolf-trail')!;
    expect(applyUpgrade(guardian, root)).toBe(true);
    expect(guardian.patrons.hunt.movingDamage).toBe(1.15);
    expect(guardian.patrons.guardian.cost).toBeCloseTo(0.81);
  });
});
