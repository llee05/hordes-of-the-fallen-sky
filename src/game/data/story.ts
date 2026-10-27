import { GAME } from '../config';
import { clanDoctrine } from '../state/clan';
import { chapterLocation, currentLocation, locationById } from '../state/journey';
import { ALL_ENEMIES, SKYBREAKER } from './enemies';
import { companionBonds, companionStanding, storyChoice } from '../state/storyBonds';
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
    'Golden Pasture · Eight survivors put up two gers and split what is left into even shares. Saran kneels over the carried embers and coaxes them into a flame.',
  outriders:
    'Golden Pasture · Eight survivors put up two gers. One of the three horses is already loaded with a second rider’s gear. Saran kneels over the carried embers and coaxes them into a flame.',
  hearthkeepers:
    'Golden Pasture · Eight survivors raise two gers, braced with the last sound timber they have. Saran kneels over the carried embers and coaxes them into a flame.',
  pathfinders:
    'Golden Pasture · Eight survivors put up two light gers. Half the stores were left behind so they could travel faster. Saran kneels over the carried embers and coaxes them into a flame.',
};

const FIRE_BORO: Record<NonNullable<RunState['startingTradition']>, string> = {
  'shared-hearth':
    'Setting down an empty bowl is easy. Filling it is herders’ work, and we have three horses, Saran.',
  outriders:
    'One of our three horses is carrying gear for two riders now. I hope the road is worth what that costs her.',
  hearthkeepers: 'We spent the timber on walls. Walls keep out the wind. They don’t fill bowls.',
  pathfinders: 'We left half the stores behind to move fast. Fast toward what? With what?',
};

