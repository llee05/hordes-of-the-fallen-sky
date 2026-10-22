import { describe, expect, it } from 'vitest';
import {
  progressionMenu,
  treeLevels,
  type TreeNode,
  type TreeBranch,
} from '../../src/ui/progressionTree';
import { researchBranches } from '../../src/ui/researchContent';
import { createRun } from '../../src/game/state/run';
import { UPGRADES } from '../../src/game/data/upgrades';

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
    expect(html.match(/data-tree-branch=/g)).toHaveLength(17);
    expect(html.match(/data-node=/g)).toHaveLength(102);
    expect(html.match(/data-tree-filter=/g)).toHaveLength(5);
    expect(
      progressionMenu({ ...options, view: { category: 'Category 1', query: 'Branch 1' } }).match(
        /data-tree-branch=/g,
      ),
    ).toHaveLength(2);
    expect(
      progressionMenu({ ...options, view: { category: 'all', query: 'no such effect' } }),
    ).toContain('No branches match');
    const escaped = progressionMenu({
      ...options,
      view: { category: 'all', query: '\"><img src=x>' },
    });
    expect(escaped).not.toContain('<img src=x>');
  });

  it('shows all authored ranks and only permits the next unlearned rank', () => {
    const run = createRun();
    run.pendingUpgrades = 2;
    run.upgrades.power = 1;
    const branches = researchBranches(run);
    expect(branches).toHaveLength(UPGRADES.length);
    const power = branches.find((entry) => entry.id === 'power')!;
    expect(power.nodes).toHaveLength(8);
    expect(power.nodes.slice(0, 3).map((entry) => entry.status)).toEqual([
      'learned',
      'available',
      'locked',
    ]);
    run.pendingUpgrades = 0;
    expect(
      researchBranches(run)
        .flatMap((entry) => entry.nodes)
        .some((entry) => entry.status === 'available'),
    ).toBe(false);
  });
});
