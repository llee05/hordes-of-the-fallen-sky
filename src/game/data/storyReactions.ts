import { choseStory } from '../state/storyBonds';
import type { BuildingId, RunState } from '../types';
import type { Companion, StoryLine } from '../story/types';
import type { CrossingRoute } from './crossings';
import type { FieldObjectiveKind } from './fieldObjectives';

// Reactions are chosen when a moment is recorded, so later choices cannot
// rewrite its transcript.

/**
 * Each building has one voice: Boro for bows, herds, and stores, Erden for
 * wagons, Saran for gers and the sanctuary, and Nara for felt and the relay.
 * Lines speak only of the facility just raised or the development just
 * learned, keyed by path ID. A development without its own line falls back to
 * the building's general craft line.
 */
interface BuildingVoice {
  speaker: Companion;
  /** The facility is first established. */
  established: string;
  /** A development is learned, by path ID. */
  paths: Readonly<Record<string, string>>;
  /** Any development without its own line. */
  craft: string;
}

const BUILDING_VOICES: Record<BuildingId, BuildingVoice> = {
  archery: {
    speaker: 'boro',
    established: 'Good bows. I hope they ride the whole road on the cart.',
    paths: {
      'level-2':
        'A proper range, marked out and kept. Practice goes better when everyone knows where to stand.',
      'level-3':
        'The old hands are teaching the young ones to shoot. That’s how a skill outlasts the people who had it.',
      'fire-arrows': 'Fire arrows. Keep them well away from the felt and the hay.',
      'veteran-riders':
        'Seasoned riders with steady hands. I’ll find them horses that can keep up.',
      'seasoned-bowyers':
        'Horn and sinew, fitted to each rider. Those bows reach a good way past where I could.',
      'resin-preparation': 'Resin bundles, wrapped and kept dry. Store them nowhere near the food.',
      'arban-drills':
        'Arban drills. They ride in step now, like a herd that knows where it’s going.',
    },
    craft: 'Another thing learned at the archery grounds. Better bows, fewer arrows wasted.',
  },
  herd: {
    speaker: 'boro',
    established: 'More horses, more grass to find. I’m glad of every one of them anyway.',
    paths: {
      'level-2':
        'Herding teams for every season. Now someone besides me is always watching the grass.',
      'level-3':
        'A remount herd worth the name, and young ones learning to keep it. I might sleep a little now.',
      'remount-herds':
        'Fresh mounts for everyone. We’ll cover ground faster than the grass runs out.',
      'winter-stores':
        'Winter stores, put by while the grass is good. Half the hunger on the road.',
      'seasonal-grazing': 'Graze it, then let it rest. Grass that’s given a season comes back.',
      'relay-remounts':
        'Always one horse saddled and waiting. Nobody rides a tired mount on my watch.',
      'dairy-reserves': 'Milk set by for the lean days. The herd feeds us twice over now.',
    },
    craft: 'The herders know a little more than they did. The horses will be glad of it.',
  },
  provisions: {
    speaker: 'boro',
    established: 'Food that keeps on the road. Now there’s a promise I can keep.',
    paths: {
      'level-2':
        'Every household putting food by now, not just mine. The stores fill faster that way.',
      'level-3':
        'Stewards for the stores, teaching the next ones how it’s done. Good. I can’t watch every sack forever.',
      'aaruul-drying':
        'Curds drying on every rack. Hard as stone, and they’ll last the whole road.',
      'borts-stores':
        'Dried meat packed small. Something to eat on the far side of every crossing.',
      'airag-hospitality':
        'Airag for anyone who sits down with us. I’ll grumble about the cost, then pour another bowl.',
      'shared-provisions':
        'Provisions for every household, not only the loudest. Arriving tired won’t mean arriving hungry.',
    },
    craft: 'One more way to make food last. I’ll take every one we can learn.',
  },
  wagon: {
    speaker: 'erden',
    established: 'I have checked every axle twice. Whatever we promise, these wagons can carry it.',
    paths: {
      'level-2':
        'Each wagon has its number and its place in the line. I have kept such lists before. This one I am glad to keep.',
      'level-3':
        'The drivers are teaching their children to close the circle. I watched them practise until it was right.',
      'war-carts':
        'War carts. I have seen them built before, for worse reasons. These will guard families.',
      'felt-armor':
        'Felt hung along every wagon side. Half the blows will never reach the people behind it.',
      'rawhide-lashings':
        'Every load lashed in rawhide. I have counted the knots; none will slip on the road.',
      wheelwrights:
        'A wheel that runs true makes a steady platform. The archers on the carts will feel it.',
      'layered-felt':
        'Another layer of felt on the screens. I have weighed it, and the wagons can bear it.',
    },
    craft: 'The wagon circle has learned something new. I have entered it in the tally.',
  },
  ger: {
    speaker: 'saran',
    established:
      'Another roof of felt under the same sky. There will be room in it for whoever comes.',
    paths: {
      'level-2':
        'Each household knows its work now, and nobody carries it alone. A camp holds like good stitching.',
      'level-3':
        'Grandmothers showing children how the lattice folds. That is how a home learns to travel.',
      hearthkeepers:
        'Hearthkeepers at every fire. Nobody comes in from the cold to find the embers out.',
      'refugee-beacons':
        'Light the beacons. Anyone still out there should know which way the warm fires are.',
      'felt-linings':
        'Another layer of felt inside every wall. Warm cloth turns aside more than the wind.',
      'hospitality-circle':
        'A place at every hearth, not only mine. That is what the spare bowl was for.',
      'household-apprentices':
        'Every household is teaching another what it knows. Thread passes from hand to hand that way.',
    },
    craft: 'The households have learned something new. Give it a place near the fire.',
  },
  // The sanctuary speaks of remembrance and shared care; it never promises
  // that a real rite works (lore.md writing boundaries).
  sanctuary: {
    speaker: 'saran',
    established:
      'Give the old stories a place near the fire. We can carry those when we can carry nothing else.',
    paths: {
      'level-2':
        'A place to gather and keep the old words among us. Let anyone who wants to listen find room.',
      'level-3':
        'We remember those who came before us here, and teach the children their names. That much I know how to carry.',
      'wind-shamans':
        'The wind shamans watch the sky with us. I cannot say what Heaven intends, but I am glad not to watch alone.',
      'ancestral-ward':
        'A ward at the camp’s edge, with the names of those before us kept beside it. Let it remind us whom we protect.',
      'ovoo-remembrance':
        'We cannot carry the places we have left, only the memory of them. Let us carry that together.',
      'storm-watch':
        'Someone keeps watch on the storms now, every hour of the night. The rest of us can sleep.',
      'ancestral-tales':
        'Names beside the hearth, said aloud each night. A tired camp rests easier among them.',
    },
    craft: 'The sanctuary keeps one more thing for us. Remembering is work too.',
  },
  felt: {
    speaker: 'nara',
    established: 'I know how to make felt now. Ask me anything. Go on.',
    paths: {
      'level-2':
        'There’s a proper workshop now, with a place for every mallet. I got the best one.',
      'level-3':
        'The master feltmakers say I’m nearly ready to teach. Nearly. I’m holding them to it.',
      'wool-sorting':
        'Everyone sits in a circle and sorts wool. It goes faster, and you hear everything.',
      'weatherproof-covers':
        'New covers on the gers. The rain runs right off, so nobody burns through food just keeping warm.',
      'pack-frames': 'The frames fold flat now. I packed a whole ger by myself. Ask Boro.',
      'master-feltmakers':
        'Felt passed down between generations. Someone taught me, so now I teach someone smaller.',
      'reinforced-felt':
        'Thick felt, layered like armour. I hit it with a mallet and it hardly noticed.',
      'fine-felt':
        'Fine felt, thin and even all the way through. Mine only has one lump in it now.',
    },
    craft: 'We learned another trick with felt. I’ll show you if you ask.',
  },
  relay: {
    speaker: 'nara',
    established:
      'Riders out ahead and word coming back. Nobody goes missing now without us knowing.',
    paths: {
      'level-2':
        'Every courier has a route now. If someone is late, we know exactly where to look.',
      'level-3': 'The masters are teaching new riders every road they know. I asked to learn too.',
      'pasture-scouts':
        'Scouts ride ahead and find the grass first. Boro pretends he isn’t pleased.',
      'supply-caches':
        'Supplies left waiting along the road. It’s like setting out a bowl for ourselves.',
      'family-messengers':
        'Messengers to the scattered families. Somebody should be looking for the ones we haven’t found.',
      'horse-relays':
        'Fresh horses waiting on the road. Nobody falls behind because a horse gave out.',
    },
    craft: 'The relay riders learned something new. I made them tell me all of it.',
  },
};

