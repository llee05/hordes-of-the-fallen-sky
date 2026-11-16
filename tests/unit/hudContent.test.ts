import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import { createPrologueRun } from '../../src/game/state/prologue';
import { createRun } from '../../src/game/state/run';
import {
  abilityStatus,
  campPressureLine,
  commandVisibility,
  dashLabel,
  encounterLine,
  fieldObjectiveLine,
  lossReport,
  RECENT_LOSS_SECONDS,
  stageLabels,
} from '../../src/ui/hudContent';

describe('clan loss report', () => {
  it('shows nothing before anything is lost', () => {
    expect(lossReport(createRun())).toEqual({ recent: '', tally: '' });
  });
  it('keeps the fresh cause on the objective leaf and the tally in the clan details', () => {
    const run = createRun();
    run.elapsed = 100;
    run.safety.combatLosses = 2;
    run.safety.starvationLosses = 1;
    run.safety.lastDamage = { at: 95, cause: 'attack', amount: 3.25, people: 2 };
    expect(lossReport(run)).toEqual({
      recent: 'Enemy attacks: −3.3 resolve (2 people)',
      tally: 'Lost 2 to combat · 1 to hunger',
    });
    run.elapsed = 95 + RECENT_LOSS_SECONDS;
    expect(lossReport(run).recent).toBe('');
    expect(lossReport(run).tally).toBe('Lost 2 to combat · 1 to hunger');
  });
  it('omits the people count when only resolve was lost', () => {
    const run = createRun();
    run.safety.lastDamage = { at: 0, cause: 'starvation', amount: 1, people: 0 };
    expect(lossReport(run).recent).toBe('Starvation: −1.0 resolve');
  });
});

describe('camp pressure', () => {
  it('drops the idle sentinel and keeps real pressure', () => {
    expect(campPressureLine(undefined)).toBe('');
    expect(campPressureLine('Camp approaches clear')).toBe('');
    expect(campPressureLine('↑ Camp: 3 approaching')).toBe('↑ Camp: 3 approaching');
  });
});

describe('encounter line', () => {
  it('names the wave, the local approach while it matters, and the countdown', () => {
    const run = createRun();
    const line = encounterLine(run);
    expect(line.text).toMatch(/ · \d+s$/);
    expect(line.title).toContain('.');
  });
});

describe('field objective line', () => {
  const objective = () => ({
    id: 1,
    kind: 'supplies' as const,
    x: 0,
    y: 0,
    progress: 0,
    status: 'available' as const,
    guards: 3,
    defeated: 1,
  });
  it('is absent without an active objective or during the prologue', () => {
    expect(fieldObjectiveLine(createRun(), '↑ 100 paces')).toBeUndefined();
    const prologue = createPrologueRun();
    prologue.field.objective = objective();
    expect(fieldObjectiveLine(prologue, '↑ 100 paces')).toBeUndefined();
    const done = createRun();
    done.field.objective = { ...objective(), status: 'complete' };
    expect(fieldObjectiveLine(done, undefined)).toBeUndefined();
  });
  it('keeps the title and reward on screen and the instruction in the tooltip', () => {
    const run = createRun();
    run.field.objective = objective();
    expect(fieldObjectiveLine(run, '↑ 1039 paces')).toEqual({
      text: 'Optional ↑ 1039 paces: Scattered supplies · +18 food · +12 materials',
      title:
        'Scattered supplies. Clear the enemies off the cart, then stay close while it is gathered. +18 food · +12 materials',
    });
    run.field.objective = { ...objective(), kind: 'gathering', status: 'returning' };
    const line = fieldObjectiveLine(run, undefined)!;
    expect(line.text.startsWith('Optional: ')).toBe(true);
    expect(line.text).toContain(`Escort to camp · 1/${GAME.field.guards}`);
  });
});

describe('stage labels', () => {
  it('describes the prologue beat before a camp exists', () => {
    const labels = stageLabels(createPrologueRun(), '→ 371 paces');
    expect(labels).toMatchObject({
      location: 'I · ARRIVAL IN KARAKORUM',
      age: 'PROLOGUE',
      stage: 'ARRIVAL IN KARAKORUM',
      hint: 'Follow the brass marker.',
    });
    expect(labels.objective).toContain('→ 371 paces');
  });
  it('counts camp days and announces open roads', () => {
    const run = createRun();
    expect(stageLabels(run, undefined)).toMatchObject({
      age: 'DAY 1',
      stage: 'ENCAMPMENT',
      objective: 'Grow the camp. Keep your people alive.',
      hint: `Routes open in ${GAME.clan.minimumCamp}s. Build up the camp with B.`,
    });
    run.clan.stageTime = GAME.clan.minimumCamp + 30;
    expect(stageLabels(run, undefined)).toMatchObject({
      age: 'DAY 3',
      hint: 'The roads are open. Pack up with M.',
    });
  });
});

describe('ride and ability labels', () => {
  it('reports gallop readiness and succession', () => {
    expect(dashLabel(true, 1, 6)).toBe('SPACE / READY');
    expect(dashLabel(true, 0.5, 6)).toBe('RECHARGING 3.0s');
    expect(dashLabel(false, 1, 6)).toBe('CHOOSING A KHAN');
    expect(abilityStatus(0)).toBe('READY');
    expect(abilityStatus(2.46)).toBe('2.5s');
  });
});

describe('command visibility', () => {
  it('hides every camp command until the prologue establishes the camp', () => {
    const run = createPrologueRun();
    expect(commandVisibility(run, 3)).toEqual({
      dock: false,
      build: false,
      formation: false,
      migrate: false,
    });
    run.prologue!.campEstablished = true;
    expect(commandVisibility(run, 1)).toEqual({
      dock: true,
      build: true,
      formation: false,
      migrate: true,
    });
  });
  it('keeps only formations while the caravan is on the road', () => {
    const run = createRun();
    run.clan.stage = 'migration';
    expect(commandVisibility(run, 2)).toEqual({
      dock: true,
      build: false,
      formation: true,
      migrate: false,
    });
  });
});
