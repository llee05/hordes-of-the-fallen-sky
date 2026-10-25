import type { LocationId } from '../types';
import type { Speaker, StoryLine } from '../story/types';

/**
 * Destination treatments for the two chosen camp stops. Real places supply terrain and
 * practical work; the White Silence, the Earth That Walks, and every incident here are
 * original fiction about the Blue Banner clan. No place speaks, commands, or demands a
 * rite, and no local tradition causes or cures the Sundering.
 *
 * Stable choice IDs keep each stop's two functions: `test-river` / `keep-names` at the
 * first stop and `mend-wheels` / `rest-hands` at the second.
 */
export interface StoryResponse {
  label: string;
  description: string;
  response: string;
}

export interface FirstStop {
  title: string;
  image: string;
  setting: string;
  lines: readonly StoryLine[];
  /** Practical testing and provisioning (`test-river`). */
  test: StoryResponse;
  /** Listening and keeping people connected (`keep-names`). */
  listen: StoryResponse;
  /** A line at the final approach recalling the response actually chosen here. */
  recall: { test: StoryLine; listen: StoryLine };
  /** An epilogue image, free of companion names so it holds after any losses. */
  remembered: { test: string; listen: string };
}

export interface SecondStop {
  /** Local framing for the banner promise that begins Act II. */
  promise: string;
  promiseLine: StoryLine;
  title: string;
  image: string;
  setting: string;
  lines: readonly StoryLine[];
  /** Preparing travelling equipment (`mend-wheels`). */
  mend: StoryResponse;
  /** Relieving tired hands (`rest-hands`). */
  rest: StoryResponse;
  recall: { mend: StoryLine; rest: StoryLine };
  remembered: { mend: string; rest: string };
}

const say = (speaker: Speaker, text: string): StoryLine => ({ speaker, text });
const respond = (label: string, description: string, response: string): StoryResponse => ({
  label,
  description,
  response,
});

