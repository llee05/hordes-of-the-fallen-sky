import { BUILDINGS } from '../game/data/clan';
import { ENCAMPMENT_TIERS, INTERNAL_DEVELOPMENTS } from '../game/data/campEstate';
import { buildingLevel, campSlots, encampment } from '../game/state/campEstate';
import { currentLocation } from '../game/state/journey';
import { assignedWorkers } from '../game/state/clan';
import { hasDevelopment } from '../game/state/camp';
import type { BuildingId, RunState } from '../game/types';
import { BUILDING_MARKS, campIllustration, clanMark } from './artwork';
import { economySummary } from './economyContent';
import { synergyContent } from './synergyContent';
import {
  buildingBonuses,
  buildingChoice,
  campBuildingBranch,
  campNodeDetails,
  campPath,
  effectDescriptions,
  estateBranch,
  nextCampNode,
} from './campPopups';
import { escapeHtml, searchText, type TreeViewState } from './progressionTree';

function craftEmblem(id: BuildingId, run: RunState): string {
  const choice = BUILDINGS.find((b) => b.id === id)!.paths.find(
    (p) => p.exclusiveGroup && hasDevelopment(run, id, p.id),
  );
  return choice
    ? `<span class="camp-craft-emblem" data-camp-craft="${choice.id}" title="${escapeHtml(choice.title)}">${clanMark(BUILDING_MARKS[id] ?? 'banner')}<span>${escapeHtml(choice.title)}</span></span>`
    : '';
}

