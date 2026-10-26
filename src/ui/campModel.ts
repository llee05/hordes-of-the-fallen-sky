import { BUILDINGS } from '../game/data/clan';
import { ENCAMPMENT_TIERS, INTERNAL_DEVELOPMENTS } from '../game/data/campEstate';
import { buildingLevel, campSlots, encampment } from '../game/state/campEstate';
import { currentLocation } from '../game/state/journey';
import { assignedWorkers } from '../game/state/clan';
import { campShelters } from '../game/state/campLife';
import type { BuildingId, RunState } from '../game/types';
import { BUILDING_MARKS, campProp, campResident, clanMark } from './artwork';
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

const CAMP_PLOTS: readonly (readonly [number, number])[] = [
  [24, 39],
  [77, 35],
  [18, 69],
  [81, 70],
  [48, 77],
  [48, 15],
  [12, 88],
  [89, 88],
];

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
  const tier = encampment(run),
    slots = campSlots(run);
  const selectedBuilding = BUILDINGS.find((b) => b.id === selected) ?? BUILDINGS[0]!;
  const selectedSlot = slots.indexOf(selectedBuilding.id);
  const position = CAMP_PLOTS[view.campTarget === 'slot' ? (view.campSlot ?? 1) : selectedSlot] ?? [
    50, 39,
  ];
  const anchor =
    view.campTarget === 'encampment' || view.campTarget === 'internal' ? [50, 39] : position;
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
        ${kind === 'encampment' ? `<details class="camp-internal-choices" data-disclosure-key="camp-internals"><summary>Internal camp developments</summary><p>These have their own allowance and never take up a building plot.</p>${INTERNAL_DEVELOPMENTS.map((d) => `<button data-camp-internal="${d.id}" data-focus-key="internal-${d.id}">${clanMark(d.icon)}<span>${escapeHtml(d.title)}<small>Level ${run.clan.estate?.internals[d.id] ?? 0} / ${d.ranks.length}</small></span></button>`).join('')}</details>` : ''}`;
    }
    popup = `<section class="camp-popup${view.expanded || view.recipes ? ' camp-popup-foldout' : ''}" id="camp-inspector" aria-label="${escapeHtml(title)}" style="--popup-x:${anchor[0]! > 55 ? Math.max(2, anchor[0]! - 42) : anchor[0]! + 7}%;--popup-y:${Math.max(3, anchor[1]! - 20)}%"><header class="camp-popup-heading">${clanMark(mark)}<h3>${escapeHtml(title)}</h3><button data-camp-dismiss data-focus-key="camp-popup-close" aria-label="Close parchment popup">×</button></header><div class="camp-popup-body" data-scroll-key="camp-popup">${content}</div></section>`;
  }
  const plot = (id: BuildingId | null, index: number) => {
    const [x, y] = CAMP_PLOTS[index] ?? [15 + (index % 4) * 23, 82];
    const unlocked = index < tier.slots;
    if (!id)
      return `<button class="camp-site camp-empty-plot" data-camp-slot="${index}" data-focus-key="plot-${index}" data-unlocked="${unlocked}" style="--site-x:${x}%;--site-y:${y}%" aria-label="${unlocked ? 'Empty' : 'Locked'} building plot ${index + 1}"><span class="camp-site-ground" aria-hidden="true"></span><span class="camp-plot-mark">${unlocked ? '+' : '◇'}</span><span class="camp-site-label"><strong>${unlocked ? 'Choose a facility' : 'Unclaimed ground'}</strong><small>${unlocked ? 'Empty building plot' : `Camp tier ${index}`}</small></span></button>`;
    const b = BUILDINGS.find((b) => b.id === id)!,
      level = buildingLevel(run, id);
    return `<button class="camp-site" data-camp-site="${id}" data-camp-plot="${index}" data-focus-key="site-${id}" data-established="true" data-level="${level}" data-match="${matches.includes(b)}" aria-pressed="${view.campPopup && view.campTarget === 'building' && selectedBuilding.id === id}" style="--site-x:${x}%;--site-y:${y}%;z-index:${Math.round(y)}" aria-label="${escapeHtml(b.title)}. Level ${level}. Inspect improvements."><span class="camp-site-ground" aria-hidden="true"></span><span class="camp-site-miniature" aria-hidden="true">${structure(id, run)}</span><span class="camp-site-label"><strong>${escapeHtml(b.title)}</strong><small>Level ${level} / ${b.maxLevel ?? 3}</small></span></button>`;
  };
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
    <div class="camp-model camp-scene" role="group" aria-label="Painted nomadic camp"><div class="camp-scene-tools"><label class="tree-search-label">Find in camp<input type="search" data-tree-search data-focus-key="tree-search" value="${escapeHtml(view.query)}" placeholder="Find a building or craft"/></label><button data-camp-economy data-focus-key="camp-economy">Provisions</button><button data-tree-recipes data-focus-key="tree-recipes">Combinations</button></div><div class="camp-diorama">${campScenery(run)}<button class="camp-site camp-central" data-camp-encampment data-focus-key="camp-encampment" aria-pressed="${view.campPopup && view.campTarget === 'encampment'}" aria-label="Clan Encampment. ${escapeHtml(tier.title)}. Tier ${tier.tier} of 5."><span class="camp-site-ground"></span><span class="camp-site-miniature">${prop('ger', 'camp-main-ger')}${prop('banner', 'camp-central-banner')}${Array.from({ length: tier.tier - 1 }, (_, i) => `<i class="camp-supply" style="--supply:${i}"></i>`).join('')}</span><span class="camp-site-label"><strong>${escapeHtml(tier.title)}</strong><small>Clan Encampment · Tier ${tier.tier} / 5</small></span></button>${slots.map(plot).join('')}${INTERNAL_DEVELOPMENTS.filter(
      (d) => (run.clan.estate?.internals[d.id] ?? 0) > 0,
    )
      .map(
        (d, i) =>
          `<button class="camp-internal-marker" data-camp-internal="${d.id}" data-focus-key="marker-${d.id}" style="left:${35 + i * 6}%;top:57%" aria-label="${escapeHtml(d.title)}. Inspect internal development.">${clanMark(d.icon)}</button>`,
      )
      .join(
        '',
      )}</div>${popup}<p class="camp-scene-caption">A home we carry. Select a building or an empty plot.</p></div><footer class="panel-footer"><span class="paused-note">Ⅱ &nbsp; THE WORLD IS PAUSED</span><button class="secondary-button" data-action="exit-camp">Return to the steppe <kbd>ESC</kbd></button></footer></section>`;
}
