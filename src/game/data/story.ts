import { GAME } from '../config';
import { clanDoctrine } from '../state/clan';
import { currentLocation } from '../state/journey';
import { companionBonds, storyChoice } from '../state/storyBonds';
import { firstStop, secondStop, type StoryResponse } from './storyDestinations';
import type { LocationId, RunState } from '../types';
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
  newcomer: { name: 'A newcomer', role: 'Rescued household', mark: 'banner' },
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
const fromResponse = (
  id: string,
  text: StoryResponse,
  benefit: StoryChoice['benefit'],
  doctrine: StoryChoice['doctrine'],
): StoryChoice => choice(id, text.label, text.description, text.response, benefit, doctrine);

/** The camp reached by a completed crossing, if the journey has actually been there. */
export function stopAt(run: RunState, region: number): LocationId | undefined {
  return run.story.crossings.find((crossing) => crossing.region === region)?.locationId;
}

/** Facts the companions can truthfully refer to when a scene opens. */
function storyContext(run: RunState) {
  const firstCrossing = run.story.crossings.find((crossing) => crossing.region === 1);
  return {
    place: currentLocation(run).name.replace(/^The /, ''),
    people: run.clan.population,
    lost: run.story.peopleLost,
    weathered: run.clan.integrity < 50 || run.story.peopleLost > 0,
    rescuedFirst: firstCrossing?.route === 'refuge',
    rescued: run.story.crossings.some((crossing) => crossing.route === 'refuge'),
    khan: run.khan.generation,
    tradition: run.startingTradition ?? 'shared-hearth',
    bonds: companionBonds(run),
    chose: (beat: StoryBeat) => storyChoice(run, beat),
  };
}
type StoryContext = ReturnType<typeof storyContext>;

const FIRE_SETTINGS: Record<NonNullable<RunState['startingTradition']>, string> = {
  'shared-hearth':
    'Golden Pasture · Eight survivors unpack two gers and divide what is left into even shares. Saran coaxes the carried embers into flame.',
  outriders:
    'Golden Pasture · Eight survivors unpack two gers. One of the three horses already carries a second rider’s gear. Saran coaxes the carried embers into flame.',
  hearthkeepers:
    'Golden Pasture · Eight survivors raise two gers braced with the last good timber. Saran coaxes the carried embers into flame.',
  pathfinders:
    'Golden Pasture · Eight survivors unpack two light gers; half the stores were left behind to travel faster. Saran coaxes the carried embers into flame.',
};

const FIRE_BORO: Record<NonNullable<RunState['startingTradition']>, string> = {
  'shared-hearth':
    'An empty bowl is easy to set down. Filling it is herders’ work. Three horses, Saran.',
  outriders: 'We put a second rider on one of three horses. I hope the road is worth the horse.',
  hearthkeepers: 'We spent our timber on walls. Walls keep the wind out. They don’t fill bowls.',
  pathfinders: 'We left half the stores behind to move fast. Fast to where, with what?',
};

function fire(c: StoryContext): Omit<StoryEncounter, 'id'> {
  return {
    act: 1,
    title: 'A place beside the fire.',
    image: 'intro-hearth.png',
    setting: FIRE_SETTINGS[c.tradition],
    lines: [
      line('nara', 'Who is the empty bowl for?'),
      line('saran', 'Whoever reaches us next. A hearth keeps room for a promise.'),
      line('boro', FIRE_BORO[c.tradition]),
      line(
        'erden',
        'Eight people. Three horses. Two gers. I can keep the tally, if you will let me. I have kept larger ones.',
      ),
    ],
    choices: [
      choice(
        'share-work',
        'Share the work',
        'Saran’s way: every household salvages felt and timber, and Nara is given real work.',
        'Saran sets the spare bowl beside the others. Nara is handed a mallet and does not give it back.',
        'materials',
        'wander',
      ),
      choice(
        'share-watch',
        'Share the watch',
        'Boro’s way: pair each household with a rider so everyone knows who guards them.',
        'Boro names the first watch and takes the coldest hour himself. You no longer face every approach alone.',
        'resolve',
        'iron',
      ),
    ],
  };
}

