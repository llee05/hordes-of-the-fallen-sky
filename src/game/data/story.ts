import { GAME } from '../config';
import { clanDoctrine } from '../state/clan';
import type { RunState } from '../types';
import type { StoryBeat, StoryChoice, StoryEncounter, StoryLine, Speaker } from '../story/types';

export const STORY_ORDER: readonly StoryBeat[] = [
  'fire',
  'departure',
  'river',
  'promise',
  'earth',
  'court',
  'opening',
  'road',
];

export const COMPANIONS: Record<
  Speaker,
  { name: string; role: string; mark: 'ger' | 'horse' | 'journal' | 'banner' }
> = {
  saran: { name: 'Saran', role: 'Hearthkeeper', mark: 'ger' },
  boro: { name: 'Boro', role: 'Herder', mark: 'horse' },
  erden: { name: 'Erden', role: 'Keeper of the tally', mark: 'journal' },
  nara: { name: 'Nara', role: 'Youngest survivor', mark: 'banner' },
  clan: { name: 'The remembered road', role: 'Survivor’s account', mark: 'journal' },
};

export function storyAct(region: number): { number: 1 | 2; title: string } {
  return region < 2
    ? { number: 1, title: 'Gather the Scattered' }
    : { number: 2, title: 'Carry the Living' };
}

const line = (speaker: Speaker, text: string): StoryLine => ({ speaker, text });
const choice = (
  id: string,
  label: string,
  description: string,
  response: string,
  benefit: StoryChoice['benefit'],
  doctrine: StoryChoice['doctrine'],
): StoryChoice => ({ id, label, description, response, benefit, doctrine });

