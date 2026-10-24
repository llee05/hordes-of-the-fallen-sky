import { SYNERGIES } from '../game/data/synergies';
import { synergyProgress } from '../game/state/synergies';
import type { RunState } from '../game/types';
import { clanMark } from './artwork';
import { escapeHtml, priceText } from './progressionTree';

export function synergyContent(run: RunState): string {
  return `<section class="synergy-catalog"><p class="eyebrow">TRADITIONS THAT WORK TOGETHER</p><h3>Strength in combination</h3><p>Follow these routes across patrons and camp crafts. Effects combine automatically; there is no extra purchase.</p><div class="synergy-grid">${SYNERGIES.map(
    (recipe) => {
      const state = synergyProgress(run, recipe);
      return `<article class="synergy-card" data-synergy="${recipe.id}" data-complete="${state.complete}" data-closed="${state.closed}"><header>${clanMark(recipe.icon)}<div><small>${state.complete ? 'Active combination' : state.closed ? 'Path closed this expedition' : 'Plan a combination'}</small><h4>${escapeHtml(recipe.title)}</h4></div></header><p>${escapeHtml(recipe.description)}</p><ul>${state.requirements.map((r) => `<li data-met="${r.current >= r.needed}"><span aria-hidden="true">${r.current >= r.needed ? '✓' : r.closed ? '×' : '○'}</span><button data-progression-jump="${r.kind}" data-branch="${r.branch}" data-target-node="${r.node}" data-focus-key="recipe-${recipe.id}-${r.node}">${escapeHtml(r.title)} <small>${r.current} / ${r.needed} ranks · ${r.kind === 'camp' ? 'Camp' : 'Patron'}</small></button></li>`).join('')}</ul><strong class="synergy-price">${state.complete ? 'Complete' : state.closed ? 'Requires an excluded specialization' : `Remaining route: ${escapeHtml(priceText(state.price))}`}</strong></article>`;
    },
  ).join(
    '',
  )}</div><p class="tree-notice">Route totals include missing prerequisites and establishments at current prices. Workers are reserved, not consumed. Future construction discounts can change material totals.</p></section>`;
}
