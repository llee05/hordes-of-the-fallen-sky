import { heading, footer } from './panelContent';
import { clanMark, type ClanMark } from './artwork';
import type { StatChange } from '../game/state/progressionPreview';

export type NodeStatus = 'available' | 'learned' | 'locked' | 'excluded' | 'unaffordable';
export interface TreeRequirement {
  id: string;
  title: string;
  rank: number;
  current: number;
}
export interface TreePrice {
  knowledge?: number;
  materials?: number;
  spirit?: number;
  workers?: number;
}
export interface TreeNode {
  id: string;
  title: string;
  description: string;
  status: NodeStatus;
  cost: string;
  reason: string;
  requires: readonly string[];
  action: Readonly<Record<string, string>>;
  kind?: 'foundation' | 'practice' | 'capstone';
  progress?: string;
  requirementsLabel?: string;
  forecast?: string;
  ranks?: { current: number; max: number };
  icon?: string;
  preview?: readonly StatChange[];
  prerequisites?: readonly TreeRequirement[];
  price?: TreePrice;
  excludes?: readonly { id: string; title: string }[];
  choiceGroup?: string;
}
export interface TreeBranch {
  id: string;
  title: string;
  category: string;
  description: string;
  illustration: string;
  progress: string;
  layout: 'ranks' | 'tiers';
  nodes: readonly TreeNode[];
}
export interface TreeViewState {
  category: string;
  query: string;
  branch?: string;
  node?: string;
  overview?: boolean;
  recipes?: boolean;
  expanded?: boolean;
  campPopup?: boolean;
  campTarget?: 'building' | 'encampment' | 'internal' | 'slot' | 'search' | 'economy';
  campSlot?: number;
  campInternal?: string;
  campFocus?: string;
}
export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}
export function searchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase();
}
export function treeLevels(nodes: readonly TreeNode[]): TreeNode[][] {
  const pending = new Map(nodes.map((n) => [n.id, n]));
  if (pending.size !== nodes.length) throw new Error('Duplicate progression node ID');
  const placed = new Set<string>(),
    levels: TreeNode[][] = [];
  while (pending.size) {
    const level = [...pending.values()].filter((n) => n.requires.every((id) => placed.has(id)));
    if (!level.length) throw new Error('Progression tree contains a cycle or missing parent');
    levels.push(level);
    for (const n of level) {
      pending.delete(n.id);
      placed.add(n.id);
    }
  }
  return levels;
}
export function selectedNode(branch: TreeBranch, id?: string): TreeNode {
  return (
    branch.nodes.find((n) => n.id === id) ??
    branch.nodes.find((n) => n.status === 'available') ??
    branch.nodes.find((n) => n.status !== 'learned' && n.status !== 'excluded') ??
    branch.nodes[0]!
  );
}
export function treeAncestors(branch: TreeBranch, id: string): Set<string> {
  const result = new Set<string>();
  const visit = (key: string) => {
    if (result.has(key)) return;
    result.add(key);
    branch.nodes.find((n) => n.id === key)?.requires.forEach(visit);
  };
  visit(id);
  return result;
}
/** Deduplicate shared parents and charge only the still-needed ranks on a selected route. */
export function treeRoute(
  branch: TreeBranch,
  target: TreeNode,
): { nodes: TreeNode[]; price: TreePrice } {
  const required = new Map<string, number>();
  const visit = (node: TreeNode, rank: number) => {
    if ((required.get(node.id) ?? 0) >= rank) return;
    required.set(node.id, rank);
    for (const id of node.requires) {
      const p = branch.nodes.find((n) => n.id === id)!;
      visit(p, node.prerequisites?.find((r) => r.id === id)?.rank ?? 1);
    }
  };
  visit(
    target,
    Math.min(
      target.ranks?.max ?? 1,
      (target.ranks?.current ?? (target.status === 'learned' ? 1 : 0)) + 1,
    ),
  );
  const price: TreePrice = {};
  const nodes: TreeNode[] = [];
  // A route is a valid purchase sequence, including shared parents before either child.
  for (const node of treeLevels(branch.nodes).flat()) {
    const rank = required.get(node.id);
    if (rank === undefined) continue;
    const remaining = Math.max(
      0,
      rank - (node.ranks?.current ?? (node.status === 'learned' ? 1 : 0)),
    );
    if (!remaining) continue;
    nodes.push(node);
    for (const key of ['knowledge', 'materials', 'spirit', 'workers'] as const)
      price[key] = (price[key] ?? 0) + (node.price?.[key] ?? 0) * remaining;
  }
  return { nodes, price };
}
export function priceText(price: TreePrice): string {
  return (
    (['knowledge', 'materials', 'spirit', 'workers'] as const)
      .filter((k) => (price[k] ?? 0) > 0)
      .map(
        (k) =>
          `${price[k]} ${k === 'knowledge' ? 'knowledge point' + (price[k] === 1 ? '' : 's') : k === 'spirit' ? 'Spirit' : k}`,
      )
      .join(' · ') || 'No remaining cost'
  );
}
const statusLabel = (n: TreeNode) =>
  n.status === 'available'
    ? 'Available'
    : n.status === 'unaffordable'
      ? 'Needs resources'
      : n.status === 'excluded'
        ? 'Path closed'
        : n.status === 'learned'
          ? n.ranks && n.ranks.max > 1
            ? 'Mastered'
            : 'Learned'
          : 'Prerequisites missing';
