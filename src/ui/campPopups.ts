import { BUILDINGS } from '../game/data/clan';
import { ENCAMPMENT_TIERS, INTERNAL_DEVELOPMENTS } from '../game/data/campEstate';
import {
  buildingLevel,
  encampment,
  estateBlocker,
  estateCost,
  purchaseEstate,
  type EstatePurchaseKind,
} from '../game/state/campEstate';
import { applyCampEffects, createCampEffects, hasDevelopment } from '../game/state/camp';
import { progressionChanges } from '../game/state/progressionPreview';
import type { BuildingId, CampEffectDefinition, RunState } from '../game/types';
import { campBranches } from './campContent';
import { buildingCost } from '../game/state/clan';
import { BUILDING_MARKS, campIllustration, clanMark } from './artwork';
import { escapeHtml as h, priceText, type TreeBranch, type TreeNode } from './progressionTree';

const EFFECT_LABELS: Record<string, string> = {
  foodProduction: 'Food production',
  materialProduction: 'Material gathering',
  consumption: 'Food consumption',
  pastureUse: 'Pasture depletion',
  mobility: 'Migration mobility',
  clanProtection: 'Clan damage taken',
  riderDamage: 'Rider damage',
  hostInterval: 'Host firing interval',
  burnDamage: 'Burn damage',
  gallopCooldown: 'Gallop cooldown',
  sanctuaryInterval: 'Lightning interval',
  wagonDamage: 'Wagon damage',
  spiritGain: 'Spirit gained from defeats',
  range: 'Targeting range',
  resolveRecovery: 'Resolve recovery / second',
  commanderRecovery: 'Khan recovery / second',
  arrivalFood: 'Food on arrival',
  arrivalMaterials: 'Materials on arrival',
  arrivalHerd: 'Horses on arrival',
  arrivalResolve: 'Resolve on arrival',
  arrivalHealth: 'Khan health on arrival',
  refugePeople: 'People at rescue arrivals',
};
export function effectDescriptions(effects?: CampEffectDefinition): string[] {
  const n = (v: number) => Number(v.toFixed(2));
  return [
    ...Object.entries(effects?.multipliers ?? {})
      .filter(([, v]) => Math.abs(v - 1) > 0.00001)
      .map(
        ([key, value]) =>
          `${EFFECT_LABELS[key] ?? key} ${value >= 1 ? '+' : '−'}${n(Math.abs(value - 1) * 100)}%`,
      ),
    ...Object.entries(effects?.bonuses ?? {})
      .filter(([, v]) => v !== 0)
      .map(([key, value]) => `${EFFECT_LABELS[key] ?? key} ${value > 0 ? '+' : ''}${n(value)}`),
  ];
}
export function buildingBonuses(run: RunState, id: BuildingId): string[] {
  if (!run.clan.buildings[id]) return [];
  const definition = BUILDINGS.find((b) => b.id === id)!;
  const effects = createCampEffects();
  applyCampEffects(effects, definition.effects);
  definition.paths
    .filter((p) => hasDevelopment(run, id, p.id))
    .forEach((p) => applyCampEffects(effects, p.effects));
  return effectDescriptions(effects);
}
export function estateBranch(run: RunState, kind: EstatePurchaseKind, id = ''): TreeBranch {
  const internal = INTERNAL_DEVELOPMENTS.find((d) => d.id === id);
  const current =
    kind === 'encampment' ? encampment(run).tier : (run.clan.estate?.internals[id] ?? 0);
  const definitions = kind === 'encampment' ? ENCAMPMENT_TIERS : (internal?.ranks ?? []);
  return {
    id: kind === 'encampment' ? 'encampment' : `internal-${id}`,
    title: kind === 'encampment' ? 'Clan Encampment' : (internal?.title ?? ''),
    category: 'Camp organisation',
    description:
      internal?.description ??
      'The portable household is the foundation of the clan. More organisation unlocks plots, facilities, and internal developments.',
    illustration: clanMark(internal?.icon ?? 'ger'),
    progress: `Level ${current} / ${definitions.length}`,
    layout: 'tiers',
    nodes: definitions.map((definition, i): TreeNode => {
      const rank = i + 1,
        target = kind === 'encampment' ? definition.id : id;
      const blocker = estateBlocker(run, kind, target, rank),
        completed = rank <= current;
      const preview: ReturnType<typeof progressionChanges> = [];
      if (!blocker || blocker === 'Gather more resources') {
        const copy = structuredClone(run),
          cost = estateCost(run, definition);
        copy.phase = 'building';
        copy.clan.materials = Math.max(copy.clan.materials, cost.materials);
        copy.clan.spirit = Math.max(copy.clan.spirit, cost.spirit);
        if (purchaseEstate(copy, kind, target, rank))
          preview.push(...progressionChanges(run, copy));
      }
      return {
        id: definition.id,
        title: definition.title,
        description: definition.description,
        icon: definition.icon,
        status: completed
          ? 'learned'
          : blocker === 'Gather more resources' || blocker === 'More families needed'
            ? 'unaffordable'
            : blocker
              ? 'locked'
              : 'available',
        reason: completed ? 'Completed' : (blocker ?? ''),
        cost: completed ? 'Completed' : priceText(estateCost(run, definition)),
        price: estateCost(run, definition),
        preview,
        ranks: { current: completed ? 1 : 0, max: 1 },
        requires: i ? [definitions[i - 1]!.id] : [],
        action: { 'estate-kind': kind, 'estate-id': target, 'estate-rank': String(rank) },
        kind: i === definitions.length - 1 ? 'capstone' : i ? 'practice' : 'foundation',
      };
    }),
  };
}
export function campBuildingBranch(run: RunState, id: BuildingId): TreeBranch {
  return campBranches(run).find((b) => b.id === id)!;
}
export function nextCampNode(branch: TreeBranch, run: RunState, id: BuildingId): TreeNode {
  const definition = BUILDINGS.find((b) => b.id === id)!,
    level = buildingLevel(run, id);
  return (
    branch.nodes.find((n) =>
      !level
        ? n.id === `${id}-base`
        : definition.paths.find((p) => n.id === `${id}-${p.id}`)?.level === level + 1 &&
          n.status !== 'excluded',
    ) ??
    branch.nodes.find((n) => n.status === 'available') ??
    branch.nodes.find((n) => n.status !== 'learned' && n.status !== 'excluded') ??
    branch.nodes[0]!
  );
}
function attrs(action: TreeNode['action']): string {
  return Object.entries(action)
    .map(([key, value]) => `data-${key}="${h(value)}"`)
    .join(' ');
}
const stateLabel = (n: TreeNode) =>
  n.status === 'learned'
    ? 'Completed'
    : n.status === 'excluded'
      ? 'Other path chosen'
      : n.status === 'unaffordable'
        ? 'Needs supplies or workers'
        : n.status === 'locked'
          ? 'Locked'
          : 'Available';
