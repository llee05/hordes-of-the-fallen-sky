import { describe, expect, it } from 'vitest';
import { PROLOGUE_STAGE_IDS, type PrologueCompletionRule } from '../../src/game/data/prologue';
import { captureExpedition, decodeExpedition } from '../../src/game/state/expeditionArchive';
import {
  advancePrologue,
  createPrologueRun,
  prologueRuleSatisfied,
  setPrologueStage,
  skipPrologue,
} from '../../src/game/state/prologue';
import { createRun } from '../../src/game/state/run';
import { world } from './fixtures/expedition';

describe('Karakorum prologue state', () => {
  it('keeps normal runs unchanged and creates an isolated Karakorum prologue run', () => {
    const normal = createRun();
    expect(normal.prologue).toBeUndefined();
    expect(normal.clan.locationId).toBe('otgontenger');

    const run = createPrologueRun();
    expect(run.prologue).toMatchObject({
      stage: 'arrival',
      beat: 0,
      campEstablished: false,
      routesOpened: false,
      completed: false,
    });
    expect(run.clan.locationId).toBe('karakorum');
    expect(run.legacy.khans[0]!.locationId).toBe('karakorum');
    expect(createRun()).toEqual(normal);
  });

  it('plays Arrival, passes through unfinished stages, and establishes the temporary camp', () => {
    const run = createPrologueRun();
    run.phase = 'playing';
    let distance = 0;
    const siteDistance = () => distance;

    expect(advancePrologue(run, 0.1, siteDistance)).toContainEqual({
      type: 'beat',
      completedBeat: 'arrival-gate',
      beat: expect.objectContaining({ id: 'arrival-report' }),
    });
    distance = 200;
    advancePrologue(run, 1, siteDistance);
    expect(run.prologue!.holdTime).toBe(0);
    distance = 0;
    advancePrologue(run, 1, siteDistance);
    expect(run.prologue!.beat).toBe(1);
    advancePrologue(run, 0.5, siteDistance);
    expect(run.prologue!.beat).toBe(2);

    const transition = advancePrologue(run, 0.1, siteDistance);
    expect(
      transition.filter((event) => event.type === 'stage').map((event) => event.stage),
    ).toEqual(['training', 'patrol', 'omen', 'beast', 'return']);
    expect(run.prologue).toMatchObject({ stage: 'return', beat: 0, completed: false });

    const completion = advancePrologue(run, 0.1, siteDistance);
    expect(completion.map((event) => event.type)).toEqual(['beat', 'camp-established', 'complete']);
    expect(run.prologue).toMatchObject({
      stage: 'return',
      campEstablished: true,
      routesOpened: true,
      completed: true,
    });
    expect(run.clan).toMatchObject({ food: 70, materials: 50 });
  });

  it('evaluates every planned completion-rule kind without renderer state', () => {
    const run = createPrologueRun();
    const state = run.prologue!;
    Object.assign(state.counters, {
      lightReleases: 5,
      heavyReleases: 2,
      objectivesCompleted: 1,
      wavesCleared: 3,
      beastDefeated: true,
      buildingsPurchased: 1,
    });
    state.counters.abilityUses.e = 1;
    Object.assign(state, { holdTime: 2, campEstablished: true, routesOpened: true });
    run.combat.gallopSerial = 1;
    run.level = 3;
    const rules: PrologueCompletionRule[] = [
      { kind: 'reach-site', site: 'gate', radius: 100 },
      { kind: 'hold-site', site: 'gate', radius: 100, seconds: 1.5 },
      { kind: 'light-releases', count: 5 },
      { kind: 'heavy-releases', count: 2 },
      { kind: 'ability-used', slot: 'e' },
      { kind: 'galloped' },
      { kind: 'objective-complete' },
      { kind: 'wave-cleared', wave: 3 },
      { kind: 'level', level: 3 },
      { kind: 'beast-defeated' },
      { kind: 'camp-established' },
      { kind: 'building-purchased' },
      { kind: 'routes-opened' },
    ];
    for (const rule of rules) expect(prologueRuleSatisfied(run, rule, () => 50)).toBe(true);
  });

  it('creates every checkpoint and skip reaches the same established endpoint', () => {
    for (const stage of PROLOGUE_STAGE_IDS) {
      const run = createPrologueRun();
      expect(setPrologueStage(run, stage)).toBe(true);
      expect(run.prologue).toMatchObject({ stage, beat: 0, completed: false });
    }
    const run = createPrologueRun();
    expect(skipPrologue(run)).toBe(true);
    expect(skipPrologue(run)).toBe(false);
    expect(run.prologue).toMatchObject({
      stage: 'return',
      campEstablished: true,
      routesOpened: true,
      completed: true,
    });
  });

  it('round-trips a mid-prologue beat and still accepts a save without prologue state', () => {
    const run = createPrologueRun();
    run.phase = 'playing';
    advancePrologue(run, 0.1, () => 0);
    advancePrologue(run, 0.75, () => 0);
    const restored = decodeExpedition(captureExpedition(run, world())).run;
    expect(restored.prologue).toEqual(run.prologue);
    expect(restored.phase).toBe('paused');

    const normal = createRun();
    const normalRestored = decodeExpedition(captureExpedition(normal, world())).run;
    expect(normalRestored.prologue).toBeUndefined();
  });
});
