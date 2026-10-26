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
// than five survivors remain. Chronicle titles and numbers stay at the call
// sites; every spoken word lives here. Each table is plain data, so the same
// moment always gets the same line.
// ---------------------------------------------------------------------------

/** Boro packs for the approach the clan chose: water, a high shelf, or more mouths. */
const DEPARTURE_REACTIONS: Record<CrossingRoute, string> = {
  river: 'Pack the stores high on the carts and count the households. The herd can drink as we go.',
  ridge: 'Pack light and tie everything down twice. Up on the ridge, a loose load is a lost one.',
  refuge:
    'Pack the stores tight and leave room on top. If we’re answering those banners, we’ll be feeding more than ourselves.',
};

export function departureReaction(_run: RunState, route: CrossingRoute): StoryLine {
  return { speaker: 'boro', text: DEPARTURE_REACTIONS[route] };
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

/** Saran lights the hearth after the approach the clan actually took. */
const QUIET_ARRIVALS: Record<CrossingRoute, string> = {
  river: 'Shake the river damp out of the felt and set the embers down. We can make a hearth here.',
  ridge: 'Let the wagons rest after that climb, and set the embers down out of the wind.',
  // A rescue that brought no one in means the wagons were already full.
  refuge:
    'The wagons were too full to take in anyone from the banners. Keep the spare bowl out all the same.',
};

/**
 * Households rescued under the blue banners speak for themselves on arrival.
 * Any other arrival with people is Nara making room; a quiet one is Saran's.
 */
export function arrivalReaction(
  _run: RunState,
  route: CrossingRoute,
  arrivedPeople: number,
): StoryLine {
  if (arrivedPeople > 0 && route === 'refuge')
    return {
      speaker: 'newcomer',
      text: 'We followed your banner all this way. Tell us where to set down our bundles, and give us work.',
    };
  if (arrivedPeople > 0)
    return {
      speaker: 'nara',
      text: 'Push the bowls closer together. We need room for more people.',
    };
  return { speaker: 'saran', text: QUIET_ARRIVALS[route] };
}

export const ARRIVAL_REMNANT =
  'Those who reached the pasture build a small fire and sit close around it.';

/** Nara counts the caravan again when every household that left is still here. */
const SAFE_CROSSINGS: Record<CrossingRoute, string> = {
  river: 'I counted at the ford and again on the far bank. Nobody is missing.',
  ridge: 'I counted everyone back down off the ridge. Nobody is missing.',
  refuge: 'We rode out to the banners and nobody of ours was lost on the way. I counted twice.',
};

export function safeCrossingReaction(_run: RunState, route: CrossingRoute): StoryLine {
  return { speaker: 'nara', text: SAFE_CROSSINGS[route] };
}

export const SAFE_CROSSING_REMNANT = 'Every household that set out reached the next camp together.';

/**
 * A held ford is Erden's count of wagons, a broken ambush is Boro's intact
 * packs, and households brought into the column are Saran's to welcome.
 */
const CROSSING_OBJECTIVE_REACTIONS: Record<CrossingRoute, StoryLine> = {
  river: {
    speaker: 'erden',
    text: 'Every wagon came through the ford. I watched each axle leave the water.',
  },
  ridge: {
    speaker: 'boro',
    text: 'The ambush is broken and every pack is still tied on. That was good riding.',
  },
  refuge: {
    speaker: 'saran',
    text: 'Bring them close to the fire. Anyone who walks under our banner has a place beside it.',
  },
};

export function crossingObjectiveReaction(_run: RunState, route: CrossingRoute): StoryLine {
  return CROSSING_OBJECTIVE_REACTIONS[route];
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

// --- Chronicle wording ------------------------------------------------------
// Short phrases the call sites weave into factual memory details, so a
// remembered crossing or errand reads as an account rather than a menu label.

/** How the caravan travelled each approach, for departure and arrival memories. */
export const ROUTE_ACCOUNTS: Record<CrossingRoute, { departed: string; arrived: string }> = {
  river: { departed: 'They followed the river.', arrived: 'by the river road' },
  ridge: { departed: 'They took the high ridge.', arrived: 'over the high ridge' },
  refuge: {
    departed: 'They rode out to answer the blue banners.',
    arrived: 'after answering the blue banners',
  },
};

/** What a completed crossing objective accomplished, before its reward is listed. */
export const CROSSING_OBJECTIVE_ACCOUNTS: Record<CrossingRoute, string> = {
  river: 'The ford held against the attackers on both banks.',
  ridge: 'The ambush on the ridge was broken before the wagons reached it.',
  refuge: 'The households under the blue banners were brought safely into the column.',
};

/** What a completed field objective accomplished, before its reward is listed. */
export const FIELD_OBJECTIVE_ACCOUNTS: Record<FieldObjectiveKind, string> = {
  supplies: 'The cart was cleared and its load gathered.',
  herd: 'The loose horses were ridden back to camp.',
  refugees: 'The stranded households were escorted back to camp.',
  gathering: 'The raiders were beaten back before they reached camp.',
};

/** The collective remembered-road voice that stands in below five survivors. */
export function clanVoiceLine(text: string): StoryLine {
  return { speaker: 'clan', text };
}
