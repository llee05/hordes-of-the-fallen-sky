import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import { epilogueText, STORY_ORDER } from '../../src/game/data/story';
import { storyEncounter } from '../../src/game/data/story';
import { advanceClan, beginMigration, damageClan } from '../../src/game/state/clan';
import { createRun } from '../../src/game/state/run';
import { openNextStory, resolveStory } from '../../src/game/state/story';
import { STORY_CONSEQUENCES, storyConsequence } from '../../src/game/data/storyConsequences';
import { firstStop, secondStop } from '../../src/game/data/storyDestinations';
import { companionBonds, companionStanding } from '../../src/game/state/storyBonds';
import type { LocationId } from '../../src/game/types';
import type { StoryBeat, StoryEncounter } from '../../src/game/story/types';

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

describe('story consequences', () => {
  it('applies a lasting camp effect once and derives companion trust from the records', () => {
    const run = createRun();
    run.phase = 'playing';
    const before = run.clan.campEffects.multipliers.materialProduction;
    openNextStory(run);
    expect(resolveStory(run, 'share-work')).toBe(true);
    expect(run.clan.campEffects.multipliers.materialProduction).toBeCloseTo(
      before * GAME.story.lasting.sharedLabour,
    );
    expect(resolveStory(run, 'share-work')).toBe(false);
    expect(run.clan.campEffects.multipliers.materialProduction).toBeCloseTo(
      before * GAME.story.lasting.sharedLabour,
    );
    expect(companionBonds(run)).toEqual({ saran: 1, boro: 0, erden: 0, nara: 1 });
    expect(companionStanding(run, 'boro')).toBe('steady');
  });

  it('grants nothing lasting for skipped or uninterrupted scenes', () => {
    const run = createRun();
    run.phase = 'playing';
    const effects = structuredClone(run.clan.campEffects);
    openNextStory(run);
    resolveStory(run);
    run.story.enabled = false;
    run.clan.stageTime = 45;
    openNextStory(run);
    expect(run.clan.campEffects).toEqual(effects);
    expect(companionBonds(run)).toEqual({ saran: 0, boro: 0, erden: 0, nara: 0 });
  });

  it('ignores unknown or inherited choice identifiers from older or altered saves', () => {
    expect(storyConsequence('constructor')).toBeUndefined();
    expect(storyConsequence('no-such-choice')).toBeUndefined();
    for (const consequence of Object.values(STORY_CONSEQUENCES))
      expect(consequence.lasting?.label ?? '').not.toMatch(/NaN|undefined/);
  });
});

const NAMED: readonly LocationId[] = [
  'otgontenger',
  'bogd-khan-uul',
  'altai-tavan-bogd',
  'khan-tengri',
  'belukha',
  'altan-ovoo',
  'eej-khairkhan',
  'orkhon-valley',
];
const PLACE_WORDS: Record<LocationId, RegExp | undefined> = {
  'golden-pasture': undefined,
  'silent-river': /Silent River/,
  'broken-pass': /Broken Pass/,
  'heart-of-the-steppe': undefined,
  otgontenger: /Otgontenger/,
  'bogd-khan-uul': /Bogd Khan Uul/,
  'altai-tavan-bogd': /Tavan Bogd/,
  'khan-tengri': /Khan Tengri/,
  belukha: /Belukha/,
  'altan-ovoo': /Altan Ovoo/,
  'eej-khairkhan': /Eej Khairkhan/,
  'orkhon-valley': /Orkhon/,
};

function sceneText(encounter: StoryEncounter): string {
  return [
    encounter.title,
    encounter.setting,
    ...encounter.lines.map((entry) => entry.text),
    ...encounter.choices.flatMap((option) => [option.label, option.description, option.response]),
  ].join(' ');
}

