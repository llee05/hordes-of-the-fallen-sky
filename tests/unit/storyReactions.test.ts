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

describe('companion moment reactions', () => {
  it('counts the households through Boro before the caravan moves', () => {
    expect(departureReaction(createRun())).toEqual({
      speaker: 'boro',
      text: 'Count the households before anyone moves. Balance the packs and keep the herd close.',
    });
  });

  it('keeps the remaining stores through Boro when the provisions run out', () => {
    expect(starvationReaction(createRun())).toEqual({
      speaker: 'boro',
      text: 'There’s nothing left to share out. Whatever we find next, we keep close.',
    });
  });

  it('welcomes arrived households through Nara and a quiet arrival through Saran', () => {
    const run = createRun();
    expect(arrivalReaction(run, 2)).toEqual({
      speaker: 'nara',
      text: 'Push the bowls closer together. We need room for more people.',
    });
    expect(arrivalReaction(run, 0)).toEqual({
      speaker: 'saran',
      text: 'Set the covered embers down gently. This ground will hold a hearth.',
    });
  });

  it('counts a protected crossing through Nara', () => {
    expect(safeCrossingReaction(createRun())).toEqual({
      speaker: 'nara',
      text: 'I counted twice. Everyone who set out with us is here.',
    });
  });

  it('claims what a crossing protected through Saran on every route', () => {
    const run = createRun();
    for (const route of ['river', 'ridge', 'refuge'] as const)
      expect(crossingObjectiveReaction(run, route)).toEqual({
        speaker: 'saran',
        text: 'Count everyone who came through. Whatever you kept safe out there has a place by our fire.',
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
