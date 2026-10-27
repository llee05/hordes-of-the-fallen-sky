import { RESEARCH, RESEARCH_BY_ID } from '../data/research';
import type { RunState } from '../types';
import { researchSpend } from './research';

export interface ResearchPurchase {
  id: string;
  rank: number;
  cost: number;
  at: number;
}
export type ResearchDamageSource = 'khan' | 'allied-arrows' | 'support-and-other';
export interface ResearchObservations {
  damage: Record<ResearchDamageSource, number>;
  frames: number;
  frameMilliseconds: number;
  worstFrameMilliseconds: number;
}
function observations(run: RunState): ResearchObservations {
  return (run.researchObservations ??= {
    damage: { khan: 0, 'allied-arrows': 0, 'support-and-other': 0 },
    frames: 0,
    frameMilliseconds: 0,
    worstFrameMilliseconds: 0,
  });
}
export function observeResearchFrame(run: RunState, milliseconds: number): void {
  if (run.phase !== 'playing' || !Number.isFinite(milliseconds) || milliseconds <= 0) return;
  const data = observations(run);
  data.frames++;
  data.frameMilliseconds += milliseconds;
  data.worstFrameMilliseconds = Math.max(data.worstFrameMilliseconds, milliseconds);
}
export function recordResearchDamage(
  run: RunState,
  source: ResearchDamageSource,
  amount: number,
): void {
  if (run.phase !== 'playing' || !Number.isFinite(amount) || amount <= 0) return;
  observations(run).damage[source] += amount;
}
/** Read-only report. Older saves cannot invent purchase timestamps or frame observations. */
export function researchSummary(run: RunState) {
  const spentByPatron = researchSpend(run);
  const paid = new Map((run.researchPurchases ?? []).map((p) => [`${p.id}:${p.rank}`, p.cost]));
  const tierRanks: Record<string, number> = {};
  const doctrines: string[] = [],
    mythics: string[] = [],
    hybrids: string[] = [];
  let totalSpent = 0;
  for (const t of RESEARCH) {
    const rank = run.upgrades[t.id] ?? 0;
    tierRanks[t.tier] = (tierRanks[t.tier] ?? 0) + rank;
    for (let i = 1; i <= rank; i++)
      totalSpent += paid.get(`${t.id}:${i}`) ?? t.pointCostPerRank[i - 1] ?? 0;
    if (rank && t.tier === 'doctrine') doctrines.push(t.id);
    if (rank && t.tier === 'mythic') mythics.push(t.id);
    if (rank && t.tier === 'hybrid') hybrids.push(t.id);
  }
  const firstMythic = run.researchPurchases?.find(
    (p) => RESEARCH_BY_ID.get(p.id)?.tier === 'mythic',
  )?.at;
  const o = run.researchObservations;
  return {
    knowledgeFromLevels: run.level - 1,
    totalSpent,
    unspent: run.pendingUpgrades,
    accountedKnowledge: totalSpent + run.pendingUpgrades,
    spentByPatron,
    tierRanks,
    doctrines,
    mythics,
    hybrids,
    firstMythic,
    damage: o ? { ...o.damage } : undefined,
    sampledFrames: o?.frames ?? 0,
    meanFrameMilliseconds: o?.frames ? o.frameMilliseconds / o.frames : undefined,
    worstFrameMilliseconds: o?.worstFrameMilliseconds,
  };
}
