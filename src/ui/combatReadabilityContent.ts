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
    starvation: 'The food ran out',
    eruption: 'A marked eruption shook the camp',
    seer: 'A seer struck the camp',
    area: 'The land or a local spell hit the camp',
  };
  const advice = {
    attack: 'Guard that approach, or strengthen the households.',
    starvation: 'Gather food, train herders, or take a supplied crossing.',
    eruption: 'Draw the eruptions away from the households.',
    seer: 'Cut the seer down before its warning runs out.',
    area: 'Clear out the casters and watch for local warnings.',
  };
  return `${causes[loss.cause]}: −${loss.amount.toFixed(1)} resolve${loss.people ? `, ${loss.people} ${loss.people === 1 ? 'person' : 'people'} lost` : ''}. ${advice[loss.cause]}`;
}