/** Plays the eight beats through two chosen camps, answering with the given choices. */
function journey(
  first: LocationId,
  second: LocationId,
  answers: Partial<Record<StoryBeat, string>> = {},
  route = 'river',
  population?: number,
) {
  const run = createRun();
  run.phase = 'playing';
  if (population !== undefined) run.clan.population = population;
  const settle = () => {
    while (openNextStory(run)) resolveStory(run, answers[run.story.active!.id]);
  };
  const arrive = (region: number, locationId: LocationId, via = 'river') => {
    run.story.crossings.push({ route: via, region, population: run.clan.population, locationId });
    run.clan.region = region;
    run.clan.locationId = locationId;
    run.clan.stage = region === 3 ? 'final' : 'camp';
    run.clan.stageTime = 0;
    settle();
  };
  settle();
  run.clan.stageTime = 45;
  settle();
  arrive(1, first, route);
  arrive(2, second);
  run.clan.stageTime = GAME.story.campBeatDelay;
  settle();
  run.clan.stageTime = 45;
  settle();
  arrive(3, 'heart-of-the-steppe');
  run.clan.stageTime = GAME.story.finalBeatTime;
  settle();
  return run;
}

const ANSWERS: Record<string, Partial<Record<StoryBeat, string>>> = {
  practical: {
    fire: 'share-watch',
    departure: 'pack-food',
    river: 'test-river',
    promise: 'promise-guard',
    earth: 'mend-wheels',
    court: 'nara-tally',
    opening: 'hold-watch',
    road: 'hold-together',
  },
  listening: {
    fire: 'share-work',
    departure: 'pack-tools',
    river: 'keep-names',
    promise: 'promise-remember',
    earth: 'rest-hands',
    court: 'trust-erden',
    opening: 'share-last-meal',
    road: 'carry-song',
  },
};

