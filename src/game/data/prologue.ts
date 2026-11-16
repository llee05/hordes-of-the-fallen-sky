import type { ClassAbilitySlot } from './classes';
import type { KarakorumSiteId } from './karakorum';

export const PROLOGUE_STAGE_IDS = [
  'arrival',
  'training',
  'patrol',
  'omen',
  'beast',
  'return',
] as const;
export type PrologueStageId = (typeof PROLOGUE_STAGE_IDS)[number];

export type PrologueCompletionRule =
  | { kind: 'reach-site'; site: KarakorumSiteId; radius: number }
  | { kind: 'hold-site'; site: KarakorumSiteId; radius: number; seconds: number }
  | { kind: 'light-releases'; count: number }
  | { kind: 'heavy-releases'; count: number }
  | { kind: 'ability-used'; slot: ClassAbilitySlot }
  | { kind: 'galloped' }
  | { kind: 'objective-complete' }
  | { kind: 'wave-cleared'; wave: number }
  | { kind: 'level'; level: number }
  | { kind: 'beast-defeated' }
  | { kind: 'camp-established' }
  | { kind: 'building-purchased' }
  | { kind: 'routes-opened' };

export interface PrologueBeat {
  id: string;
  objective: string;
  guidanceTitle: string;
  guidanceText: string;
  rule: PrologueCompletionRule;
}

export interface PrologueStage {
  id: PrologueStageId;
  numeral: string;
  title: string;
  summary: string;
  /** Phase 2 deliberately advances these authored stages until their mechanics land. */
  phase2PassThrough?: boolean;
  beats: readonly PrologueBeat[];
}

const reach = (site: KarakorumSiteId, radius = 105): PrologueCompletionRule => ({
  kind: 'reach-site',
  site,
  radius,
});

export const PROLOGUE_STAGES: readonly PrologueStage[] = [
  {
    id: 'arrival',
    numeral: 'I',
    title: 'Arrival in Karakorum',
    summary: 'Return through the western pasture and report for duty at the imperial city.',
    beats: [
      {
        id: 'arrival-gate',
        objective: 'Ride to the western gate',
        guidanceTitle: 'Ride for Karakorum',
        guidanceText:
          'Ride with WASD, the arrow keys, the left stick, or a touch drag. Follow the brass marker to the city gate.',
        rule: reach('gate', 125),
      },
      {
        id: 'arrival-report',
        objective: 'Report to the gate captain',
        guidanceTitle: 'Hold at the gate',
        guidanceText:
          'Stay inside the marked circle while the gate captain receives your report. The hold resets if you ride away.',
        rule: { kind: 'hold-site', site: 'gate', radius: 125, seconds: 1.5 },
      },
      {
        id: 'arrival-yard',
        objective: 'Ride to the training yard',
        guidanceTitle: 'The yard-master is waiting',
        guidanceText: 'Follow the road east into Karakorum and stop at the training yard.',
        rule: reach('yard', 135),
      },
    ],
  },
  {
    id: 'training',
    numeral: 'II',
    title: 'Training Grounds',
    summary: 'Show the yard-master that horse, weapon, and discipline still answer together.',
    phase2PassThrough: true,
    beats: [
      {
        id: 'training-light',
        objective: 'Land five light attacks',
        guidanceTitle: 'Keep the weapon moving',
        guidanceText: 'Hold the light-attack control and ride through the practice ring.',
        rule: { kind: 'light-releases', count: 5 },
      },
      {
        id: 'training-heavy',
        objective: 'Release two heavy attacks',
        guidanceTitle: 'Commit to the heavy strike',
        guidanceText:
          'Use the heavy-attack control twice; charged weapons release when you let go.',
        rule: { kind: 'heavy-releases', count: 2 },
      },
      ...(['q', 'w', 'e', 'r'] as const).map((slot): PrologueBeat => ({
        id: `training-ability-${slot}`,
        objective: `Use ability ${slot.toUpperCase()}`,
        guidanceTitle: 'Use every tool you carry',
        guidanceText:
          'Try each of your four class abilities once. Their names and cooldowns remain in the command dock.',
        rule: { kind: 'ability-used', slot },
      })),
      {
        id: 'training-gallop',
        objective: 'Gallop through the practice ring',
        guidanceTitle: 'Break clear at a gallop',
        guidanceText: 'Gallop grants a brief moment of protection as your horse surges forward.',
        rule: { kind: 'galloped' },
      },
    ],
  },
  {
    id: 'patrol',
    numeral: 'III',
    title: 'Western Patrol',
    summary: 'Follow the west road, recover the missing patrol supplies, and climb to the ovoo.',
    phase2PassThrough: true,
    beats: [
      {
        id: 'patrol-road',
        objective: 'Follow the west track',
        guidanceTitle: 'Keep the road in sight',
        guidanceText:
          'The bearing and distance in the objective banner lead beyond the city pasture.',
        rule: reach('westTrack0', 120),
      },
      {
        id: 'patrol-cart',
        objective: "Recover the patrol's supplies",
        guidanceTitle: 'Search the abandoned cart',
        guidanceText: 'Hold near the cart until the supplies are secured.',
        rule: { kind: 'objective-complete' },
      },
      {
        id: 'patrol-ovoo',
        objective: 'Ride on to the ovoo',
        guidanceTitle: 'Climb the last rise',
        guidanceText: 'The patrol should be waiting beyond the ridge.',
        rule: reach('omen', 135),
      },
    ],
  },
  {
    id: 'omen',
    numeral: 'IV',
    title: 'The First Omen',
    summary: 'The western sky tears and the first unreturned creatures gather around the ridge.',
    phase2PassThrough: true,
    beats: [
      ...[1, 2, 3].map((wave): PrologueBeat => ({
        id: `omen-wave-${wave}`,
        objective: `Survive omen wave ${wave}`,
        guidanceTitle: wave === 1 ? 'Do not let the swarm close' : 'Keep moving through the swarm',
        guidanceText:
          'Ride through open ground, gather the turquoise shards, and let your class kit control the crowd.',
        rule: { kind: 'wave-cleared', wave },
      })),
      {
        id: 'omen-level',
        objective: 'Reach level 3',
        guidanceTitle: 'Gather what the fallen leave',
        guidanceText:
          'Spirit shards fill the experience bar and grant class improvements without pausing the fight.',
        rule: { kind: 'level', level: 3 },
      },
    ],
  },
  {
    id: 'beast',
    numeral: 'V',
    title: 'The Corrupted Beast',
    summary: 'A lesser antlered thing emerges from the wound in the sky and blocks the road home.',
    phase2PassThrough: true,
    beats: [
      {
        id: 'beast-fight',
        objective: 'Defeat the corrupted beast',
        guidanceTitle: 'Watch the line',
        guidanceText: 'Gallop out of its telegraphed breath, then strike while it staggers.',
        rule: { kind: 'beast-defeated' },
      },
    ],
  },
  {
    id: 'return',
    numeral: 'VI',
    title: 'Return to Karakorum',
    summary:
      'Households gather beyond the walls. Establish their first camp and keep the valley road open.',
    beats: [
      {
        id: 'return-camp',
        objective: 'Reach the expedition camp site',
        guidanceTitle: 'Households wait beyond the walls',
        guidanceText:
          'Ride to the blue banner. Reaching it establishes the temporary expedition camp and opens the Orkhon road.',
        rule: reach('campSite', 145),
      },
    ],
  },
] as const;

export function prologueStage(id: PrologueStageId): PrologueStage {
  return PROLOGUE_STAGES.find((stage) => stage.id === id)!;
}