export function campPath(branch: TreeBranch, selected: TreeNode, building?: BuildingId): string {
  const definition = BUILDINGS.find((b) => b.id === building);
  const levelOf = (n: TreeNode) =>
    !definition
      ? branch.nodes.indexOf(n) + 1
      : n.id === `${building}-base`
        ? 1
        : definition.paths.find((p) => n.id === `${building}-${p.id}`)?.level;
  const levels = [...new Set(branch.nodes.map(levelOf).filter((l) => l !== undefined))];
  const button = (n: TreeNode, level?: number) =>
    `<button class="camp-path-node" data-node="${h(n.id)}" data-tree-select="${h(n.id)}" data-focus-key="${h(n.id)}" data-status="${n.status}" aria-pressed="${selected.id === n.id}">${clanMark(n.icon ?? 'ger')}<span><small>${level ? `Level ${level}` : 'Camp craft'} · ${stateLabel(n)}</small><strong>${h(n.title)}</strong></span></button>`;
  return `<div class="camp-level-path" data-tree-branch="${h(branch.id)}" aria-label="${h(branch.title)} upgrade path">${levels
    .map(
      (level) =>
        `<div class="camp-level-step${branch.nodes.filter((n) => levelOf(n) === level).length > 1 ? ' camp-level-fork' : ''}">${branch.nodes
          .filter((n) => levelOf(n) === level)
          .map((n) => button(n, level))
          .join('')}</div>`,
    )
    .join('')}${
    definition
      ? `<details class="camp-crafts" data-disclosure-key="crafts-${building}"><summary>Household crafts & complementary improvements</summary>${branch.nodes
          .filter((n) => levelOf(n) === undefined)
          .map((n) => button(n))
          .join('')}</details>`
      : ''
  }</div>`;
}
export function campNodeDetails(
  node: TreeNode,
  level: string,
  bonuses: readonly string[],
  flavour: string,
  slot?: number,
): string {
  const preview = node.preview ?? [],
    enabled = node.status === 'available';
  const action = {
    ...node.action,
    ...(node.action.building && !node.action.path && slot !== undefined
      ? { slot: String(slot) }
      : {}),
  };
  return `<div class="camp-popup-copy" data-scroll-key="camp-popup-copy"><p class="eyebrow">${h(level)} · ${stateLabel(node)}</p><h3>${h(node.title)}</h3><p class="camp-popup-description">${h(node.description)}</p>${flavour ? `<p class="camp-flavour">${h(flavour)}</p>` : ''}${bonuses.length ? `<details class="camp-current-bonuses" data-disclosure-key="current-bonuses"><summary>Current continuing bonuses</summary><ul>${bonuses.map((text) => `<li>${h(text)}</li>`).join('')}</ul></details>` : ''}
  ${
    preview.length
      ? `<section class="camp-gains" aria-label="Upgrade bonuses"><h4>With your clan</h4><dl>${preview
          .slice(0, 4)
          .map(
            (p) =>
              `<div><dt>${h(p.label)}</dt><dd>${h(p.before)} → <strong>${h(p.after)}</strong></dd></div>`,
          )
          .join('')}</dl>${
          preview.length > 4
            ? `<details><summary>${preview.length - 4} more changes</summary><dl>${preview
                .slice(4)
                .map(
                  (p) => `<div><dt>${h(p.label)}</dt><dd>${h(p.before)} → ${h(p.after)}</dd></div>`,
                )
                .join('')}</dl></details>`
            : ''
        }</section>`
      : ''
  }
  ${node.prerequisites?.length ? `<ul class="camp-popup-requirements" aria-label="Requirements">${node.prerequisites.map((r) => `<li data-met="${r.current >= r.rank}">${r.current >= r.rank ? '✓' : '○'} <button data-tree-select="${h(r.id)}" data-focus-key="requires-${h(r.id)}">${h(r.title)}</button></li>`).join('')}</ul>` : ''}
  ${node.excludes?.length ? `<p class="camp-choice-warning">Choosing this closes: ${h(node.excludes.map((n) => n.title).join(', '))}.</p>` : ''}</div>
  <div class="camp-popup-purchase"><p class="node-purchase-status" role="status">${h(node.reason)}</p><strong class="node-price">${h(node.cost)}</strong><button class="tree-purchase" data-focus-key="purchase-${h(node.id)}" ${attrs(action)} ${enabled ? '' : 'disabled'}>${node.status === 'learned' ? 'Completed' : node.status === 'excluded' ? 'Path closed' : node.action.building && !node.action.path ? h(node.title) : `Upgrade · ${h(node.title)}`}</button></div>`;
}
export function buildingChoice(run: RunState, id: BuildingId, slot?: number): string {
  const b = BUILDINGS.find((b) => b.id === id)!;
  const cost = buildingCost(run, id);
  return `<button class="camp-building-choice" data-camp-site="${id}" ${slot !== undefined ? `data-camp-plot="${slot}"` : ''} data-focus-key="choose-${id}">${campIllustration(b.illustration ?? 'ger')}<span><strong>${h(b.title)}</strong><small>${run.clan.buildings[id] ? `Level ${buildingLevel(run, id)}` : `Camp tier ${b.minTier ?? 1} · ${cost.materials} materials${cost.spirit ? ` · ${cost.spirit} Spirit` : ''} · ${b.workers} workers`}</small></span>${clanMark(BUILDING_MARKS[id] ?? 'ger')}</button>`;
}