function departure(c: StoryContext, run: RunState): Omit<StoryEncounter, 'id'> {
  const fireChoice = c.chose('fire');
  return {
    act: 1,
    title: 'More mouths, more hands.',
    image: 'intro-steppe.png',
    setting:
      'The first departure · The grazing is thinning. On the eastern horizon, Nara has seen scraps of blue cloth: other households, signalling.',
    lines: [
      line('nara', 'There are banners out there. Blue, like ours. Someone is asking for help.'),
      line(
        'boro',
        'Someone. Or something that learned our colour. Every mouth we take eats from the same sack.',
      ),
      line(
        'saran',
        fireChoice === 'share-watch'
          ? 'You named a watch for eight, Boro. You can name one for twenty.'
          : fireChoice === 'share-work'
            ? 'That is what the bowl is for. The families built this camp; let them help decide.'
            : 'We have kept one another alive. Now we decide what that lets us promise.',
      ),
      line(
        'erden',
        `${Math.floor(run.clan.food)} measures of food. ${c.people} people. Fewer days with guests. I can give you the number. I cannot give you the answer.`,
      ),
    ],
    choices: [
      choice(
        'pack-food',
        'Fill the stores first',
        'Boro dries the last grazing into travelling stores, whoever the road brings.',
        'Boro packs the stores tight. “Whoever we meet will eat,” he says. “So will we.” Choose the road when you are ready.',
        'food',
        'wander',
      ),
      choice(
        'pack-tools',
        'Make room in the wagons',
        'Erden repacks every load so there is space for people as well as goods.',
        'Erden finds room for four more sleepers. He loads a cart like someone who has moved an army. Choose the road when you are ready.',
        'materials',
        'iron',
      ),
    ],
  };
}

/** One line acknowledging what the first crossing actually brought, or left empty. */
function firstArrivalNote(c: StoryContext): StoryLine[] {
  const departureChoice = c.chose('departure');
  if (c.rescuedFirst)
    return [
      line('newcomer', 'We came in under your banner. We know a little of this country. Ask us.'),
      departureChoice === 'pack-tools'
        ? line('nara', 'The room we made in the wagons is full. Good.')
        : line('boro', 'Good thing we filled the stores. Our guests eat like wolves. So do I.'),
    ];
  if (c.lost > 0)
    return [line('saran', 'We left someone on the road. Keep the names close tonight.')];
  if (departureChoice === 'pack-tools')
    return [
      line(
        'nara',
        'We made room in the wagons and nobody is sleeping in it. I keep looking at it.',
      ),
    ];
  return [];
}

function river(c: StoryContext, run: RunState): Omit<StoryEncounter, 'id'> {
  const stop = firstStop(currentLocation(run).id);
  return {
    act: 1,
    title: stop.title,
    image: stop.image,
    setting: stop.setting,
    lines: [...stop.lines, ...firstArrivalNote(c)],
    choices: [
      fromResponse('test-river', stop.test, 'food', 'wander'),
      fromResponse('keep-names', stop.listen, 'spirit', 'sky'),
    ],
  };
}

