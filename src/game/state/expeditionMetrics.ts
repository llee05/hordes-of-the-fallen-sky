import type { RunState } from '../types';
import { currentLocation } from './journey';

export const EXPEDITION_MILESTONES = [
  'fight',
  'knowledge',
  'research',
  'construction',
  'camp-damage',
  'casualty',
  'departure',
] as const;
export type ExpeditionMilestone = (typeof EXPEDITION_MILESTONES)[number];
export interface ExpeditionStageMetrics {
  key: string;
  location: string;
  stage: string;
  startedAt: number;
  marks: Partial<Record<ExpeditionMilestone, number>>;
  damage: number;
  casualties: number;
  riding: number;
  guarding: number;
  travelling: number;
}
export interface ExpeditionMetrics {
  stages: ExpeditionStageMetrics[];
}

export function metricStage(run: RunState): ExpeditionStageMetrics {
  const metrics = (run.metrics ??= { stages: [] });
  const key = `${run.clan.region}:${run.clan.stage}:${currentLocation(run).id}`;
  let stage = metrics.stages.at(-1);
  if (!stage || stage.key !== key) {
    stage = {
      key,
      location: currentLocation(run).name,
      stage: run.clan.stage,
      startedAt: run.elapsed,
      marks: {},
      damage: 0,
      casualties: 0,
      riding: 0,
      guarding: 0,
      travelling: 0,
    };
    metrics.stages.push(stage);
    if (metrics.stages.length > 8) metrics.stages.shift();
  }
  return stage;
}
/** Once-only active-time marks. Missing legacy observations remain unknown. */
export function markExpedition(run: RunState, event: ExpeditionMilestone): void {
  const stage = metricStage(run);
  stage.marks[event] ??= run.elapsed;
}
export function observeExpedition(
  run: RunState,
  dt: number,
  riding: boolean,
  guarding: boolean,
): void {
  if (run.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
  const stage = metricStage(run);
  if (riding) stage.riding += dt;
  if (guarding) stage.guarding += dt;
  if (run.clan.stage === 'migration') stage.travelling += dt;
}
export function metricCasualties(run: RunState, people: number): void {
  if (people <= 0) return;
  markExpedition(run, 'casualty');
  metricStage(run).casualties += people;
}
export function expeditionMetricLines(run: RunState): string[] {
  return (run.metrics?.stages ?? []).map((s) => {
    const time = (event: ExpeditionMilestone) =>
      s.marks[event] === undefined ? '—' : `${(s.marks[event]! - s.startedAt).toFixed(1)}s`;
    return `${s.location} / ${s.stage}: fight ${time('fight')}, knowledge ${time('knowledge')}, research ${time('research')}, build ${time('construction')}, first damage ${time('camp-damage')}, first casualty ${time('casualty')}, departure ${time('departure')}; ${s.damage.toFixed(1)} resolve lost, ${s.casualties} people; riding ${s.riding.toFixed(0)}s, guarding ${s.guarding.toFixed(0)}s, travelling ${s.travelling.toFixed(0)}s.`;
  });
}
