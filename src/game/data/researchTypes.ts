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
        | 'km-sky-darkener';
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