function promise(c: StoryContext, run: RunState): Omit<StoryEncounter, 'id'> {
  const stop = secondStop(currentLocation(run).id);
  const context: StoryLine[] =
    c.lost > 0
      ? [line('boro', `Tie a dark thread for the ${c.lost} we lost. They walked under it too.`)]
      : c.rescued
        ? [
            line('newcomer', 'Our cloth is grey. Will it hold?'),
            line('saran', 'Grey holds as well as blue.'),
          ]
        : [];
  return {
    act: 2,
    title: 'A promise chosen.',
    image: 'intro-caravan.png',
    setting: `${stop.promise} Act II begins. Households tie scraps of their own cloth into the blue banner. Erden holds an unmarked strip.`,
    lines: [
      line('saran', 'Every household has brought a piece. Whose banner is it now?'),
      line('nara', 'Ours. Even the parts that are different colours.'),
      stop.promiseLine,
      ...context,
      ...(c.khan > 1
        ? [
            line(
              'boro',
              `It has passed through ${c.khan} Khans’ hands already. Hands change. The banner doesn’t mind, as long as there are hands.`,
            ),
          ]
        : []),
      line(
        'erden',
        `I counted ${c.people} at the crossing. Let the banner promise that we count again before we leave. I have nothing of my own to tie.`,
      ),
    ],
    choices: [
      choice(
        'promise-guard',
        'We will watch for one another',
        'The households organize a shared watch, and count heads before every departure.',
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
  };
}

function earth(c: StoryContext, run: RunState): Omit<StoryEncounter, 'id'> {
  const stop = secondStop(currentLocation(run).id);
  return {
    act: 2,
    title: stop.title,
    image: stop.image,
    setting: stop.setting,
    lines: [
      ...stop.lines,
      line(
        'saran',
        c.weathered
          ? 'We have paid for this road already. Whatever we choose, let the tired rest first.'
          : 'We still have strength to share. Spend it on whoever is tired.',
      ),
    ],
    choices: [
      fromResponse('mend-wheels', stop.mend, 'materials', 'iron'),
      fromResponse('rest-hands', stop.rest, 'resolve', 'wander'),
    ],
  };
}

function court(c: StoryContext): Omit<StoryEncounter, 'id'> {
  return {
    act: 2,
    title: 'The court’s empty promise.',
    image: 'intro-iron-vow.png',
    setting: `${c.place} · Before the final departure, Erden unfolds a tally sheet bearing the seal of the Last Court.`,
    lines: [
      line(
        'erden',
        'I counted households for the Last Court. Taxes. Soldiers. Obligations. I stood in the courtyard when they spoke the Iron Vow.',
      ),
      line(
        'boro',
        c.bonds.erden >= GAME.story.bonds.close
          ? 'I knew you had loaded wagons for an army. I didn’t think it was that army.'
          : 'You were there. And you let us trust your numbers.',
      ),
      line(
        'erden',
        'I was afraid you would hear the court every time I spoke. I saw the sky tear. I cannot tell you what Heaven intended. I can tell you what we did.',
      ),
      line('nara', '“We.” You said “we.”'),
      line('saran', 'Then begin with what you can do for the people here.'),
    ],
    choices: [
      choice(
        'trust-erden',
        'Put the tally in shared hands',
        'Erden keeps the record, but reads it aloud for the households to correct.',
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
      choice(
        'nara-tally',
        'Give the tally to Nara',
        'Erden keeps working, but the record passes to someone the court never touched.',
        'Erden hands over the sheet without a word. Nara reads the first line aloud, slowly, then the next. Boro nods once.',
        'resolve',
        'iron',
      ),
    ],
  };
}

function opening(c: StoryContext, run: RunState): Omit<StoryEncounter, 'id'> {
  const firstChoice = c.chose('river');
  const first = firstStop(stopAt(run, 1));
  const recall =
    firstChoice === 'test-river'
      ? [first.recall.test]
      : firstChoice === 'keep-names'
        ? [first.recall.listen]
        : [];
  const tally = {
    'trust-erden': line(
      'erden',
      'The households have the tally. Each knows which wagon follows theirs.',
    ),
    'hear-erden': line(
      'erden',
      'My account of the court is written down. Now I will count the wagons, and anyone may check me.',
    ),
    'nara-tally': line(
      'nara',
      'I have the tally. Every wagon, every name. Erden checked my sums twice.',
    ),
  }[c.chose('court') as 'trust-erden' | 'hear-erden' | 'nara-tally'];
  return {
    act: 2,
    title: 'The narrow opening.',
    image: 'intro-caravan.png',
    setting:
      'Heart of the Steppe · The valley lies beyond fallen stone and ice. Families begin clearing the narrow approach as the eclipse reddens the sky.',
    lines: [
      line(
        'boro',
        'There is a way through. We need time to clear it, and riders to hold the approach.',
      ),
      ...recall,
      tally ??
        line('erden', 'I will count the wagons at the opening. Ask anyone here to check me.'),
      line(
        'saran',
        `We have brought ${c.people} people this far${c.rescued ? ', the households from the blue banners among them' : ''}.${c.khan > 1 ? ` The banner rides with Khan ${c.khan} now.` : ''} Ride for them while we make the passage ready.`,
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
  };
}

function road(c: StoryContext, run: RunState): Omit<StoryEncounter, 'id'> {
  const secondChoice = c.chose('earth');
  const second = secondStop(stopAt(run, 2));
  const recall =
    secondChoice === 'mend-wheels'
      ? [second.recall.mend]
      : secondChoice === 'rest-hands'
        ? [second.recall.rest]
        : [];
  const naraTrusted = c.bonds.nara >= GAME.story.bonds.close;
  return {
    act: 2,
    title: 'Hold the road.',
    image: 'intro-hearth.png',
    setting:
      'The last stand · The gap widens. Beyond the defenders, Nara reaches for the covered ember vessel.',
    lines: [
      line('nara', 'I can carry it now. Keep your hands free for the people coming after us.'),
      ...(naraTrusted
        ? [
            line(
              'saran',
              'I know you can. You have been carrying things since the first camp. Keep the cover steady.',
            ),
          ]
        : [
            line('saran', 'Your hands are small for it.'),
            line('nara', 'They are steady. Keep yours on the wagons.'),
          ]),
      ...recall,
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
  };
}

/** Resolve conditional dialogue once, when the scene opens, so the record keeps what was said. */
export function storyEncounter(run: RunState, id: StoryBeat): StoryEncounter {
  const c = storyContext(run);
  const compose: Record<StoryBeat, () => Omit<StoryEncounter, 'id'>> = {
    fire: () => fire(c),
    departure: () => departure(c, run),
    river: () => river(c, run),
    promise: () => promise(c, run),
    earth: () => earth(c, run),
    court: () => court(c),
    opening: () => opening(c, run),
    road: () => road(c, run),
  };
  const scene = { id, ...compose[id]() };
  // Population is abstract. A tiny remnant cannot stage a conversation among four
  // named people, and the game never claims which individual casualties occurred.
  if (run.clan.population < 5) {
    const remembrance: Record<StoryBeat, string> = {
      fire: 'The carried embers become a small fire. A place beside it is still a promise.',
      departure: 'The gers can be packed. The remaining hands must choose what to carry onward.',
      river: `${c.place} · The White Silence makes familiar signs unreliable. The remaining hands decide what to trust.`,
      promise:
        'Scraps of cloth are tied into the blue banner. Those who remain keep the promise to count before leaving.',
      earth: `${c.place} · The ground shifts beneath the camp. The wheels, the harness, and the tired hands all need tending.`,
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