/** The facility's own companion speaks for its establishment or the development just learned. */
export function buildingReaction(id: BuildingId, pathId?: string): StoryLine {
  const voice = BUILDING_VOICES[id];
  return {
    speaker: voice.speaker,
    text: pathId === undefined ? voice.established : (voice.paths[pathId] ?? voice.craft),
  };
}

export const BUILDING_REMNANT = 'Even with so few hands, the clan makes room for one more craft.';

/**
 * A larger ordo is the clan's own accountable practice: open counts, shared work,
 * and a camp that still folds onto the wagons. It never becomes a court's claim.
 * Keyed by the encampment tier reached; the starting Wandering Clan is never bought.
 */
const ENCAMPMENT_REACTIONS: Record<number, StoryLine> = {
  2: {
    speaker: 'erden',
    text: 'A tally kept in the open, where anyone can check it. That is the only kind I will keep now.',
  },
  3: {
    speaker: 'boro',
    text: 'Full stores and a guarded circle. And we can still pack it all by morning.',
  },
  4: {
    speaker: 'nara',
    text: 'It’s bigger, and it still packs onto the wagons. Everyone knows which load is theirs.',
  },
  5: {
    speaker: 'erden',
    text: 'The court called its halls eternal. This ordo answers to the people who carry it, and it moves when they do.',
  },
};

