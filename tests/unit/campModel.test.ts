import { describe, expect, it } from 'vitest';
import { createRun } from '../../src/game/state/run';
import { buildStructure } from '../../src/game/state/clan';
import { buildingMenu } from '../../src/ui/campModel';

const view = { category: 'all', query: '' };

describe('camp miniature and development inspector', () => {
  it('inspects sites without spending resources or advancing the paused expedition', () => {
    const run = createRun();
    run.phase = 'building';
    const before = structuredClone(run);
    const html = buildingMenu(run, { ...view, node: 'archery-fire-arrows' }, 'archery');
    expect(html.match(/data-camp-site=/g)).toHaveLength(8);
    expect(html.match(/data-tree-branch=/g)).toHaveLength(1);
    expect(html).toContain('data-tree-branch="archery"');
    expect(html).toContain('Establish Archery grounds first');
    expect(run).toEqual(before);
  });

  it('reflects actual purchases, resource blockers, and excluded descendants in the selected site', () => {
    const run = createRun();
    delete run.clan.estate; // Legacy craft-price and effect contract.
    run.phase = 'building';
    run.clan.materials = 500;
    run.clan.spirit = 100;
    expect(buildStructure(run, 'archery')).toBe(true);
    expect(buildStructure(run, 'archery', 'fire-arrows')).toBe(true);
    const html = buildingMenu(run, { ...view, node: 'archery-veteran-riders' }, 'archery');
    expect(html).toMatch(/data-camp-site="archery"[^>]*data-established="true"[^>]*data-level="1"/);
    expect(html).toMatch(/data-node="archery-veteran-riders"[^>]*data-status="excluded"/);
    expect(html).toContain('Another path chosen');
    run.clan.materials = 0;
    expect(buildingMenu(run, view, 'felt')).toContain('Gather more resources');
  });

  it('finds crafts with accent-insensitive search while retaining the full camp', () => {
    const run = createRun();
    const found = buildingMenu(run, { ...view, query: 'ortoo' }, 'ger');
    expect(found).toContain('data-tree-branch="relay"');
    expect(found.match(/data-camp-site=/g)).toHaveLength(8);
    expect(found).toContain('1 matching site');
    const missing = buildingMenu(run, { ...view, query: '"><img src=x>' }, 'ger');
    expect(missing).not.toContain('<img src=x>');
    expect(missing).not.toContain('data-node=');
    expect(missing).toContain('No matching sites');
    expect(buildingMenu(run, view, 'retired-id')).toContain('data-tree-branch="ger"');
  });
  it('compares exclusive alternatives and their closed descendants before purchase', () => {
    const run = createRun();
    const html = buildingMenu(run, { ...view, node: 'ger-hearthkeepers', expanded: true }, 'ger');
    expect(html).toContain('choice-comparison');
    expect(html).toContain('Closes: Refugee beacons, Household apprentices');
    expect(html).toContain('camp-building-nav');
    expect(html.match(/data-camp-site=/g)).toHaveLength(8);
    run.phase = 'building';
    run.clan.materials = 100;
    buildStructure(run, 'ger', 'hearthkeepers');
    expect(buildingMenu(run, view, 'ger')).toContain('data-camp-craft="hearthkeepers"');
  });
});