export const FIRST_STOPS: Partial<Record<LocationId, FirstStop>> = {
  'silent-river': {
    title: 'Voices across the ice.',
    image: 'intro-fallen-sky.png',
    setting:
      'Silent River · Winter has entered the wrong season. A familiar voice calls from beyond the ice.',
    lines: [
      say('nara', 'It sounds like someone we knew. It says there is a shorter road.'),
      say('saran', 'I know the sound. I do not know what is making it.'),
      say('boro', 'Ice doesn’t care who’s calling. The bank is firm where the reeds bend.'),
      say('erden', 'I have heard promises that ask for obedience before they offer safety.'),
    ],
    test: respond(
      'Trust the tested ground',
      'Boro probes the bank, step by step, for a ford and winter feed.',
      'The clan follows the tested bank. The distant voice loses itself in the wind.',
    ),
    listen: respond(
      'Answer with living voices',
      'Saran gathers the households to call one another by name until the other voice falls quiet.',
      'Nara leads the answering. The living voices carry across the camp; the other one stops.',
    ),
    recall: {
      test: say('boro', 'At the river we tested every step. Test this stone the same way.'),
      listen: say('nara', 'At the river we answered with our own voices. Keep calling each other.'),
    },
    remembered: {
      test: 'At the Silent River, the clan learned to test the ground before trusting any voice.',
      listen:
        'At the Silent River, the clan learned to answer a false call with living voices; at dusk the households still call one another in by name.',
    },
  },
  otgontenger: {
    title: 'Below the snowline.',
    image: 'intro-steppe.png',
    setting:
      'Mount Otgontenger · The summit shines above the camp. The grass below it is short and thin, and the White Silence lies on it in patches.',
    lines: [
      say('nara', 'You can see half the world from here.'),
      say('boro', 'And none of it is grass. A view doesn’t feed a mare.'),
      say(
        'saran',
        'Then count what is here, Boro. Aloud. If the households know the limit, they can carry it with you.',
      ),
      say('erden', 'A number told to everyone is harder to bend. That is… in its favour.'),
    ],
    test: respond(
      'Walk the slopes with Boro',
      'Measure the grazing and dry what the herd cannot use.',
      'Boro returns with cold hands and an honest count. The stores are smaller than hoped, and nobody is surprised later.',
    ),
    listen: respond(
      'Gather the households',
      'Each family says what it can carry, and what it cannot.',
      'Nobody promises more than their back can bear. Saran writes nothing down; everyone remembers anyway.',
    ),
    recall: {
      test: say('boro', 'Count what’s really here, like below the snowline. Then promise.'),
      listen: say(
        'saran',
        'Each household said what it could carry at Otgontenger. Ask them again.',
      ),
    },
    remembered: {
      test: 'Below Otgontenger, the clan learned to count the grass before promising the bowl.',
      listen: 'Below Otgontenger, the clan learned to say aloud what each household could carry.',
    },
  },
  'bogd-khan-uul': {
    title: 'Shelter with limits.',
    image: 'intro-hearth.png',
    setting:
      'Bogd Khan Uul · Wooded slopes break the wind. For the first time since the Sundering, the gers do not shake at night.',
    lines: [
      say('saran', 'Let them sleep a full night. Let them eat a proper meal.'),
      say(
        'boro',
        'Shelter makes people slow. The White Silence won’t wait while we get comfortable.',
      ),
      say('nara', 'Can’t we be comfortable and ready? Like a horse eating with its saddle on.'),
      say(
        'erden',
        'The court built walls against every season. It was very comfortable when the sky tore.',
      ),
    ],
    test: respond(
      'Fill the travelling stores',
      'Use the sheltered days to pack before anyone fully unpacks.',
      'The packs are full by the second evening. Boro allows himself one long meal.',
    ),
    listen: respond(
      'Shorten the night watches',
      'Shorter watches, so everyone sleeps and everyone is heard at the fire.',
      'With shorter watches, people talk around the fire. Someone finally laughs.',
    ),
    recall: {
      test: say('boro', 'Full packs before comfort. We learned that at Bogd Khan Uul.'),
      listen: say(
        'saran',
        'Short watches, like at Bogd Khan Uul. Everyone sleeps; everyone is heard.',
      ),
    },
    remembered: {
      test: 'At Bogd Khan Uul, the clan learned to pack while the shelter was still good.',
      listen: 'At Bogd Khan Uul, the clan learned that a short watch leaves room to be heard.',
    },
  },
  'altai-tavan-bogd': {
    title: 'Five ways of seeing.',
    image: 'intro-steppe.png',
    setting:
      'Altai Tavan Bogd · Five peaks stand on the horizon, and each companion has chosen a different one as tomorrow’s landmark.',
    lines: [
      say('boro', 'The left saddle. The herd smells water there.'),
      say('nara', 'The one with the cloud. It hasn’t moved all day. That’s wrong.'),
      say('erden', 'I have taken bearings to all five. Numbers do not argue.'),
      say('saran', 'Numbers don’t. People do. Let each say what they actually saw, and why.'),
    ],
    test: respond(
      'Ride out and look',
      'Boro and a rider test the nearest approach before anyone argues further.',
      'The left saddle has water and bad footing. Both facts go into the plan.',
    ),
    listen: respond(
      'Hear every account',
      'Each person explains what they saw, and the clan compares them.',
      'Nara’s still cloud is a pocket of the White Silence. Nobody had noticed but her.',
    ),
    recall: {
      test: say('boro', 'Ride out and look, like at the five peaks. Argue after.'),
      listen: say(
        'nara',
        'Everyone say what you see. At Tavan Bogd I was the only one who saw the cloud.',
      ),
    },
    remembered: {
      test: 'At Altai Tavan Bogd, the clan learned to look before it argued.',
      listen:
        'At Altai Tavan Bogd, the clan learned that the quietest observer may be the one who is right.',
    },
  },
  'khan-tengri': {
    title: 'A name is no command.',
    image: 'intro-caravan.png',
    setting:
      'Khan Tengri Peak · A sharp summit stands over a hard, sparse camp. The Khan has ridden every patrol since the crossing.',
    lines: [
      say(
        'boro',
        'The wagons need a plan they can follow without you, Khan. You can’t be everywhere.',
      ),
      say('nara', 'Who watches when the Khan sleeps? Does the Khan sleep?'),
      say(
        'saran',
        'The mountain’s name sounds like a title. It is not a command, and neither is ours.',
      ),
      say('erden', 'Titles were how the court made people obey. We called it order.'),
    ],
    test: respond(
      'Write a plan the wagons can follow',
      'Boro sets the order of march and the stores for each leg.',
      'The wagons know where to go if the Khan is late. That is the point.',
    ),
    listen: respond(
      'Share out the watch',
      'Every household takes a named hour. The Khan takes one too, and no more.',
      'Nara takes the hour before dawn. The Khan sleeps, for once.',
    ),
    recall: {
      test: say('boro', 'The wagons have their plan. They will follow it if the Khan is late.'),
      listen: say(
        'nara',
        'Every household has its hour, like at Khan Tengri. The Khan only holds one.',
      ),
    },
    remembered: {
      test: 'At Khan Tengri, the clan learned to plan a road that did not depend on one rider.',
      listen: 'At Khan Tengri, the clan learned that a Khan keeps one watch, not all of them.',
    },
  },
  belukha: {
    title: 'Beyond our telling.',
    image: 'intro-steppe.png',
    setting:
      'Mount Belukha · White summits stand over a cool upland halt. Saran’s stories have no names for these peaks.',
    lines: [
      say(
        'saran',
        'My grandmother’s stories end at the rivers we left. I will not pretend they reach this far.',
      ),
      say('nara', 'Then whose stories do?'),
      say(
        'saran',
        'The people who live beneath these mountains. Not ours to tell. We are guests here.',
      ),
      say('boro', 'Guests still guard their stores. Something has been at the sacks.'),
    ],
    test: respond(
      'Guard and sort the stores',
      'Lift the stores off the ground and count what is left.',
      'The stores are safe, and smaller. Boro says the marmots ate better than he did.',
    ),
    listen: respond(
      'Share what each remembers',
      'Each household tells what it knows, without forcing the tellings into one.',
      'The stories do not agree. Saran lets them sit side by side, like gers in one camp.',
    ),
    recall: {
      test: say('boro', 'Stores off the ground and counted. The marmots taught us that much.'),
      listen: say('saran', 'We were guests beneath Belukha. We are guests here too. Listen first.'),
    },
    remembered: {
      test: 'Beneath Belukha, the clan learned to guard what it carried in a place that was not its own.',
      listen: 'Beneath Belukha, the clan learned to leave several tellings side by side.',
    },
  },
  'altan-ovoo': {
    title: 'A halt, not a claim.',
    image: 'intro-steppe.png',
    setting:
      'Altan Ovoo · Open steppe runs in every direction around an old volcanic mountain. Travellers could be seen coming a day off.',
    lines: [
      say('nara', 'If another clan rode up now, how would they know we’re friendly?'),
      say('boro', 'They’d see bows. That’s how they’d know we’re careful.'),
      say(
        'saran',
        'Careful and friendly are not enemies. Leave the near side of the camp open, and a bowl where it can be seen.',
      ),
      say('erden', 'A camp that claims a crossroads becomes a toll gate. I have seen it happen.'),
    ],
    test: respond(
      'Ready stores for the onward road',
      'Pack what the open country gives before anyone else needs it.',
      'Boro’s packs are full. The near side of the camp stays open anyway.',
    ),
    listen: respond(
      'Organize a welcome',
      'Decide who greets, who listens, and who keeps watch if anyone arrives.',
      'Nara is chosen to greet. She practises on Boro, who does not smile, and then does.',
    ),
    recall: {
      test: say('boro', 'Packs full, near side open, like at Altan Ovoo.'),
      listen: say('nara', 'I will greet whoever comes through. I practised at Altan Ovoo.'),
    },
    remembered: {
      test: 'At Altan Ovoo, the clan learned that a full pack and an open side can share one camp.',
      listen: 'At Altan Ovoo, the clan learned how a welcome is recognized from a day away.',
    },
  },
  'eej-khairkhan': {
    title: 'Who carries the carriers?',
    image: 'intro-hearth.png',
    setting:
      'Eej Khairkhan · Warm rock shelters a dry camp. Water has to be carried up from far below, and Saran has carried most of it.',
    lines: [
      say('nara', 'Saran, you took the last turn. And the one before.'),
      say('saran', 'Someone has to.'),
      say('boro', 'Someone. Not the same one every time.'),
      say(
        'erden',
        'By my count, Saran has carried more than any two of us. I should have said so sooner.',
      ),
    ],
    test: respond(
      'Check and share the stores',
      'Boro and Erden count every waterskin, and the turns are shared out by the numbers.',
      'The water is rationed fairly. Saran’s name is not on the list.',
    ),
    listen: respond(
      'Let others keep the hearth',
      'Saran sits. Others tend the fire, and serve her first.',
      'Nara hands Saran the first cup. Saran does not know what to do with her hands.',
    ),
    recall: {
      test: say(
        'erden',
        'Every waterskin counted, as at Eej Khairkhan. Nobody carries more than a share.',
      ),
      listen: say('nara', 'Saran, sit. Others can hold the hearth. We did it at Eej Khairkhan.'),
    },
    remembered: {
      test: 'At Eej Khairkhan, the clan learned to share the heaviest work by count, not by habit.',
      listen:
        'At Eej Khairkhan, the clan learned to carry the carriers; the first cup goes to whoever served the last.',
    },
  },
  'orkhon-valley': {
    title: 'What a tally leaves out.',
    image: 'intro-caravan.png',
    setting:
      'Orkhon Valley · Broad river pastures give the clan its first easy day. Erden spreads his tally on a felt to show what they have.',
    lines: [
      say('erden', 'Food. Horses. Felt. Arrows. Everything we own.'),
      say('nara', 'Where am I in it?'),
      say('erden', 'You are… one of the mouths. That is how it is done.'),
      say('boro', 'Done by who?'),
      say('saran', 'A list of what we eat is not a list of who we are. Add what people know.'),
    ],
    test: respond(
      'Check the tally against the pasture',
      'Walk the river meadows and correct the count with real grass and real herds.',
      'The tally is right about the food and wrong about the horses. Boro corrects it, pleased.',
    ),
    listen: respond(
      'Let each household answer',
      'Each family adds what it knows and needs beside its line.',
      'The tally grows a column Erden has never kept. He studies it for a long time.',
    ),
    recall: {
      test: say('boro', 'The tally matches the herd, as it did on the Orkhon. I checked.'),
      listen: say('erden', 'Every household has a line it can answer. That began on the Orkhon.'),
    },
    remembered: {
      test: 'In the Orkhon Valley, the clan learned to check its records against the ground.',
      listen:
        'In the Orkhon Valley, the clan learned to keep a column for what people know and need.',
    },
  },
};

