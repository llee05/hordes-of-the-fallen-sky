import { describe, expect, it } from 'vitest';
import {
  ARRIVAL_REMNANT,
  BUILDING_REMNANT,
  CHOSEN_KHAN_REMNANT,
  CROSSING_OBJECTIVE_REMNANT,
  DEPARTURE_REMNANT,
  FALLEN_KHAN_REMNANT,
  FIELD_OBJECTIVE_REMNANTS,
  LOSS_REMNANT,
  SAFE_CROSSING_REMNANT,
  SKYBREAKER_REMNANT,
  STARVATION_REMNANT,
  CROSSING_OBJECTIVE_ACCOUNTS,
  FIELD_OBJECTIVE_ACCOUNTS,
  ROUTE_ACCOUNTS,
  arrivalReaction,
  buildingReaction,
  clanVoiceLine,
  crossingObjectiveReaction,
  departureReaction,
  fieldObjectiveReaction,
  safeCrossingReaction,
  starvationReaction,
} from '../../src/game/data/storyReactions';
import { CROSSING_ENCOUNTERS } from '../../src/game/data/crossings';
import { FIELD_OBJECTIVES } from '../../src/game/data/fieldObjectives';
import { BUILDINGS, LOCATIONS, ROUTES } from '../../src/game/data/clan';
import { advanceClan, beginMigration, buildStructure } from '../../src/game/state/clan';
import { completeFieldObjective, startFieldObjective } from '../../src/game/state/fieldObjectives';
import { createRun } from '../../src/game/state/run';
import { GAME } from '../../src/game/config';

const ROUTE_IDS = ROUTES.map((route) => route.id);

function expectNoPlaceName(text: string): void {
  for (const location of LOCATIONS) expect(text).not.toContain(location.name);
}

describe('crossing reactions follow the approach taken', () => {
  const expected = {
    departure: { river: 'boro', ridge: 'boro', refuge: 'boro' },
    arrivedWithPeople: { river: 'nara', ridge: 'nara', refuge: 'newcomer' },
    arrivedQuietly: { river: 'saran', ridge: 'saran', refuge: 'saran' },
    safe: { river: 'nara', ridge: 'nara', refuge: 'nara' },
    objective: { river: 'erden', ridge: 'boro', refuge: 'saran' },
  } as const;

  it('gives every route and arrival its own speaker and words, naming no place', () => {
    const run = createRun();
    for (const route of ROUTE_IDS) {
      const lines = {
        departure: departureReaction(run, route),
        arrivedWithPeople: arrivalReaction(run, route, 8),
        arrivedQuietly: arrivalReaction(run, route, 0),
        safe: safeCrossingReaction(run, route),
        objective: crossingObjectiveReaction(run, route),
      };
      for (const [moment, line] of Object.entries(lines)) {
        expect(line.speaker).toBe(expected[moment as keyof typeof expected][route]);
        expect(line.text.trim()).not.toBe('');
        expectNoPlaceName(line.text);
      }
    }
    for (const moment of [
      (route: (typeof ROUTE_IDS)[number]) => departureReaction(run, route).text,
      (route: (typeof ROUTE_IDS)[number]) => arrivalReaction(run, route, 0).text,
      (route: (typeof ROUTE_IDS)[number]) => safeCrossingReaction(run, route).text,
      (route: (typeof ROUTE_IDS)[number]) => crossingObjectiveReaction(run, route).text,
    ])
      expect(new Set(ROUTE_IDS.map(moment)).size).toBe(ROUTE_IDS.length);
  });

  it('lets a newcomer speak only for people who arrived by the blue banners', () => {
    const run = createRun();
    for (const route of ROUTE_IDS)
      for (const people of [0, 1, 8])
        expect(arrivalReaction(run, route, people).speaker === 'newcomer').toBe(
          route === 'refuge' && people > 0,
        );
  });

  it('chooses the same words for the same crossing every time', () => {
    for (const route of ROUTE_IDS) {
      expect(departureReaction(createRun(), route)).toEqual(departureReaction(createRun(), route));
      expect(arrivalReaction(createRun(), route, 8)).toEqual(
        arrivalReaction(createRun(), route, 8),
      );
      expect(crossingObjectiveReaction(createRun(), route)).toEqual(
        crossingObjectiveReaction(createRun(), route),
      );
    }
  });

  it('records the route’s departure line, the remnant voice, or silence', () => {
    const depart = (setup: (run: ReturnType<typeof createRun>) => void, route = 'ridge') => {
      const run = createRun();
      run.phase = 'route';
      run.clan.stageTime = 45;
      setup(run);
      expect(beginMigration(run, route)).toBe(true);
      return run.legacy.memories.at(-1)!.line;
    };
    for (const route of ROUTE_IDS)
      expect(depart(() => {}, route)).toEqual(departureReaction(createRun(), route));
    expect(
      depart((run) => {
        run.clan.population = 4;
      }),
    ).toEqual({ speaker: 'clan', text: DEPARTURE_REMNANT });
    expect(
      depart((run) => {
        run.story.enabled = false;
      }),
    ).toBeUndefined();
  });

  it('greets households who arrived by the blue banners, or notes full wagons', () => {
    const arrive = (population: number) => {
      const run = createRun();
      run.phase = 'route';
      run.clan.stageTime = 45;
      run.clan.population = population;
      expect(beginMigration(run, 'refuge')).toBe(true);
      run.phase = 'playing';
      run.legacy.reactionUntil = 0;
      run.clan.food = 10_000;
      run.story.peopleLost = 1; // skip the safe-crossing line so the arrival may speak
      expect(advanceClan(run, 1000)).toBe('arrived');
      return run.legacy.memories.at(-1)!.line;
    };
    expect(arrive(8)?.speaker).toBe('newcomer');
    expect(arrive(GAME.clan.maxPopulation)).toEqual(arrivalReaction(createRun(), 'refuge', 0));
  });
});