export function buildingMenu(run: RunState, view: TreeViewState, selected: string): string {
  const tier = encampment(run),
    slots = campSlots(run);
  const selectedBuilding = BUILDINGS.find((b) => b.id === selected) ?? BUILDINGS[0]!;
  const query = searchText(view.query.trim());
  const matches = BUILDINGS.filter((b) =>
    searchText(
      [b.id, b.title, b.description, ...b.paths.map((p) => `${p.title} ${p.description}`)].join(
        ' ',
      ),
    ).includes(query),
  );
  let popup = '';
  if (view.campPopup) {
    let content = '',
      title = '',
      mark = 'ger';
    if (view.campTarget === 'slot' || view.campTarget === 'search') {
      const locked = view.campTarget === 'slot' && (view.campSlot ?? 0) >= tier.slots;
      title =
        view.campTarget === 'search'
          ? 'Find a place in camp'
          : `Building plot ${(view.campSlot ?? 0) + 1}`;
      content = locked
        ? `<p>This plot opens with ${escapeHtml(ENCAMPMENT_TIERS[Math.min(4, (view.campSlot ?? 1) - 1)]!.title)}.</p><button data-camp-encampment class="secondary-button">Inspect the Clan Encampment</button>`
        : `<p>${view.campTarget === 'search' ? 'Pick a facility to see its place and how it can grow.' : 'Choose a portable facility for this plot. Workers and supplies are only committed once you build.'}</p><div class="camp-building-choices">${matches
            .filter((b) => view.campTarget === 'search' || !run.clan.buildings[b.id])
            .map((b) =>
              buildingChoice(run, b.id, view.campTarget === 'slot' ? view.campSlot : undefined),
            )
            .join(
              '',
            )}</div>${!matches.length ? '<p role="status">No matching crafts. Clear the search to see the whole camp.</p>' : ''}`;
    } else if (view.recipes) {
      title = 'Traditions that work together';
      content = synergyContent(run);
      mark = 'spirit';
    } else if (view.campTarget === 'economy') {
      title = 'Provisions & gathering';
      content = economySummary(run);
      mark = 'grain';
    } else {
      const kind =
        view.campTarget === 'internal'
          ? 'internal'
          : view.campTarget === 'encampment'
            ? 'encampment'
            : undefined;
      const branch = kind
        ? estateBranch(run, kind, view.campInternal)
        : campBuildingBranch(run, selectedBuilding.id);
      const current =
        kind === 'encampment'
          ? tier.tier
          : kind === 'internal'
            ? (run.clan.estate?.internals[view.campInternal ?? ''] ?? 0)
            : buildingLevel(run, selectedBuilding.id);
      const node =
        branch.nodes.find((n) => n.id === view.node) ??
        (kind
          ? branch.nodes[Math.min(branch.nodes.length - 1, current)]!
          : nextCampNode(branch, run, selectedBuilding.id));
      const max = kind ? branch.nodes.length : (selectedBuilding.maxLevel ?? 3);
      const levelDefinition = !kind
        ? selectedBuilding.paths.find(
            (p) => `${selectedBuilding.id}-${p.id}` === node.id && p.level,
          )
        : undefined;
      const displayedNode = levelDefinition
        ? {
            ...node,
            description: `${node.description} ${effectDescriptions(levelDefinition.effects).join(' · ')}`,
          }
        : node;
      title = branch.title;
      mark = node.icon ?? 'ger';
      const bonuses = kind
        ? effectDescriptions(run.clan.campEffects)
        : buildingBonuses(run, selectedBuilding.id);
      content = `${kind === 'encampment' ? `<p class="camp-tier-tally">${slots.filter(Boolean).length} / ${tier.slots} building plots · ${Object.values(run.clan.estate?.internals ?? {}).filter((v) => v > 0).length} / ${tier.internalSlots} internal developments</p>` : ''}
        <button class="camp-foldout-toggle" data-camp-foldout data-focus-key="camp-foldout" aria-expanded="${!!view.expanded}">${view.expanded ? 'Fold away the upgrade path' : 'Unfold levels & specialisations'}</button>
        ${view.expanded ? campPath(branch, node, kind ? undefined : selectedBuilding.id) : ''}
        ${campNodeDetails(displayedNode, `${kind === 'encampment' ? 'Camp tier' : 'Building level'} ${current} / ${max}`, bonuses, kind ? 'Order and know-how travel with the households.' : (selectedBuilding.flavour ?? ''), !kind && !run.clan.buildings[selectedBuilding.id] ? view.campSlot : undefined)}
        `;
    }
    popup = `<section class="camp-popup${view.expanded || view.recipes ? ' camp-popup-foldout' : ''}" id="camp-inspector" aria-label="${escapeHtml(title)}"><header class="camp-popup-heading">${clanMark(mark)}<h3>${escapeHtml(title)}</h3><button data-camp-dismiss data-focus-key="camp-popup-close" aria-label="Close camp details">×</button></header><div class="camp-popup-body" data-scroll-key="camp-popup">${content}</div></section>`;
  }
  const plot = (id: BuildingId | null, index: number) => {
    const unlocked = index < tier.slots;
    if (!id)
      return `<button class="camp-slot-card camp-empty-slot" data-camp-slot="${index}" data-focus-key="plot-${index}" data-unlocked="${unlocked}" aria-pressed="${!!view.campPopup && view.campTarget === 'slot' && view.campSlot === index}" aria-label="${unlocked ? 'Empty' : 'Locked'} building plot ${index + 1}"><span class="camp-slot-number">FACILITY ${String(index + 1).padStart(2, '0')}</span><span class="camp-slot-symbol">${clanMark(unlocked ? 'materials' : 'mountain')}</span><strong>${unlocked ? 'Choose a facility' : 'Sealed slot'}</strong><small>${unlocked ? 'Empty · supplies committed on building' : `Requires camp tier ${index}`}</small><span class="camp-card-action">${unlocked ? '+ Establish a workplace' : 'Inspect encampment →'}</span></button>`;
    const b = BUILDINGS.find((b) => b.id === id)!,
      level = buildingLevel(run, id),
      workers =
        (run.clan.buildings[id] ? b.workers : 0) +
        b.paths
          .filter((p) => hasDevelopment(run, id, p.id))
          .reduce((sum, p) => sum + (p.workers ?? 0), 0);
    return `<button class="camp-slot-card" data-camp-site="${id}" data-camp-plot="${index}" data-focus-key="site-${id}" data-established="${level > 0}" data-level="${level}" data-match="${matches.includes(b)}" aria-pressed="${!!view.campPopup && view.campTarget === 'building' && selectedBuilding.id === id}" aria-label="${escapeHtml(b.title)}. Level ${level}. ${workers} assigned workers. Inspect improvements."><span class="camp-slot-number">FACILITY ${String(index + 1).padStart(2, '0')} ${clanMark(BUILDING_MARKS[id] ?? 'ger')}</span><span class="camp-slot-art">${campIllustration(b.illustration ?? 'ger')}</span><strong>${escapeHtml(b.title)}</strong><small>Level ${level} / ${b.maxLevel ?? 3} · ${workers} assigned workers</small>${craftEmblem(id, run)}<span class="camp-card-action">${level ? 'Inspect improvements' : 'Reserved · establish facility'} →</span></button>`;
  };
  const nextTier = estateBranch(run, 'encampment').nodes[tier.tier];
  const holding = `<button class="camp-holding" data-camp-encampment data-focus-key="camp-encampment" aria-pressed="${!!view.campPopup && view.campTarget === 'encampment'}" aria-label="Clan Encampment. ${escapeHtml(tier.title)}. Tier ${tier.tier} of 5."><span class="camp-holding-art">${campIllustration('ger')}</span><span class="camp-holding-copy"><span class="eyebrow">CLAN ENCAMPMENT · TIER ${tier.tier} / 5</span><strong>${escapeHtml(tier.title)}</strong><small>${slots.filter(Boolean).length} / ${tier.slots} facilities · ${Object.values(run.clan.estate?.internals ?? {}).filter((v) => v > 0).length} / ${tier.internalSlots} internal developments</small><span class="camp-card-action">${nextTier ? `Inspect upgrade: ${escapeHtml(nextTier.title)} →<small>${escapeHtml(nextTier.cost)}${nextTier.reason ? ` · ${escapeHtml(nextTier.reason)}` : ''}</small>` : 'Highest camp tier · inspect bonuses →'}</span></span></button>`;
  const internals = `<section class="camp-internals" aria-label="Internal developments"><h3>Within the household <small>${tier.internalSlots} development slots</small></h3><div class="camp-internal-strip">${INTERNAL_DEVELOPMENTS.map(
    (d) => {
      const rank = run.clan.estate?.internals[d.id] ?? 0;
      return `<button data-camp-internal="${d.id}" data-focus-key="marker-${d.id}" aria-pressed="${!!view.campPopup && view.campTarget === 'internal' && view.campInternal === d.id}" data-established="${rank > 0}">${clanMark(d.icon)}<strong>${escapeHtml(d.title)}</strong><small>${rank ? `Level ${rank} / ${d.ranks.length}` : 'Not established'}</small></button>`;
    },
  ).join('')}</div></section>`;
  return `<section class="game-panel camp-estate immersive-camp" data-region="${run.clan.region}"><header class="camp-estate-heading"><div class="camp-estate-title">${clanMark('banner')}<div><p class="eyebrow">BLUE BANNER CLAN · ${escapeHtml(currentLocation(run).short)}</p><h2 id="overlay-title">Build a people.</h2></div></div><div class="camp-stores" aria-label="Camp resources">${[
    ['grain', run.clan.food, 'Food'],
    ['materials', run.clan.materials, 'Materials'],
    ['spirit', run.clan.spirit, 'Spirit'],
    ['people', `${assignedWorkers(run)} / ${run.clan.population}`, 'Workers'],
  ]
    .map(
      ([mark, value, label]) =>
        `<span>${clanMark(String(mark))}<span><strong>${typeof value === 'number' ? Math.floor(value) : value}</strong><small>${label}</small></span></span>`,
    )
    .join(
      '',
    )}</div><button class="panel-close" data-action="exit-camp" aria-label="Leave camp management">×</button></header>
    <div class="camp-model camp-workspace"><div class="camp-estate-overview" data-scroll-key="camp-estate"><div class="camp-estate-tools"><label class="tree-search-label">Find in camp<input type="search" data-tree-search data-focus-key="tree-search" value="${escapeHtml(view.query)}" placeholder="Find a building or craft"/></label><button data-camp-economy data-focus-key="camp-economy">Provisions</button><button data-tree-recipes data-focus-key="tree-recipes">Combinations</button></div>${holding}${internals}<section class="camp-facilities" aria-label="Building slots"><h3>Workplaces of the clan <small>${tier.slots} open slots</small></h3><div class="camp-slot-grid">${slots.map(plot).join('')}</div></section></div>${popup || `<aside class="camp-inspector-idle">${clanMark('banner')}<p class="eyebrow">A HOME WE CARRY</p><h3>Every household has a part.</h3><p>Select the encampment, an internal development, or a facility to inspect its improvements.</p><p>Supplies and workers are committed only when you confirm a purchase.</p></aside>`}</div><footer class="panel-footer"><span class="paused-note">Ⅱ &nbsp; THE WORLD IS PAUSED</span><button class="secondary-button" data-action="exit-camp">Return to the steppe <kbd>ESC</kbd></button></footer></section>`;
}
