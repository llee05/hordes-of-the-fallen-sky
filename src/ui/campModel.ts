import { BUILDINGS } from '../game/data/clan';
import { ENCAMPMENT_TIERS, INTERNAL_DEVELOPMENTS } from '../game/data/campEstate';
import {
  buildingLevel,
  campSlots,
  encampment,
  estateBlocker,
  estateCost,
} from '../game/state/campEstate';
import { currentLocation } from '../game/state/journey';
import { assignedWorkers } from '../game/state/clan';
import { hasDevelopment } from '../game/state/camp';
import type { BuildingId, RunState } from '../game/types';
import { BUILDING_MARKS, campIllustration, campProp, campResident, clanMark } from './artwork';
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
import { escapeHtml, priceText, searchText, type TreeViewState } from './progressionTree';

function craftEmblem(id: BuildingId, run: RunState): string {
  const choice = BUILDINGS.find((b) => b.id === id)!.paths.find(
    (p) => p.exclusiveGroup && hasDevelopment(run, id, p.id),
  );
  return choice
    ? `<span class="camp-craft-emblem" data-camp-craft="${choice.id}" title="${escapeHtml(choice.title)}">${clanMark(BUILDING_MARKS[id] ?? 'banner')}<span>${escapeHtml(choice.title)}</span></span>`
    : '';
}

