import { choseStory } from '../state/storyBonds';
import type { BuildingId, RunState } from '../types';
import type { StoryLine } from '../story/types';
import type { CrossingRoute } from './crossings';
import type { FieldObjectiveKind } from './fieldObjectives';

/**
 * Choose reactions when recording a moment so later choices cannot rewrite its transcript.
 */
const BUILDING_REACTIONS: Record<BuildingId, StoryLine> = {
  ger: {
    speaker: 'saran',
    text: 'Another hearth beneath one sky. There is room for whoever comes.',
  },
  archery: { speaker: 'boro', text: 'Good bows. Better if we never need them.' },
  herd: { speaker: 'boro', text: 'More horses means more grass to find. Still, I’m glad of them.' },
  sanctuary: {
    speaker: 'saran',
    text: 'Give each new craft a place beside the hearth. These are skills we can carry.',
  },
  wagon: { speaker: 'erden', text: 'Every axle counted. The wagons will carry what we promise.' },
  felt: { speaker: 'nara', text: 'I can make felt now. Ask me. Go on.' },
  provisions: { speaker: 'boro', text: 'Stores we can carry. That is a promise I can keep.' },
  relay: { speaker: 'nara', text: 'Riders ahead of us, word behind us. Nobody gets lost now.' },
};

export function buildingReaction(id: BuildingId): StoryLine {
  return BUILDING_REACTIONS[id];
}

/** The record-keeper speaks for a loss; who keeps the record depends on the court scene. */
export function lossReaction(run: RunState): StoryLine {
  if (run.story.peopleLost >= 3)
    return {
      speaker: 'saran',
      text: 'Another place left empty. Say the name tonight, so the road does not take that too.',
    };
  if (choseStory(run, 'nara-tally'))
    return {
      speaker: 'nara',
      text: 'One fewer. I have written it in the tally, where everyone can see.',
    };
  return {
    speaker: 'erden',
    text: 'One fewer at the fire. I will keep the loss in the tally, where we can all see it.',
  };
}

/** A shared watch was meant to hold without one rider; a later fall is harder to bear. */
export function fallenKhanReaction(run: RunState): StoryLine {
  if (run.khan.generation > 1)
    return {
      speaker: 'nara',
      text: 'Another Khan down. Keep the banner up where the people can see it. I will help.',
    };
  if (choseStory(run, 'share-watch') || choseStory(run, 'promise-guard'))
    return {
      speaker: 'boro',
      text: 'The watch holds. We named it so it would hold without one rider.',
    };
  return {
    speaker: 'saran',
    text: 'Keep the banner where the people can see it. The road still needs a Khan.',
  };
}

export function chosenKhanReaction(run: RunState): StoryLine {
  if (run.khan.trait === 'outrider')
    return {
      speaker: 'boro',
      text: 'The outrider takes the banner. Ride ahead, but not so far we lose you.',
    };
  if (run.khan.trait === 'hearthguard')
    return {
      speaker: 'saran',
      text: 'The hearthguard takes the banner. Stay near the wagons; that is where it belongs.',
    };
  return {
    speaker: 'erden',
    text: 'A new hand carries the banner. The people and everything they have learned remain.',
  };
}

/** The Skybreaker falls during the final stand; Boro turns the clan back to the wagons. */
export function skybreakerReaction(): StoryLine {
  return {
    speaker: 'boro',
    text: 'It is down. Let the little ones see it lying still, then back to the wagons. We are not through yet.',
  };
}

// ---------------------------------------------------------------------------
// Journey and camp moment voices, recorded by state/clan.ts, state/legacy.ts,
// state/crossingEncounters.ts, and state/fieldObjectives.ts. Each moment pairs
// its companion reaction with the collective remnant voice heard when fewer
// than five survivors remain. Factual chronicle titles and details stay at the
// call sites; every spoken word lives here.
// ---------------------------------------------------------------------------

/** Boro counts the households before the caravan moves. */
export function departureReaction(_run: RunState): StoryLine {
  return {
    speaker: 'boro',
    text: 'Count the households before we move. Keep the packs balanced and the herd beside us.',
  };
}

export const DEPARTURE_REMNANT = 'The remaining hands load the wagons and count before leaving.';

/** Boro keeps the remaining stores close when the provisions run out. */
export function starvationReaction(_run: RunState): StoryLine {
  return {
    speaker: 'boro',
    text: 'There is nothing left to share. Keep the remaining stores close when we find them.',
  };
}

export const STARVATION_REMNANT =
  'Empty stores cost another life. The remaining people keep moving.';

/** Nara makes room for arrived households; a quieter arrival belongs to Saran. */
export function arrivalReaction(_run: RunState, arrivedPeople: number): StoryLine {
  return arrivedPeople
    ? {
        speaker: 'nara',
        text: 'Move the bowls closer. There are more people to make room for.',
      }
    : {
        speaker: 'saran',
        text: 'Set the covered embers down gently. We can make a hearth here.',
      };
}

export const ARRIVAL_REMNANT = 'Those who reached the pasture make another small hearth.';

/** Nara counts the caravan again when every household that left is still here. */
export function safeCrossingReaction(_run: RunState): StoryLine {
  return {
    speaker: 'nara',
    text: 'I counted again. Every household that left is still here.',
  };
}

export const SAFE_CROSSING_REMNANT = 'Every household that departed reached the next camp.';

/** Saran claims what a completed crossing objective protected for the camp. */
export function crossingObjectiveReaction(_run: RunState, _route: CrossingRoute): StoryLine {
  return {
    speaker: 'saran',
    text: 'Count everyone who came through. What you protected belongs beside our fire.',
  };
}

export const CROSSING_OBJECTIVE_REMNANT = 'The people who came through count what they saved.';

/** Boro brings a completed field objective back beside the fire. */
export function fieldObjectiveReaction(_run: RunState, _kind: FieldObjectiveKind): StoryLine {
  return {
    speaker: 'boro',
    text: 'Another journey made together. Bring what we found beside the fire.',
  };
}

export const FIELD_OBJECTIVE_REMNANT =
  'The remaining hands bring the rescued supplies and travellers into camp.';

// --- Succession remnants ----------------------------------------------------
// The succession reactions above pair with these collective voices in
// state/legacy.ts.

export const FALLEN_KHAN_REMNANT =
  'The banner remains with the people while another Khan is chosen.';

export const CHOSEN_KHAN_REMNANT =
  'Another hand takes the banner. The remaining people carry their learning onward.';

/** The collective remembered-road voice that stands in below five survivors. */
export function clanVoiceLine(text: string): StoryLine {
  return { speaker: 'clan', text };
}
