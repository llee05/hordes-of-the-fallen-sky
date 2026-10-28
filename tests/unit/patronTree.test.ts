import { RESEARCH } from '../../src/game/data/research';
import { applyResearch } from '../../src/game/state/run';
import { describe, expect, it } from 'vitest';
import { PATRONS } from '../../src/game/data/patrons';
import { UPGRADES } from '../../src/game/data/upgrades';
import {
  applyUpgrade,
  createRun,
  upgradeBlocker,
  upgradeExcluded,
  upgradeCost,
  redeemMasteredResearch,
} from '../../src/game/state/run';
import { buildingCost, riderCount } from '../../src/game/state/clan';
import type { PatronId } from '../../src/game/types';

function master(patron: PatronId) {
  const run = createRun();
  run.pendingUpgrades = 10;
  const path = UPGRADES.filter((entry) => entry.patron === patron);
  for (const upgrade of path.filter((u) => u.kind !== 'capstone'))
    for (let rank = 1; rank <= upgrade.maxStacks; rank++)
      expect(applyUpgrade(run, upgrade, rank)).toBe(true);
  expect(applyUpgrade(run, path[3]!)).toBe(true);
  expect(
    path
      .filter((u) => u.kind === 'capstone' && u.id !== path[3]!.id)
      .every((u) => upgradeExcluded(run, u)),
  ).toBe(true);
  return run;
}

describe('the eight patron trees', () => {
  it('registers the requested roster with unique IDs, complete requirements, and specialization alternatives', () => {
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
    expect(new Set(UPGRADES.map((entry) => entry.id)).size).toBe(42);
    expect(UPGRADES.reduce((sum, entry) => sum + entry.maxStacks, 0)).toBe(50);
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

  it('unlocks practices early and buys a focused capstone for five points without its sibling practice', () => {
    for (const patron of PATRONS) {
      const path = UPGRADES.filter((u) => u.patron === patron.id),
        foundation = path[0]!,
        cap = path[3]!;
      const practice = path.find(
        (u) => u.id === cap.requires!.find((r) => r.id !== foundation.id)!.id,
      )!;
      const run = createRun();
      run.pendingUpgrades = 5;
      expect(applyUpgrade(run, practice)).toBe(false);
      expect(applyUpgrade(run, foundation, 1)).toBe(true);
      expect(applyUpgrade(run, practice)).toBe(true);
      expect(upgradeBlocker(run, cap)).toContain(foundation.title);
      expect(applyUpgrade(run, foundation, 2)).toBe(true);
      expect(upgradeCost(cap)).toBe(2);
      expect(applyUpgrade(run, cap)).toBe(true);
      expect(run.pendingUpgrades).toBe(0);
      for (const other of path.filter((u) => u.kind === 'practice' && u !== practice))
        expect(run.upgrades[other.id]).toBeUndefined();
      const snapshot = structuredClone(run);
      run.pendingUpgrades = 4;
      const alternative = path.find((u) => u.kind === 'capstone' && u !== cap)!;
      expect(applyUpgrade(run, alternative)).toBe(false);
      expect(run.pendingUpgrades).toBe(4);
      expect(run.patrons).toEqual(snapshot.patrons);
    }
  });
  it('redeems mastery after every reachable choice, preserving the cost of unchosen specializations', () => {
    const run = createRun();
    run.pendingUpgrades = 100;
    for (const patron of PATRONS) {
      const path = UPGRADES.filter((u) => u.patron === patron.id);
      for (const u of path.filter((u) => u.kind !== 'capstone'))
        for (let i = 1; i <= u.maxStacks; i++) expect(applyUpgrade(run, u, i)).toBe(true);
      expect(applyUpgrade(run, path[3]!)).toBe(true);
    }
    expect(run.pendingUpgrades).toBe(51);
    expect(redeemMasteredResearch(run)).toBe(false);
    for (const t of RESEARCH.filter(
      (t) => !t.unavailableReason && !UPGRADES.some((u) => u.id === t.id),
    ))
      applyResearch(run, t.id);
    expect(run.pendingUpgrades).toBeLessThan(51);
    expect(redeemMasteredResearch(run)).toBe(true);
    expect(run.pendingUpgrades).toBe(0);
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
    expect(archer.stats.damage).toBe(22.5);
    expect(archer.patrons.bow).toEqual({ range: 60, pierce: 1, spread: 1.62 });
    expect(archer.stats.projectiles).toBe(4);
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
