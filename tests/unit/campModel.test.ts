import { describe, expect, it } from 'vitest';
import { createRun } from '../../src/game/state/run';
import { buildStructure } from '../../src/game/state/clan';
import { buildingMenu } from '../../src/ui/campModel';
import { estateBranch } from '../../src/ui/campPopups';
const view = { category: 'all', query: '' };
describe('immersive painted camp and anchored parchments', () => {
  it('opens as one painting with a central encampment, established homes, and selectable plots', () => {
    const run = createRun(),
      before = structuredClone(run);
    const html = buildingMenu(run, view, 'ger');
    expect(html).toContain('immersive-camp');
    expect(html).toContain('data-camp-encampment');
    expect(html.match(/data-camp-slot=/g)).toHaveLength(5);
    expect(html.match(/data-camp-site=/g)).toHaveLength(1);
    expect(html).not.toContain('class="camp-popup');
    expect(html).not.toContain('camp-tree-workspace');
    expect(html).not.toContain('class="node-inspector');
    expect(run).toEqual(before);
  });
  it('inspects locked upgrades without spending resources and uses a foldout for exclusive branches', () => {
    const run = createRun();
    run.phase = 'building';
    const before = structuredClone(run);
    const html = buildingMenu(
      run,
      {
        ...view,
        campPopup: true,
        campTarget: 'building',
        expanded: true,
        node: 'archery-fire-arrows',
      },
      'archery',
    );
    expect(html).toContain('camp-popup-foldout');
    expect(html).toContain('data-tree-branch="archery"');
    expect(html).toContain('Establish Archery grounds first');
    expect(html).toContain('camp-level-fork');
    expect(html).toContain('Veteran riders');
    expect(run).toEqual(before);
  });
  it('reflects real legacy choices, resource blockers, and excluded descendants', () => {
    const run = createRun();
    delete run.clan.estate;
    run.phase = 'building';
    run.clan.materials = 500;
    run.clan.spirit = 100;
    expect(buildStructure(run, 'archery')).toBe(true);
    expect(buildStructure(run, 'archery', 'fire-arrows')).toBe(true);
    const html = buildingMenu(
      run,
      {
        ...view,
        campPopup: true,
        campTarget: 'building',
        expanded: true,
        node: 'archery-veteran-riders',
      },
      'archery',
    );
    expect(html).toMatch(/data-camp-site="archery"[^>]*data-established="true"[^>]*data-level="4"/);
    expect(html).toMatch(/data-node="archery-arban-drills"[^>]*data-status="excluded"/);
    expect(html).toContain('Another path chosen');
    expect(html).toContain('data-camp-craft="fire-arrows"');
  });
  it('finds crafts without accents and safely escapes unmatched search text', () => {
    const run = createRun();
    const found = buildingMenu(
      run,
      { ...view, query: 'ortoo', campPopup: true, campTarget: 'search' },
      'ger',
    );
    expect(found).toContain('data-camp-site="relay"');
    expect(found).not.toContain('data-camp-site="archery"');
    const missing = buildingMenu(
      run,
      { ...view, query: '"><img src=x>', campPopup: true, campTarget: 'search' },
      'ger',
    );
    expect(missing).not.toContain('<img src=x>');
    expect(missing).toContain('No matching crafts');
  });
  it('previews central and internal purchases through the same real validated effects', () => {
    const run = createRun();
    run.phase = 'building';
    run.clan.materials = 500;
    run.clan.spirit = 100;
    const before = structuredClone(run);
    const tier = estateBranch(run, 'encampment').nodes[1]!;
    expect(tier.status).toBe('available');
    expect(tier.preview?.some((p) => p.label === 'Material gathering')).toBe(true);
    const council = estateBranch(run, 'internal', 'clan-council');
    expect(council.nodes[0]?.preview?.some((p) => p.label === 'Food net')).toBe(true);
    expect(run).toEqual(before);
  });
});
