import { describe, expect, it } from 'vitest';
import {
  progressionMenu,
  treeLevels,
  treeRoute,
  branchMarkup,
  nodeInspector,
  type TreeNode,
  type TreeBranch,
} from '../../src/ui/progressionTree';
import { researchBranches } from '../../src/ui/researchContent';
import { createRun } from '../../src/game/state/run';
import { PATRONS } from '../../src/game/data/patrons';
import { UPGRADES } from '../../src/game/data/upgrades';
import { BUILDINGS, type BuildingDefinition } from '../../src/game/data/clan';
import { campBranches } from '../../src/ui/campContent';
import { buildStructure } from '../../src/game/state/clan';

function node(id: string, requires: string[] = []): TreeNode {
  return {
    id,
    requires,
    title: id,
    description: '',
    status: 'available',
    cost: '1 point',
    reason: '',
    action: {},
  };
}

describe('expandable progression views', () => {
  it('derives camp tiers and exclusion states from added development definitions', () => {
    const definitions = BUILDINGS as BuildingDefinition[];
    const index = definitions.findIndex((entry) => entry.id === 'ger');
    const original = definitions[index]!;
    definitions[index] = {
      ...original,
      paths: [
        ...original.paths,
        {
          id: 'third-path',
          title: 'A third path',
          description: 'An alternative.',
          exclusiveGroup: 'specialization',
        },
        {
          id: 'next-tier',
          title: 'A deeper tier',
          description: 'An extension.',
          requires: ['hearthkeepers'],
        },
      ],
    };
    try {
      const run = createRun();
      run.phase = 'building';
      run.clan.materials = 500;
      const ger = campBranches(run).find((branch) => branch.id === 'ger')!;
      expect(treeLevels(ger.nodes).map((level) => level.length)).toEqual([1, 5, 4]);
      expect(ger.nodes.find((entry) => entry.id === 'ger-next-tier')?.status).toBe('locked');
      buildStructure(run, 'ger', 'hearthkeepers');
      const learned = campBranches(run).find((branch) => branch.id === 'ger')!;
      expect(learned.nodes.find((entry) => entry.id === 'ger-third-path')?.status).toBe('excluded');
      expect(learned.nodes.find((entry) => entry.id === 'ger-next-tier')?.status).toBe('available');
    } finally {
      definitions[index] = original;
    }
  });
  it('lays out unordered nodes with multiple parents and arbitrary depth', () => {
    const nodes = [
      node('final', ['left', 'right']),
      node('right', ['root']),
      node('root'),
      node('left', ['root']),
      node('beyond', ['final']),
    ];
    expect(treeLevels(nodes).map((level) => level.map((entry) => entry.id))).toEqual([
      ['root'],
      ['right', 'left'],
      ['final'],
      ['beyond'],
    ]);
    expect(() => treeLevels([node('loop', ['loop'])])).toThrow(/cycle/);
    expect(() => treeLevels([node('orphan', ['missing'])])).toThrow(/missing parent/);
    expect(() => treeLevels([node('same'), node('same')])).toThrow(/Duplicate/);
  });

  it('renders growing branch and category collections without fixed slots or coordinates', () => {
    const branches: TreeBranch[] = Array.from({ length: 17 }, (_, index) => ({
      id: `branch-${index}`,
      title: `Branch ${index}`,
      category: `Category ${index % 4}`,
      description: 'A new effect',
      illustration: '',
      progress: '',
      layout: 'tiers',
      nodes: [
        node(`base-${index}`),
        ...Array.from({ length: 5 }, (_, path) => node(`path-${index}-${path}`, [`base-${index}`])),
      ],
    }));
    const options = {
      title: 'Tree',
      eyebrow: 'Test',
      mark: 'spirit' as const,
      introduction: '',
      summary: [],
      branches,
      view: { category: 'all', query: '' },
    };
    const html = progressionMenu(options);
    expect(html.match(/data-tree-branch=/g)).toHaveLength(1);
    expect(html.match(/data-tree-branch-select=/g)).toHaveLength(17);
    expect(html.match(/data-node=/g)).toHaveLength(6);
    expect(
      progressionMenu({ ...options, view: { ...options.view, overview: true } }).match(
        /class="patron-overview-card"/g,
      ),
    ).toHaveLength(17);
    expect(
      progressionMenu({ ...options, view: { category: 'Category 1', query: 'Branch 1' } }).match(
        /data-tree-branch=/g,
      ),
    ).toHaveLength(1);
    expect(
      progressionMenu({ ...options, view: { category: 'all', query: 'no such effect' } }),
    ).toContain('No branches match');
    const escaped = progressionMenu({
      ...options,
      view: { category: 'all', query: '\"><img src=x>' },
    });
    expect(escaped).not.toContain('<img src=x>');
  });

  it('shows all patrons with connected foundations, practices, and capstones', () => {
    const run = createRun();
    run.pendingUpgrades = 2;
    run.upgrades.power = 1;
    const branches = researchBranches(run);
    expect(branches).toHaveLength(PATRONS.length);
    expect(branches.flatMap((entry) => entry.nodes)).toHaveLength(UPGRADES.length);
    for (const branch of branches)
      expect(treeLevels(branch.nodes).map((level) => level.length)).toEqual(
        branch.id === 'khukhedei-mergen' ? [1, 3, 3] : [1, 2, 2],
      );
    const archer = branches.find((entry) => entry.id === 'khukhedei-mergen')!;
    expect(archer.nodes.find((n) => n.id === 'haste')?.status).toBe('available');
    expect(archer.nodes.find((n) => n.id === 'sky-volley')?.status).toBe('locked');
    expect(archer.nodes[0]?.progress).toBe('1 / 2 ranks learned');
    run.upgrades.power = 2;
    expect(
      researchBranches(run)
        .find((b) => b.id === archer.id)!
        .nodes.find((n) => n.id === 'piercing-shaft')?.status,
    ).toBe('available');
    run.pendingUpgrades = 0;
    expect(
      researchBranches(run)
        .flatMap((entry) => entry.nodes)
        .some((entry) => entry.status === 'available'),
    ).toBe(false);
  });
  it('deduplicates multi-parent route costs, includes required ranks, and renders actual edges', () => {
    const root = { ...node('root'), ranks: { current: 1, max: 2 }, price: { knowledge: 1 } };
    const left = { ...node('left', ['root']), price: { knowledge: 1 } };
    const right = { ...node('right', ['root']), price: { knowledge: 1 } };
    const final = {
      ...node('final', ['root', 'left', 'right']),
      ranks: { current: 0, max: 1 },
      price: { knowledge: 2 },
      prerequisites: [{ id: 'root', title: 'Root', current: 1, rank: 2 }],
    };
    const branch: TreeBranch = {
      id: 'test',
      title: 'Test',
      description: '',
      category: '',
      illustration: '',
      progress: '',
      layout: 'tiers',
      nodes: [root, left, right, final],
    };
    expect(treeRoute(branch, final).price.knowledge).toBe(5);
    expect(treeRoute(branch, final).nodes.map((n) => n.id)).toEqual([
      'root',
      'left',
      'right',
      'final',
    ]);
    const html = branchMarkup(branch, { selectedNode: 'final' });
    expect(html).toContain('data-edge-from="left" data-edge-to="final"');
    expect(html).toContain('data-edge-from="right" data-edge-to="final"');
    expect(html).not.toContain('data-edge-from="root" data-edge-to="final"');
    expect(html).not.toContain('data-research=');
    expect(nodeInspector(branch, final)).toContain('5 knowledge points');
  });

  it('distinguishes missing prerequisites, insufficient points, mastery, and excluded choices', () => {
    const run = createRun();
    run.phase = 'upgrade';
    run.pendingUpgrades = 0;
    let nodes = researchBranches(run).flatMap((b) => b.nodes);
    expect(nodes.find((n) => n.id === 'power')?.status).toBe('unaffordable');
    expect(nodes.find((n) => n.id === 'sky-volley')?.status).toBe('locked');
    run.upgrades = { power: 2, haste: 1, 'one-perfect-shot': 1 };
    nodes = researchBranches(run).flatMap((b) => b.nodes);
    expect(nodes.find((n) => n.id === 'power')?.status).toBe('learned');
    expect(nodes.find((n) => n.id === 'sky-volley')?.status).toBe('excluded');
  });
});
