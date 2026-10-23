import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import { epilogueText, STORY_ORDER } from '../../src/game/data/story';
import { storyEncounter } from '../../src/game/data/story';
import { advanceClan, beginMigration, damageClan } from '../../src/game/state/clan';
import { createRun } from '../../src/game/state/run';
import { openNextStory, resolveStory } from '../../src/game/state/story';

describe('the two-act expedition', () => {
  it('uses a remnant account when too few survivors remain for the named cast', () => {
    const run = createRun();
    run.clan.population = 1;
    run.story.peopleLost = 7;
    const scene = storyEncounter(run, 'court');
    expect(scene.lines).toHaveLength(1);
    expect(scene.lines[0]!.speaker).toBe('clan');
    for (const beat of STORY_ORDER) {
      const remnant = storyEncounter(run, beat);
      const text = [
        remnant.setting,
        ...remnant.lines.map((line) => line.text),
        ...remnant.choices.flatMap((choice) => [choice.label, choice.description, choice.response]),
      ].join(' ');
      expect(text).not.toMatch(/Saran|Nara|Erden|Boro/);
    }
    const ending = epilogueText(run).join(' ');
    expect(ending).toContain('last survivor');
    expect(ending).not.toMatch(/Saran|Nara|Erden|Boro/);
  });
  it('offers each beat once, freezes its transcript, validates choices, and prevents duplicate rewards', () => {
    const run = createRun();
    expect(openNextStory(run)).toBe(false);
    run.phase = 'playing';
    expect(openNextStory(run)).toBe(true);
    expect(run.story.active?.id).toBe('fire');
    expect(resolveStory(run, 'forged-choice')).toBe(false);
    const materials = run.clan.materials;
    expect(resolveStory(run, 'share-work')).toBe(true);
    expect(run.clan.materials).toBe(materials + GAME.story.gifts.materials);
    expect(resolveStory(run, 'share-work')).toBe(false);
    expect(openNextStory(run)).toBe(false);
    run.clan.stageTime = 45;
    openNextStory(run);
    const spoken = run.story.active!.lines.map((line) => line.text).join(' ');
    run.clan.population = 30;
    resolveStory(run);
    expect(run.story.records[1]!.encounter.lines.map((line) => line.text).join(' ')).toBe(spoken);
    expect(run.story.records[1]!.status).toBe('skipped');
  });

  it('covers both acts, skips without rewards, and gates the final beat on active journey time', () => {
    const run = createRun();
    run.phase = 'playing';
    const settle = () => {
      while (openNextStory(run)) resolveStory(run);
    };
    settle();
    run.clan.stageTime = 45;
    settle();
    run.clan.region = 1;
    run.clan.stageTime = 0;
    settle();
    run.clan.region = 2;
    settle();
    run.clan.stageTime = GAME.story.campBeatDelay;
    settle();
    run.clan.stageTime = 45;
    settle();
    run.clan.region = 3;
    run.clan.stage = 'final';
    run.clan.stageTime = 0;
    settle();
    expect(run.story.records).toHaveLength(7);
    run.clan.stageTime = GAME.story.finalBeatTime;
    settle();
    expect(run.story.records.map((record) => record.encounter.id)).toEqual(STORY_ORDER);
    expect(run.clan.materials).toBe(50);
    expect(run.clan.identity).toEqual({ iron: 0, sky: 0, wander: 0 });
    expect(openNextStory(run)).toBe(false);
    expect(createRun().story.records).toEqual([]);
  });

  it('lets uninterrupted expeditions record milestones without inventing conversations or granting gifts', () => {
    const run = createRun();
    run.phase = 'playing';
    run.story.enabled = false;
    expect(openNextStory(run)).toBe(false);
    expect(run.story.records[0]).toMatchObject({ status: 'passed', encounter: { lines: [] } });
    run.clan.stage = 'migration';
    run.clan.stageTime = 100;
    openNextStory(run);
    expect(run.story.records).toHaveLength(1);
    expect(run.clan.materials).toBe(50);
  });

  it('records real route rewards and losses, then reflects them and the clan identity in the ending', () => {
    const run = createRun();
    run.phase = 'route';
    run.clan.stageTime = 45;
    beginMigration(run, 'refuge');
    expect(run.story.crossings).toEqual([]);
    run.phase = 'playing';
    advanceClan(run, 100);
    expect(run.story.crossings).toEqual([
      { route: 'refuge', region: 1, population: 16, locationId: 'silent-river' },
    ]);
    damageClan(run, 40);
    expect(run.story.peopleLost).toBe(1);
    run.clan.identity.sky = 6;
    const ending = epilogueText(run).join(' ');
    expect(ending).toContain(`${run.clan.population} people`);
    expect(ending).toContain('1 person lost');
    expect(ending).toContain('Children of the Eternal Sky');
    expect(ending).toContain('Skybreaker still walks');
    run.clan.finalBossDefeated = true;
    expect(epilogueText(run).join(' ')).toContain('Skybreaker has fallen');
    run.clan.identity.iron = 10;
    expect(epilogueText(run).join(' ')).toContain('Iron Horde');
    run.clan.identity.wander = 12;
    expect(epilogueText(run).join(' ')).toContain('Wandering Nation');
  });
});
