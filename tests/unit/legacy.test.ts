import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import { createRun } from '../../src/game/state/run';
import { advanceSuccession, beginSuccession, damageKhan } from '../../src/game/state/khan';
import { advanceClan, beginMigration, buildStructure, damageClan } from '../../src/game/state/clan';
import { currentReaction, rememberClan } from '../../src/game/state/legacy';
import { clanMemories, khanRecords } from '../../src/ui/legacyContent';

describe('the clan’s lived history', () => {
  it('does not invent another casualty when damage reaches an already empty clan', () => {
    const run = createRun();
    run.phase = 'playing';
    run.clan.population = 1;
    damageClan(run, 40);
    expect(run.clan.population).toBe(0);
    const count = run.legacy.totalMemories;
    damageClan(run, 40);
    expect(run.legacy.totalMemories).toBe(count);
  });

  it('records actual Khan lifetimes, host victories, and inheritance exactly once', () => {
    const run = createRun();
    run.phase = 'playing';
    run.elapsed = 42;
    run.kills = 12;
    run.patrons.hearth.revives = 1;
    damageKhan(run, 1000);
    expect(run.legacy.khans[0]!.fallenAt).toBeUndefined();
    damageKhan(run, 1000);
    expect(beginSuccession(run)).toBe(false);
    expect(run.legacy.khans[0]).toMatchObject({ chosenAt: 0, fallenAt: 42, killsAtFall: 12 });
    run.phase = 'journal';
    const frozen = structuredClone(run.legacy);
    expect(advanceSuccession(run, 20)).toBe(false);
    expect(run.legacy).toEqual(frozen);
    run.phase = 'playing';
    run.elapsed = 52;
    run.kills = 16;
    advanceSuccession(run, 10);
    expect(run.legacy.khans[1]).toMatchObject({ generation: 2, chosenAt: 52, killsAtStart: 16 });
    expect(khanRecords(run)).toContain('00:42 in the saddle');
    expect(khanRecords(run)).toContain('12 banished by the host');
    expect(advanceSuccession(run, 10)).toBe(false);
    expect(run.legacy.khans).toHaveLength(2);
    expect(createRun().legacy.khans).toHaveLength(1);
  });

  it('remembers validated crafts, actual crossings, and losses without replaying rewards', () => {
    const run = createRun();
    run.phase = 'building';
    buildStructure(run, 'archery');
    buildStructure(run, 'archery');
    expect(run.legacy.memories).toHaveLength(1);
    expect(currentReaction(run)?.line?.speaker).toBe('boro');
    const quote = currentReaction(run)!.line!.text;
    run.elapsed = 10;
    damageClan(run, 40);
    expect(run.legacy.memories.at(-1)!.title).toBe('A place left empty');
    run.clan.stageTime = 45;
    run.phase = 'route';
    beginMigration(run, 'refuge');
    expect(run.story.crossings).toHaveLength(0);
    run.phase = 'playing';
    run.elapsed = 100;
    advanceClan(run, 100);
    expect(run.legacy.memories.at(-1)!.title).toBe('New households at the fire');
    expect(run.legacy.memories[0]!.line!.text).toBe(quote);
    const before = structuredClone(run);
    clanMemories(run);
    khanRecords(run);
    expect(run).toEqual(before);
  });

  it('uses a collective voice for remnants and keeps only facts when camp scenes are off', () => {
    const run = createRun();
    run.clan.population = 2;
    rememberClan(
      run,
      'A moment',
      'Two people remained.',
      { speaker: 'nara', text: 'Named voice.' },
      'Those who remain remember.',
    );
    expect(currentReaction(run)?.line).toEqual({
      speaker: 'clan',
      text: 'Those who remain remember.',
    });
    expect(clanMemories(run)).not.toContain('Nara');
    const time = run.elapsed;
    run.elapsed += GAME.story.reactionDuration;
    expect(currentReaction(run)).toBeUndefined();
    run.story.enabled = false;
    rememberClan(
      run,
      'Another moment',
      'A recorded fact.',
      { speaker: 'boro', text: 'Unspoken.' },
      'Remnant.',
    );
    expect(run.legacy.memories.at(-1)!.line).toBeUndefined();
    expect(run.elapsed).toBe(time + GAME.story.reactionDuration);
  });

  it('bounds memories and keeps completed expedition status when viewing the record', () => {
    const run = createRun();
    for (let i = 0; i < GAME.story.memoryLimit + 10; i++) {
      rememberClan(
        run,
        `Moment ${i}`,
        'Fact.',
        { speaker: 'saran', text: 'A thought.' },
        'Remnant.',
      );
    }
    expect(run.legacy.memories).toHaveLength(GAME.story.memoryLimit);
    expect(run.legacy.totalMemories).toBe(GAME.story.memoryLimit + 10);
    run.legacy.outcome = 'won';
    run.phase = 'story-log';
    expect(khanRecords(run)).toContain('Carried the banner to refuge');
  });
});

describe('companion reactions to lived history', () => {
  const choose = (run: ReturnType<typeof createRun>, id: string) =>
    run.story.records.push({
      encounter: { id: 'fire', act: 1, title: '', image: '', setting: '', lines: [], choices: [] },
      choice: {
        id,
        label: '',
        description: '',
        response: '',
        benefit: 'resolve',
        doctrine: 'iron',
      },
      status: 'chosen',
      elapsed: 0,
      population: 8,
    });

  it('lets the companion whose work a building serves react to it', () => {
    const run = createRun();
    run.phase = 'building';
    buildStructure(run, 'herd');
    expect(currentReaction(run)?.line?.speaker).toBe('boro');
  });

  it('voices a Khan’s fall through the clan’s choices and a successor through their trait', () => {
    const run = createRun();
    run.phase = 'playing';
    choose(run, 'share-watch');
    run.health = 0;
    beginSuccession(run);
    expect(currentReaction(run)?.line?.text).toContain('hold without any one rider');
    run.khan.candidate = 'outrider';
    run.elapsed = 20;
    advanceSuccession(run, GAME.khan.successionDelay);
    expect(currentReaction(run)?.line?.speaker).toBe('boro');
    expect(currentReaction(run)?.line?.text).toContain('outrider');
  });

  it('gives the tally’s keeper the words for a loss, and grief to repeated losses', () => {
    const run = createRun();
    choose(run, 'nara-tally');
    damageClan(run, 40);
    expect(currentReaction(run)?.line?.speaker).toBe('nara');
    run.story.peopleLost = 2;
    run.elapsed = 100;
    damageClan(run, 40);
    expect(currentReaction(run)?.line?.speaker).toBe('saran');
  });
});
