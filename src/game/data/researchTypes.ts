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
        | 'km-feathered-fan'
        | 'on-spirit-signal'
        | 'on-memory-vessels'
        | 'on-quiet-council'
        | 'on-ancestral-archers';
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
