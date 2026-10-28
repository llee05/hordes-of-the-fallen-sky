import { SYNERGIES, NOMADIC_SYNERGIES } from '../game/data/synergies';
import { synergyProgress, nomadicSynergyProgress } from '../game/state/synergies';
import type { RunState } from '../game/types';
import { clanMark } from './artwork';
import { escapeHtml, priceText } from './progressionTree';

export function synergyContent(run: RunState): string {
  return `<section class="synergy-catalog"><p class="eyebrow">TRADITIONS THAT WORK TOGETHER</p><h3>Strength in combination</h3><p>Some traditions and camp crafts strengthen each other. Learn every part and the combination works by itself.</p><div class="synergy-grid">${(run
    .clan.nomadicCamp
    ? NOMADIC_SYNERGIES
    : SYNERGIES
  )
    .map((recipe) => {
      const state = run.clan.nomadicCamp
        ? nomadicSynergyProgress(run, recipe as (typeof NOMADIC_SYNERGIES)[number])
        : synergyProgress(run, recipe as (typeof SYNERGIES)[number]);
      return `<article class="synergy-card" data-synergy="${recipe.id}" data-complete="${state.complete}" data-closed="${state.closed}"><header>${clanMark(recipe.icon)}<div><small>${state.complete ? 'Active combination' : state.closed ? 'Closed for this expedition' : 'Plan a combination'}</small><h4>${escapeHtml(recipe.title)}</h4></div></header><p>${escapeHtml(recipe.description)}</p><ul>${state.requirements.map((r) => `<li data-met="${r.current >= r.needed}"><span aria-hidden="true">${r.current >= r.needed ? '✓' : r.closed ? '×' : '○'}</span><button data-progression-jump="${r.kind}" data-branch="${r.branch}" data-target-node="${r.node}" data-focus-key="recipe-${recipe.id}-${r.node}">${escapeHtml(r.title)} <small>${r.current} / ${r.needed} ranks · ${r.kind === 'camp' ? 'Camp' : 'Patron'}</small></button></li>`).join('')}</ul><strong class="synergy-price">${state.complete ? 'Complete' : state.closed ? (run.clan.nomadicCamp ? 'No optional location available' : 'Needs a path you closed') : `Remaining route: ${escapeHtml(priceText(state.price))}`}</strong></article>`;
    })
    .join(
      '',
    )}</div><p class="tree-notice">Totals count every missing prerequisite and building at today’s prices. Workers are held, not spent, and later construction discounts can lower the materials.</p></section>`;
}
