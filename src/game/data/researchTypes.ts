import type { PatronId } from '../types';

export type ResearchTier =
  'foundation' | 'practice' | 'doctrine' | 't2' | 't3' | 't4' | 'mythic' | 'hybrid' | 'general';
export interface ResearchRequirement {
  id: string;
  rank: number;
}
/** Only named adapters with real gameplay handlers belong in this vocabulary. */
export type ResearchEffect =
  | { kind: 'legacy'; upgradeId: string }
  | {
      kind: 'runtime';
      handler:
        | 'hy-galloping-barrage'
        | 'hy-stillwater-refuge'
        | 'hy-river-of-spirits'
        | 'ee-deep-roots'
        | 'go-layered-felt'
        | 'go-common-fire'
        | 'km-feathered-fan'
        | 'on-spirit-signal'
        | 'on-memory-vessels'
        | 'on-quiet-council'
        | 'on-ancestral-archers'
        | 'bc-scent-of-fear'
        | 'bc-bounding-charge'
        | 'bc-pack-instinct'
        | 'bc-hounds-of-the-horizon'
        | 'bc-wind-cutting-hooves'
        | 'bc-throat-of-the-prey'
        | 'bc-storm-chaser'
        | 'bc-call-of-the-pack'
        | 'bc-endless-pursuit'
        | 'ee-vigilant-herders'
        | 'ee-camp-of-craftspeople'
        | 'ee-bounty-in-scarcity'
        | 'ee-wandering-city'
        | 'ee-unbroken-seasons'
        | 'km-draw-to-breath'
        | 'km-barbed-flight'
        | 'km-eagle-eye'
        | 'km-drilling-shafts'
        | 'km-arrow-rain'
        | 'km-still-hand'
        | 'km-sunder-the-ranks'
        | 'km-circle-of-shafts'
        | 'km-one-arrow-one-fate'
        | 'km-world-piercer'
        | 'km-sky-darkener'
        | 'go-warm-ashes'
        | 'go-embers-return'
        | 'go-shelter-the-wounded'
        | 'go-campfire-vigil'
        | 'go-ash-born'
        | 'go-firebreak'
        | 'go-household-oath'
        | 'go-flame-that-refuses'
        | 'go-fortress-of-felt'
        | 'go-eternal-hearth'
        | 'lu-floodplain'
        | 'lu-geomancers-eye'
        | 'lu-stone-and-stream'
        | 'lu-undertow'
        | 'lu-warning-signs'
        | 'lu-frozen-bank'
        | 'lu-floodgate'
        | 'lu-shifting-ridge'
        | 'lu-deep-current'
        | 'lu-river-that-remembers'
        | 'lu-eye-of-the-mountain'
        | 'lu-land-in-motion'
        | 'on-reverent-gathering'
        | 'on-line-of-forebears'
        | 'on-names-in-stone'
        | 'on-infinite-remembrance';
    };
export interface ResearchDefinition {
  id: string;
  title: string;
  description: string;
  tier: ResearchTier;
  patronIds: readonly PatronId[];
  maxRank: number;
  pointCostPerRank: readonly number[];
  requiresAll: readonly ResearchRequirement[];
  requiresAny: readonly ResearchRequirement[];
  minSpendByPatron: Partial<Record<PatronId, number>>;
  minCompletedCrossings: number;
  exclusiveGroup?: string;
  tags: readonly string[];
  effects: readonly ResearchEffect[];
  unavailableReason?: string;
}
