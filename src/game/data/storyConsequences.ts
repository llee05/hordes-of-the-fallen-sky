import { GAME } from '../config';
import type { CampEffectDefinition } from '../types';
import type { Companion } from '../story/types';

/**
 * What a chosen response means beyond its one-time gift. Keyed by stable choice ID so
 * saved transcripts from any build resolve to the same consequences.
 *
 * - `bonds` shift companion trust. Trust is derived from the run's records, never stored.
 * - `lasting` is a small camp effect applied once, when the response is chosen.
 */
export interface StoryConsequence {
  bonds: Partial<Record<Companion, number>>;
  lasting?: { label: string; effects: CampEffectDefinition };
}

const L = GAME.story.lasting;
const percent = (multiplier: number): number => Math.round(Math.abs(multiplier - 1) * 100);

export const STORY_CONSEQUENCES: Readonly<Record<string, StoryConsequence>> = {
  // Act I · A place beside the fire
  'share-work': {
    bonds: { saran: 1, nara: 1 },
    lasting: {
      label: `Shared labour: +${percent(L.sharedLabour)}% materials`,
      effects: { multipliers: { materialProduction: L.sharedLabour } },
    },
  },
  'share-watch': {
    bonds: { boro: 1, erden: 1 },
    lasting: {
      label: `Named watches: clan takes ${percent(L.namedWatches)}% less damage`,
      effects: { multipliers: { clanProtection: L.namedWatches } },
    },
  },
  // Act I · More mouths, more hands
  'pack-food': {
    bonds: { boro: 1 },
    lasting: {
      label: `Careful rations: ${percent(L.carefulRations)}% less food eaten`,
      effects: { multipliers: { consumption: L.carefulRations } },
    },
  },
  'pack-tools': {
    bonds: { saran: 1, erden: 1 },
    lasting: {
      label: `Room in the wagons: +${L.roomInWagons} person from each blue-banner rescue`,
      effects: { bonuses: { refugePeople: L.roomInWagons } },
    },
  },
  // Act I · first chosen camp
  'test-river': {
    bonds: { boro: 1 },
    lasting: {
      label: `Tested ground: +${percent(L.testedGround)}% food`,
      effects: { multipliers: { foodProduction: L.testedGround } },
    },
  },
  'keep-names': {
    bonds: { saran: 1, nara: 1 },
    lasting: {
      label: `Living voices: +${percent(L.sharedSongs)}% spirit`,
      effects: { multipliers: { spiritGain: L.sharedSongs } },
    },
  },
  // Act II · A promise chosen
  'promise-guard': {
    bonds: { boro: 1, nara: 1 },
    lasting: {
      label: `Counted before leaving: +${L.countedWatch} resolve each second`,
      effects: { bonuses: { resolveRecovery: L.countedWatch } },
    },
  },
  'promise-remember': {
    bonds: { saran: 1, erden: 1 },
    lasting: {
      label: `Every name: +${percent(L.everyName)}% spirit`,
      effects: { multipliers: { spiritGain: L.everyName } },
    },
  },
  // Act II · second chosen camp
  'mend-wheels': {
    bonds: { boro: 1, erden: 1 },
    lasting: {
      label: `Mended wheels: caravan ${percent(L.mendedWheels)}% faster`,
      effects: { multipliers: { mobility: L.mendedWheels } },
    },
  },
  'rest-hands': {
    bonds: { saran: 1, nara: 1 },
    lasting: {
      label: `Rested hands: +${L.restedHands} resolve each second`,
      effects: { bonuses: { resolveRecovery: L.restedHands } },
    },
  },
  // Act II · The court's empty promise
  'trust-erden': {
    bonds: { erden: 2, saran: 1, boro: -1 },
    lasting: {
      label: `Shared tally: ${percent(L.sharedTally)}% less food eaten`,
      effects: { multipliers: { consumption: L.sharedTally } },
    },
  },
  'hear-erden': {
    bonds: { erden: 1, saran: 1 },
    lasting: {
      label: `A witness recorded: +${percent(L.witnessAccount)}% spirit`,
      effects: { multipliers: { spiritGain: L.witnessAccount } },
    },
  },
  'nara-tally': {
    bonds: { nara: 2, boro: 1, erden: -1 },
    lasting: {
      label: `Plain accounts: clan takes ${percent(L.plainOrders)}% less damage`,
      effects: { multipliers: { clanProtection: L.plainOrders } },
    },
  },
  // Climax · no lasting effects; the defense is already timed.
  'hold-watch': { bonds: { boro: 1 } },
  'share-last-meal': { bonds: { saran: 1, boro: 1 } },
  'hold-together': { bonds: { boro: 1, erden: 1 } },
  'carry-song': { bonds: { saran: 1, nara: 1 } },
};

export function storyConsequence(choiceId: string | undefined): StoryConsequence | undefined {
  return choiceId !== undefined && Object.hasOwn(STORY_CONSEQUENCES, choiceId)
    ? STORY_CONSEQUENCES[choiceId]
    : undefined;
}
