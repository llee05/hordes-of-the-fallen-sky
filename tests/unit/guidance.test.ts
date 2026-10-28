import { describe, expect, it } from 'vitest';
import { currentGuidance, completeGuidance, clanWarning } from '../../src/game/state/guidance';
import { gainExperience, applyUpgrade } from '../../src/game/state/run';
import { createLegacyCampRun as createRun } from '../support/legacyCamp';
import { buildStructure, beginMigration, advanceClan } from '../../src/game/state/clan';
import { UPGRADES } from '../../src/game/data/upgrades';

describe('first-crossing guidance', () => {
  it('follows actual purchases, collection, and research without consuming points on inspection', () => {
    const run = createRun();
    expect(currentGuidance(run)?.id).toBe('ride');
    completeGuidance(run, 'ride');
    completeGuidance(run, 'ride');
    expect(run.guidance.completed).toEqual(['ride']);
    expect(currentGuidance(run)?.id).toBe('build');
    run.phase = 'building';
    expect(buildStructure(run, 'sanctuary')).toBe(false);
    expect(currentGuidance(run)?.id).toBe('build');
    expect(buildStructure(run, 'archery')).toBe(true);
    expect(currentGuidance(run)?.id).toBe('shards');
    gainExperience(run, run.nextLevelXp);
    expect(currentGuidance(run)?.id).toBe('research');
    expect(run.pendingUpgrades).toBe(1);
    expect(
      applyUpgrade(
        run,
        UPGRADES.find((u) => u.id === 'power')!,
      ),
    ).toBe(true);
    expect(currentGuidance(run)?.id).toBe('formation');
    completeGuidance(run, 'formation');
    expect(currentGuidance(run)?.id).toBe('prepare');
    run.clan.stageTime = 45;
    expect(currentGuidance(run)?.id).toBe('depart');
    run.phase = 'route';
    expect(beginMigration(run, 'river')).toBe(true);
    expect(currentGuidance(run)?.id).toBe('crossing');
    run.phase = 'playing';
    expect(advanceClan(run, 100)).toBe('arrived');
    expect(currentGuidance(run)).toBeUndefined();
  });

  it('allows any order of actions, hiding tips, and an independent new expedition', () => {
    const run = createRun();
    gainExperience(run, 1);
    completeGuidance(run, 'ride');
    run.clan.buildings.herd = 1;
    completeGuidance(run, 'build');
    expect(currentGuidance(run)?.id).toBe('formation');
    run.clan.stageTime = 45;
    expect(currentGuidance(run)?.id).toBe('depart');
    run.guidance.enabled = false;
    expect(currentGuidance(run)).toBeUndefined();
    run.guidance.enabled = true;
    run.khan.successionRemaining = 10;
    expect(currentGuidance(run)?.id).toBe('succession');
    expect(createRun().guidance.completed).toEqual([]);
  });

  it('keeps danger actionable after tips are hidden and handles travel and the final stand', () => {
    const run = createRun();
    run.guidance.enabled = false;
    expect(clanWarning(run)).toBe('');
    run.clan.pasture = 20;
    expect(clanWarning(run)).toContain('Scout a route');
    run.clan.stage = 'final';
    expect(clanWarning(run)).toContain('passage opens');
    run.clan.food = 10;
    run.clan.stage = 'migration';
    expect(clanWarning(run)).toContain('on arrival');
    run.clan.integrity = 20;
    expect(clanWarning(run)).toContain('resolve is critical');
    run.clan.food = 0;
    expect(clanWarning(run)).toContain('Starvation');
  });
});
