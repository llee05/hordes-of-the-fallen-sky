import type { RunState } from '../game/types';
import type { EdgeWarning, EliteMarker } from '../game/systems/combatReadability';
import { escapeHtml as h } from './progressionTree';
export function dangerWarningsContent(warnings: readonly EdgeWarning[]): string {
  return warnings
    .map(
      (w) =>
        `<div role="listitem" class="danger-edge" style="left:${w.x * 100}%;top:${w.y * 100}%"><span aria-hidden="true" style="transform:rotate(${w.angle}deg)">➤</span><strong>${h(w.label)}</strong><small>${w.eta.toFixed(1)}s</small></div>`,
    )
    .join('');
}
export function eliteMarkersContent(elites: readonly EliteMarker[]): string {
  return elites
    .map(
      (e) =>
        `<div role="listitem" class="elite-marker" style="left:${e.x * 100}%;top:${e.y * 100}%"><strong>◆ ${h(e.label)}</strong><div><i style="width:${Math.max(0, Math.min(1, e.health)) * 100}%"></i></div></div>`,
    )
    .join('');
}
export function majorLossMessage(run: RunState): string {
  const loss = run.safety.lastMajorLoss;
  if (!loss || run.elapsed - loss.at >= 12) return '';
  const causes = {
    attack: `${loss.source ?? 'Enemy attacks'} reached the households`,
    starvation: 'Provisions ran out',
    eruption: 'A marked ground eruption hit the camp',
    seer: 'A seer strike hit the camp',
    area: 'A local terrain or spell strike hit the camp',
  };
  const advice = {
    attack: 'Guard the threatened approach or reinforce the households.',
    starvation: 'Gather food, train herders, or choose a supplied crossing.',
    eruption: 'Draw eruption warnings away from the households.',
    seer: 'Interrupt the seer before its warning releases.',
    area: 'Clear the threatening casters and watch local warnings.',
  };
  return `${causes[loss.cause]}: −${loss.amount.toFixed(1)} resolve${loss.people ? `, ${loss.people} ${loss.people === 1 ? 'person' : 'people'} lost` : ''}. ${advice[loss.cause]}`;
}