export const SECOND_STOPS: Partial<Record<LocationId, SecondStop>> = {
  'broken-pass': {
    promise: 'Broken Pass · Loose stone rattles down the slopes around the camp.',
    promiseLine: say('boro', 'Tie it tight. Nothing on this pass stays where you put it.'),
    title: 'When the earth moves.',
    image: 'intro-caravan.png',
    setting:
      'Broken Pass · Boro watches the cracks in the slope while the families tend the wheels and harness.',
    lines: [
      say(
        'boro',
        'The ground warns before it breaks. Give me time to watch it, and I’ll call the wagons across.',
      ),
      say('nara', 'I can carry the water. You don’t have to give me the smallest bowl.'),
    ],
    mend: respond(
      'Mend the wheels together',
      'The households sort reusable timber and repair their travelling tools.',
      'Hands that argued at the last camp work the same harness. Boro takes the first watch on the slope.',
    ),
    rest: respond(
      'Let the tired hands rest',
      'Saran shares the fire while fresh hands take over camp duties.',
      'The work goes on around the people who need a moment beside the hearth.',
    ),
    recall: {
      mend: say('boro', 'Same as the pass. Watch the ground, call the wagons, don’t run.'),
      rest: say('saran', 'We rested at the pass and lost nothing by it. Hold in turns.'),
    },
    remembered: {
      mend: 'At the Broken Pass, the clan learned to hear the ground before it broke; the new carts stand where the earth is quiet.',
      rest: 'At the Broken Pass, the clan learned that tired hands drop wheels; the valley watch is kept short.',
    },
  },
  otgontenger: {
    promise:
      'Mount Otgontenger · Packs lie open below the snowline while the households check every strap.',
    promiseLine: say(
      'boro',
      'Before anyone ties cloth, everyone checks one strap that isn’t theirs.',
    ),
    title: 'The load we share.',
    image: 'intro-caravan.png',
    setting:
      'Mount Otgontenger · The ground shrugs under the foothills. The path the clan came up by has slid away in the night.',
    lines: [
      say(
        'boro',
        'That approach is gone. The next is steeper. Every load lighter and better tied.',
      ),
      say(
        'erden',
        'I can tell you exactly what we can carry. I cannot promise the path stays open while we argue.',
      ),
      say('nara', 'Then don’t argue. Everyone check someone else’s pack.'),
    ],
    mend: respond(
      'Check every load',
      'Repack, retie, and repair the travelling gear for the steeper road.',
      'Several hands retie the same pack strap until it holds. Boro pulls it once and nods.',
    ),
    rest: respond(
      'Rotate the work',
      'Short shifts. Nobody packs and stands guard at once.',
      'Shifts change every hour. The packing is slower, and nobody drops a load on the slope.',
    ),
    recall: {
      mend: say('boro', 'Check someone else’s load. Like at Otgontenger.'),
      rest: say('nara', 'Short shifts, like below the snowline. Nobody holds the line alone.'),
    },
    remembered: {
      mend: 'Below Otgontenger, the clan learned to check one another’s loads; nobody ties a pack alone.',
      rest: 'Below Otgontenger, the clan learned to change hands before hands failed.',
    },
  },
  'bogd-khan-uul': {
    promise:
      'Bogd Khan Uul · The households tie their cloth to the banner beside a windbreak of cut brush.',
    promiseLine: say(
      'saran',
      'A windbreak with one side open. Whoever comes in from the wind can find us.',
    ),
    title: 'A shelter kept open.',
    image: 'intro-hearth.png',
    setting:
      'Bogd Khan Uul · Tremors shake needles from the trees. The windbreak is half down, and the families who slept best are slowest to pack.',
    lines: [
      say('boro', 'It’s a good place. That’s the trouble. People want to stay in good places.'),
      say('saran', 'Then we leave it in good order, for whoever needs it next.'),
      say('erden', 'The court never left anything for whoever came next.'),
    ],
    mend: respond(
      'Turn the windbreak into travois',
      'Fix the poles for dragging loads and pack the wagons.',
      'The windbreak becomes poles on the wagons. The open side becomes a habit.',
    ),
    rest: respond(
      'Relieve the tired workers',
      'Those who held the camp together take the last quiet night; others pack.',
      'The tired sleep one more night out of the wind. In the morning they pack faster than anyone.',
    ),
    recall: {
      mend: say('saran', 'We left Bogd Khan Uul in good order. Leave this road open behind us.'),
      rest: say('boro', 'Like the windbreak: hold it, but leave a side open.'),
    },
    remembered: {
      mend: 'At Bogd Khan Uul, the clan learned to leave a shelter in good order; the new windbreak keeps an open side.',
      rest: 'At Bogd Khan Uul, the clan learned that rest is part of the work; the first valley night has a watch, and a sleep, for everyone.',
    },
  },
  'altai-tavan-bogd': {
    promise:
      'Altai Tavan Bogd · Erden sketches the way ahead while the banner is patched, and others correct his marks.',
    promiseLine: say('nara', 'You drew the stream on the wrong side. I’m fixing it. Hold still.'),
    title: 'The corrected map.',
    image: 'intro-steppe.png',
    setting:
      'Altai Tavan Bogd · The ground has moved overnight. Half of Erden’s sketch is wrong, and he knows it.',
    lines: [
      say('erden', 'The map was correct yesterday. The ground has not consulted me.'),
      say('boro', 'Then we redraw it. Aloud, so everyone hears where the cracks are.'),
      say('nara', 'And whoever hauls the wagons gets a say in where they go.'),
    ],
    mend: respond(
      'Redraw the route and fit the wagons',
      'Check each approach, mark it on the sketch, and fit the wagons for it.',
      'The new sketch carries many people’s marks. The wagons are ready for every one of them.',
    ),
    rest: respond(
      'Rest the haulers first',
      'Those who will drag the wagons rest while the planners argue.',
      'The planners argue, quietly, around sleeping haulers. The plan is better for it.',
    ),
    recall: {
      mend: say(
        'erden',
        'Mark the cracks where everyone can see, and correct me. That was what the sketch was for.',
      ),
      rest: say('nara', 'The ones hauling the wagons get a say. We said so at Tavan Bogd.'),
    },
    remembered: {
      mend: 'At Altai Tavan Bogd, the clan learned to correct a map in public; the valley paths are drawn by many hands.',
      rest: 'At Altai Tavan Bogd, the clan learned to plan in the hearing of those who carry the plan.',
    },
  },
  'khan-tengri': {
    promise:
      'Khan Tengri Peak · The banner is raised beside the riders’ lines while the host prepares to leave.',
    promiseLine: say(
      'boro',
      'One household says the riders take too much feed. They’re right. We hear them.',
    ),
    title: 'The title passes.',
    image: 'intro-caravan.png',
    setting:
      'Khan Tengri Peak · The slopes are sliding. The riders want to leave at once; one household asks to wait for its scattered herd.',
    lines: [
      say('boro', 'If we wait, we risk the road. If we don’t, they lose their animals.'),
      say('nara', 'The Khan decides, right?'),
      say('saran', 'The Khan answers for it. That is not the same thing.'),
    ],
    mend: respond(
      'Rig lead lines for the herd',
      'Spend the spare rope and harness so the household’s animals travel with the caravan.',
      'It takes an extra hour and every spare rope. The herd comes too.',
    ),
    rest: respond(
      'Stop and hear the household',
      'Halt the preparations long enough to hear the objection properly.',
      'The household speaks. The Khan listens. The order of march changes, and nobody calls it weakness.',
    ),
    recall: {
      mend: say('boro', 'Every rope we had, at Khan Tengri. Use them all again.'),
      rest: say(
        'nara',
        'At Khan Tengri the Khan stopped to listen. The households are ready. Listen now.',
      ),
    },
    remembered: {
      mend: 'At Khan Tengri, the clan learned that a title is a duty; a household’s herd came through on borrowed rope.',
      rest: 'At Khan Tengri, the clan learned that a Khan answers to the people; any household may stop the work to be heard.',
    },
  },
  belukha: {
    promise:
      'Mount Belukha · Cloth with patterns that do not match is stitched into the banner side by side.',
    promiseLine: say(
      'saran',
      'Leave the patterns as they are. A seam can join cloth without making it the same.',
    ),
    title: 'Different threads.',
    image: 'intro-steppe.png',
    setting:
      'Mount Belukha · The upland trembles. Two households disagree about what the moving ground means, and about what to do first.',
    lines: [
      say('saran', 'They need not agree about the meaning. They must agree about the wagons.'),
      say('boro', 'Wagons I understand. Let them argue over supper.'),
      say('erden', 'What I have seen, I will swear to. What it meant, I will not pretend to know.'),
    ],
    mend: respond(
      'Work on what can be agreed',
      'Set every household to the wagons and leave the arguments for later.',
      'The wagons are mended by people who still disagree. The seams hold anyway.',
    ),
    rest: respond(
      'Sit and hear both accounts',
      'Rest the workers by the fire while each household gives its account.',
      'Two accounts, side by side. Nobody wins. Everybody sleeps.',
    ),
    recall: {
      mend: say('saran', 'We need not agree why the sky broke. We must agree on this road.'),
      rest: say(
        'saran',
        'Beneath Belukha we let two stories sit side by side. There is room for more.',
      ),
    },
    remembered: {
      mend: 'Beneath Belukha, the clan learned to mend wagons alongside people it disagreed with.',
      rest: 'Beneath Belukha, the clan learned that a seam can join cloth without making it the same.',
    },
  },
  'altan-ovoo': {
    promise:
      'Altan Ovoo · The banner is planted where the households gather and count before leaving, in sight of the open roads.',
    promiseLine: say('erden', 'Count, then. Not as a claim. As a way of noticing who is missing.'),
    title: 'Room at the crossroads.',
    image: 'intro-steppe.png',
    setting:
      'Altan Ovoo · Tremors run through the open ground. The roads are emptying, and the clan has to leave before the earth closes them.',
    lines: [
      say('nara', 'Someone could still come down one of those roads after we’re gone.'),
      say('boro', 'Then they’ll find tracks. That’s all we can leave.'),
      say(
        'saran',
        'Tracks, a cleared camp, and a marked trail. Signs that someone passed who would have stopped.',
      ),
    ],
    mend: respond(
      'Prepare the wagons and mark the trail',
      'Fit the wagons for the rough road and mark the way for whoever follows.',
      'The wagons are ready. Nara marks the trail behind them, for whoever follows.',
    ),
    rest: respond(
      'Rest, and keep the space clear',
      'Give the tired one full night, with room kept by the wagons for anyone who arrives.',
      'Nobody arrives in the night. The space by the wagons stays clear anyway.',
    ),
    recall: {
      mend: say('nara', 'We marked the trail at Altan Ovoo. Mark this one too.'),
      rest: say('saran', 'At Altan Ovoo we kept room by the wagons. Keep it here.'),
    },
    remembered: {
      mend: 'At Altan Ovoo, the clan learned to mark a road for strangers; the valley trail is marked all the way down.',
      rest: 'At Altan Ovoo, the clan learned to keep space clear for an arrival; the new camp keeps it still.',
    },
  },
  'eej-khairkhan': {
    promise:
      'Eej Khairkhan · In the shelter of warm rock, the ember vessel passes from hand to hand as the banner is tied.',
    promiseLine: say(
      'nara',
      'Saran, give someone else the vessel while you tie your cloth. Only for a while.',
    ),
    title: 'A change of hands.',
    image: 'intro-hearth.png',
    setting:
      'Eej Khairkhan · The dry ground splits in long lines. The people who carry the water are the most tired of all.',
    lines: [
      say('boro', 'Water first. Wagons after. Nothing moves without water.'),
      say('nara', 'Then the water carriers need relief. Saran has done four turns today.'),
      say('saran', 'I am fine.'),
      say('erden', 'By my count, you are not.'),
    ],
    mend: respond(
      'Put the water on wheels',
      'Repair the casks and harness so the water travels on wagons, not backs.',
      'The casks ride the wagons now. Fewer backs ache tonight.',
    ),
    rest: respond(
      'Relieve the carriers',
      'Others take the water turns; Saran and the carriers sit.',
      'Saran sits. Nara brings her the cup she usually brings to everyone else.',
    ),
    recall: {
      mend: say('boro', 'Water on the wagons, like at Eej Khairkhan. Nobody carries it alone.'),
      rest: say('nara', 'At Eej Khairkhan we took turns. I will take this one.'),
    },
    remembered: {
      mend: 'At Eej Khairkhan, the clan learned to put the heaviest loads on wheels instead of backs.',
      rest: 'At Eej Khairkhan, the clan learned to carry the carriers; the first cup goes to whoever served the last.',
    },
  },
  'orkhon-valley': {
    promise:
      'Orkhon Valley · Beside the river pastures, each household answers its own entry in Erden’s tally as its cloth joins the banner.',
    promiseLine: say(
      'erden',
      'Say your own name, and I will write it as you say it. Not as I would have.',
    ),
    title: 'Answering for oneself.',
    image: 'intro-caravan.png',
    setting:
      'Orkhon Valley · The river meadows ripple as the ground shifts. The households must move, and Erden’s tally has to be rebuilt.',
    lines: [
      say('erden', 'I could reconstruct it alone by morning.'),
      say('boro', 'Or everyone tells you what they’re carrying and you write it down. Faster.'),
      say('nara', 'And if you get it wrong, they tell you.'),
    ],
    mend: respond(
      'Rebuild the tally while packing',
      'Each household reports its load as it packs; Erden writes, and the wagons fill.',
      'The new tally is written in several hands. The wagons are ready by noon.',
    ),
    rest: respond(
      'Rest by the river first',
      'The families rest beside the water before the work; Erden waits to write.',
      'A slow morning by the river. Erden’s tally is shorter, and more honest.',
    ),
    recall: {
      mend: say('erden', 'Every household answers its own line, like the Orkhon tally.'),
      rest: say('boro', 'We rested by the Orkhon and nobody lost a horse for it. Hold in turns.'),
    },
    remembered: {
      mend: 'In the Orkhon Valley, the clan learned that a tally must leave room for people to answer.',
      rest: 'In the Orkhon Valley, the clan learned that a slower record can be a more honest one.',
    },
  },
};

