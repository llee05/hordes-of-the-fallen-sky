import { encampment } from '../game/state/campEstate';
import { BUILDINGS } from '../game/data/clan';
import { currentLocation } from '../game/state/journey';
import { assignedWorkers, burningTempest } from '../game/state/clan';
import { campShelters } from '../game/state/campLife';
import type { BuildingId, RunState } from '../game/types';
import { BUILDING_MARKS, campProp, campResident, clanMark } from './artwork';
import { campBranches } from './campContent';
import { developmentOutlook, economySummary } from './economyContent';
import { footer } from './panelContent';
import { synergyContent } from './synergyContent';
import {
  branchMarkup,
  nodeInspector,
  selectedNode,
  escapeHtml,
  searchText,
  type TreeViewState,
} from './progressionTree';

// Presentation coordinates in the miniature, independent of combat distances.
const SITES: Partial<Record<BuildingId, readonly [number, number]>> = {
  ger: [47, 31],
  archery: [20, 45],
  herd: [23, 74],
  sanctuary: [73, 26],
  wagon: [77, 73],
  felt: [20, 22],
  provisions: [49, 77],
  relay: [84, 48],
};

function prop(name: Parameters<typeof campProp>[0], className = ''): string {
  return `<span class="camp-object ${className}">${campProp(name)}</span>`;
}

function resident(name: 'worker' | 'packhorse', className = ''): string {
  return `<span class="camp-object camp-resident ${className}">${campResident(name)}</span>`;
}

function flag(className = ''): string {
  return `<span class="camp-pennant ${className}"><i></i></span>`;
}

function structure(id: BuildingId, run: RunState): string {
  const building = BUILDINGS.find((entry) => entry.id === id)!;
  const learned = run.clan.paths[id] ?? [];
  const established = run.clan.buildings[id] > 0;
  const details = established
    ? `${flag('camp-site-flag')}${Array.from({ length: Math.min(learned.length, 5) }, (_, index) => `<i class="camp-supply" style="--supply:${index}"></i>`).join('')}`
    : '';
  const worker = established && building.workers ? resident('worker', 'camp-crafter') : '';
  const assemblies: Partial<Record<BuildingId, string>> = {
    ger: `${prop('ger', 'camp-main-ger')}${prop('ger', 'camp-second-ger')}${established ? '<span class="camp-smoke camp-roof-smoke"><i></i><i></i><i></i></span>' : ''}${campShelters(
      run,
    )
      .slice(2)
      .map((_, index) => prop('ger', `camp-household camp-household-${index}`))
      .join('')}`,
    archery: `${prop('banner', 'camp-archery-banner')}<span class="camp-target target-one"></span><span class="camp-target target-two"></span>${established ? worker : ''}`,
    herd: `${resident('packhorse', 'camp-grazing-horse')}${prop('sheep', 'camp-sheep-one')}${prop('sheep', 'camp-sheep-two')}<span class="camp-hitching-rail"></span>`,
    sanctuary: `${prop('pillar', 'camp-cairn')}${flag('camp-sacred-flag')}`,
    wagon: `${prop('cart', 'camp-cart-one')}${prop('cart', 'camp-cart-two')}`,
    felt: `${prop('ger', 'camp-workshop')}<span class="camp-felt-rack"><i></i><i></i></span>${worker}`,
    provisions: `${prop('ger', 'camp-workshop')}<span class="camp-drying-rack"><i></i><i></i><i></i></span>${worker}`,
    relay: `${prop('cart', 'camp-relay-cart')}${resident('packhorse', 'camp-relay-horse')}${flag('camp-relay-flag')}`,
  };
  const choice = building.paths.find((p) => p.exclusiveGroup && learned.includes(p.id));
  const craft = choice
    ? `<span class="camp-craft-emblem" data-camp-craft="${choice.id}" title="${escapeHtml(choice.title)}">${clanMark(choice.id.includes('fire') ? 'hearth' : choice.id.includes('wind') ? 'river' : choice.id.includes('winter') ? 'grain' : choice.id.includes('armor') ? 'mountain' : (BUILDING_MARKS[id] ?? 'banner'))}</span>`
    : '';
  const extra = choice
    ? id === 'archery'
      ? prop('banner', 'camp-craft-banner')
      : id === 'herd'
        ? resident('packhorse', 'camp-craft-horse')
        : id === 'wagon' || id === 'relay'
          ? prop('cart', 'camp-craft-cart')
          : id === 'ger'
            ? prop('ger', 'camp-craft-ger')
            : prop('pillar', 'camp-craft-pillar')
    : '';
  return `${assemblies[id] ?? prop('ger', 'camp-workshop')}${details}${extra}${craft}`;
}