/** Resolve conditional dialogue once, when the scene opens, so the record keeps what was said. */
export function storyEncounter(run: RunState, id: StoryBeat): StoryEncounter {
  const rescued = run.story.crossings.some((crossing) => crossing.route === 'refuge');
  const caredFor = run.story.records.some((record) => record.choice?.id === 'share-work');
  const trustedClerk = run.story.records.some((record) => record.choice?.id === 'trust-erden');
  const weathered = run.clan.integrity < 50 || run.story.peopleLost > 0;
  const scenes: Record<StoryBeat, Omit<StoryEncounter, 'id'>> = {
    fire: {
      act: 1,
      title: 'A place beside the fire.',
      image: 'intro-hearth.png',
      setting:
        'Golden Pasture · Eight survivors unpack two gers. Boro checks the horses while Erden counts the blankets. Saran coaxes the carried embers into flame.',
      lines: [
        line('nara', 'Who is the empty bowl for?'),
        line('saran', 'Whoever reaches us next. A hearth has room for a promise.'),
        line(
          'boro',
          'And a promise needs food. Let me see to the herds while our rider watches the road.',
        ),
        line('erden', 'Eight people. Three horses. I can keep the tally, if you will let me.'),
      ],
      choices: [
        choice(
          'share-work',
          'Share the work',
          'Families salvage felt and timber while the riders keep watch.',
          'Saran puts the spare bowl beside the others. Everyone finds work they can carry.',
          'materials',
          'wander',
        ),
        choice(
          'share-watch',
          'Share the watch',
          'Pair the households with riders so everyone knows who guards them.',
          'Boro names the first watch. You no longer have to face every approach alone.',
          'resolve',
          'iron',
        ),
      ],
    },
    departure: {
      act: 1,
      title: 'More mouths, more hands.',
      image: 'intro-steppe.png',
      setting:
        'The first departure · The grazing is thinning. The camp can pack its gers and choose a road east.',
      lines: [
        line(
          'boro',
          'We can follow water, take the ridge, or answer the banners. Each road asks something of us.',
        ),
        line(
          'saran',
          caredFor
            ? 'The families have worked together. Let them help decide what we carry.'
            : 'We have kept one another safe. Now we must decide what safety allows us to promise.',
        ),
        line(
          'erden',
          `We have ${run.clan.population} people to bring through. I will count them again on the far bank.`,
        ),
      ],
      choices: [
        choice(
          'pack-food',
          'Prepare the provisions',
          'Boro gathers the last usable grazing into travelling stores.',
          'The herders tie their stores onto the wagons. Choose the route when you are ready.',
          'food',
          'wander',
        ),
        choice(
          'pack-tools',
          'Prepare the wagons',
          'Erden organizes spare wood and harness for the crossing.',
          'Erden makes room for a broken wheel before there is one. Choose the route when you are ready.',
          'materials',
          'iron',
        ),
      ],
    },
    river: {
      act: 1,
      title: 'Voices across the ice.',
      image: 'intro-fallen-sky.png',
      setting:
        'Silent River · Winter has entered the wrong season. A familiar voice calls from beyond the ice.',
      lines: [
        line('nara', 'It sounds like someone we knew. It says there is a shorter road.'),
        line('saran', 'I know the sound. I do not know what is making it.'),
        line('boro', 'The bank is firm where the reeds bend. We can test the ground together.'),
        line(
          'erden',
          rescued
            ? 'The families we brought through have another name for this river. Let us hear their route as well.'
            : 'I have heard promises that ask for obedience before they offer safety. We should look for ourselves.',
        ),
      ],
      choices: [
        choice(
          'test-river',
          'Trust the ground',
          'Boro searches the bank for a usable ford and winter feed.',
          'The clan follows the tested bank. The distant voice loses itself in the wind.',
          'food',
          'wander',
        ),
        choice(
          'keep-names',
          'Keep the names together',
          'Saran gathers the households to answer one another with remembered songs.',
          'The living voices carry across the camp. Nara stays beside the fire.',
          'spirit',
          'sky',
        ),
      ],
    },
    promise: {
      act: 2,
      title: 'A promise chosen.',
      image: 'intro-caravan.png',
      setting:
        'Broken Pass · Act II begins. Households tie scraps of their own cloth into the blue banner. Erden holds an unmarked strip.',
      lines: [
        line('saran', 'Every household has brought a piece. Whose banner is it now?'),
        line('nara', 'Ours. Even the parts that are different colors.'),
        line(
          'erden',
          `I counted ${run.clan.population} people at the crossing. I would like the banner to promise that we count again before we leave.`,
        ),
        line('boro', 'Then we each take a part of keeping that promise.'),
      ],
      choices: [
        choice(
          'promise-guard',
          'We will watch for one another',
          'The households organize a shared watch around the camp.',
          'Each family names someone to look for when the wagons move. The banner belongs to all of them.',
          'resolve',
          'iron',
        ),
        choice(
          'promise-remember',
          'We will carry every name',
          'Saran teaches a song with room for each household to answer.',
          'One voice becomes several. Erden ties his blank strip into the cloth.',
          'spirit',
          'sky',
        ),
      ],
    },
    earth: {
      act: 2,
      title: 'When the earth moves.',
      image: 'intro-caravan.png',
      setting:
        'Broken Pass · Boro watches the cracks in the slope while the families tend the wheels and harness.',
      lines: [
        line(
          'boro',
          'The ground warns us before it breaks. Give me time to watch it, and I can call the wagons across.',
        ),
        line(
          'saran',
          weathered
            ? 'We have paid for this road already. Sit beside the fire while the next watch takes its turn.'
            : 'We still have strength to share. Let the tired hands rest before the next climb.',
        ),
        line('nara', 'I can carry the water. You do not have to give me the smallest bowl.'),
      ],
      choices: [
        choice(
          'mend-wheels',
          'Mend the wheels together',
          'The households sort reusable timber and repair their travelling tools.',
          'Hands that argued at the river work the same harness. Boro takes the first watch on the slope.',
          'materials',
          'iron',
        ),
        choice(
          'rest-hands',
          'Let the tired hands rest',
          'Saran shares the fire while fresh hands take over camp duties.',
          'The work continues around the people who need a moment beside the hearth.',
          'resolve',
          'wander',
        ),
      ],
    },
    court: {
      act: 2,
      title: 'The court’s empty promise.',
      image: 'intro-iron-vow.png',
      setting:
        'Before the final departure · Erden unfolds a tally sheet bearing the seal of the Last Court.',
      lines: [
        line(
          'erden',
          'I counted households for the court. Taxes. Soldiers. Obligations. I stood in the courtyard when they spoke the Iron Vow.',
        ),
        line('boro', 'You were there, and you kept this from us?'),
        line(
          'erden',
          'I was afraid you would hear the court whenever I spoke. I saw the sky tear. I cannot tell you what Heaven intended. I can tell you what we did.',
        ),
        line('saran', 'Then begin with what you can do for the people here.'),
      ],
      choices: [
        choice(
          'trust-erden',
          'Put the tally in shared hands',
          'Erden works with the households to organize the remaining supplies.',
          'Erden reads every entry aloud. The families correct it together; no name belongs to the court.',
          'materials',
          'wander',
        ),
        choice(
          'hear-erden',
          'Hear the whole account',
          'Saran and the households listen, question, and record what Erden witnessed.',
          'The court’s actions become a memory the clan can examine. Its claim over them ends at this fire.',
          'spirit',
          'sky',
        ),
      ],
    },
    opening: {
      act: 2,
      title: 'The narrow opening.',
      image: 'intro-caravan.png',
      setting:
        'Heart of the Steppe · The valley lies beyond fallen stone and ice. Families begin clearing the narrow approach as the eclipse reddens the sky.',
      lines: [
        line(
          'boro',
          'There is a way through. We need time to clear it, and riders to keep the approach open.',
        ),
        line(
          'erden',
          trustedClerk
            ? 'The households have the tally. Each knows which wagon follows theirs.'
            : 'I will count the wagons at the opening. Ask anyone here to check me.',
        ),
        line(
          'saran',
          `We have brought ${run.clan.population} people this far. Ride for them while we make the passage ready.`,
        ),
      ],
      choices: [
        choice(
          'hold-watch',
          'Organize the last watch',
          'Riders and households prepare to take turns defending the approach.',
          'The watches take their places. The clan begins the work behind them.',
          'resolve',
          'iron',
        ),
        choice(
          'share-last-meal',
          'Share a meal before the work',
          'Boro gathers the last stores close to the people clearing the path.',
          'Food passes from hand to hand. There will be work enough for everyone.',
          'food',
          'wander',
        ),
      ],
    },
    road: {
      act: 2,
      title: 'Hold the road.',
      image: 'intro-hearth.png',
      setting:
        'The last stand · The gap widens. Beyond the defenders, Nara reaches for the covered ember vessel.',
      lines: [
        line('nara', 'I can carry it now. Keep your hands free for the people coming after us.'),
        line('saran', 'Keep the cover steady. A small fire is enough to begin again.'),
        line(
          'boro',
          run.clan.finalBossDefeated
            ? 'The great creature has fallen, but the wagons still need us. Hold the approach.'
            : 'The great creature is still coming. We need a road through, and time to use it.',
        ),
      ],
      choices: [
        choice(
          'hold-together',
          'Hold together',
          'The defenders hear the households answering behind them.',
          'The blue cloth moves above the wagons. Every watch knows what it is holding for.',
          'resolve',
          'iron',
        ),
        choice(
          'carry-song',
          'Carry the song forward',
          'Saran calls each household into the song they will take through the passage.',
          'Nara carries the covered embers. The song travels beside the wagons.',
          'spirit',
          'sky',
        ),
      ],
    },
  };
  const scene = { id, ...scenes[id] };
  // Population is abstract. A tiny remnant cannot stage a conversation among four
  // named people, and the game never claims which individual casualties occurred.
  if (run.clan.population < 5) {
    const remembrance: Record<StoryBeat, string> = {
      fire: 'The carried embers become a small fire. A place beside it is still a promise.',
      departure: 'The gers can be packed. The remaining hands must choose what to carry east.',
      river: 'A familiar voice calls beyond the ice. The tested bank offers a way through.',
      promise:
        'Scraps of cloth are tied into the blue banner. Those who remain keep the promise to count before leaving.',
      earth: 'The ground warns before it breaks. The wheels and harness need patient work.',
      court:
        'A folded tally from the Last Court records what happened in the courtyard. Its witness left questions that the road has not answered.',
      opening: 'Beyond the fallen stone lies the valley. The passage will take time to clear.',
      road: 'The gap is widening. The carried embers need a road through, and the defenders must hold it.',
    };
    return {
      ...scene,
      setting: `${run.clan.population} ${run.clan.population === 1 ? 'survivor remains' : 'survivors remain'} beneath the blue banner. The road is remembered in fewer voices.`,
      lines: [line('clan', remembrance[id])],
      choices: scene.choices.map((option) => ({
        ...option,
        label: {
          food: 'Gather what provisions remain',
          materials: 'Keep the travelling tools',
          spirit: 'Carry the names forward',
          resolve: 'Steady the next watch',
        }[option.benefit],
        description: {
          food: 'Gather the remaining stores for the next part of the journey.',
          materials: 'Put reusable timber and harness to work.',
          spirit: 'Carry a remembered song into the next camp.',
          resolve: 'Take time to recover before the next watch.',
        }[option.benefit],
        response:
          run.clan.population === 1
            ? 'The survivor records the decision and puts it into practice.'
            : 'Those who remain record the decision and put it into practice.',
      })),
    };
  }
  return scene;
}