/**
 * Each internal path speaks through the companion whose concern it is, with a
 * first-rank and an experienced-rank line:
 * governance → Boro (shared judgment over scarce stores), remembrance → Saran,
 * craft → Nara, warfare → Boro, logistics → Erden, travelling exchange → Nara.
 */
const INTERNAL_REACTIONS: Record<string, readonly [StoryLine, StoryLine]> = {
  'clan-council': [
    {
      speaker: 'boro',
      text: 'Everyone hears what the stores hold before we decide. Then nobody eats in the dark.',
    },
    {
      speaker: 'boro',
      text: 'The council argues less and decides better. I can live with being outvoted.',
    },
  ],
  'ancestral-hearth': [
    {
      speaker: 'saran',
      text: 'Say their names into the fire. What we carry for them weighs less when we share it.',
    },
    {
      speaker: 'saran',
      text: 'The young ones know the names now. The hearth remembers when I cannot.',
    },
  ],
  'master-craftsmen': [
    {
      speaker: 'nara',
      text: 'They’re teaching me to stitch felt. I’ve only pricked myself twice.',
    },
    { speaker: 'nara', text: 'Now I teach the new ones. That’s how it stays with us.' },
  ],
  'war-council': [
    {
      speaker: 'boro',
      text: 'We drill together, so every rider knows the call. Better that than one rider’s orders.',
    },
    {
      speaker: 'boro',
      text: 'The riders hold their lines without me shouting. Good. I would rather count horses.',
    },
  ],
  'supply-organisation': [
    {
      speaker: 'erden',
      text: 'Every sack has a mark and a keeper. Anyone may read the list.',
    },
    {
      speaker: 'erden',
      text: 'The lists balance at every crossing now. I check them twice anyway.',
    },
  ],
  'travelling-merchants': [
    {
      speaker: 'nara',
      text: 'Traders on the road! I asked them where they’ve been. Everywhere, they said.',
    },
    {
      speaker: 'nara',
      text: 'The traders wait for us now. They say our camp keeps its word.',
    },
  ],
};

/** The steady hearthkeeper's line for any estate improvement without an authored voice. */
const ESTATE_FALLBACK: StoryLine = {
  speaker: 'saran',
  text: 'Another practice beside the hearth. We will carry it to the next pasture.',
};

/** Choose the voice for a validated encampment tier or internal development rank. */
export function estateReaction(
  kind: 'encampment' | 'internal',
  id: string,
  rank: number,
): StoryLine {
  const line =
    kind === 'encampment' ? ENCAMPMENT_REACTIONS[rank] : INTERNAL_REACTIONS[id]?.[rank - 1];
  return line ?? ESTATE_FALLBACK;
}

export const ENCAMPMENT_REMNANT =
  'However few remain, the camp grows a little and still folds onto the wagons.';
export const INTERNAL_DEVELOPMENT_REMNANT =
  'However few remain, the new work is taken up and kept.';

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

/** Boro keeps the remaining stores close; if the court scene gave Nara the tally, she records it. */
export function starvationReaction(run: RunState): StoryLine {
  if (choseStory(run, 'nara-tally'))
    return {
      speaker: 'nara',
      text: 'I wrote it in the tally: the stores ran out, and it cost us someone. I don’t want to write that again.',
    };
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

const FIELD_OBJECTIVE_REACTIONS: Record<FieldObjectiveKind, StoryLine> = {
  supplies: {
    speaker: 'boro',
    text: 'Food and tools off that cart. I’ll find room in the stores for every bit of it.',
  },
  herd: {
    speaker: 'boro',
    text: 'More horses running with ours. I’ll see they find grass.',
  },
  refugees: {
    speaker: 'saran',
    text: 'Bring them to the fire first. Questions can wait until they have eaten.',
  },
  gathering: {
    speaker: 'nara',
    text: 'The last of those raiders has fallen. I counted them.',
  },
};

export function fieldObjectiveReaction(_run: RunState, kind: FieldObjectiveKind): StoryLine {
  return FIELD_OBJECTIVE_REACTIONS[kind];
}

export const FIELD_OBJECTIVE_REMNANTS: Record<FieldObjectiveKind, string> = {
  supplies: 'Those still standing haul the cart’s load back into camp.',
  herd: 'The survivors bring the loose horses in to graze beside their own.',
  refugees: 'The survivors make room at their small fire for the stranded households.',
  gathering: 'Those still standing have defeated the raiders.',
};

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
  ridge: 'The ridge attackers were defeated.',
  refuge: 'The households under the blue banners were brought safely into the column.',
};

/** What a completed field objective accomplished, before its reward is listed. */
export const FIELD_OBJECTIVE_ACCOUNTS: Record<FieldObjectiveKind, string> = {
  supplies: 'The cart was cleared and its load gathered.',
  herd: 'The loose horses were ridden back to camp.',
  refugees: 'The stranded households were escorted back to camp.',
  gathering: 'The raiding band was beaten.',
};

/** The collective remembered-road voice that stands in below five survivors. */
export function clanVoiceLine(text: string): StoryLine {
  return { speaker: 'clan', text };
}
