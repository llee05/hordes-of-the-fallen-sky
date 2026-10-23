import { heading, footer } from './panelContent';
import type { ClanMark } from './artwork';

export type NodeStatus = 'available' | 'learned' | 'locked' | 'excluded';

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
}

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!,
  );
}

/** Automatic topological tiers: authored nodes need IDs and parent IDs, never coordinates. */
export function treeLevels(nodes: readonly TreeNode[]): TreeNode[][] {
  const pending = new Map(nodes.map((node) => [node.id, node]));
  if (pending.size !== nodes.length) throw new Error('Duplicate progression node ID');
  const placed = new Set<string>();
  const levels: TreeNode[][] = [];
  while (pending.size) {
    const level = [...pending.values()].filter((node) =>
      node.requires.every((id) => placed.has(id)),
    );
    if (!level.length) throw new Error('Progression tree contains a cycle or missing parent');
    levels.push(level);
    for (const node of level) {
      pending.delete(node.id);
      placed.add(node.id);
    }
  }
  return levels;
}

function nodeButton(node: TreeNode, compact: boolean, parents = ''): string {
  const attributes = Object.entries(node.action)
    .map(([key, value]) => `data-${key}="${escapeHtml(value)}"`)
    .join(' ');
  const label = [
    `${node.title}.`,
    node.kind,
    node.progress,
    node.description,
    node.forecast,
    `${node.cost}.`,
    node.reason,
    parents,
  ]
    .filter(Boolean)
    .join(' ');
  return `<button data-kind="${node.kind ?? 'upgrade'}" class="tree-node ${compact ? 'tree-rank' : ''}" data-node="${escapeHtml(node.id)}" data-focus-key="${escapeHtml(node.id)}" data-status="${node.status}" aria-disabled="${node.status !== 'available'}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" ${attributes}>
    <span class="tree-node-state">${node.status === 'learned' ? '✓ LEARNED' : node.status === 'available' ? 'AVAILABLE' : node.status === 'excluded' ? 'OTHER PATH CHOSEN' : 'LOCKED'}</span>
    <strong>${escapeHtml(node.title)}</strong>
    ${node.kind ? `<span class="tree-node-kind">${escapeHtml(node.kind)}</span>` : ''}
    ${node.progress ? `<span class="tree-node-progress">${escapeHtml(node.progress)}</span>` : ''}
    ${compact ? '' : `<span class="tree-node-description">${escapeHtml(node.description)}</span>`}
    ${node.forecast ? `<span class="tree-node-forecast">${escapeHtml(node.forecast)}</span>` : ''}
    ${parents ? `<span class="tree-node-requires">${escapeHtml(parents)}</span>` : ''}
    <span class="tree-node-cost">${escapeHtml(compact ? node.reason || node.cost : node.cost)}</span>${!compact && node.reason ? `<span class="tree-node-reason">${escapeHtml(node.reason)}</span>` : ''}
  </button>`;
}

export function branchMarkup(branch: TreeBranch): string {
  const labels = new Map(branch.nodes.map((node) => [node.id, node.title]));
  const parents = (node: TreeNode): string =>
    node.requirementsLabel ??
    (node.requires.length
      ? `Requires: ${node.requires.map((id) => labels.get(id) ?? id).join(' + ')}`
      : '');
  const nodes =
    branch.layout === 'ranks'
      ? `<div class="tree-rank-track">${branch.nodes.map((node) => nodeButton(node, true)).join('')}</div>`
      : `<div class="tree-tiers">${treeLevels(branch.nodes)
          .map(
            (level, index) =>
              `<div class="tree-tier" data-depth="${index}">${level.map((node) => nodeButton(node, false, parents(node))).join('')}</div>`,
          )
          .join('')}</div>`;
  return `<article class="tree-branch tree-layout-${branch.layout}" data-tree-branch="${escapeHtml(branch.id)}">
    <header class="tree-branch-heading"><span class="tree-illustration">${branch.illustration}</span><div><p class="eyebrow">${escapeHtml(branch.category)}</p><h3>${escapeHtml(branch.title)}</h3><p class="tree-progress">${escapeHtml(branch.progress)}</p></div></header>
    <p class="tree-branch-description">${escapeHtml(branch.description)}</p>${nodes}
  </article>`;
}

export function searchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase();
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
}): string {
  const { branches, view } = options;
  const categories = [...new Set(branches.map((branch) => branch.category))];
  const query = searchText(view.query.trim());
  const visible = branches.filter(
    (branch) =>
      (view.category === 'all' || branch.category === view.category) &&
      searchText(
        [
          branch.title,
          branch.description,
          ...branch.nodes.flatMap((node) => [node.title, node.description]),
        ].join(' '),
      ).includes(query),
  );
  return `<section class="game-panel progression-panel" data-tree-kind="${escapeHtml(options.kind ?? 'progression')}">${heading(options.eyebrow, options.title, true, options.mark)}
    <div class="tree-toolbar"><div class="tree-summary">${options.summary.map((item) => `<span><strong>${escapeHtml(item.value)}</strong>${escapeHtml(item.label)}</span>`).join('')}</div>
    <label class="tree-search-label">Find a branch<input type="search" id="tree-search" data-tree-search data-focus-key="tree-search" placeholder="Search names and effects" value="${escapeHtml(view.query)}" /></label></div>
    <div class="tree-filters" role="group" aria-label="Tree categories">${['all', ...categories].map((category) => `<button data-tree-filter="${escapeHtml(category)}" data-focus-key="filter-${escapeHtml(category)}" aria-pressed="${view.category === category}">${escapeHtml(category === 'all' ? (options.allLabel ?? 'All branches') : category)}</button>`).join('')}</div>
    <div class="panel-body tree-scroll"><p class="panel-intro">${escapeHtml(options.introduction)}</p>${options.notice ? `<p class="tree-notice">${escapeHtml(options.notice)}</p>` : ''}
      <div class="tree-legend"><span data-status="available">◇ Available</span><span data-status="learned">✓ Learned</span><span data-status="locked">○ Locked</span></div>
      <div class="progression-branches">${visible.map(branchMarkup).join('')}</div>
      ${visible.length ? '' : '<p class="tree-empty" role="status">No branches match. Clear your search or choose another category.</p>'}
    </div>${footer('Close tree')}</section>`;
}