export function epilogueText(run: RunState): readonly string[] {
  const clan = run.clan;
  const identity = clanDoctrine(run);
  const single = clan.population === 1;
  const sharedTally = run.story.records.some((record) => record.choice?.id === 'trust-erden');
  return [
    `${clan.population} ${single ? 'person' : 'people'} and ${clan.herd} ${clan.herd === 1 ? 'animal' : 'animals'} reach the sheltered valley. ${clan.finalBossDefeated ? 'The Skybreaker has fallen behind them.' : 'The Skybreaker still walks beyond the mountain.'} The passage has given the living a road through.`,
    run.story.peopleLost > 0
      ? `The ${single ? 'last survivor remembers' : 'survivors remember'} the ${run.story.peopleLost} ${run.story.peopleLost === 1 ? 'person' : 'people'} lost along the road. Their names have a place beside the fire.`
      : 'Saran sets the spare bowl beside the new hearth. The carried embers catch in fresh kindling.',
    single
      ? `The tally carries the clan’s name: ${identity}. Its promise belongs to the next camp as well.`
      : identity === 'The Iron Horde'
        ? 'The Iron Horde posts riders above the approach, then sends tired guards back to eat with their families.'
        : identity === 'Children of the Eternal Sky'
          ? 'The Children of the Eternal Sky begin a song in several voices. Each household finds its own place in the answer.'
          : identity === 'The Wandering Nation'
            ? 'The Wandering Nation leaves room between its gers for more arrivals. The next task is learning how many the pasture can support.'
            : 'The households raise their gers around a common fire. Their people are still taking shape.',
    run.story.peopleLost > 0 || clan.population < 5
      ? `${single ? 'The last survivor lights' : 'The remaining hands light'} a hearth from the carried embers. A spare bowl waits beside it.`
      : sharedTally
        ? 'Erden reads the tally aloud, and the families answer for themselves. Nara brings another bowl.'
        : 'Nara sets down the covered ember vessel and asks who will be coming next.',
    'Keep a place beside the fire. Someone is still coming home.',
  ];
}

export function storyGiftLabel(benefit: StoryChoice['benefit']): string {
  return `+${GAME.story.gifts[benefit]} ${benefit === 'resolve' ? 'clan resolve' : benefit}`;
}