describe('destination-specific scenes', () => {
  it('gives every eligible first and second camp its own scene and keeps the original titles', () => {
    const firstTitles = new Set<string>();
    const secondTitles = new Set<string>();
    for (const id of ['silent-river', ...NAMED] as LocationId[]) {
      const run = createRun();
      run.clan.region = 1;
      run.clan.locationId = id;
      firstTitles.add(storyEncounter(run, 'river').title);
    }
    for (const id of ['broken-pass', ...NAMED] as LocationId[]) {
      const run = createRun();
      run.clan.region = 2;
      run.clan.locationId = id;
      secondTitles.add(storyEncounter(run, 'earth').title);
      expect(storyEncounter(run, 'promise').title).toBe('A promise chosen.');
    }
    expect(firstTitles.size).toBe(9);
    expect(secondTitles.size).toBe(9);
    expect(firstTitles).toContain('Voices across the ice.');
    expect(secondTitles).toContain('When the earth moves.');
    expect(firstTitles).not.toContain('Whose road is this?');
  });

  it('never names an unvisited place across every ordered pair of camps and both answer sets', () => {
    const firsts: LocationId[] = ['silent-river', ...NAMED];
    const seconds: LocationId[] = ['broken-pass', ...NAMED];
    // Full casts, a small remnant, and a single survivor each take their own text paths.
    const runs = [
      ...Object.values(ANSWERS).map((answers) => ({ answers, population: undefined })),
      { answers: ANSWERS.practical!, population: 3 },
      { answers: ANSWERS.listening!, population: 1 },
    ];
    for (const first of firsts)
      for (const second of seconds) {
        if (first === second) continue;
        for (const { answers, population } of runs) {
          const run = journey(first, second, answers, 'river', population);
          expect(run.story.records.map((record) => record.encounter.id)).toEqual(STORY_ORDER);
          const text = [
            ...run.story.records.map((record) => sceneText(record.encounter)),
            ...epilogueText(run),
          ].join(' ');
          for (const [id, pattern] of Object.entries(PLACE_WORDS))
            if (pattern && id !== first && id !== second) expect(text).not.toMatch(pattern);
          expect(text).not.toMatch(/undefined|NaN|\$\{/);
        }
      }
  });

  it('gives each camp its own remnant account, drawn from that camp and safe for one survivor', () => {
    const scene = (beat: 'river' | 'earth', id: LocationId, population: number) => {
      const run = createRun();
      run.clan.region = beat === 'river' ? 1 : 2;
      run.clan.locationId = id;
      run.clan.population = population;
      return storyEncounter(run, beat);
    };
    const accounts = new Set<string>();
    const slots = [
      ['river', ['silent-river', ...NAMED], (id: LocationId) => firstStop(id).remnant],
      ['earth', ['broken-pass', ...NAMED], (id: LocationId) => secondStop(id).remnant],
    ] as const;
    for (const [beat, ids, remnant] of slots)
      for (const id of ids) {
        expect(remnant(id).trim()).not.toBe('');
        // One survivor reads the same account, so it must not assume a crowd.
        expect(remnant(id)).not.toMatch(/survivors|households|families|everyone/);
        accounts.add(remnant(id));
        for (const population of [4, 1]) {
          const remembered = scene(beat, id, population);
          expect(remembered.lines).toEqual([
            { speaker: 'clan', text: expect.stringContaining(remnant(id)) },
          ]);
          expect(sceneText(remembered)).not.toMatch(/Saran|Nara|Erden|Boro/);
        }
        expect(scene(beat, id, 1).setting).toContain('1 survivor remains');
        expect(scene(beat, id, 4).setting).toContain('4 survivors remain');
      }
    expect(accounts.size).toBe(18);
    // The neutral fallbacks keep the chapter's generic account.
    expect(firstStop(undefined).remnant).toContain('White Silence');
    expect(secondStop(undefined).remnant).toContain('ground shifts');
  });

  it('recalls the response actually chosen at each camp during the final defense', () => {
    const run = journey('eej-khairkhan', 'orkhon-valley', ANSWERS.listening);
    const opening = sceneText(run.story.records[6]!.encounter);
    const road = sceneText(run.story.records[7]!.encounter);
    expect(opening).toContain('We did it at Eej Khairkhan');
    expect(opening).toContain('households have the tally');
    expect(road).toContain('rested by the Orkhon');
    const skipped = journey('eej-khairkhan', 'orkhon-valley');
    expect(sceneText(skipped.story.records[6]!.encounter)).not.toMatch(/Eej Khairkhan/);
    expect(sceneText(skipped.story.records[7]!.encounter)).not.toMatch(/Orkhon/);
  });

  it('acknowledges a rescue only when the first crossing actually answered the blue banners', () => {
    const rescued = journey('belukha', 'broken-pass', ANSWERS.listening, 'refuge');
    const arrival = rescued.story.records[2]!.encounter;
    expect(arrival.lines.some((entry) => entry.speaker === 'newcomer')).toBe(true);
    expect(sceneText(arrival)).toContain('room we made in the wagons is full');
    const unanswered = journey('belukha', 'broken-pass', ANSWERS.listening);
    expect(
      unanswered.story.records[2]!.encounter.lines.map((entry) => entry.speaker),
    ).not.toContain('newcomer');
    expect(sceneText(unanswered.story.records[2]!.encounter)).toContain('nobody is sleeping in it');
  });

  it('lets the clan hand the court tally to Nara, with a lasting effect and later callback', () => {
    const run = journey('otgontenger', 'khan-tengri', ANSWERS.practical);
    expect(run.story.records[5]!.choice?.id).toBe('nara-tally');
    expect(sceneText(run.story.records[6]!.encounter)).toContain('I have the tally');
    expect(companionBonds(run).nara).toBeGreaterThanOrEqual(GAME.story.bonds.close);
    expect(run.clan.campEffects.multipliers.clanProtection).toBeLessThan(1);
  });

  it('reflects the starting tradition and actual succession without inventing either', () => {
    const run = createRun();
    run.startingTradition = 'outriders';
    expect(storyEncounter(run, 'fire').setting).toContain('second rider');
    run.startingTradition = 'pathfinders';
    expect(storyEncounter(run, 'fire').setting).toContain('travel faster');
    run.clan.region = 2;
    run.clan.locationId = 'broken-pass';
    expect(sceneText(storyEncounter(run, 'promise'))).not.toMatch(/Khans’ hands/);
    run.khan.generation = 3;
    expect(sceneText(storyEncounter(run, 'promise'))).toContain('3 Khans’ hands');
  });

  it('ties the banner thread to the actual number of people lost, in natural words', () => {
    const run = createRun();
    run.clan.region = 2;
    run.clan.locationId = 'broken-pass';
    expect(sceneText(storyEncounter(run, 'promise'))).not.toContain('dark thread');
    run.story.peopleLost = 1;
    expect(sceneText(storyEncounter(run, 'promise'))).toContain('for the one we lost');
    run.story.peopleLost = 3;
    expect(sceneText(storyEncounter(run, 'promise'))).toContain('for each of the 3 we lost');
    run.clan.population = 1;
    expect(storyEncounter(run, 'promise').setting).toBe(
      '1 survivor remains beneath the blue banner. One voice carries the memory of the road now.',
    );
  });
});

describe('the ending', () => {
  it('remembers both camps in visit order from the responses actually chosen', () => {
    const run = journey('altan-ovoo', 'eej-khairkhan', ANSWERS.listening);
    const ending = epilogueText(run).join(' ');
    expect(ending.indexOf('At Altan Ovoo')).toBeGreaterThan(-1);
    expect(ending.indexOf('At Altan Ovoo')).toBeLessThan(ending.indexOf('At Eej Khairkhan'));
    expect(ending).toContain('carry the carriers');
    const silent = journey('altan-ovoo', 'eej-khairkhan');
    const quiet = epilogueText(silent).join(' ');
    expect(quiet).toContain('passed through Altan Ovoo and Eej Khairkhan');
    expect(quiet).not.toMatch(/learned/);
  });

  it('follows trust and the court decision to different companion endings', () => {
    const listening = epilogueText(journey('belukha', 'orkhon-valley', ANSWERS.listening)).join(
      ' ',
    );
    expect(listening).toContain('families answer for themselves');
    expect(listening).toContain('lights the new hearth herself');
    expect(listening).not.toContain('fills the spare bowl himself');
    // Boro and Saran reconcile only when the clan has honoured both of their priorities.
    const balanced = epilogueText(
      journey('belukha', 'orkhon-valley', {
        fire: 'share-work',
        departure: 'pack-food',
        river: 'test-river',
        promise: 'promise-guard',
        earth: 'rest-hands',
        court: 'hear-erden',
        opening: 'share-last-meal',
      }),
    ).join(' ');
    expect(balanced).toContain('fills the spare bowl himself');
    expect(balanced).toContain('a warning, not a scripture');
    const practical = epilogueText(journey('belukha', 'orkhon-valley', ANSWERS.practical)).join(
      ' ',
    );
    expect(practical).toContain('Nara keeps the tally now');
    expect(practical).not.toContain('fills the spare bowl himself');
  });

  it('speaks of practices instead of placing the named cast at the fire after losses', () => {
    const run = journey('khan-tengri', 'broken-pass', ANSWERS.listening);
    run.story.peopleLost = 2;
    const ending = epilogueText(run).join(' ');
    expect(ending).toContain('as Erden promised');
    expect(ending).not.toMatch(
      /Nara sets|Saran feeds|Saran lets|Saran sets|Boro walks|Erden reads/,
    );
  });

  it('acknowledges fallen Khans, including one whose successor is still being chosen', () => {
    const run = createRun();
    expect(epilogueText(run).join(' ')).not.toMatch(/Khans? fell/);
    run.khan.generation = 2;
    run.khan.successionRemaining = 3;
    expect(epilogueText(run).join(' ')).toContain('2 Khans fell keeping the road');
  });
});