function fire(c: StoryContext): Omit<StoryEncounter, 'id'> {
  return {
    act: 1,
    title: 'A place beside the fire.',
    image: 'intro-hearth.png',
    setting: FIRE_SETTINGS[c.tradition],
    lines: [
      line('nara', 'Who’s the empty bowl for?'),
      line(
        'saran',
        'For whoever reaches us next. A hearth always keeps a place for someone still on the road.',
      ),
      line('boro', FIRE_BORO[c.tradition]),
      line(
        'erden',
        'Eight people, three horses, two gers. I could keep the tally, if you will allow it. I have kept larger ones.',
      ),
    ],
    choices: [
      choice(
        'share-work',
        'Share the work',
        'Saran’s way: every household salvages felt and timber, and Nara gets real work to do.',
        'Saran sets the spare bowl beside the others. Someone hands Nara a mallet, and she doesn’t give it back.',
        'materials',
        'wander',
      ),
      choice(
        'share-watch',
        'Share the watch',
        'Boro’s way: pair every household with a rider, so each one knows who is guarding it.',
        'Boro names the first watch and takes the coldest hour for himself. You no longer have to face every approach alone.',
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
      'The first departure · The grazing is thinning. Far off to the east, Nara has spotted scraps of blue cloth: other households, signalling for help.',
    lines: [
      line('nara', 'There are banners out there. Blue, like ours. Someone’s asking for help.'),
      line(
        'boro',
        'Someone. Or something that’s learned our colour. Every mouth we take in eats from the same sack.',
      ),
      line(
        'saran',
        fireChoice === 'share-watch'
          ? 'You named a watch for eight, Boro. You can name one for twenty.'
          : fireChoice === 'share-work'
            ? 'That is what the spare bowl is for. The families built this camp. Let them have a say in this too.'
            : 'We have kept one another alive so far. Now we decide what that lets us promise.',
      ),
      line(
        'erden',
        `${Math.floor(run.clan.food)} measures of food for ${c.people} people. With guests, it lasts fewer days. I can give you the number. The answer is not mine to give.`,
      ),
    ],
    choices: [
      choice(
        'pack-food',
        'Fill the stores first',
        'Boro dries the last of the grazing into travelling stores, for whoever the road brings.',
        'Boro packs the stores tight. “Whoever we meet will eat,” he says. “So will we.” Choose the road when you are ready.',
        'food',
        'wander',
      ),
      choice(
        'pack-tools',
        'Make room in the wagons',
        'Erden repacks every load so there is space for people as well as goods.',
        'Erden finds room for four more sleepers. He loads a cart like a man who has moved an army before. Choose the road when you are ready.',
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
      line(
        'newcomer',
        'We came in under your banner, and we know this country a little. Ask us anything.',
      ),
      departureChoice === 'pack-tools'
        ? line('nara', 'The room we made in the wagons is full now. Good.')
        : line('boro', 'Good thing we filled the stores. Our guests eat like wolves. So do I.'),
    ];
  if (c.lost > 0)
    return [line('saran', 'We left someone on the road. Keep their name close tonight.')];
  if (departureChoice === 'pack-tools')
    return [
      line(
        'nara',
        'We made room in the wagons, and nobody is sleeping in it. I keep looking at the gap.',
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
      ? [
          line(
            'boro',
            c.lost === 1
              ? 'Tie in a dark thread for the one we lost. They walked under this cloth too.'
              : `Tie in a dark thread for each of the ${c.lost} we lost. They walked under this cloth too.`,
          ),
        ]
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
    setting: `${stop.promise} One by one, the households tie scraps of their own cloth into the blue banner. Erden holds a strip with nothing on it.`,
    lines: [
      line('saran', 'Every household has brought a piece. Whose banner is it now?'),
      line('nara', 'Ours. Even the bits that are different colours.'),
      stop.promiseLine,
      ...context,
      ...(c.khan > 1
        ? [
            line(
              'boro',
              `It’s been through ${c.khan} Khans’ hands already. Hands change. The banner doesn’t mind, as long as there are hands to hold it.`,
            ),
          ]
        : []),
      line(
        'erden',
        `I counted ${c.people} at the crossing. Let the banner hold us to counting again before every departure. I have nothing of my own to tie on.`,
      ),
    ],
    choices: [
      choice(
        'promise-guard',
        'We will watch for one another',
        'The households set up a shared watch and count heads before every departure.',
        'Each family names someone to look out for when the wagons move. The banner belongs to all of them now.',
        'resolve',
        'iron',
      ),
      choice(
        'promise-remember',
        'We will carry every name',
        'Saran teaches a song with a place in it for every household to answer.',
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
          ? 'This road has cost us already. Whatever we choose, the tired rest first.'
          : 'We still have strength to spare. Let it go to whoever is most tired.',
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
    setting: `${c.place} · With the last departure close, Erden unfolds a tally sheet stamped with the seal of the Last Court.`,
    lines: [
      line(
        'erden',
        'I counted households for the Last Court: their taxes, their soldiers, what each of them owed. I was standing in the courtyard when they spoke the Iron Vow.',
      ),
      line(
        'boro',
        c.chose('departure') === 'pack-tools'
          ? 'I knew you’d loaded wagons for an army. I didn’t think it was that army.'
          : 'You were there. And you let us trust your numbers all this way.',
      ),
      line(
        'erden',
        'I was afraid that every time I spoke, you would hear the court. I saw the sky tear. I cannot tell you what Heaven meant by it. I can only tell you what we did.',
      ),
      line('nara', '“We.” You said “we.”'),
      line('saran', 'Then start with what you can do for the people in front of you.'),
    ],
    choices: [
      choice(
        'trust-erden',
        'Put the tally in shared hands',
        'Erden keeps the record, but reads it aloud so the households can correct it.',
        'Erden reads every entry aloud, and the families correct it together. No name in it belongs to the court any more.',
        'materials',
        'wander',
      ),
      choice(
        'hear-erden',
        'Hear the whole account',
        'Saran and the households listen, ask their questions, and write down what Erden saw.',
        'What the court did becomes something the clan can remember and question. Its claim on them ends at this fire.',
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
      'The households have the tally now. Each one knows which wagon follows theirs.',
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
      'Heart of the Steppe · The valley lies beyond fallen stone and ice. As the eclipse reddens the sky, the families start clearing the narrow approach.',
    lines: [
      line(
        'boro',
        'There’s a way through. We need time to clear it, and riders to hold the approach.',
      ),
      ...recall,
      tally ?? line('erden', 'I will count the wagons at the opening. Anyone here may check me.'),
      line(
        'saran',
        `We have brought ${c.people} people this far${c.rescued ? ', the households from the blue banners among them' : ''}.${c.khan > 1 ? ` The banner rides with Khan ${c.khan} now.` : ''} Ride for them while we open the way.`,
      ),
    ],
    choices: [
      choice(
        'hold-watch',
        'Organize the last watch',
        'Riders and households take turns defending the approach.',
        'The watches take their places, and behind them the clan sets to work.',
        'resolve',
        'iron',
      ),
      choice(
        'share-last-meal',
        'Share a meal before the work',
        'Boro brings the last stores up to the people clearing the path.',
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
      'The last stand · The gap is widening. Behind the defenders, Nara reaches for the covered ember vessel.',
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
            line('nara', 'They’re steady. Keep yours on the wagons.'),
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
        'The defenders can hear the households answering behind them.',
        'The blue cloth stirs above the wagons. Every watch knows what it is holding the road for.',
        'resolve',
        'iron',
      ),
      choice(
        'carry-song',
        'Carry the song forward',
        'Saran calls each household into the song they’ll carry through the passage.',
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
      fire: 'The carried embers make a small fire. Even now, a place beside it is kept for whoever comes.',
      departure:
        'The grazing is thinning and the gers must come down. Whatever goes onward has to fit in the hands that are left.',
      river: `${c.place} · ${firstStop(currentLocation(run).id).remnant}`,
      promise:
        'Scraps of cloth go into the blue banner all the same. The promise holds, however few keep it: count who is left before every departure.',
      earth: `${c.place} · ${secondStop(currentLocation(run).id).remnant}`,
      court:
        'Among the packs is a folded tally sheet stamped with the Last Court’s seal. It records what happened in the courtyard, and its witness left questions the road has not answered.',
      opening: 'Past the fallen stone lies the valley. Clearing the passage will take time.',
      road: 'The gap is widening. The carried embers need a road through, and someone has to hold it.',
    };
    return {
      ...scene,
      setting: `${run.clan.population} ${run.clan.population === 1 ? 'survivor remains beneath the blue banner. One voice carries the memory of the road now.' : 'survivors remain beneath the blue banner. Fewer voices carry the memory of the road now.'}`,
      lines: [line('clan', remembrance[id])],
      choices: scene.choices.map((option) => ({
        ...option,
        label: {
          food: 'Gather what food is left',
          materials: 'Keep the travelling tools in order',
          spirit: 'Carry the names forward',
          resolve: 'Steady the next watch',
        }[option.benefit],
        description: {
          food: 'Pack what stores remain for the next stretch of road.',
          materials: 'Mend whatever timber and harness can still be used.',
          spirit: 'Carry a remembered song into the next camp.',
          resolve: 'Rest and recover before the next watch.',
        }[option.benefit],
        response:
          run.clan.population === 1
            ? 'The survivor marks the choice in the tally and gets on with the work.'
            : 'Those who remain mark the choice in the tally and get on with the work.',
      })),
    };
  }
  return scene;
}

function locationName(id: LocationId | undefined): string | undefined {
  return id && locationById(id)?.name.replace(/^The /, 'the ');
}

/** One remembered image from each chosen camp, in visit order. No companion names. */
function rememberedRoads(run: RunState): string | undefined {
  const firstId = stopAt(run, 1);
  const secondId = stopAt(run, 2);
  const firstKey = { 'test-river': 'test', 'keep-names': 'listen' }[
    storyChoice(run, 'river') ?? ''
  ] as 'test' | 'listen' | undefined;
  const secondKey = { 'mend-wheels': 'mend', 'rest-hands': 'rest' }[
    storyChoice(run, 'earth') ?? ''
  ] as 'mend' | 'rest' | undefined;
  const images: string[] = [];
  const unspoken: string[] = [];
  if (firstId) {
    if (firstKey) images.push(firstStop(firstId).remembered[firstKey]);
    else unspoken.push(locationName(firstId)!);
  }
  if (secondId) {
    if (secondKey) images.push(secondStop(secondId).remembered[secondKey]);
    else unspoken.push(locationName(secondId)!);
  }
  if (unspoken.length)
    images.push(
      `The road also passed through ${unspoken.join(' and ')}, where the clan made camp and moved on.`,
    );
  return images.length ? images.join(' ') : undefined;
}

/**
 * Companion outcomes follow trust and the court decision. After any loss, the ending speaks
 * of their practices rather than placing all four named companions at the new fire.
 */
function companionsEnding(run: RunState): string {
  const court = storyChoice(run, 'court');
  const close = (companion: 'saran' | 'boro' | 'erden' | 'nara') =>
    companionStanding(run, companion) === 'close';
  const strained = (companion: 'boro' | 'erden') =>
    companionStanding(run, companion) === 'strained';
  if (run.story.peopleLost > 0) {
    return [
      close('nara')
        ? 'The embers came through the passage in young hands.'
        : 'The covered embers came through the passage.',
      close('saran') && close('boro')
        ? 'The spare bowl is filled before anyone eats, the way Saran asked and Boro made possible.'
        : 'The spare bowl waits beside the new hearth.',
      court === 'trust-erden'
        ? 'The tally is read aloud, as Erden promised, and the families answer for themselves.'
        : court === 'hear-erden'
          ? 'The account of the courtyard is kept beside the songs: a warning, not a scripture.'
          : court === 'nara-tally'
            ? 'The tally is kept by younger hands now, and checked by older ones.'
            : 'Someone counts the gers twice and says the number aloud, as Erden taught.',
    ].join(' ');
  }
  return [
    close('nara')
      ? 'Nara sets down the ember vessel she carried through the passage and lights the new hearth herself.'
      : 'Nara sets down the covered ember vessel and asks who is coming next.',
    close('saran')
      ? 'For once, Saran lets someone else feed the fire, and sits down.'
      : 'Saran feeds the new fire, as she always has.',
    close('boro') && close('saran')
      ? 'Boro, who once asked what they could feed a stranger, fills the spare bowl himself.'
      : strained('boro')
        ? 'Boro counts the horses twice when he thinks nobody is looking. He is not wrong to.'
        : close('boro')
          ? 'Boro walks the new pasture and admits, grudgingly, that it will do.'
          : 'Boro checks the grass and says nothing, which, from Boro, counts as praise.',
    court === 'trust-erden'
      ? 'Erden reads the tally aloud, and the families answer for themselves.'
      : court === 'hear-erden'
        ? 'Erden’s account of the courtyard is kept beside the songs: a warning, not a scripture.'
        : court === 'nara-tally'
          ? 'Nara keeps the tally now. Erden checks her sums, and she lets him.'
          : strained('erden')
            ? 'Erden works at the edge of the firelight, counting, still unsure of his welcome.'
            : 'Erden counts the gers twice and says the number aloud.',
  ].join(' ');
}

export function epilogueText(run: RunState): readonly string[] {
  const clan = run.clan;
  const identity = clanDoctrine(run);
  const single = clan.population === 1;
  const few = clan.population < 5;
  const fallen = run.khan.generation - 1 + (run.khan.successionRemaining > 0 ? 1 : 0);
  const rescued = run.story.crossings.some((crossing) => crossing.route === 'refuge');
  const roads = rememberedRoads(run);
  return [
    `${clan.population} ${single ? 'person' : 'people'} and ${clan.herd} ${clan.herd === 1 ? 'animal' : 'animals'} come through the passage into the sheltered valley, under a stretch of sky that has not torn. ${clan.finalBossDefeated ? 'The Skybreaker has fallen behind them.' : 'The Skybreaker still walks beyond the mountain.'}${fallen > 0 ? ` ${fallen === 1 ? 'One Khan' : `${fallen} Khans`} fell keeping the road, and the banner came through in other hands.` : ''}`,
    run.story.peopleLost > 0
      ? `${run.story.peopleLost === 1 ? 'One person was' : `${run.story.peopleLost} people were`} lost on the road. ${single ? 'The last survivor keeps' : 'The survivors keep'} a place beside the fire for ${run.story.peopleLost === 1 ? 'that name' : 'their names'}.`
      : `Saran sets the spare bowl down beside the new hearth, and the carried embers catch in fresh kindling.${rescued ? ' The households who came in under the blue banners raise their gers beside the first two.' : ''}`,
    ...(roads ? [roads] : []),
    ...(few ? [] : [companionsEnding(run)]),
    single
      ? `The tally remembers the clan as “${identity}.” Its promise goes on to the next camp.`
      : identity === 'The Iron Horde'
        ? 'The Iron Horde posts riders above the approach, then sends tired guards back to eat with their families.'
        : identity === 'Children of the Eternal Sky'
          ? 'The Children of the Eternal Sky begin a song in several voices. Each household finds its own place in the answer.'
          : identity === 'The Wandering Nation'
            ? 'The Wandering Nation leaves room between its gers for whoever arrives next. First, though, it has to learn how many this pasture can feed.'
            : 'The households raise their gers around a common fire. What kind of people they will become is still being decided.',
    ...(few
      ? [
          `${single ? 'The last survivor lights' : 'The remaining hands light'} a hearth from the carried embers and set${single ? 's' : ''} a spare bowl beside it.`,
        ]
      : []),
    'Keep a place beside the fire. Someone is still coming home.',
  ];
}

/** "a hollow wolf" for a recorded attacker, or the unreturned when the source is unknown. */
function attackerName(source: string | undefined): string {
  if (source === SKYBREAKER.title) return 'the Skybreaker';
  const known = ALL_ENEMIES.find((enemy) => (enemy.title ?? enemy.id) === source);
  if (!known) return 'the unreturned';
  const name = (known.title ?? known.id).toLowerCase();
  return `${/^[aeiou]/.test(name) ? 'an' : 'a'} ${name}`;
}

function listPlaces(names: readonly string[]): string {
  return names.length < 3
    ? names.join(' and ')
    : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

/**
 * A short account of a lost expedition, built only from what the run recorded: where the
 * clan was, the last damage it took, the camps it actually reached, its losses, and its
 * Khans. It names no companion and no place the clan never reached, so it holds for any
 * remnant, including one that no longer exists.
 */
export function defeatAccount(run: RunState): readonly string[] {
  const clan = run.clan;
  const place = locationName(currentLocation(run).id)!;
  const where =
    clan.stage === 'migration'
      ? `On the road out of ${place}`
      : clan.stage === 'final'
        ? `At ${place}, while the passage was still being cleared`
        : run.story.crossings.length === 0
          ? `At ${place}, before the clan had ever broken camp`
          : `At ${place}`;
  const how =
    clan.population <= 0
      ? 'the last of the clan was lost'
      : `the clan’s resolve gave out with ${clan.population === 1 ? 'one person' : `${clan.population} people`} still beneath the banner`;
  const blow = run.safety.lastDamage;
  const cause = !blow
    ? ''
    : {
        attack: ` The last recorded blow came from ${attackerName(blow.source)}.`,
        starvation: ' The stores had run empty; the last recorded blow came from hunger.',
        eruption: ' The last recorded blow came when the ground erupted at the camp.',
        seer: ' The last recorded blow was a seer’s strike on the camp.',
        area: ' The last recorded blow came from a spell or a shift in the land near the camp.',
      }[blow.cause];

  const reached = run.story.crossings
    .map((crossing) => locationName(crossing.locationId))
    .filter((name): name is string => !!name);
  const rescues = run.story.crossings.filter((crossing) => crossing.route === 'refuge').length;
  const lost = run.story.peopleLost;
  const khans = run.khan.generation;
  const awaitingSuccessor = run.khan.successionRemaining > 0;
  const road = [
    reached.length
      ? `The road had led from ${locationName(chapterLocation(0).id)} to ${listPlaces(reached)}.`
      : '',
    rescues
      ? `On the way, the clan answered the blue banners${rescues === 1 ? '' : rescues === 2 ? ' twice' : ` ${rescues} times`}.`
      : '',
    lost > 0
      ? `In all, ${lost === 1 ? 'one person was' : `${lost} people were`} lost on the road.`
      : '',
    khans > 1
      ? `The banner had passed through ${khans} Khans’ hands${awaitingSuccessor ? '; the last of them had fallen, and no successor had yet taken up the bow' : ''}.`
      : awaitingSuccessor
        ? 'The Khan had fallen, and no successor had yet taken up the bow.'
        : '',
    clan.finalBossDefeated ? 'The Skybreaker had already fallen.' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return [
    `${where}, ${how}.${cause}`,
    ...(road ? [road] : []),
    'The journey ends here. The road it travelled is still remembered.',
  ];
}

export function storyGiftLabel(benefit: StoryChoice['benefit']): string {
  return `+${GAME.story.gifts[benefit]} ${benefit === 'resolve' ? 'clan resolve' : benefit}`;
}
