import { createNomadicCamp } from '../shared/nomadicCamp.js';
import {
  NOMADIC_BUILDINGS,
  CORE_NOMADIC_BUILDINGS,
  OPTIONAL_NOMADIC_BUILDINGS,
  nomadicBuilding,
  type NomadicBuildingEffects,
  type NomadicBuildingDefinition,
} from '../game/data/nomadicCamp';
import {
  nomadicBuildingLevel,
  nomadicBuildingCost,
  nomadicBuildingBlocker,
  purchaseNomadicBuilding,
  nomadicPopulationCapacity,
} from '../game/state/nomadicCamp';
import { assignedWorkers } from '../game/state/clan';
import { currentLocation } from '../game/state/journey';
import { progressionChanges } from '../game/state/progressionPreview';
import type { RunState } from '../game/types';
import { campIllustration, campResident, campProp, clanMark } from './artwork';
import { campNodeDetails, effectDescriptions } from './campPopups';
import { economySummary } from './economyContent';
import { synergyContent } from './synergyContent';
import {
  escapeHtml as h,
  priceText,
  searchText,
  type TreeNode,
  type TreeViewState,
} from './progressionTree';

export function nomadicEffectDescriptions(effects: NomadicBuildingEffects): string[] {
  const futureName = (key: string) => key.replace(/([A-Z])/g, ' $1').toLowerCase();
  return [
    ...effectDescriptions(effects.ongoing),
    ...Object.entries(effects.player ?? {}).map(([key, value]) => `${futureName(key)} +${value}`),
    ...(effects.attackInterval
      ? [`Attack interval −${Math.round((1 - effects.attackInterval) * 100)}%`]
      : []),
    ...(effects.pierce ? [`Arrow pierces +${effects.pierce}`] : []),
    ...(effects.populationCapacity ? [`Population capacity +${effects.populationCapacity}`] : []),
    ...(effects.experience
      ? [`Experience gained +${Math.round((effects.experience - 1) * 100)}%`]
      : []),
    ...(effects.unlocks ?? []).map(
      (unlock) => `Unlock: ${futureName(unlock.path.replaceAll('-', ' '))}`,
    ),
    ...Object.entries(effects.future ?? {}).map(
      ([key, value]) =>
        `Planned · ${futureName(key)} +${value < 1 ? `${Math.round(value * 100)}%` : value}`,
    ),
  ];
}
const OPTIONAL_POSITIONS = [
  [34, 12],
  [66, 12],
  [38, 60],
  [62, 60],
  [50, 82],
] as const;
export function nomadicBuildingArt(definition: NomadicBuildingDefinition, level: number): string {
  const visual = definition.levels[Math.max(0, level - 1)]!.visual;
  const art =
    definition.id === 'horse-lines' ? campResident('packhorse') : campIllustration(visual.art);
  return `<span class="camp-place-art nomadic-building-art" data-visual-level="${level}" style="--building-size:${visual.scale}" aria-hidden="true">${art}${Array.from({ length: visual.ornament }, (_, i) => `<span class="nomadic-ornament" style="--ornament:${i}">${campProp('banner')}</span>`).join('')}</span>`;
}
export function nomadicBuildingMenu(
  run: RunState,
  view: TreeViewState,
  art: { landscape: () => string; plaque: (mark: string, name: string, detail: string) => string },
): string {
  const camp = run.clan.nomadicCamp ?? createNomadicCamp();
  const selected =
    NOMADIC_BUILDINGS.find((b) => b.id === view.nomadicSelection) ?? CORE_NOMADIC_BUILDINGS[0]!;
  const selectedLevel = nomadicBuildingLevel(camp, selected.id);
  const ownedSlot = camp.slots.findIndex((slot) => slot?.id === selected.id);
  const selectedSlot =
    selected.category === 'Core' ? undefined : ownedSlot >= 0 ? ownedSlot : view.campSlot;
  const query = searchText(view.query.trim());
  const matches = (definition: NomadicBuildingDefinition) =>
    searchText(
      [
        definition.id,
        definition.title,
        definition.category,
        definition.description,
        ...definition.levels.flatMap((level) => nomadicEffectDescriptions(level.effects)),
      ].join(' '),
    ).includes(query);
  const place = (
    definition: NomadicBuildingDefinition,
    position: readonly [number, number],
    slot?: number,
  ) => {
    const level = nomadicBuildingLevel(camp, definition.id);
    return `<button class="camp-place ${definition.id === 'khans-ger' ? 'camp-encampment' : 'camp-facility'}" data-nomadic-site="${definition.id}" data-camp-site="${definition.id}" ${definition.id === 'khans-ger' ? 'data-camp-encampment' : ''} ${slot !== undefined ? `data-nomadic-slot="${slot}"` : ''} data-focus-key="nomadic-site-${definition.id}" data-established="true" data-level="${level}" data-match="${matches(definition)}" aria-pressed="${!!view.campPopup && view.campTarget === 'building' && selected.id === definition.id}" aria-label="${h(definition.title)}. Level ${level} of ${definition.levels.length}. Inspect improvements." style="--map-x:${position[0]}%;--map-y:${position[1]}%">${nomadicBuildingArt(definition, level)}${art.plaque(definition.icon, definition.title, `Level ${level} / ${definition.levels.length} · ${definition.category === 'Core' ? 'Permanent household' : definition.category}`)}</button>`;
  };
  const choices = (slot?: number) =>
    `<div class="camp-building-choices">${NOMADIC_BUILDINGS.filter(
      (b) =>
        matches(b) &&
        (slot === undefined || (b.category !== 'Core' && !nomadicBuildingLevel(camp, b.id))),
    )
      .map((b) => {
        const level = nomadicBuildingLevel(camp, b.id);
        const cost = nomadicBuildingCost(run, b.id);
        return `<button class="camp-building-choice" data-nomadic-site="${b.id}" ${slot !== undefined ? `data-nomadic-slot="${slot}"` : ''} data-focus-key="choose-${b.id}">${campIllustration(b.levels[0]!.visual.art)}<span><strong>${h(b.title)}</strong><small>${h(b.category)} · ${level ? `Level ${level}` : cost ? h(priceText(cost)) : 'Completed'}</small><small>${h(nomadicEffectDescriptions(b.levels[0]!.effects).slice(0, 2).join(' · '))}</small></span>${clanMark(b.icon)}</button>`;
      })
      .join('')}</div>`;
  let popup = '';
  if (view.campPopup) {
    let title = selected.title,
      mark = selected.icon,
      content = '';
    if (view.campTarget === 'slot' || view.campTarget === 'search') {
      title =
        view.campTarget === 'slot'
          ? `Optional location ${(view.campSlot ?? 0) + 1}`
          : 'Find a place in camp';
      const slot = view.campTarget === 'slot' ? view.campSlot : undefined;
      const found = (
        slot === undefined
          ? NOMADIC_BUILDINGS
          : OPTIONAL_NOMADIC_BUILDINGS.filter((b) => !nomadicBuildingLevel(camp, b.id))
      ).filter(matches);
      content = `<p>${slot === undefined ? 'Inspect a household or an optional workplace.' : 'Choose one of fourteen workplaces. Each type can occupy only one of the five optional locations; supplies are committed only when you construct it.'}</p>${found.length ? choices(slot) : '<p role="status">No matching buildings. Clear the search to see the camp.</p>'}`;
    } else if (view.recipes) {
      title = 'Traditions that work together';
      mark = 'spirit';
      content = synergyContent(run);
    } else if (view.campTarget === 'economy') {
      title = 'Provisions & gathering';
      mark = 'grain';
      content = economySummary(run);
    } else {
      const next = selected.levels[selectedLevel];
      const reason = next
        ? nomadicBuildingBlocker(run, selected.id, selectedSlot)
        : 'Maximum level reached';
      const cost = nomadicBuildingCost(run, selected.id);
      const preview = [];
      if (next && (!reason || reason === 'Gather more resources')) {
        const copy = structuredClone(run);
        copy.phase = 'building';
        copy.clan.materials = Math.max(copy.clan.materials, cost!.materials);
        copy.clan.spirit = Math.max(copy.clan.spirit, cost!.spirit);
        if (purchaseNomadicBuilding(copy, selected.id, selectedSlot))
          preview.push(...progressionChanges(run, copy));
      }
      const node: TreeNode = {
        id: `${selected.id}-level-${Math.min(selected.levels.length, selectedLevel + 1)}`,
        title: `${selectedLevel ? 'Improve' : 'Construct'} ${selected.title}${next ? ` · ${next.title}` : ''}`,
        description: selected.description,
        status: !next
          ? 'learned'
          : !reason
            ? 'available'
            : reason === 'Gather more resources'
              ? 'unaffordable'
              : 'locked',
        reason: reason ?? '',
        requires: [],
        cost: cost ? priceText(cost) : 'All building levels completed',
        price: cost,
        preview,
        action: {
          'nomadic-purchase': selected.id,
          ...(selectedSlot !== undefined ? { 'nomadic-slot': String(selectedSlot) } : {}),
        },
      };
      const benefits = selected.levels
        .slice(0, selectedLevel)
        .flatMap((level) => nomadicEffectDescriptions(level.effects));
      content = `<p class="camp-tier-tally">${h(selected.category)} · ${selected.category === 'Core' ? 'Permanent: cannot be removed or replaced' : `Optional location ${(selectedSlot ?? camp.slots.indexOf(null)) + 1} of 5`}</p>${campNodeDetails(node, `Building level ${selectedLevel} / ${selected.levels.length}`, benefits, '', selectedSlot)}${
        next
          ? `<section class="camp-popup-copy"><h4>Benefits of this level</h4><ul>${nomadicEffectDescriptions(
              next.effects,
            )
              .map((text) => `<li>${h(text)}</li>`)
              .join('')}</ul></section>`
          : ''
      }<details class="camp-popup-copy" data-disclosure-key="nomadic-levels"><summary>All building levels</summary>${selected.levels.map((level) => `<p data-nomadic-level="${level.level}"><strong>${level.level}. ${h(level.title)}</strong> · ${h(priceText(level.cost))}<br>${h(nomadicEffectDescriptions(level.effects).join(' · '))}</p>`).join('')}</details>`;
    }
    popup = `<section class="camp-popup" id="camp-inspector" aria-label="${h(title)}"><header class="camp-popup-heading">${clanMark(mark)}<h3>${h(title)}</h3><button data-camp-dismiss data-focus-key="camp-popup-close" aria-label="Close camp details">×</button></header><div class="camp-popup-body" data-scroll-key="camp-popup">${content}</div></section>`;
  }
  const slots = camp.slots
    .map((slot, i) =>
      slot
        ? place(nomadicBuilding(slot.id), OPTIONAL_POSITIONS[i]!, i)
        : `<button class="camp-place camp-empty-place" data-camp-slot="${i}" data-focus-key="plot-${i}" data-unlocked="true" aria-pressed="${!!view.campPopup && ((view.campTarget === 'slot' && view.campSlot === i) || (view.campTarget === 'building' && selectedLevel === 0 && selected.category !== 'Core' && (selectedSlot ?? camp.slots.indexOf(null)) === i))}" aria-label="Empty optional building slot ${i + 1}" style="--map-x:${OPTIONAL_POSITIONS[i]![0]}%;--map-y:${OPTIONAL_POSITIONS[i]![1]}%">${art.plaque('materials', 'Unclaimed ground', `Optional location ${i + 1} / 5`)}</button>`,
    )
    .join('');
  return `<section class="game-panel camp-estate immersive-camp nomadic-camp"><header class="camp-estate-heading"><div class="camp-estate-title">${clanMark('banner')}<div><p class="eyebrow">BLUE BANNER CLAN · ${h(currentLocation(run).short)}</p><h2 id="overlay-title">The Khan's camp</h2></div></div><div class="camp-stores" aria-label="Camp resources">${[
    ['grain', Math.floor(run.clan.food), 'Food'],
    ['materials', Math.floor(run.clan.materials), 'Materials'],
    ['spirit', Math.floor(run.clan.spirit), 'Spirit'],
    ['people', `${run.clan.population} / ${nomadicPopulationCapacity(run)}`, 'People'],
    ['materials', `${assignedWorkers(run)} / ${run.clan.population}`, 'Workers'],
  ]
    .map(
      ([icon, value, label]) =>
        `<span>${clanMark(String(icon))}<span><strong>${value}</strong><small>${label}</small></span></span>`,
    )
    .join(
      '',
    )}</div><button class="panel-close" data-action="exit-camp" aria-label="Leave camp management">×</button></header><div class="camp-model camp-manuscript"><div class="camp-map-tools"><label class="tree-search-label">Find in camp<input type="search" data-tree-search data-focus-key="tree-search" value="${h(view.query)}" placeholder="Find a building or benefit"/></label><button data-camp-economy data-focus-key="camp-economy">Provisions</button><button data-tree-recipes data-focus-key="tree-recipes">Combinations</button></div><div class="camp-map-scroll" data-scroll-key="camp-map"><div class="camp-map" role="group" aria-label="Painted manuscript map of the camp">${art.landscape()}<div class="camp-map-cores" role="group" aria-label="Permanent core buildings">${CORE_NOMADIC_BUILDINGS.map((b) => place(b, b.position!)).join('')}</div><div class="camp-map-facilities" role="group" aria-label="Optional building slots">${slots}</div></div></div>${popup}</div><footer class="panel-footer"><span class="paused-note">Ⅱ &nbsp; THE WORLD IS PAUSED</span><button class="secondary-button" data-action="exit-camp">Return to the steppe <kbd>ESC</kbd></button></footer></section>`;
}

export function nomadicJournalBuildings(run: RunState): string {
  const camp = run.clan.nomadicCamp!;
  return NOMADIC_BUILDINGS.filter((b) => nomadicBuildingLevel(camp, b.id))
    .map((b) => {
      const level = nomadicBuildingLevel(camp, b.id);
      return `<div class="clan-building"><span class="clan-building-art">${campIllustration(b.levels[level - 1]!.visual.art)}</span><div><strong>${h(b.title)}</strong><p>Level ${level} / ${b.levels.length} · ${h(b.category)}</p></div></div>`;
    })
    .join('');
}
