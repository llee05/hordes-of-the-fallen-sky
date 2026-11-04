import { describe, expect, it } from 'vitest';
import { BUILDINGS, type BuildingDefinition } from '../../src/game/data/clan';
import { buildStructure } from '../../src/game/state/clan';
import { campBranches } from '../../src/ui/campContent';
import {
  treeRoute,
  branchMarkup,
  nodeInspector,
  progressionMenu,
  treeLevels,
  type TreeBranch,
  type TreeNode,
} from '../../src/ui/progressionTree';
import { createLegacyCampRun as createRun } from '../support/legacyCamp';

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
  it('deduplicates multi-parent route costs, includes required ranks, and renders actual edges', () => {
    const root = { ...node('root'), ranks: { current: 1, max: 2 }, price: { materials: 1 } };
    const left = { ...node('left', ['root']), price: { materials: 1 } };
    const right = { ...node('right', ['root']), price: { materials: 1 } };
    const final = {
      ...node('final', ['root', 'left', 'right']),
      ranks: { current: 0, max: 1 },
      price: { materials: 2 },
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
    expect(treeRoute(branch, final).price.materials).toBe(5);
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
    expect(nodeInspector(branch, final)).toContain('5 materials');
  });
});
