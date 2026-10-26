import { describe, expect, it } from 'vitest';
import {
  ARRIVAL_REMNANT,
  BUILDING_REMNANT,
  CHOSEN_KHAN_REMNANT,
  CROSSING_OBJECTIVE_REMNANT,
  DEPARTURE_REMNANT,
  FALLEN_KHAN_REMNANT,
  FIELD_OBJECTIVE_REMNANT,
  LOSS_REMNANT,
  SAFE_CROSSING_REMNANT,
  SKYBREAKER_REMNANT,
  STARVATION_REMNANT,
  CROSSING_OBJECTIVE_ACCOUNTS,
  FIELD_OBJECTIVE_ACCOUNTS,
  ROUTE_ACCOUNTS,
  arrivalReaction,
  clanVoiceLine,
  crossingObjectiveReaction,
  departureReaction,
  fieldObjectiveReaction,
  safeCrossingReaction,
  starvationReaction,
} from '../../src/game/data/storyReactions';
import { CROSSING_ENCOUNTERS } from '../../src/game/data/crossings';
import { FIELD_OBJECTIVES } from '../../src/game/data/fieldObjectives';
import { LOCATIONS, ROUTES } from '../../src/game/data/clan';
import { advanceClan, beginMigration } from '../../src/game/state/clan';
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

describe('companion moment reactions', () => {
  it('keeps the remaining stores through Boro when the provisions run out', () => {
    expect(starvationReaction(createRun())).toEqual({
      speaker: 'boro',
      text: 'There’s nothing left to share out. Whatever we find next, we keep close.',
    });
  });

  it('brings field objective findings beside the fire through Boro for every kind', () => {
    const run = createRun();
    for (const kind of ['supplies', 'herd', 'refugees', 'gathering'] as const)
      expect(fieldObjectiveReaction(run, kind)).toEqual({
        speaker: 'boro',
        text: 'We went out together and came back together. Bring what we found to the fire.',
      });
  });

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
    expect(FIELD_OBJECTIVE_REMNANT).toBe(
      'What is left of the clan brings what it found back into camp.',
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
