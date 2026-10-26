import { choseStory } from '../state/storyBonds';
import type { BuildingId, RunState } from '../types';
import type { StoryLine } from '../story/types';

/**
 * Brief companion reactions to factual moments: camp work, losses, and succession.
 * Each is chosen when the moment is recorded, so the chronicle keeps what was said.
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
