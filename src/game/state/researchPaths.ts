import { RESEARCH, RESEARCH_BY_ID } from '../data/research';
import type { PatronId } from '../types';
import type { ResearchRequirement } from '../data/researchTypes';
import { researchExcluded, type ResearchState } from './research';

export interface ResearchStep {
  id: string;
  rank: number;
  cost: number;
}
export interface ResearchPath {
  steps: ResearchStep[];
  cost: number;
  reasons: string[];
  affordable: boolean;
}

/** Bounded uniform-cost search includes spend fillers and respects AND/ANY and choices.
 * Catalogue mode is for authoring simulations only, never permission to buy an effect. */
export function planResearch(state: ResearchState, id: string, catalogue = false): ResearchPath {
  const target = RESEARCH_BY_ID.get(id);
  const fail = (reason: string): ResearchPath => ({
    steps: [],
    cost: 0,
    reasons: [reason],
    affordable: false,
  });
  if (!target) return fail('Unknown technology');
  if (!catalogue && target.unavailableReason)
    return fail(`Unavailable: ${target.unavailableReason}`);
  if (researchExcluded(state, id)) return fail('Another specialization chosen blocks this route');
  const needed = new Map<PatronId, ResearchRequirement[]>();
  const shared: ResearchStep[] = [];
  function requireShared(key: string): void {
    const t = RESEARCH_BY_ID.get(key)!;
    if (t.patronIds.length === 1) {
      const p = t.patronIds[0]!;
      needed.set(p, [
        ...(needed.get(p) ?? []),
        { id: key, rank: Math.min(t.maxRank, (state.upgrades[key] ?? 0) + 1) },
      ]);
      return;
    }
    for (const r of t.requiresAll) {
      const parent = RESEARCH_BY_ID.get(r.id)!;
      if ((state.upgrades[r.id] ?? 0) >= r.rank) continue;
      if (parent.patronIds.length === 1) {
        const p = parent.patronIds[0]!;
        needed.set(p, [...(needed.get(p) ?? []), r]);
      } else requireShared(r.id);
    }
    if ((state.upgrades[key] ?? 0) < t.maxRank && !shared.some((s) => s.id === key))
      shared.push({ id: key, rank: 1, cost: t.pointCostPerRank[0]! });
  }
  requireShared(id);
  for (const [p, min] of Object.entries(target.minSpendByPatron) as [PatronId, number][])
    if (min > 0 && !needed.has(p)) needed.set(p, []);
  const steps: ResearchStep[] = [];
  for (const [patron, requirements] of needed) {
    const candidates = RESEARCH.filter(
      (t) =>
        t.patronIds.length === 1 &&
        t.patronIds[0] === patron &&
        (catalogue || !t.unavailableReason),
    );
    const indices = new Map(candidates.map((t, i) => [t.id, i]));
    if (requirements.some((r) => !indices.has(r.id)))
      return fail('Required technology is awaiting runtime integration');
    type Entry = { ranks: number[]; spend: number; steps: ResearchStep[] };
    const ranks = candidates.map((t) => state.upgrades[t.id] ?? 0);
    const paid = (values: number[]) =>
      candidates.reduce(
        (sum, t, i) => sum + t.pointCostPerRank.slice(0, values[i]).reduce((a, b) => a + b, 0),
        0,
      );
    const minimum = target.patronIds.length === 2 ? (target.minSpendByPatron[patron] ?? 0) : 0;
    const buckets: Entry[][] = Array.from({ length: 76 }, () => []);
    buckets[0]!.push({ ranks, spend: paid(ranks), steps: [] });
    const seen = new Set<string>([ranks.join(',')]);
    let solution: Entry | undefined,
      visits = 0;
    for (let cost = 0; cost < buckets.length && !solution; cost++) {
      for (const entry of buckets[cost]!) {
        if (++visits > 100000) return fail('Route search limit reached; narrow the target');
        const owned = (r: ResearchRequirement) =>
          (indices.has(r.id) ? entry.ranks[indices.get(r.id)!]! : (state.upgrades[r.id] ?? 0)) >=
          r.rank;
        if (entry.spend >= minimum && requirements.every(owned)) {
          solution = entry;
          break;
        }
        for (const [i, t] of candidates.entries()) {
          const rank = entry.ranks[i]!;
          if (
            rank >= t.maxRank ||
            entry.spend < (t.minSpendByPatron[patron] ?? 0) ||
            !t.requiresAll.every(owned) ||
            (t.requiresAny.length > 0 && !t.requiresAny.some(owned))
          )
            continue;
          if (
            t.exclusiveGroup &&
            candidates.some(
              (other, j) =>
                j !== i && other.exclusiveGroup === t.exclusiveGroup && entry.ranks[j]! > 0,
            )
          )
            continue;
          const price = t.pointCostPerRank[rank]!,
            nextCost = cost + price;
          if (nextCost >= buckets.length) continue;
          const next = [...entry.ranks];
          next[i] = rank + 1;
          const key = next.join(',');
          if (seen.has(key)) continue;
          seen.add(key);
          buckets[nextCost]!.push({
            ranks: next,
            spend: entry.spend + price,
            steps: [...entry.steps, { id: t.id, rank: rank + 1, cost: price }],
          });
        }
      }
    }
    if (!solution)
      return fail('No legal route from the current choices and implemented technologies');
    steps.push(...solution.steps);
  }
  steps.push(...shared);
  const reasons: string[] = [];
  const crossing = Math.max(
    target.minCompletedCrossings,
    ...shared.map((s) => RESEARCH_BY_ID.get(s.id)!.minCompletedCrossings),
  );
  if (crossing > state.completedCrossings) reasons.push(`Complete ${crossing} crossings first`);
  const cost = steps.reduce((sum, s) => sum + s.cost, 0);
  return {
    steps,
    cost,
    reasons,
    affordable: reasons.length === 0 && cost <= state.pendingUpgrades,
  };
}
