import { expect, it } from 'vitest';
import { createRun, gainExperience, applyUpgrade } from '../../src/game/state/run';
import {
  markExpedition,
  observeExpedition,
  metricStage,
} from '../../src/game/state/expeditionMetrics';
import { damageClan, advanceClan, beginMigration, buildStructure } from '../../src/game/state/clan';
import { UPGRADES } from '../../src/game/data/upgrades';

it('records first active-time milestones once, casualties by cause, and valid purchases only', () => {
  const run = createRun();
  metricStage(run);
  run.elapsed = 8;
  markExpedition(run, 'fight');
  run.elapsed = 11;
  markExpedition(run, 'fight');
  run.elapsed = 20;
  gainExperience(run, 8);
  applyUpgrade(
    run,
    UPGRADES.find((u) => !u.requires?.length && !u.exclusiveGroup)!,
  );
  run.phase = 'building';
  expect(buildStructure(run, 'archery')).toBe(true);
  run.elapsed = 25;
  damageClan(run, 30);
  const s = metricStage(run);
  expect(s.marks).toMatchObject({
    fight: 8,
    knowledge: 20,
    research: 20,
    construction: 20,
    'camp-damage': 25,
    casualty: 25,
  });
  expect(s.casualties).toBe(1);
  expect(s.damage).toBeCloseTo(21);
  const before = structuredClone(run.metrics);
  observeExpedition(run, 10, true, true);
  expect(run.metrics).toEqual(before);
  run.phase = 'playing';
  observeExpedition(run, 2, true, false);
  expect(s.riding).toBe(2);
  run.clan.stageTime = 45;
  run.phase = 'route';
  run.elapsed = 45;
  beginMigration(run, 'river');
  expect(s.marks.departure).toBe(45);
  run.phase = 'playing';
  observeExpedition(run, 1, false, true);
  expect(run.metrics?.stages).toHaveLength(2);
  expect(metricStage(run).travelling).toBe(1);
});
it('counts starvation and low-resolve losses once each and leaves older observations unknown', () => {
  const run = createRun();
  delete run.metrics;
  run.elapsed = 100;
  run.phase = 'playing';
  run.clan.food = 0;
  run.clan.pasture = 0;
  run.clan.stageTime = 11.9;
  run.clan.integrity = 81;
  advanceClan(run, 0.2);
  expect(metricStage(run).startedAt).toBe(100);
  expect(metricStage(run).marks.fight).toBeUndefined();
  expect(metricStage(run).casualties).toBe(2);
});