/** Defensive fallbacks for any location without a treatment; normal play never reaches them. */
const FALLBACK_FIRST: FirstStop = {
  title: 'Whose road is this?',
  image: 'intro-fallen-sky.png',
  setting:
    'The White Silence makes familiar signs unreliable. Every companion reads the way ahead differently.',
  lines: [
    say('boro', 'The herd will tell us where the grass is. I trust the herd.'),
    say('saran', 'And I trust the households to say what they have seen.'),
    say('nara', 'Then ask both.'),
  ],
  test: respond(
    'Test the ground',
    'Boro checks the grazing and the approaches before the camp settles.',
    'The tested ground holds. The stores are packed against the cold.',
  ),
  listen: respond(
    'Hear every household',
    'Saran gathers the households to compare what each has seen.',
    'Several accounts make one plan. Nobody had seen everything.',
  ),
  recall: {
    test: say('boro', 'Test it first. We learned that at the first camp.'),
    listen: say('saran', 'Ask everyone what they see. We learned that at the first camp.'),
  },
  remembered: {
    test: 'At the first chosen camp, the clan learned to test the ground before trusting it.',
    listen: 'At the first chosen camp, the clan learned to compare what each household had seen.',
  },
};

const FALLBACK_SECOND: SecondStop = {
  promise: 'The households gather around the blue banner.',
  promiseLine: say('boro', 'Tie it tight. The road ahead is rough.'),
  title: 'What the road asks.',
  image: 'intro-caravan.png',
  setting:
    'The ground shifts beneath the camp. The wheels, the harness, and the people all need tending.',
  lines: [
    say('boro', 'The ground warns before it breaks. Watch it, and the wagons can cross.'),
    say('nara', 'I can carry water. Give me real work.'),
  ],
  mend: respond(
    'Mend the wagons',
    'The households repair their travelling tools.',
    'The wagons are ready for the next road.',
  ),
  rest: respond(
    'Rest the tired hands',
    'Fresh hands take over while the tired ones sit by the fire.',
    'The work goes on around the people who need a moment beside the hearth.',
  ),
  recall: {
    mend: say('boro', 'Watch the ground, call the wagons, don’t run.'),
    rest: say('saran', 'Hold in turns. Nobody holds alone.'),
  },
  remembered: {
    mend: 'At the second chosen camp, the clan learned to mend the wagons together.',
    rest: 'At the second chosen camp, the clan learned to rest before the hands failed.',
  },
};

export function firstStop(id: LocationId | undefined): FirstStop {
  return (id && FIRST_STOPS[id]) || FALLBACK_FIRST;
}

export function secondStop(id: LocationId | undefined): SecondStop {
  return (id && SECOND_STOPS[id]) || FALLBACK_SECOND;
}
