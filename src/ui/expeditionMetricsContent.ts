import type { RunState } from '../game/types';
import { EXPEDITION_MILESTONES } from '../game/state/expeditionMetrics';
import { escapeHtml } from './progressionTree';
export function expeditionMetricsContent(run: RunState): string {
  const stages = run.metrics?.stages ?? [];
  if (!stages.length) return '';
  const labels = [
    'First fight',
    'First knowledge',
    'First research',
    'First build',
    'First damage',
    'First casualty',
    'Departure',
  ];
  return `<details class="expedition-metrics"><summary>Expedition milestones</summary><p>Seconds of active play since each stage began. A dash means it never happened. Riding and guarding time can overlap.</p>${stages.map((s) => `<article><h4>${escapeHtml(s.location)} · ${escapeHtml(s.stage)}</h4><dl>${EXPEDITION_MILESTONES.map((id, i) => `<div><dt>${labels[i]}</dt><dd>${s.marks[id] === undefined ? '—' : `${Math.max(0, s.marks[id]! - s.startedAt).toFixed(1)}s`}</dd></div>`).join('')}<div><dt>Resolve lost</dt><dd>${s.damage.toFixed(1)}</dd></div><div><dt>Casualties</dt><dd>${s.casualties}</dd></div></dl><p>Riding ${Math.round(s.riding)}s · Guarding ${Math.round(s.guarding)}s · Travelling ${Math.round(s.travelling)}s</p></article>`).join('')}</details>`;
}
