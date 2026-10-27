import { clanMark } from '../../src/ui/artwork';
import { RESEARCH_ICONS } from '../../src/ui/researchIcons';
import type { TreeViewState } from '../../src/ui/progressionTree';
import { describe, expect, it } from 'vitest';
import { researchBuildingModifiers } from '../../src/game/state/research';
import { createRun } from '../../src/game/state/run';
import { researchBranches, researchMenu, selectResearch } from '../../src/ui/researchContent';

describe('V2 research presentation', () => {
  it('exposes every canonical ID once and keeps unavailable nodes unpurchasable', () => {
    const r = createRun();
    r.pendingUpgrades = 100;
    const branches = researchBranches(r),
      nodes = branches.flatMap((b) => b.nodes);
    expect(branches).toHaveLength(10);
    expect(nodes).toHaveLength(166);
    expect(new Set(nodes.map((n) => n.id)).size).toBe(166);
    expect(nodes.find((n) => n.id === 'gen-mapmaker')?.reason).toContain('discovery pool');
    expect(nodes.find((n) => n.id === 'gen-mapmaker')?.status).toBe('locked');
    expect(nodes.find((n) => n.id === 'on-bond-of-ashes')?.reason).toContain('expiry lifecycle');
  });
  it('gives all 166 technologies unique icon keys and distinct rendered SVG art', () => {
    const nodes = researchBranches(createRun()).flatMap((b) => b.nodes);
    expect(new Set(nodes.map((n) => n.icon)).size).toBe(166);
    expect(Object.keys(RESEARCH_ICONS)).toHaveLength(166);
    for (const node of nodes) expect(RESEARCH_ICONS[node.id]).toBeDefined();
    const rendered = nodes.map((n) => clanMark(n.icon!));
    expect(new Set(rendered).size).toBe(166);
    for (const svg of rendered) expect(svg).not.toBe(clanMark('spirit'));
  });
  it.each(['wolf-trail', 'power', 'hy-galloping-barrage', 'gen-mapmaker'])(
    'opens %s from filtered prerequisites, routes, bridges and pinned targets',
    (id) => {
      const run = createRun();
      const view: TreeViewState = {
        category: 'Archery',
        query: 'Galloping Barrage',
        branch: 'hybrids',
        overview: true,
        recipes: true,
        confirmResearch: 'one-perfect-shot',
      };
      selectResearch(view, id);
      expect(view).toMatchObject({
        node: id,
        query: '',
        category: 'all',
        overview: false,
        recipes: false,
        confirmResearch: undefined,
      });
      const branch = researchBranches(run).find((b) => b.nodes.some((n) => n.id === id))!;
      expect(view.branch).toBe(branch.id);
      const html = researchMenu(run, view);
      expect(html).toContain(`data-tree-branch="${branch.id}"`);
      expect(html).toContain(`<h3>${branch.nodes.find((n) => n.id === id)!.title}</h3>`);
    },
  );
  it('separates legacy Fortress technology from the building modifier source', () => {
    const r = createRun();
    r.upgrades['rolling-fortress'] = 1;
    r.clan.campEffects.multipliers.wagonDamage = 1.5 * 1.25;
    expect(researchBuildingModifiers(r).multipliers.wagonDamage).toBe(1.25);
    expect(r.clan.campEffects.multipliers.wagonDamage).toBe(1.875);
  });
  it('shows sixteen distinct hybrid bridges and map zoom controls', () => {
    const html = researchMenu(createRun(), { category: 'all', query: '', overview: true });
    expect(html.match(/data-focus-key="bridge-/g) ?? []).toHaveLength(16);
    expect(html).toContain('Zoom research map in');
    expect(html).toContain('Early');
    expect(html).toContain('Advanced');
  });
  it('shows tier and ANY gates, separately labelled building modifiers, compact and pin controls', () => {
    const r = createRun();
    r.clan.campEffects.bonuses.range = 10;
    const html = researchMenu(r, {
      category: 'all',
      query: '',
      node: 'on-whispered-orders',
      branch: 'ongod',
      compact: true,
      pinned: 'on-whispered-orders',
    });
    expect(html).toContain('ANY:');
    expect(html).toContain('knowledge spent');
    expect(html).toContain('Building bonuses already included');
    expect(html).toContain('data-compact="true"');
    expect(html).toContain('Pinned: Whispered Orders');
  });
  it('displays a legal shared route with filler costs and an explicit irreversible confirmation', () => {
    const r = createRun();
    r.pendingUpgrades = 20;
    let html = researchMenu(r, {
      category: 'all',
      query: '',
      branch: 'hybrids',
      node: 'hy-galloping-barrage',
    });
    expect(html).toContain('6 knowledge points');
    r.upgrades = { power: 2, haste: 1 };
    html = researchMenu(r, {
      category: 'all',
      query: '',
      branch: 'khukhedei-mergen',
      node: 'one-perfect-shot',
      confirmResearch: 'one-perfect-shot',
    });
    expect(html).toContain('Confirm choice:');
    expect(html).toContain('irreversible choice');
  });
});