function campScenery(run: RunState): string {
  return `<div class="camp-scenery" aria-hidden="true">
    <svg class="camp-ground-drawing" viewBox="0 0 1000 760" preserveAspectRatio="none"><ellipse cx="500" cy="397" rx="440" ry="290" fill="#c5b575" opacity=".28"/><g fill="none" stroke="#e2d2a0" stroke-width="24" opacity=".22"><path d="M85 730Q515 530 498 386Q480 220 195 170M498 386Q720 250 780 235M498 386Q700 510 860 560M498 386Q305 470 230 565"/></g><ellipse cx="500" cy="397" rx="425" ry="278" fill="none" stroke="#6d6741" stroke-width="3" stroke-dasharray="3 11" opacity=".55"/></svg>
    ${Array.from({ length: 32 }, (_, index) => `<i class="camp-grass" style="left:${5 + ((index * 37) % 90)}%;top:${13 + ((index * 23) % 78)}%;--wind-delay:${-(index % 7)}s"></i>`).join('')}
    ${prop('rock', 'camp-edge-rock rock-one')}${prop('rock', 'camp-edge-rock rock-two')}
    <div class="camp-hearth"><span class="camp-hearth-stones"></span><span class="camp-fire"></span><span class="camp-smoke"><i></i><i></i><i></i></span>${flag('camp-hearth-banner')}</div>
    ${Array.from({ length: Math.min(run.clan.herd, 5) }, (_, index) => `<span class="camp-loose-horse" style="left:${35 + index * 8}%;top:${58 + (index % 2) * 5}%;z-index:${58 + (index % 2) * 5}">${campResident('packhorse')}</span>`).join('')}
  </div>`;
}