describe('field-objective and starvation reactions by kind', () => {
  const FIELD_SPEAKERS = {
    supplies: 'boro',
    herd: 'boro',
    refugees: 'saran',
    gathering: 'nara',
  } as const;
  const KINDS = Object.keys(FIELD_OBJECTIVES) as (keyof typeof FIELD_OBJECTIVES)[];

  const complete = (
    kind: keyof typeof FIELD_OBJECTIVES,
    setup: (run: ReturnType<typeof createRun>) => void = () => {},
  ) => {
    const run = createRun();
    run.phase = 'playing';
    run.clan.stage = 'camp';
    run.clan.stageTime = GAME.field.firstAt;
    setup(run);
    expect(startFieldObjective(run, { x: 0, y: 0 }, kind)).toBe(true);
    expect(completeFieldObjective(run)).toBe(true);
    return run.legacy.memories.at(-1)!.line;
  };

  it('gives every field objective its own speaker and words', () => {
    expect(Object.keys(FIELD_SPEAKERS).sort()).toEqual([...KINDS].sort());
    const texts = KINDS.map((kind) => {
      const line = fieldObjectiveReaction(createRun(), kind);
      expect(line.speaker).toBe(FIELD_SPEAKERS[kind]);
      expect(line.text.trim()).not.toBe('');
      expectNoPlaceName(line.text);
      expect(complete(kind)).toEqual(line);
      expect(fieldObjectiveReaction(createRun(), kind)).toEqual(line);
      return line.text;
    });
    expect(new Set(texts).size).toBe(KINDS.length);
  });

  it('welcomes stranded households without naming any of them', () => {
    const { text } = fieldObjectiveReaction(createRun(), 'refugees');
    for (const name of ['Saran', 'Boro', 'Erden', 'Nara']) expect(text).not.toContain(name);
    // No capitalised word past the first may stand in for an invented name.
    expect(
      text
        .split(/[.!?]\s+/)
        .flatMap((sentence) => sentence.split(/\s+/).slice(1))
        .filter((word) => /^[A-Z]/.test(word)),
    ).toEqual([]);
  });

  it('keeps the remnant voice and Camp scenes: Off silence for every kind', () => {
    const remnants = KINDS.map((kind) => {
      // Rescued households join before the memory is recorded, so start low enough
      // that even the refugee objective stays below five.
      const remnant = complete(kind, (run) => {
        run.clan.population = 2;
      });
      expect(remnant).toEqual({ speaker: 'clan', text: FIELD_OBJECTIVE_REMNANTS[kind] });
      expect(
        complete(kind, (run) => {
          run.story.enabled = false;
        }),
      ).toBeUndefined();
      return remnant!.text;
    });
    expect(new Set(remnants).size).toBe(KINDS.length);
  });

  it('lets Nara record a starvation when the court gave her the tally', () => {
    const run = createRun();
    expect(starvationReaction(run)).toEqual({
      speaker: 'boro',
      text: 'There’s nothing left to share out. Whatever we find next, we keep close.',
    });
    run.story.records.push({
      encounter: { id: 'court', act: 2, title: '', image: '', setting: '', lines: [], choices: [] },
      choice: {
        id: 'nara-tally',
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
    expect(starvationReaction(run)).toEqual({
      speaker: 'nara',
      text: 'I wrote it in the tally: the stores ran out, and it cost us someone. I don’t want to write that again.',
    });
  });
});

describe('camp-work reactions per level and specialization', () => {
  // docs/story-prototype.md: Boro reacts to herds, bows, and stores; Nara to
  // felt and relays; Erden to wagons; Saran to gers and sanctuaries.
  const VOICES = {
    archery: 'boro',
    herd: 'boro',
    provisions: 'boro',
    wagon: 'erden',
  } as const;
  const voiced = BUILDINGS.filter((building) => building.id in VOICES);

  it('gives every voiced building distinct lines for each level and specialization', () => {
    expect(voiced).toHaveLength(Object.keys(VOICES).length);
    for (const building of voiced) {
      const required = [
        undefined,
        'level-2',
        'level-3',
        ...building.paths.filter((path) => path.level === 4).map((path) => path.id),
      ];
      const all = [undefined, ...building.paths.map((path) => path.id)];
      const texts = all.map((pathId) => {
        const line = buildingReaction(building.id, pathId);
        expect(line.speaker).toBe(VOICES[building.id as keyof typeof VOICES]);
        expect(line.text.trim()).not.toBe('');
        expectNoPlaceName(line.text);
        expect(buildingReaction(building.id, pathId)).toEqual(line);
        return line.text;
      });
      expect(new Set(texts).size).toBe(all.length);
      expect(required.every((pathId) => all.includes(pathId))).toBe(true);
    }
  });

  it('falls back to the building’s craft line for an unknown development', () => {
    for (const building of voiced) {
      const craft = buildingReaction(building.id, 'not-a-path');
      expect(craft.speaker).toBe(VOICES[building.id as keyof typeof VOICES]);
      expect(
        building.paths.map((path) => buildingReaction(building.id, path.id).text),
      ).not.toContain(craft.text);
    }
  });

  it('records the line for the facility or development actually purchased', () => {
    for (const building of voiced) {
      const run = createRun();
      delete run.clan.estate;
      run.phase = 'building';
      run.clan.materials = run.clan.spirit = 10_000;
      run.clan.population = 30;
      expect(buildStructure(run, building.id)).toBe(true);
      expect(run.legacy.memories.at(-1)!.line).toEqual(buildingReaction(building.id));
      run.legacy.reactionUntil = 0;
      expect(buildStructure(run, building.id, 'level-2')).toBe(true);
      expect(run.legacy.memories.at(-1)!.line).toEqual(buildingReaction(building.id, 'level-2'));
    }
  });
});

describe('companion moment reactions', () => {
  it('keeps the collective remnant voices heard below five survivors', () => {
    expect(clanVoiceLine('A remembered account.')).toEqual({
      speaker: 'clan',
      text: 'A remembered account.',
    });
    expect(DEPARTURE_REMNANT).toBe(
      'The few who are left load the wagons, count one another, and set out.',
    );
    expect(STARVATION_REMNANT).toBe(
      'The stores ran empty, and it cost another life. Those still standing keep moving.',
    );
    expect(ARRIVAL_REMNANT).toBe(
      'Those who reached the pasture build a small fire and sit close around it.',
    );
    expect(SAFE_CROSSING_REMNANT).toBe(
      'Every household that set out reached the next camp together.',
    );
    expect(CROSSING_OBJECTIVE_REMNANT).toBe(
      'Those who came through take stock of what they saved.',
    );
    expect(FALLEN_KHAN_REMNANT).toBe(
      'The people keep the banner raised while they choose another Khan.',
    );
    expect(BUILDING_REMNANT).toBe(
      'Even with so few hands, the clan makes room for one more craft.',
    );
    expect(LOSS_REMNANT).toBe('One fewer under the banner. The tally keeps the loss.');
    expect(SKYBREAKER_REMNANT).toBe(
      'The great creature lies still, and the few who remain turn back to the wagons.',
    );
    expect(CHOSEN_KHAN_REMNANT).toBe(
      'Someone new takes up the banner, and the survivors carry on what they have learned.',
    );
  });
});

describe('chronicle wording', () => {
  it('remembers each approach in words rather than its menu label', () => {
    for (const route of ROUTES) {
      const run = createRun();
      run.phase = 'route';
      run.clan.stageTime = 45;
      expect(beginMigration(run, route.id)).toBe(true);
      const destination = LOCATIONS.find((entry) => entry.id === run.clan.destinationId)!;
      expect(run.legacy.memories.at(-1)!.detail).toBe(
        `${run.clan.population} people set out for ${destination.name}. ${ROUTE_ACCOUNTS[route.id].departed}`,
      );
      run.phase = 'playing';
      expect(advanceClan(run, 1000)).toBe('arrived');
      const arrival = run.legacy.memories.at(-1)!.detail;
      expect(arrival).toBe(
        `${run.clan.population} people reached ${destination.name} ${ROUTE_ACCOUNTS[route.id].arrived}.`,
      );
      expect(arrival).not.toContain(route.title);
    }
  });

  it('accounts for every crossing objective and field objective without naming a place', () => {
    const accounts = [
      ...Object.keys(CROSSING_ENCOUNTERS).map(
        (route) => CROSSING_OBJECTIVE_ACCOUNTS[route as keyof typeof CROSSING_ENCOUNTERS],
      ),
      ...Object.keys(FIELD_OBJECTIVES).map(
        (kind) => FIELD_OBJECTIVE_ACCOUNTS[kind as keyof typeof FIELD_OBJECTIVES],
      ),
      ...Object.values(ROUTE_ACCOUNTS).flatMap((entry) => [entry.departed, entry.arrived]),
    ];
    expect(new Set(accounts).size).toBe(accounts.length);
    for (const account of accounts) {
      expect(account.trim()).not.toBe('');
      for (const location of LOCATIONS) expect(account).not.toContain(location.name);
    }
  });
});
