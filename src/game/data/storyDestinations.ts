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
      'Silent River · Winter has come in the wrong season. Somewhere past the ice, a voice the clan knows is calling.',
    lines: [
      say('nara', 'That sounds like someone we knew. It says there’s a shorter road.'),
      say('saran', 'I know the voice. I do not know what is wearing it.'),
      say('boro', 'Ice doesn’t care who’s calling. The bank is firm where the reeds bend.'),
      say(
        'erden',
        'I know that kind of promise. It asks for obedience first and offers safety later.',
      ),
    ],
    test: respond(
      'Trust the tested ground',
      'Boro tries the bank with a pole for a ford and winter feed.',
      'The clan keeps to the bank Boro tested. Out on the ice, the voice thins until the wind has it.',
    ),
    listen: respond(
      'Answer with living voices',
      'Saran has the households call one another by name until the other voice stops.',
      'Nara starts the calling. Names pass from ger to ger, and past the ice the other voice gives out.',
    ),
    recall: {
      test: say('boro', 'We tested every step at the river. Test this stone the same way.'),
      listen: say(
        'nara',
        'At the river we answered with our own names. Keep calling to each other.',
      ),
    },
    remembered: {
      test: 'At the Silent River, the clan learned to trust tested ground over any voice, however familiar.',
      listen:
        'At the Silent River, a false call was answered with living voices. At dusk the households still call one another in by name.',
    },
  },
  otgontenger: {
    title: 'Below the snowline.',
    image: 'intro-steppe.png',
    setting:
      'Mount Otgontenger · The summit shines above the camp. Below it the grass grows short and thin, and the White Silence lies over it in patches.',
    lines: [
      say('nara', 'You can see half the world from here.'),
      say('boro', 'And none of it is grass. A view doesn’t feed a mare.'),
      say(
        'saran',
        'Then count what is here, Boro, and count it out loud. A limit everyone knows is one everyone can help you carry.',
      ),
      say('erden', 'A number everyone has heard is harder to bend. I count that… in its favour.'),
    ],
    test: respond(
      'Walk the slopes with Boro',
      'Measure the grazing and dry what the herd can’t eat.',
      'Boro comes back with numb hands and an honest count. The stores are smaller than anyone hoped, so nobody is surprised when they run low.',
    ),
    listen: respond(
      'Gather the households',
      'Each family says what it can carry, and what it can’t.',
      'Nobody promises more than their back will bear. Saran writes none of it down, and everyone remembers it anyway.',
    ),
    recall: {
      test: say('boro', 'Count what’s really here, like we did below the snowline. Promise after.'),
      listen: say(
        'saran',
        'At Otgontenger each household said aloud what it could carry. Ask them again.',
      ),
    },
    remembered: {
      test: 'Below Otgontenger, the clan learned to count the grass before promising the bowl.',
      listen: 'Below Otgontenger, each household learned to say out loud what it could carry.',
    },
  },
  'bogd-khan-uul': {
    title: 'Shelter with limits.',
    image: 'intro-hearth.png',
    setting:
      'Bogd Khan Uul · Wooded slopes take the edge off the wind. For the first time since the Sundering, the gers stand still through the night.',
    lines: [
      say('saran', 'Let them sleep one whole night. Let them eat one proper meal.'),
      say(
        'boro',
        'Shelter makes people slow. The White Silence won’t wait for us to get comfortable.',
      ),
      say('nara', 'Can’t we be comfortable and ready? Like a horse eating with its saddle on.'),
      say(
        'erden',
        'The court built walls against every season. It was very comfortable, right up until the sky tore.',
      ),
    ],
    test: respond(
      'Fill the travelling stores',
      'Use the sheltered days to pack before anyone fully unpacks.',
      'By the second evening the packs are full, and Boro lets himself sit through one long meal.',
    ),
    listen: respond(
      'Shorten the night watches',
      'Short watches, so everyone sleeps and everyone gets heard at the fire.',
      'With the watches cut short, people stay up talking around the fire. Someone finally laughs.',
    ),
    recall: {
      test: say(
        'boro',
        'Fill the packs first, then get comfortable. Bogd Khan Uul taught us that.',
      ),
      listen: say(
        'saran',
        'Keep the watches short, as at Bogd Khan Uul. Everyone sleeps, and everyone is heard.',
      ),
    },
    remembered: {
      test: 'At Bogd Khan Uul, the clan learned to pack while the shelter was still good.',
      listen:
        'At Bogd Khan Uul, the clan cut its watches short and found there was time left over to be heard.',
    },
  },
  'altai-tavan-bogd': {
    title: 'Five ways of seeing.',
    image: 'intro-steppe.png',
    setting:
      'Altai Tavan Bogd · Five peaks line the horizon, and each companion has picked a different one to steer by tomorrow.',
    lines: [
      say('boro', 'The left saddle. The herd smells water there.'),
      say('nara', 'The one with the cloud. It hasn’t moved all day. That’s wrong.'),
      say('erden', 'I have taken bearings to all five. Numbers do not argue.'),
      say('saran', 'Numbers don’t. People do. So let each of us say what we saw, and why.'),
    ],
    test: respond(
      'Ride out and look',
      'Boro and one rider try the nearest approach before the arguing goes on.',
      'The left saddle has water, and footing bad enough to lame a horse. Both go into the plan.',
    ),
    listen: respond(
      'Hear every account',
      'Everyone says what they saw; the clan compares the accounts.',
      'Nara’s motionless cloud is a pocket of the White Silence. Nobody else had noticed it.',
    ),
    recall: {
      test: say('boro', 'Ride out and look, like at the five peaks. Argue after.'),
      listen: say(
        'nara',
        'Everybody say what you see. At Tavan Bogd I was the only one watching that cloud.',
      ),
    },
    remembered: {
      test: 'At Altai Tavan Bogd, the clan learned to go and look before it argued.',
      listen:
        'At Altai Tavan Bogd, the clan learned to hear out its quietest watcher, who had seen what everyone else missed.',
    },
  },
  'khan-tengri': {
    title: 'A name is no command.',
    image: 'intro-caravan.png',
    setting:
      'Khan Tengri Peak · A sharp summit stands over a hard, sparse camp. Since the crossing, the Khan has ridden every patrol.',
    lines: [
      say(
        'boro',
        'The wagons need a plan they can follow without you, Khan. You can’t be everywhere.',
      ),
      say('nara', 'Who watches when the Khan sleeps? Does the Khan sleep?'),
      say(
        'saran',
        'The mountain’s name sounds like a title. A name is not a command, and neither is ours.',
      ),
      say('erden', 'At court, a title was how you made people obey. We called that order.'),
    ],
    test: respond(
      'Write a plan the wagons can follow',
      'Boro sets the order of march and the stores for each leg.',
      'Now the wagons know where to go if the Khan is late, which was the whole point.',
    ),
    listen: respond(
      'Share out the watch',
      'Every household takes a named hour. So does the Khan, and only one.',
      'Nara claims the hour before dawn, and for once the Khan sleeps.',
    ),
    recall: {
      test: say('boro', 'The wagons have their plan. If the Khan is late, they follow it.'),
      listen: say(
        'nara',
        'Every household has its hour, same as at Khan Tengri. The Khan gets one, like anybody.',
      ),
    },
    remembered: {
      test: 'At Khan Tengri, the clan learned to plan a road that did not hang on a single rider.',
      listen: 'At Khan Tengri, the clan learned that a Khan keeps one watch, not all of them.',
    },
  },
  belukha: {
    title: 'Beyond our telling.',
    image: 'intro-steppe.png',
    setting:
      'Mount Belukha · White summits rise over a cool upland halt. None of Saran’s stories has a name for these peaks.',
    lines: [
      say(
        'saran',
        'My grandmother’s stories end at the rivers we left. I will not pretend they reach this far.',
      ),
      say('nara', 'Then whose stories do?'),
      say(
        'saran',
        'The people who live beneath these mountains. Those stories are not ours to tell. We are guests here.',
      ),
      say('boro', 'Guests still guard their stores. Something has been at the sacks.'),
    ],
    test: respond(
      'Guard and sort the stores',
      'Lift the stores off the ground and count what is left.',
      'The stores are safe now, and smaller. Boro grumbles that the marmots have eaten better than he has.',
    ),
    listen: respond(
      'Share what each remembers',
      'Each household tells what it knows. Nobody forces the tellings to agree.',
      'The stories don’t agree. Saran lets them stand side by side, like gers in one camp.',
    ),
    recall: {
      test: say('boro', 'Stores off the ground and counted. The marmots taught us that much.'),
      listen: say('saran', 'We were guests beneath Belukha. We are guests here too. Listen first.'),
    },
    remembered: {
      test: 'Beneath Belukha, the clan learned to guard what it carried in a place that was not its own.',
      listen: 'Beneath Belukha, the clan learned to let several tellings stand side by side.',
    },
  },
  'altan-ovoo': {
    title: 'A halt, not a claim.',
    image: 'intro-steppe.png',
    setting:
      'Altan Ovoo · Open steppe runs out on every side of an old volcanic mountain. Riders could be seen coming a day before they arrived.',
    lines: [
      say('nara', 'If another clan rode up now, how would they know we’re friendly?'),
      say('boro', 'They’d see bows. That’s how they’d know we’re careful.'),
      say(
        'saran',
        'Careful and friendly can share a camp. Leave the near side open, and set a bowl out where it can be seen.',
      ),
      say('erden', 'A camp that claims a crossroads becomes a toll gate. I have seen it happen.'),
    ],
    test: respond(
      'Ready stores for the onward road',
      'Gather what the open country offers and pack it for the road.',
      'Boro’s packs are full, and the near side of the camp stays open all the same.',
    ),
    listen: respond(
      'Organize a welcome',
      'Decide who greets, who listens, and who keeps watch if anyone comes.',
      'Nara is chosen to greet. She practises on Boro, who refuses to smile, and then does.',
    ),
    recall: {
      test: say('boro', 'Packs full, near side open, like at Altan Ovoo.'),
      listen: say('nara', 'Whoever comes through, I’ll greet them. I practised at Altan Ovoo.'),
    },
    remembered: {
      test: 'At Altan Ovoo, the clan learned that a full pack and an open side can share one camp.',
      listen:
        'At Altan Ovoo, the clan learned to make its welcome plain to riders still a day away.',
    },
  },
  'eej-khairkhan': {
    title: 'Who carries the carriers?',
    image: 'intro-hearth.png',
    setting:
      'Eej Khairkhan · Warm rock shelters a dry camp. Every drop of water is carried up from far below, and Saran has carried most of it.',
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
      'Boro and Erden count every waterskin and share out the turns by the numbers.',
      'The water is rationed fairly. Saran’s name is not on the carrying list.',
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
      listen: say(
        'nara',
        'Sit down, Saran. Others can keep the hearth. We did it at Eej Khairkhan.',
      ),
    },
    remembered: {
      test: 'At Eej Khairkhan, the clan learned to share the heaviest work by count, not by habit.',
      listen:
        'At Eej Khairkhan, the clan learned to carry its carriers. The first cup still goes to whoever served the last.',
    },
  },
  'orkhon-valley': {
    title: 'What a tally leaves out.',
    image: 'intro-caravan.png',
    setting:
      'Orkhon Valley · Broad river pastures give the clan its first easy day. Erden spreads his tally on a square of felt to show what they have.',
    lines: [
      say('erden', 'Food. Horses. Felt. Arrows. Everything we own.'),
      say('nara', 'Where am I in it?'),
      say('erden', 'You are… one of the mouths. That is how it is done.'),
      say('boro', 'Done by who?'),
      say('saran', 'A list of what we eat is not a list of who we are. Add what people know.'),
    ],
    test: respond(
      'Check the tally against the pasture',
      'Walk the river meadows and correct the count against the grass and the herd.',
      'The tally is right about the food and wrong about the horses. Boro corrects it, plainly pleased with himself.',
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
      test: 'In the Orkhon Valley, the clan learned to check what was written against what was grazing.',
      listen:
        'In the Orkhon Valley, the tally gained a column for what people know and need, and it has kept one since.',
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
      'Broken Pass · Boro keeps his eyes on the cracks in the slope while the families see to the wheels and harness.',
    lines: [
      say(
        'boro',
        'The ground warns before it breaks. Give me time to watch it, and I’ll call the wagons across.',
      ),
      say('nara', 'I can carry the water. You don’t have to give me the smallest bowl.'),
    ],
    mend: respond(
      'Mend the wheels together',
      'The households sort sound timber and repair their travelling tools.',
      'Hands that argued at the last camp work the same harness now. Boro takes the first watch on the slope.',
    ),
    rest: respond(
      'Let the tired hands rest',
      'Saran makes room at the fire; fresh hands take the camp work.',
      'The work carries on around the ones who need a moment by the hearth.',
    ),
    recall: {
      mend: say('boro', 'Same as the pass. Watch the ground, call the wagons, don’t run.'),
      rest: say('saran', 'We rested at the pass and lost nothing by it. Hold in turns.'),
    },
    remembered: {
      mend: 'At the Broken Pass, the clan learned to listen to the ground before it broke. The new carts stand where the earth is quiet.',
      rest: 'At the Broken Pass, the clan learned that tired hands drop wheels. In the valley, the watches are kept short.',
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
      'Mount Otgontenger · The ground shrugs under the foothills. In the night, the path the clan came up by slid away.',
    lines: [
      say(
        'boro',
        'That approach is gone. The next one is steeper. Every load lighter, every knot better.',
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
      'One pack strap passes through several pairs of hands until it holds. Boro gives it a single pull and nods.',
    ),
    rest: respond(
      'Rotate the work',
      'Nobody packs and stands guard at the same time.',
      'The shifts change every hour. Packing goes slower, and nobody drops a load on the slope.',
    ),
    recall: {
      mend: say('boro', 'Check someone else’s load, same as at Otgontenger.'),
      rest: say('nara', 'Short shifts, like below the snowline. Nobody holds the line alone.'),
    },
    remembered: {
      mend: 'Below Otgontenger, the clan learned to check one another’s loads. Nobody ties a pack alone now.',
      rest: 'Below Otgontenger, the clan learned to change hands before the hands gave out.',
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
      'Bogd Khan Uul · Tremors shake needles from the trees. The windbreak is half down, and the families who slept best are the slowest to pack.',
    lines: [
      say('boro', 'It’s a good place. That’s the trouble. People want to stay in good places.'),
      say('saran', 'Then we leave it in good order, for whoever needs it next.'),
      say('erden', 'The court never left anything for whoever came next.'),
    ],
    mend: respond(
      'Turn the windbreak into travois',
      'Lash the poles into drags and pack the wagons.',
      'The windbreak goes onto the wagons as poles. The open side stays with the clan as a habit.',
    ),
    rest: respond(
      'Let the tired rest',
      'Whoever held the camp together gets the last quiet night; others pack.',
      'The tired sleep one more night out of the wind. In the morning they pack faster than anyone.',
    ),
    recall: {
      mend: say('saran', 'We left Bogd Khan Uul in good order. Leave this road open behind us.'),
      rest: say('boro', 'Like the windbreak: hold it, but leave a side open.'),
    },
    remembered: {
      mend: 'At Bogd Khan Uul, the clan learned to leave a shelter in good order. The new windbreak still keeps one side open.',
      rest: 'At Bogd Khan Uul, the clan learned that rest is part of the work. On the first valley night, everyone stands a watch and everyone sleeps.',
    },
  },
  'altai-tavan-bogd': {
    promise:
      'Altai Tavan Bogd · Erden sketches the way ahead while the banner is patched, and others correct his marks.',
    promiseLine: say('nara', 'You drew the stream on the wrong side. I’m fixing it. Hold still.'),
    title: 'The corrected map.',
    image: 'intro-steppe.png',
    setting:
      'Altai Tavan Bogd · The ground moved in the night. Half of Erden’s sketch is wrong now, and he knows it.',
    lines: [
      say('erden', 'The map was correct yesterday. The ground has not consulted me.'),
      say('boro', 'Then we redraw it. Out loud, so everyone hears where the cracks are.'),
      say('nara', 'And whoever hauls the wagons gets a say in where they go.'),
    ],
    mend: respond(
      'Redraw the route, fit the wagons',
      'Try each approach, mark it on the sketch, and fit the wagons to match.',
      'The new sketch is crowded with other people’s marks, and the wagons are fitted for every one.',
    ),
    rest: respond(
      'Rest the haulers first',
      'Those who will drag the wagons rest while the planners argue.',
      'The planners argue in low voices around the sleeping haulers. The plan is better for it.',
    ),
    recall: {
      mend: say(
        'erden',
        'Mark the cracks where everyone can see them, and correct me. That is what the sketch was for.',
      ),
      rest: say('nara', 'The ones hauling the wagons get a say. We said so at Tavan Bogd.'),
    },
    remembered: {
      mend: 'At Altai Tavan Bogd, the clan learned to correct a map in public. The valley paths are drawn by many hands.',
      rest: 'At Altai Tavan Bogd, the clan learned to make its plans within earshot of the people who would carry them.',
    },
  },
  'khan-tengri': {
    promise:
      'Khan Tengri Peak · The banner goes up beside the riders’ lines as the host gets ready to leave.',
    promiseLine: say(
      'boro',
      'One household says the riders eat too much of the feed. They’re right. So we listen.',
    ),
    title: 'The title passes.',
    image: 'intro-caravan.png',
    setting:
      'Khan Tengri Peak · The slopes are sliding. The riders want to leave at once, but one household asks to wait for its scattered herd.',
    lines: [
      say('boro', 'If we wait, we risk the road. If we don’t, they lose their animals.'),
      say('nara', 'The Khan decides, right?'),
      say('saran', 'The Khan answers for it. That is not the same thing.'),
    ],
    mend: respond(
      'Rig lead lines for the herd',
      'Use the spare rope and harness so the household’s animals travel with the caravan.',
      'It costs an extra hour and every spare rope, and the herd comes too.',
    ),
    rest: respond(
      'Stop and hear the household',
      'Halt the packing long enough to hear the objection out.',
      'The household speaks and the Khan listens. The order of march changes, and nobody calls it weakness.',
    ),
    recall: {
      mend: say('boro', 'Every rope we had, at Khan Tengri. Use them all again.'),
      rest: say(
        'nara',
        'At Khan Tengri the Khan stopped to listen. The households are ready. Listen now.',
      ),
    },
    remembered: {
      mend: 'At Khan Tengri, the clan learned that a title is a duty. One household’s herd came through on borrowed rope.',
      rest: 'At Khan Tengri, the clan learned that a Khan answers to the people. Any household may still stop the work to be heard.',
    },
  },
  belukha: {
    promise:
      'Mount Belukha · Cloth whose patterns do not match is stitched into the banner side by side.',
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
      'Start where they agree',
      'Put every household to work on the wagons; the argument can wait.',
      'The wagons are mended by people who still disagree, and the seams hold anyway.',
    ),
    rest: respond(
      'Sit and hear both accounts',
      'Rest the workers by the fire while each household gives its account.',
      'The two accounts are laid side by side. Neither wins, and everyone sleeps.',
    ),
    recall: {
      mend: say('saran', 'We need not agree why the sky broke. We must agree on this road.'),
      rest: say(
        'saran',
        'Beneath Belukha we let two stories sit side by side. There is room for more.',
      ),
    },
    remembered: {
      mend: 'Beneath Belukha, the clan learned to mend wagons beside people it still disagreed with.',
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
        'Tracks, a cleared camp, a marked trail. Signs that someone came this way who would have stopped for them.',
      ),
    ],
    mend: respond(
      'Ready the wagons, mark the trail',
      'Fit the wagons for the rough road and mark the way for whoever follows.',
      'The wagons are ready, and Nara rides last, marking the trail behind them.',
    ),
    rest: respond(
      'Rest, and keep the space clear',
      'The tired get a full night, and room is kept by the wagons for anyone who arrives.',
      'Nobody arrives in the night. The space by the wagons stays clear anyway.',
    ),
    recall: {
      mend: say('nara', 'We marked the trail at Altan Ovoo. Mark this one too.'),
      rest: say('saran', 'At Altan Ovoo we kept room by the wagons. Keep it here.'),
    },
    remembered: {
      mend: 'At Altan Ovoo, the clan learned to mark a road for strangers. The valley trail is marked all the way down.',
      rest: 'At Altan Ovoo, the clan learned to keep a space clear for whoever might arrive. The new camp still keeps one.',
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
      'Eej Khairkhan · The dry ground splits in long lines. Of everyone in camp, the water carriers are the most tired.',
    lines: [
      say('boro', 'Water first. Wagons after. Nothing moves without water.'),
      say('nara', 'Then the water carriers need relief. Saran has done four turns today.'),
      say('saran', 'I am fine.'),
      say('erden', 'By my count, you are not.'),
    ],
    mend: respond(
      'Put the water on wheels',
      'Repair the casks and harness so the water travels on wagons, not backs.',
      'The casks ride the wagons now, and fewer backs ache tonight.',
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
      rest: 'At Eej Khairkhan, the clan learned to carry the carriers. Whoever has served all day is handed the first cup.',
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
      'Each household names its load as it packs; Erden writes, and the wagons fill.',
      'The new tally is written in several hands, and the wagons are ready by noon.',
    ),
    rest: respond(
      'Rest by the river first',
      'The families rest beside the water before the work; Erden waits to write.',
      'It is a slow morning by the river. Erden’s tally comes out shorter, and more honest.',
    ),
    recall: {
      mend: say('erden', 'Every household answers its own line, like the Orkhon tally.'),
      rest: say('boro', 'We rested by the Orkhon and nobody lost a horse for it. Hold in turns.'),
    },
    remembered: {
      mend: 'In the Orkhon Valley, the clan learned that a tally must leave room for people to answer.',
      rest: 'In the Orkhon Valley, the clan learned that a slower record can be the more honest one.',
    },
  },
};

/** Defensive fallbacks for any location without a treatment; normal play never reaches them. */
const FALLBACK_FIRST: FirstStop = {
  title: 'Whose road is this?',
  image: 'intro-fallen-sky.png',
  setting:
    'The White Silence has made familiar signs unreliable, and each companion reads the way ahead differently.',
  lines: [
    say('boro', 'The herd will tell us where the grass is. I trust the herd.'),
    say('saran', 'And I trust the households to say what they have seen.'),
    say('nara', 'Then ask both.'),
  ],
  test: respond(
    'Test the ground',
    'Boro checks the grazing and the approaches before the camp settles.',
    'The tested ground holds, and the stores are packed against the cold.',
  ),
  listen: respond(
    'Hear every household',
    'Saran gathers the households to compare what each has seen.',
    'Nobody had seen everything, but together the accounts make one plan.',
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
    'The ground shifts under the camp. The wheels, the harness, and the people all need tending.',
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