export function buildingMenu(run: RunState, view: TreeViewState, selected: string): string {
  const branches = campBranches(run);
  const query = searchText(view.query.trim());
  const matches = branches.filter((branch) =>
    searchText(
      [
        branch.title,
        branch.description,
        ...branch.nodes.flatMap((node) => [node.title, node.description]),
      ].join(' '),
    ).includes(query),
  );
  const branch =
    (query
      ? (matches.find((entry) => entry.id === selected) ?? matches[0])
      : branches.find((entry) => entry.id === selected)) ?? branches[0]!;
  const summary = [
    ['grain', String(Math.floor(run.clan.food)), 'Food'],
    ['materials', String(Math.floor(run.clan.materials)), 'Materials'],
    ['spirit', String(Math.floor(run.clan.spirit)), 'Spirit'],
    ['people', `${assignedWorkers(run)} / ${run.clan.population}`, 'Workers'],
  ];
  const inspectedBranch = {
    ...branch,
    nodes: branch.nodes.map((node) => ({
      ...node,
      forecast: developmentOutlook(run, branch.id as BuildingId, node.action.path),
    })),
  };
  const site = (entry: typeof branch, index: number): string => {
    const id = entry.id as BuildingId;
    const [x, y] = SITES[id] ?? [15 + (index % 4) * 23, 25 + Math.floor(index / 4) * 42];
    const established = run.clan.buildings[id] > 0;
    const learned = run.clan.paths[id]?.length ?? 0;
    const available = entry.nodes.some((node) => node.status === 'available');
    const status = established ? `${learned} learned` : available ? 'Establish' : 'Unestablished';
    return `<button class="camp-site" data-camp-site="${escapeHtml(id)}" data-focus-key="site-${escapeHtml(id)}" data-established="${established}" data-match="${matches.includes(entry)}" data-level="${learned}" aria-pressed="${entry.id === branch.id}" aria-controls="camp-inspector" aria-label="${escapeHtml(entry.title)}. ${status}. Inspect developments." style="--site-x:${x}%;--site-y:${y}%;z-index:${Math.round(y)}"><span class="camp-site-ground" aria-hidden="true"></span><span class="camp-site-miniature" aria-hidden="true">${structure(id, run)}</span><span class="camp-site-label"><strong>${escapeHtml(entry.title)}</strong><small>${established ? '◆' : '+'} ${status}${available && established ? ' · Develop' : ''}</small></span></button>`;
  };
  return `<section class="game-panel camp-estate" data-region="${run.clan.region}" data-expanded="${!!view.expanded}">
    <header class="camp-estate-heading"><div class="camp-estate-title">${clanMark('banner')}<div><p class="eyebrow">BLUE BANNER CLAN · ${escapeHtml(currentLocation(run).short)}</p><h2 id="overlay-title">Build a people.</h2></div></div>${encampment(run).tier < 5 ? `<button data-estate-kind="encampment" data-estate-id="encampment-${encampment(run).tier + 1}" data-estate-rank="${encampment(run).tier + 1}">Improve encampment</button>` : ''}<div class="camp-stores" aria-label="Camp resources">${summary.map(([mark, value, label]) => `<span>${clanMark(mark!)}<span><strong>${value}</strong><small>${label}</small></span></span>`).join('')}</div><button class="panel-close" data-action="back" aria-label="Close panel" title="Close (Escape)">×</button></header>
    <div class="camp-estate-body">
      ${view.expanded ? `<nav class="camp-building-nav patron-navigation" aria-label="Camp buildings" data-scroll-key="camp-nav">${branches.map((entry, i) => `<div class="camp-nav-site">${site(entry, i)}</div>`).join('')}</nav>` : `<div class="camp-model" role="group" aria-label="Camp model. Select a building to inspect its developments."><div class="camp-model-caption"><p class="eyebrow">A HOME WE CARRY</p><p>Every hearth. Every craft. Your people.</p></div><div class="camp-diorama">${campScenery(run)}${branches.map(site).join('')}</div><div class="camp-model-key"><span>◆ Established</span><span>+ Building site</span><span>Select a place to develop it</span></div></div>`}
      <aside class="camp-inspector" id="camp-inspector" aria-label="Building developments"><div class="camp-inspector-tools"><label class="tree-search-label">Find in camp<input type="search" data-tree-search data-focus-key="tree-search" placeholder="Search buildings & crafts" value="${escapeHtml(view.query)}" /></label><div class="tree-view-tools"><button data-camp-expand data-focus-key="camp-expand" aria-pressed="${!!view.expanded}">${view.expanded ? 'Show camp' : 'Expand developments'}</button><button data-tree-recipes data-focus-key="tree-recipes" aria-pressed="${!!view.recipes}">Combinations</button></div>${query ? `<p class="camp-search-result" role="status">${matches.length ? `${matches.length} matching site${matches.length === 1 ? '' : 's'}` : 'No matching sites. Clear your search to explore the camp.'}</p>` : ''}</div>
        ${view.recipes ? `<div class="panel-body tree-scroll camp-recipes" data-scroll-key="camp-recipes">${synergyContent(run)}</div>` : `<div class="camp-tree-workspace"><div class="panel-body tree-scroll camp-development-scroll" data-scroll-key="camp-map"><details class="camp-economy" data-disclosure-key="camp-economy"><summary>Provisions & gathering</summary>${economySummary(run)}</details>${!query || matches.length ? branchMarkup(inspectedBranch, { selectedNode: view.node }) : '<p class="tree-empty">No matching crafts.</p>'}<p class="camp-carry-note">${clanMark('wagon')}Buildings and learned crafts travel with your clan.</p>${burningTempest(run) ? '<p class="tree-notice">Burning Tempest learned — Fire arrows and Wind shamans combine in every volley.</p>' : ''}</div>${!query || matches.length ? nodeInspector(inspectedBranch, selectedNode(inspectedBranch, view.node)) : ''}</div>`}
      </aside>
    </div>${footer()}</section>`;
}
