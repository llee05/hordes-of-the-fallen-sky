import { describe, expect, it } from 'vitest';
import {
  ARRIVAL_REMNANT,
  CHOSEN_KHAN_REMNANT,
  CROSSING_OBJECTIVE_REMNANT,
  DEPARTURE_REMNANT,
  FALLEN_KHAN_REMNANT,
  FIELD_OBJECTIVE_REMNANT,
  SAFE_CROSSING_REMNANT,
  STARVATION_REMNANT,
  arrivalReaction,
  clanVoiceLine,
  crossingObjectiveReaction,
  departureReaction,
  fieldObjectiveReaction,
  safeCrossingReaction,
  starvationReaction,
} from '../../src/game/data/storyReactions';
import { createRun } from '../../src/game/state/run';

describe('companion moment reactions', () => {
  it('counts the households through Boro before the caravan moves', () => {
    expect(departureReaction(createRun())).toEqual({
      speaker: 'boro',
      text: 'Count the households before we move. Keep the packs balanced and the herd beside us.',
    });
  });

  it('keeps the remaining stores through Boro when the provisions run out', () => {
    expect(starvationReaction(createRun())).toEqual({
      speaker: 'boro',
      text: 'There is nothing left to share. Keep the remaining stores close when we find them.',
    });
  });

  it('welcomes arrived households through Nara and a quiet arrival through Saran', () => {
    const run = createRun();
    expect(arrivalReaction(run, 2)).toEqual({
      speaker: 'nara',
      text: 'Move the bowls closer. There are more people to make room for.',
    });
    expect(arrivalReaction(run, 0)).toEqual({
      speaker: 'saran',
      text: 'Set the covered embers down gently. We can make a hearth here.',
    });
  });

  it('counts a protected crossing through Nara', () => {
    expect(safeCrossingReaction(createRun())).toEqual({
      speaker: 'nara',
      text: 'I counted again. Every household that left is still here.',
    });
  });

  it('claims what a crossing protected through Saran on every route', () => {
    const run = createRun();
    for (const route of ['river', 'ridge', 'refuge'] as const)
      expect(crossingObjectiveReaction(run, route)).toEqual({
        speaker: 'saran',
        text: 'Count everyone who came through. What you protected belongs beside our fire.',
      });
  });

  it('brings field objective findings beside the fire through Boro for every kind', () => {
    const run = createRun();
    for (const kind of ['supplies', 'herd', 'refugees', 'gathering'] as const)
      expect(fieldObjectiveReaction(run, kind)).toEqual({
        speaker: 'boro',
        text: 'Another journey made together. Bring what we found beside the fire.',
      });
  });

  it('keeps the collective remnant voices heard below five survivors', () => {
    expect(clanVoiceLine('A remembered account.')).toEqual({
      speaker: 'clan',
      text: 'A remembered account.',
    });
    expect(DEPARTURE_REMNANT).toBe('The remaining hands load the wagons and count before leaving.');
    expect(STARVATION_REMNANT).toBe(
      'Empty stores cost another life. The remaining people keep moving.',
    );
    expect(ARRIVAL_REMNANT).toBe('Those who reached the pasture make another small hearth.');
    expect(SAFE_CROSSING_REMNANT).toBe('Every household that departed reached the next camp.');
    expect(CROSSING_OBJECTIVE_REMNANT).toBe('The people who came through count what they saved.');
    expect(FIELD_OBJECTIVE_REMNANT).toBe(
      'The remaining hands bring the rescued supplies and travellers into camp.',
    );
    expect(FALLEN_KHAN_REMNANT).toBe(
      'The banner remains with the people while another Khan is chosen.',
    );
    expect(CHOSEN_KHAN_REMNANT).toBe(
      'Another hand takes the banner. The remaining people carry their learning onward.',
    );
  });
});