/** Positions are manuscript-map coordinates, with no camera projection or ground depth. */
function mapPosition(index: number): string {
  const positions = [
    [18, 30],
    [82, 29],
    [16, 65],
    [84, 65],
    [41, 83],
    [63, 83],
    [10, 16],
    [90, 16],
  ];
  const [x, y] = positions[index] ?? [8 + (index % 6) * 16, 92];
  return `--map-x:${x}%;--map-y:${y}%`;
}
function plaque(mark: string, name: string, detail: string): string {
  return `<span class="camp-plaque"><span class="camp-plaque-badge">${clanMark(mark)}</span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(detail)}</small></span>`;
}
function mapLandscape(): string {
  return `<div class="camp-map-painting" aria-hidden="true"><svg viewBox="0 0 1200 600" preserveAspectRatio="none"><g fill="none" stroke="#f1dfb2" stroke-width="26" opacity=".5"><path d="M-30 560C240 500 240 280 590 260S900 170 1230 80M590 260Q420 80 210 120M590 260Q740 430 1090 450M590 260Q520 440 620 630"/></g><g fill="#728366" opacity=".28"><path d="M0 65Q170-50 330 55L270 95 180 65 70 120 0 90ZM930 560Q1070 470 1200 520V600H900Z"/><path d="M1020 0Q1120 85 1200 35V0Z"/></g><g fill="none" stroke="#77794e" stroke-width="2" opacity=".3"><path d="m36 46 22-16 20 16m-37-3 16-10 17 10M1040 530q50-28 94-8m-75 20q38-20 68-6M70 360q25-14 50-2m-47 9q27-13 44-4"/></g></svg><span class="map-decoration map-households">${campProp('ger')}</span><span class="map-decoration map-households-small">${campProp('ger')}</span><span class="map-decoration map-road-cart">${campProp('cart')}</span><span class="map-decoration map-blue-banner">${campProp('banner')}</span><span class="map-decoration map-grazing-horse">${campResident('packhorse')}</span><span class="map-decoration map-second-horse">${campResident('packhorse')}</span><span class="map-decoration map-sheep">${campProp('sheep')}</span><span class="map-decoration map-stones">${campProp('rock')}</span></div>`;
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
      return `<button class="camp-place camp-empty-place" data-camp-slot="${index}" data-focus-key="plot-${index}" data-unlocked="${unlocked}" aria-pressed="${!!view.campPopup && view.campTarget === 'slot' && view.campSlot === index}" style="${mapPosition(index)}" aria-label="${unlocked ? 'Empty' : 'Locked'} building plot ${index + 1}">${plaque(unlocked ? 'materials' : 'mountain', 'Unclaimed ground', unlocked ? 'Choose a facility' : `Camp tier ${index}`)}</button>`;
    const b = BUILDINGS.find((b) => b.id === id)!,
      level = buildingLevel(run, id),
      workers =
        (run.clan.buildings[id] ? b.workers : 0) +
        b.paths
          .filter((p) => hasDevelopment(run, id, p.id))
          .reduce((sum, p) => sum + (p.workers ?? 0), 0);
    return `<button class="camp-place camp-facility" data-camp-site="${id}" data-camp-plot="${index}" data-focus-key="site-${id}" data-established="${level > 0}" data-level="${level}" data-match="${matches.includes(b)}" aria-pressed="${!!view.campPopup && view.campTarget === 'building' && selectedBuilding.id === id}" style="${mapPosition(index)}" aria-label="${escapeHtml(b.title)}. Level ${level}. ${workers} assigned workers. Inspect improvements."><span class="camp-place-art" aria-hidden="true">${campIllustration(b.illustration ?? 'ger')}</span>${plaque(BUILDING_MARKS[id] ?? 'ger', b.title, level ? `Level ${level} / ${b.maxLevel ?? 3} · ${workers} assigned workers` : 'Reserved · establish facility')}${craftEmblem(id, run)}</button>`;
  };
  const nextTier = ENCAMPMENT_TIERS[tier.tier];
  const tierBlocker = nextTier
    ? estateBlocker(run, 'encampment', nextTier.id, nextTier.tier)
    : undefined;
  const holding = `<button class="camp-place camp-encampment" data-camp-encampment data-focus-key="camp-encampment" aria-pressed="${!!view.campPopup && view.campTarget === 'encampment'}" style="--map-x:50%;--map-y:35%" aria-label="Clan Encampment. ${escapeHtml(tier.title)}. Tier ${tier.tier} of 5."><span class="camp-place-art" aria-hidden="true">${campIllustration('ger')}</span>${plaque('ger', 'Clan Encampment', `${tier.title} · Tier ${tier.tier} / 5`)}<span class="camp-map-upgrade">${nextTier ? `Inspect upgrade: ${escapeHtml(nextTier.title)}<small>${escapeHtml(priceText(estateCost(run, nextTier)))}${tierBlocker ? ` · ${escapeHtml(tierBlocker)}` : ''}</small>` : 'Highest camp tier · inspect bonuses'}</span></button>`;
  const internalPositions = [
    [34, 12],
    [65, 12],
    [37, 57],
    [63, 55],
    [19, 87],
    [84, 88],
  ];
  const internalArt = ['ger', 'sanctuary', 'ger', 'archery', 'wagon', 'wagon'] as const;
  const internals = `<div class="camp-map-internals" role="group" aria-label="Internal developments">${INTERNAL_DEVELOPMENTS.map(
    (d, i) => {
      const rank = run.clan.estate?.internals[d.id] ?? 0;
      const [x, y] = internalPositions[i] ?? [10 + i * 12, 92];
      return `<button class="camp-place camp-internal-place" data-camp-internal="${d.id}" data-focus-key="marker-${d.id}" aria-pressed="${!!view.campPopup && view.campTarget === 'internal' && view.campInternal === d.id}" data-established="${rank > 0}" style="--map-x:${x}%;--map-y:${y}%">${rank ? `<span class="camp-place-art" aria-hidden="true">${campIllustration(internalArt[i] ?? 'ger')}</span>` : ''}${plaque(d.icon, d.title, rank ? `Level ${rank} / ${d.ranks.length}` : 'Not established')}</button>`;
    },
  ).join('')}</div>`;
  return `<section class="game-panel camp-estate immersive-camp" data-region="${run.clan.region}"><header class="camp-estate-heading"><div class="camp-estate-title">${clanMark('banner')}<div><p class="eyebrow">BLUE BANNER CLAN · ${escapeHtml(currentLocation(run).short)}</p><h2 id="overlay-title">${escapeHtml(tier.title)}</h2></div></div><div class="camp-stores" aria-label="Camp resources">${[
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
    <div class="camp-model camp-manuscript"><div class="camp-map-tools"><label class="tree-search-label">Find in camp<input type="search" data-tree-search data-focus-key="tree-search" value="${escapeHtml(view.query)}" placeholder="Find a building or craft"/></label><button data-camp-economy data-focus-key="camp-economy">Provisions</button><button data-tree-recipes data-focus-key="tree-recipes">Combinations</button></div><div class="camp-map-scroll" data-scroll-key="camp-map"><div class="camp-map" role="group" aria-label="Painted manuscript map of the camp">${mapLandscape()}${holding}${internals}<div class="camp-map-facilities" role="group" aria-label="Building plots">${slots.map(plot).join('')}</div><p class="camp-map-caption">A home we carry · Select a place to inspect its improvements</p></div></div>${popup}</div><footer class="panel-footer"><span class="paused-note">Ⅱ &nbsp; THE WORLD IS PAUSED</span><button class="secondary-button" data-action="exit-camp">Return to the steppe <kbd>ESC</kbd></button></footer></section>`;
}
