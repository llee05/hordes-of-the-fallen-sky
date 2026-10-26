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
    text: 'Another roof of felt under the same sky. There will be room in it for whoever comes.',
  },
  archery: {
    speaker: 'boro',
    text: 'Good bows. I hope they ride the whole road on the cart.',
  },
  herd: {
    speaker: 'boro',
    text: 'More horses, more grass to find. I’m glad of every one of them anyway.',
  },
  sanctuary: {
    speaker: 'saran',
    text: 'Give the old stories a place near the fire. We can carry those when we can carry nothing else.',
  },
  wagon: {
    speaker: 'erden',
    text: 'I have checked every axle twice. Whatever we promise, these wagons can carry it.',
  },
  felt: { speaker: 'nara', text: 'I know how to make felt now. Ask me anything. Go on.' },
  provisions: {
    speaker: 'boro',
    text: 'Food that keeps on the road. Now there’s a promise I can keep.',
  },
  relay: {
    speaker: 'nara',
    text: 'Riders out ahead and word coming back. Nobody goes missing now without us knowing.',
  },
};

export function buildingReaction(id: BuildingId): StoryLine {
  return BUILDING_REACTIONS[id];
}

export const BUILDING_REMNANT = 'Even with so few hands, the clan makes room for one more craft.';

/** The record-keeper speaks for a loss; who keeps the record depends on the court scene. */
export function lossReaction(run: RunState): StoryLine {
  if (run.story.peopleLost >= 3)
    return {
      speaker: 'saran',
      text: 'Another empty place at the fire. Say the name tonight, so the road doesn’t take that as well.',
    };
  if (choseStory(run, 'nara-tally'))
    return {
      speaker: 'nara',
      text: 'One fewer. I wrote it in the tally myself, where everyone can read it.',
    };
  return {
    speaker: 'erden',
    text: 'One fewer at the fire. I have entered the loss in the tally, where any of us may read it.',
  };
}

export const LOSS_REMNANT = 'One fewer under the banner. The tally keeps the loss.';

/** A shared watch was meant to hold without one rider; a later fall is harder to bear. */
export function fallenKhanReaction(run: RunState): StoryLine {
  if (run.khan.generation > 1)
    return {
      speaker: 'nara',
      text: 'Another Khan down. Get the banner up where people can see it. I’ll hold the other side.',
    };
  if (choseStory(run, 'share-watch') || choseStory(run, 'promise-guard'))
    return {
      speaker: 'boro',
      text: 'The watch stands. We named it so it would hold without any one rider.',
    };
  return {
    speaker: 'saran',
    text: 'Raise the banner where everyone can see it. The road still needs a Khan, and so do we.',
  };
}

export function chosenKhanReaction(run: RunState): StoryLine {
  if (run.khan.trait === 'outrider')
    return {
      speaker: 'boro',
      text: 'An outrider has the banner now. Ride ahead if you must, just not so far we lose sight of you.',
    };
  if (run.khan.trait === 'hearthguard')
    return {
      speaker: 'saran',
      text: 'A hearthguard has the banner now. Keep it near the wagons. That is where it belongs.',
    };
  return {
    speaker: 'erden',
    text: 'New hands on the banner. The people are still here, and so is everything they have learned.',
  };
}

/** The Skybreaker falls during the final stand; Boro turns the clan back to the wagons. */
export function skybreakerReaction(): StoryLine {
  return {
    speaker: 'boro',
    text: 'It’s down. Let the little ones see it lying still, then everyone back to the wagons. We aren’t through yet.',
  };
}

export const SKYBREAKER_REMNANT =
  'The great creature lies still, and the few who remain turn back to the wagons.';

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
    text: 'Count the households before anyone moves. Balance the packs and keep the herd close.',
  };
}

export const DEPARTURE_REMNANT =
  'The few who are left load the wagons, count one another, and set out.';

/** Boro keeps the remaining stores close when the provisions run out. */
export function starvationReaction(_run: RunState): StoryLine {
  return {
    speaker: 'boro',
    text: 'There’s nothing left to share out. Whatever we find next, we keep close.',
  };
}

export const STARVATION_REMNANT =
  'The stores ran empty, and it cost another life. Those still standing keep moving.';

/** Nara makes room for arrived households; a quieter arrival belongs to Saran. */
export function arrivalReaction(_run: RunState, arrivedPeople: number): StoryLine {
  return arrivedPeople
    ? {
        speaker: 'nara',
        text: 'Push the bowls closer together. We need room for more people.',
      }
    : {
        speaker: 'saran',
        text: 'Set the covered embers down gently. This ground will hold a hearth.',
      };
}

export const ARRIVAL_REMNANT =
  'Those who reached the pasture build a small fire and sit close around it.';

/** Nara counts the caravan again when every household that left is still here. */
export function safeCrossingReaction(_run: RunState): StoryLine {
  return {
    speaker: 'nara',
    text: 'I counted twice. Everyone who set out with us is here.',
  };
}

export const SAFE_CROSSING_REMNANT = 'Every household that set out reached the next camp together.';

/** Saran claims what a completed crossing objective protected for the camp. */
export function crossingObjectiveReaction(_run: RunState, _route: CrossingRoute): StoryLine {
  return {
    speaker: 'saran',
    text: 'Count everyone who came through. Whatever you kept safe out there has a place by our fire.',
  };
}

export const CROSSING_OBJECTIVE_REMNANT = 'Those who came through take stock of what they saved.';

/** Boro brings a completed field objective back beside the fire. */
export function fieldObjectiveReaction(_run: RunState, _kind: FieldObjectiveKind): StoryLine {
  return {
    speaker: 'boro',
    text: 'We went out together and came back together. Bring what we found to the fire.',
  };
}

export const FIELD_OBJECTIVE_REMNANT =
  'What is left of the clan brings what it found back into camp.';

// --- Succession remnants ----------------------------------------------------
// The succession reactions above pair with these collective voices in
// state/legacy.ts.

export const FALLEN_KHAN_REMNANT =
  'The people keep the banner raised while they choose another Khan.';

export const CHOSEN_KHAN_REMNANT =
  'Someone new takes up the banner, and the survivors carry on what they have learned.';

/** The collective remembered-road voice that stands in below five survivors. */
export function clanVoiceLine(text: string): StoryLine {
  return { speaker: 'clan', text };
}
