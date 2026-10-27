import { RESEARCH } from '../../src/game/data/research';
import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import { UPGRADES } from '../../src/game/data/upgrades';
import { advanceClan, beginMigration } from '../../src/game/state/clan';
import {
  advanceSuccession,
  beginSuccession,
  damageKhan,
  isKhanActive,
} from '../../src/game/state/khan';
import { advancePatrons, rewardPatronKill } from '../../src/game/state/patrons';
import { applyUpgrade, createRun, redeemMasteredResearch } from '../../src/game/state/run';
import type { RunPhase } from '../../src/game/types';

function expedition() {
  const run = createRun();
  run.phase = 'playing';
  return run;
}

describe('choosing a new Khan', () => {
  it('starts an independent succession after a lethal hit and never restarts it on repeated hits', () => {
    const run = expedition();
    run.clan.momentum = 1;
    expect(damageKhan(run, 1000)).toBe('fallen');
    expect(run.phase).toBe('playing');
    expect(run.health).toBe(0);
    expect(run.khan).toEqual({ generation: 1, successionRemaining: GAME.khan.successionDelay });
    expect(run.clan.momentum).toBe(0);
    expect(isKhanActive(run)).toBe(false);
    advanceSuccession(run, 3);
    expect(damageKhan(run, 10)).toBeUndefined();
    expect(beginSuccession(run)).toBe(false);
    expect(run.khan.successionRemaining).toBe(7);
    expect(createRun().khan).toEqual({ generation: 1, successionRemaining: 0 });
  });

  it('chooses exactly one full-health successor after ten active seconds, inheriting the expedition', () => {
    const run = expedition();
    run.stats.maxHealth = 140;
    run.stats.damage = 25;
    run.pendingUpgrades = 3;
    run.upgrades.power = 2;
    run.clan.paths.ger = ['hearthkeepers'];
    run.patrons.banner.riders = 4;
    const clan = structuredClone(run.clan);
    const learned = structuredClone(run.upgrades);
    damageKhan(run, 1000);
    expect(advanceSuccession(run, 9.5)).toBe(false);
    expect(run.health).toBe(0);
    expect(advanceSuccession(run, 0.5)).toBe(true);
    expect(run.khan).toEqual({ generation: 2, successionRemaining: 0 });
    expect(run.health).toBe(140);
    expect(run.stats.damage).toBe(25);
    expect(run.upgrades).toEqual(learned);
    expect(run.pendingUpgrades).toBe(3);
    expect(run.clan.paths).toEqual(clan.paths);
    expect(run.clan.population).toBe(clan.population);
    expect(run.patrons.banner.riders).toBe(4);
    expect(advanceSuccession(run, 100)).toBe(false);
    expect(run.khan.generation).toBe(2);
  });

  it('freezes succession in every menu and ending and rejects invalid time', () => {
    const phases: RunPhase[] = [
      'ready',
      'intro',
      'story',
      'epilogue',
      'story-log',
      'paused',
      'upgrade',
      'building',
      'route',
      'journal',
      'settings',
      'help',
      'dead',
      'won',
    ];
    for (const phase of phases) {
      const run = expedition();
      damageKhan(run, 1000);
      run.phase = phase;
      const before = structuredClone(run);
      expect(advanceSuccession(run, 100)).toBe(false);
      expect(run).toEqual(before);
    }
    const run = expedition();
    damageKhan(run, 1000);
    for (const dt of [0, -1, Infinity, NaN]) expect(advanceSuccession(run, dt)).toBe(false);
    expect(run.khan.successionRemaining).toBe(10);
  });

  it('keeps Last Ember with the same Khan and does not refresh its charge for successors', () => {
    const run = expedition();
    run.patrons.hearth.revives = 1;
    expect(damageKhan(run, 1000)).toBe('revived');
    expect(run.health).toBe(40);
    expect(run.khan).toEqual({ generation: 1, successionRemaining: 0 });
    expect(damageKhan(run, 1000)).toBe('fallen');
    advanceSuccession(run, 10);
    expect(run.patrons.hearth.revives).toBe(0);
    expect(run.khan.generation).toBe(2);
    expect(damageKhan(run, 1000)).toBe('fallen');
    expect(run.khan.successionRemaining).toBe(10);
  });

  it('does not resurrect a fallen Khan through regeneration, hunt rewards, or healing research', () => {
    const run = expedition();
    run.patrons.hearth.regeneration = 100;
    run.patrons.hunt.killHeal = 100;
    run.patrons.banner.resolveOnKill = 0.15;
    damageKhan(run, 1000);
    run.clan.momentum = 1;
    run.clan.integrity = 50;
    advancePatrons(run, 100);
    rewardPatronKill(run);
    expect(run.health).toBe(0);
    expect(run.clan.integrity).toBe(50.15);
    run.phase = 'upgrade';
    run.pendingUpgrades = 2;
    expect(
      applyUpgrade(
        run,
        UPGRADES.find((upgrade) => upgrade.id === 'vitality')!,
      ),
    ).toBe(true);
    expect(run.stats.maxHealth).toBe(120);
    expect(run.health).toBe(0);
    for (const upgrade of RESEARCH.filter((t) => !t.unavailableReason))
      run.upgrades[upgrade.id] = upgrade.maxRank;
    expect(redeemMasteredResearch(run)).toBe(true);
    expect(run.health).toBe(0);
    run.phase = 'playing';
    advanceSuccession(run, 10);
    expect(run.health).toBe(120);
  });

  it('keeps the countdown and zero health through a crossing arrival despite recovery bonuses', () => {
    const run = expedition();
    damageKhan(run, 1000);
    run.clan.campEffects.bonuses.arrivalHealth = 100;
    run.clan.stageTime = 45;
    run.phase = 'route';
    beginMigration(run, 'river');
    run.phase = 'playing';
    expect(advanceClan(run, 100)).toBe('arrived');
    expect(run.health).toBe(0);
    expect(run.khan.successionRemaining).toBe(10);
    expect(run.clan.region).toBe(1);
    advanceSuccession(run, 10);
    expect(run.health).toBe(100);
  });

  it('cannot choose a successor after the clan is lost and allows the clan to win during succession', () => {
    for (const loss of ['population', 'integrity'] as const) {
      const run = expedition();
      damageKhan(run, 1000);
      run.clan[loss] = 0;
      expect(advanceSuccession(run, 100)).toBe(false);
      expect(run.health).toBe(0);
      expect(advanceClan(run, 0.05)).toBe('lost');
    }
    const saved = expedition();
    damageKhan(saved, 1000);
    saved.clan.stage = 'final';
    saved.clan.stageTime = 180;
    expect(advanceClan(saved, 0.05)).toBe('saved');
    expect(saved.health).toBe(0);
  });
});