export function graphLayout(branch: TreeBranch) {
  const levels = treeLevels(branch.nodes),
    width = Math.max(300, ...levels.map((l) => l.length * 152)) + 24;
  const points = new Map<string, { x: number; y: number; level: number }>();
  levels.forEach((level, depth) =>
    level.forEach((node, i) =>
      points.set(node.id, {
        x: (width - level.length * 152) / 2 + i * 152,
        y: 18 + depth * 104,
        level: depth,
      }),
    ),
  );
  return { width, height: levels.length * 104 + 12, points };
}
export function branchMarkup(
  branch: TreeBranch,
  options: { selectedNode?: string; inspector?: boolean } = {},
): string {
  const selected = selectedNode(branch, options.selectedNode),
    route = treeAncestors(branch, selected.id),
    layout = graphLayout(branch);
  const edges = branch.nodes
    .flatMap((node) =>
      node.requires
        .filter(
          (parent) =>
            !node.requires.some(
              (other) => other !== parent && treeAncestors(branch, other).has(parent),
            ),
        )
        .map((parent) => {
          const a = layout.points.get(parent)!,
            b = layout.points.get(node.id)!,
            onRoute = route.has(node.id) && route.has(parent);
          return `<path data-edge-from="${escapeHtml(parent)}" data-edge-to="${escapeHtml(node.id)}" data-route="${onRoute}" data-learned="${branch.nodes.find((n) => n.id === parent)?.status === 'learned'}" d="M${a.x + 64},${a.y + 86} C${a.x + 64},${a.y + 104} ${b.x + 64},${b.y - 18} ${b.x + 64},${b.y}"/>`;
        }),
    )
    .join('');
  return `<article class="tree-branch connected-branch" data-tree-branch="${escapeHtml(branch.id)}"><header class="tree-branch-heading"><span class="tree-illustration">${branch.illustration}</span><div><p class="eyebrow">${escapeHtml(branch.category)}</p><h3>${escapeHtml(branch.title)}</h3><p class="tree-progress">${escapeHtml(branch.progress)}</p></div></header><p class="tree-branch-description">${escapeHtml(branch.description)}</p>
 <div class="tree-graph-viewport" data-scroll-key="graph-${escapeHtml(branch.id)}" aria-label="${escapeHtml(branch.title)} prerequisite map"><div class="tree-graph" style="width:${layout.width}px;height:${layout.height}px"><svg class="tree-connections" viewBox="0 0 ${layout.width} ${layout.height}" aria-hidden="true">${edges}</svg>
 ${branch.nodes
   .map((node) => {
     const p = layout.points.get(node.id)!,
       rank = node.ranks ?? { current: node.status === 'learned' ? 1 : 0, max: 1 };
     return `<button class="tree-node" data-node="${escapeHtml(node.id)}" data-tree-select="${escapeHtml(node.id)}" data-focus-key="${escapeHtml(node.id)}" data-level="${p.level}" data-status="${node.status}" data-kind="${node.kind ?? 'practice'}" data-route="${route.has(node.id)}" aria-pressed="${selected.id === node.id}" aria-controls="tree-node-inspector" aria-label="${escapeHtml(`${node.title}. ${statusLabel(node)}. ${rank.current} of ${rank.max} ranks. Inspect details.`)}" style="left:${p.x}px;top:${p.y}px"><span class="tree-node-icon">${clanMark(node.icon ?? 'spirit')}</span><strong>${escapeHtml(node.title)}</strong><span class="tree-node-ranks" aria-hidden="true">${Array.from({ length: rank.max }, (_, i) => `<i data-filled="${i < rank.current}"></i>`).join('')}</span><span class="tree-node-state">${escapeHtml(statusLabel(node))}</span></button>`;
   })
   .join(
     '',
   )}</div></div><p class="tree-map-hint">Select a node to inspect. Arrows follow connections; purchases use the inspector.</p>
 ${options.inspector ? nodeInspector(branch, selected) : ''}</article>`;
}
export function nodeInspector(branch: TreeBranch, node: TreeNode): string {
  const route = treeRoute(branch, node),
    ranks = node.ranks ?? { current: node.status === 'learned' ? 1 : 0, max: 1 };
  const prerequisites =
    node.prerequisites ??
    node.requires.map((id) => ({
      id,
      title: branch.nodes.find((n) => n.id === id)?.title ?? id,
      rank: 1,
      current: branch.nodes.find((n) => n.id === id)?.status === 'learned' ? 1 : 0,
    }));
  const attributes = Object.entries(node.action)
    .map(([key, value]) => `data-${key}="${escapeHtml(value)}"`)
    .join(' ');
  const preview = node.preview ?? [];
  const alternatives = node.choiceGroup
    ? branch.nodes.filter((n) => n.id !== node.id && n.choiceGroup === node.choiceGroup)
    : [];
  return `<section class="node-inspector" id="tree-node-inspector" aria-label="Selected technology"><div class="node-inspector-scroll" data-scroll-key="node-details"><div class="node-portrait" data-capstone="${node.kind === 'capstone'}">${clanMark(node.icon ?? 'spirit')}<span class="node-patron-seal">${branch.illustration}</span></div><p class="eyebrow">${escapeHtml(node.kind ?? 'Camp development')} · ${escapeHtml(statusLabel(node))}</p><h3>${escapeHtml(node.title)}</h3><p class="node-rank-summary">Rank ${ranks.current} / ${ranks.max}</p><p class="node-effect">${escapeHtml(node.description)}</p>
 ${preview.length ? `<section class="node-preview" aria-label="Purchase effect preview"><h4>With your current build</h4><dl>${preview.map((change) => `<div data-improves="${change.improves}"><dt>${escapeHtml(change.label)}</dt><dd><span>${escapeHtml(change.before)}</span><b aria-label="becomes">→</b><strong>${escapeHtml(change.after)}</strong></dd>${change.context ? `<small>${escapeHtml(change.context)}</small>` : ''}</div>`).join('')}</dl></section>` : ''}${node.forecast ? `<p class="tree-node-forecast">${escapeHtml(node.forecast)}</p>` : ''}
 ${prerequisites.length ? `<section class="node-prerequisites"><h4>Prerequisites</h4><ul>${prerequisites.map((r) => `<li data-met="${r.current >= r.rank}"><span aria-hidden="true">${r.current >= r.rank ? '✓' : '○'}</span><button data-tree-select="${escapeHtml(r.id)}" data-focus-key="requirement-${escapeHtml(r.id)}">${escapeHtml(r.title)} <small>${r.current} / ${r.rank} ranks</small></button></li>`).join('')}</ul></section>` : ''}
 ${
   route.nodes.length > 1
     ? `<section class="node-route"><h4>Complete route to this upgrade</h4><p>${escapeHtml(priceText(route.price))}</p><div>${route.nodes
         .map(
           (n) =>
             `<button data-tree-select="${escapeHtml(n.id)}" data-focus-key="route-${escapeHtml(n.id)}">${escapeHtml(n.title)}</button>`,
         )
         .join('<span aria-hidden="true">›</span>')}</div></section>`
     : ''
 }
 ${alternatives.length ? `<section class="node-comparison"><h4>Choose a specialization</h4><p>One choice per group for this expedition.</p><div class="choice-comparison">${[node, ...alternatives].map((n) => `<article data-selected="${n.id === node.id}" data-status="${n.status}"><h5>${escapeHtml(n.title)}</h5><p>${escapeHtml(n.description)}</p><strong>${escapeHtml(n.cost)}</strong>${n.excludes?.length ? `<small>Closes: ${escapeHtml(n.excludes.map((e) => e.title).join(', '))}</small>` : ''}${n.id !== node.id ? `<button data-tree-select="${escapeHtml(n.id)}" data-focus-key="compare-${escapeHtml(n.id)}">Inspect alternative</button>` : '<small>Selected for inspection</small>'}</article>`).join('')}</div></section>` : ''}
 ${node.excludes?.length ? `<section class="node-exclusions"><h4>Choosing this closes</h4><p>Other branches remain open.</p><ul>${node.excludes.map((n) => `<li>${escapeHtml(n.title)}</li>`).join('')}</ul></section>` : ''}
 </div><div class="node-purchase"><p class="node-purchase-status" role="status">${escapeHtml(node.reason)}</p><strong class="node-price">${escapeHtml(node.cost)}</strong><button class="tree-purchase" data-focus-key="purchase-${escapeHtml(node.id)}" ${attributes} ${node.status === 'available' ? '' : 'disabled'} aria-disabled="${node.status !== 'available'}">${node.status === 'learned' ? 'Learned' : node.status === 'excluded' ? 'Path closed' : node.action.building && !node.action.path ? escapeHtml(node.title) : `Learn ${escapeHtml(node.title)}`}</button></div></section>`;
}
export function progressionMenu(options: {
  title: string;
  eyebrow: string;
  mark: ClanMark;
  introduction: string;
  summary: readonly { label: string; value: string }[];
  branches: readonly TreeBranch[];
  view: TreeViewState;
  notice?: string;
  kind?: string;
  allLabel?: string;
  recipes?: string;
}): string {
  const { branches, view } = options,
    query = searchText(view.query.trim());
  const visible = branches.filter(
    (b) =>
      (view.category === 'all' || b.category === view.category) &&
      searchText(
        [b.title, b.description, ...b.nodes.flatMap((n) => [n.title, n.description])].join(' '),
      ).includes(query),
  );
  const branch = visible.find((b) => b.id === view.branch) ?? visible[0];
  const selected = branch ? selectedNode(branch, view.node) : undefined;
  const overview = view.overview;
  return `<section class="game-panel progression-panel" data-tree-kind="${escapeHtml(options.kind ?? 'progression')}">${heading(options.eyebrow, options.title, true, options.mark)}
 <div class="tree-toolbar"><div class="tree-summary">${options.summary.map((s) => `<span><strong>${escapeHtml(s.value)}</strong>${escapeHtml(s.label)}</span>`).join('')}</div><div class="tree-view-tools"><button data-tree-overview data-focus-key="tree-overview" aria-pressed="${!!overview}">Patron overview</button>${options.recipes ? `<button data-tree-recipes data-focus-key="tree-recipes" aria-pressed="${!!view.recipes}">Combinations</button>` : ''}</div></div>
 <div class="tree-workspace${overview || view.recipes ? ' tree-workspace-overview' : ''}"><aside class="patron-navigation"><label class="tree-search-label">Find a branch<input type="search" id="tree-search" data-tree-search data-focus-key="tree-search" placeholder="Search names and effects" value="${escapeHtml(view.query)}"/></label><button class="tree-reset-filter" data-tree-filter="all" data-focus-key="filter-all">${escapeHtml(options.allLabel ?? 'All branches')}</button><nav aria-label="Patron traditions">${visible.map((b) => `<button class="patron-nav-item" data-tree-branch-select="${escapeHtml(b.id)}" data-nodes="${b.nodes.map((n) => escapeHtml(n.id)).join(' ')}" data-focus-key="branch-${escapeHtml(b.id)}" aria-pressed="${!overview && !view.recipes && branch?.id === b.id}"><span>${b.illustration}</span><span><strong>${escapeHtml(b.title)}</strong><small>${escapeHtml(b.category)} · ${escapeHtml(b.progress)}</small></span></button>`).join('')}</nav></aside>
 <div class="tree-main panel-body tree-scroll" data-scroll-key="tree-main">${view.recipes ? (options.recipes ?? '') : overview ? `<p class="panel-intro">${escapeHtml(options.introduction)}</p><div class="patron-overview">${visible.map((b) => `<button class="patron-overview-card" data-tree-branch-select="${escapeHtml(b.id)}" data-focus-key="overview-${escapeHtml(b.id)}"><span>${b.illustration}</span><p class="eyebrow">${escapeHtml(b.category)}</p><h3>${escapeHtml(b.title)}</h3><p>${escapeHtml(b.description)}</p><strong>${escapeHtml(b.progress)}</strong><small>${b.nodes.filter((n) => n.status === 'available').length} upgrades affordable now</small></button>`).join('')}</div>` : branch ? branchMarkup(branch, { selectedNode: selected!.id }) : '<p class="tree-empty" role="status">No branches match. Clear your search or choose another category.</p>'}</div>
 ${!overview && !view.recipes && branch && selected ? nodeInspector(branch, selected) : ''}</div><div class="tree-bottom-note">${escapeHtml(options.notice ?? '')}</div>${footer('Close tree')}</section>`;
}
