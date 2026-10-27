import { GAME } from '../config';
import { RESEARCH, RESEARCH_BY_ID } from '../data/research';
import type { ResearchRequirement } from '../data/researchTypes';
import { PATRONS } from '../data/patrons';
import type { PatronId, RunState } from '../types';

export type ResearchState = Pick<RunState, 'upgrades' | 'pendingUpgrades'> & {
  completedCrossings: number;
};
export type ResearchReason =
  | 'unknown'
  | 'stale-rank'
  | 'max-rank'
  | 'knowledge'
  | 'prerequisite'
  | 'any-prerequisite'
  | 'patron-spend'
  | 'crossings'
  | 'exclusive'
  | 'unimplemented';
export interface ResearchValidation {
  allowed: boolean;
  reasonCodes: ResearchReason[];
  reasons: string[];
  missingRequirements: ResearchRequirement[];
  missingAny: ResearchRequirement[];
  missingKnowledge: number;
  spentByPatron: Record<PatronId, number>;
  cost: number;
}
export function researchState(run: RunState): ResearchState {
  return {
    upgrades: run.upgrades,
    pendingUpgrades: run.pendingUpgrades,
    completedCrossings: run.story.crossings.length,
  };
}
export function researchSpend(state: Pick<ResearchState, 'upgrades'>): Record<PatronId, number> {
  const spent = Object.fromEntries(PATRONS.map((p) => [p.id, 0])) as Record<PatronId, number>;
  for (const t of RESEARCH) {
    if (t.patronIds.length !== 1) continue;
    const rank = Math.min(t.maxRank, state.upgrades[t.id] ?? 0);
    spent[t.patronIds[0]!] += t.pointCostPerRank.slice(0, rank).reduce((a, b) => a + b, 0);
  }
  return spent;
}
export function researchExcluded(
  state: Pick<ResearchState, 'upgrades'>,
  id: string,
  visited = new Set<string>(),
): boolean {
  const t = RESEARCH_BY_ID.get(id);
  if (!t || visited.has(id)) return false;
  visited.add(id);
  if (
    t.exclusiveGroup &&
    RESEARCH.some(
      (other) =>
        other.id !== id &&
        other.exclusiveGroup === t.exclusiveGroup &&
        (state.upgrades[other.id] ?? 0) > 0,
    )
  )
    return true;
  if (t.requiresAll.some((r) => researchExcluded(state, r.id, new Set(visited)))) return true;
  return (
    t.requiresAny.length > 0 &&
    t.requiresAny.every((r) => researchExcluded(state, r.id, new Set(visited)))
  );
}
/** All blockers are computed before mutation. expectedRank is the current owned rank. */
export function validateResearchPurchase(
  state: ResearchState,
  id: string,
  expectedRank: number,
): ResearchValidation {
  const t = RESEARCH_BY_ID.get(id),
    rank = state.upgrades[id] ?? 0;
  const result: ResearchValidation = {
    allowed: false,
    reasonCodes: [],
    reasons: [],
    missingRequirements: [],
    missingAny: [],
    missingKnowledge: 0,
    spentByPatron: researchSpend(state),
    cost: t?.pointCostPerRank[rank] ?? 0,
  };
  const fail = (code: ResearchReason, reason: string) => {
    result.reasonCodes.push(code);
    result.reasons.push(reason);
  };
  if (!t) {
    fail('unknown', 'Unknown technology');
    return result;
  }
  if (!Number.isInteger(expectedRank) || expectedRank !== rank)
    fail('stale-rank', 'Research changed; inspect its current rank again');
  if (rank >= t.maxRank) fail('max-rank', 'Already learned');
  result.missingKnowledge = Math.max(0, result.cost - state.pendingUpgrades);
  if (result.missingKnowledge > 0)
    fail(
      'knowledge',
      `Needs ${result.cost} knowledge point${result.cost === 1 ? '' : 's'} (${state.pendingUpgrades} available)`,
    );
  const owned = (r: ResearchRequirement) => (state.upgrades[r.id] ?? 0) >= r.rank;
  result.missingRequirements = t.requiresAll.filter((r) => !owned(r));
  for (const r of result.missingRequirements)
    fail('prerequisite', `Requires ${RESEARCH_BY_ID.get(r.id)?.title ?? r.id} rank ${r.rank}`);
  if (t.requiresAny.length && !t.requiresAny.some(owned)) {
    result.missingAny = [...t.requiresAny];
    fail(
      'any-prerequisite',
      `Requires ANY: ${t.requiresAny.map((r) => `${RESEARCH_BY_ID.get(r.id)?.title ?? r.id} rank ${r.rank}`).join(' or ')}`,
    );
  }
  for (const p of PATRONS) {
    const minimum = t.minSpendByPatron[p.id] ?? 0;
    if (result.spentByPatron[p.id] < minimum)
      fail(
        'patron-spend',
        `Spend ${minimum} knowledge with ${p.name} first (${result.spentByPatron[p.id]} spent)`,
      );
  }
  if (state.completedCrossings < t.minCompletedCrossings)
    fail(
      'crossings',
      `Complete ${t.minCompletedCrossings} crossings first (${state.completedCrossings} completed)`,
    );
  if (researchExcluded(state, id)) fail('exclusive', 'Another specialization chosen');
  if (t.unavailableReason) fail('unimplemented', `Unavailable: ${t.unavailableReason}`);
  result.allowed = result.reasonCodes.length === 0;
  return result;
}
export function purchaseResearch(
  state: ResearchState,
  id: string,
  expectedRank: number,
): ResearchValidation {
  const result = validateResearchPurchase(state, id, expectedRank);
  if (result.allowed) {
    state.pendingUpgrades -= result.cost;
    state.upgrades[id] = expectedRank + 1;
  }
  return result;
}
export function previewResearchPurchase(
  state: ResearchState,
  id: string,
  expectedRank: number,
): { validation: ResearchValidation; projected?: ResearchState } {
  const copy = structuredClone(state);
  const validation = purchaseResearch(copy, id, expectedRank);
  return { validation, projected: validation.allowed ? copy : undefined };
}
/** Read-only building channel; no building IDs are technology prerequisites. */
export interface ResearchBuildingModifiers {
  readonly source: 'building';
  readonly optionalCount: number;
  readonly optionalCategories: readonly string[];
  readonly bonuses: Readonly<RunState['clan']['campEffects']['bonuses']>;
  readonly multipliers: Readonly<RunState['clan']['campEffects']['multipliers']>;
}
export function researchBuildingModifiers(run: RunState): ResearchBuildingModifiers {
  return {
    source: 'building',
    optionalCount: 0,
    optionalCategories: [],
    bonuses: { ...run.clan.campEffects.bonuses },
    multipliers: {
      ...run.clan.campEffects.multipliers,
      wagonDamage:
        run.clan.campEffects.multipliers.wagonDamage /
        ((run.upgrades['rolling-fortress'] ?? 0) > 0
          ? GAME.patrons.specializations.fortressDamage
          : 1),
    },
  };
}
