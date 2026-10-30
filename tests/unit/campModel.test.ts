import { describe, expect, it } from 'vitest';
import { createRun } from '../../src/game/state/run';
import { buildingMenu } from '../../src/ui/campModel';
import { purchaseNomadicBuilding } from '../../src/game/state/nomadicCamp';
const view = { category: 'all', query: '' };
describe('nomadic manuscript camp and shared purchase inspector', () => {
  it('renders five permanent households and five empty places without changing the snapshot', () => {
    const run = createRun(),
      before = structuredClone(run);
    const html = buildingMenu(run, view);
    expect(html).toContain('aria-label="Painted manuscript map of the camp"');
    expect(html).toContain('aria-label="Permanent core buildings"');
    expect(html.match(/data-camp-site=/g)).toHaveLength(5);
    expect(html.match(/data-camp-slot=/g)).toHaveLength(5);
    expect(html).toContain('camp-plaque-badge');
    expect(html).not.toContain('class="camp-popup');
    expect(html).not.toContain('Internal developments');
    expect(run).toEqual(before);
  });
  it('offers fourteen distinct optional choices in an empty location and commits none on inspection', () => {
    const run = createRun(),
      before = structuredClone(run);
    const html = buildingMenu(run, { ...view, campPopup: true, campTarget: 'slot', campSlot: 2 });
    expect(html.match(/class="camp-building-choice"/g)).toHaveLength(14);
    expect(html).toContain('data-nomadic-slot="2"');
    expect(html).toContain('Sacred Ovoo');
    expect(html).toContain('Smith&#39;s Forge');
    expect(run).toEqual(before);
  });
  it('uses actual construction costs, effects and affordability without granting resources or knowledge', () => {
    const run = createRun();
    run.clan.materials = 0;
    const before = structuredClone(run);
    const html = buildingMenu(run, {
      ...view,
      campPopup: true,
      campTarget: 'building',
      nomadicSelection: 'archery-range',
      campSlot: 1,
    });
    expect(html).toContain('data-nomadic-purchase="archery-range"');
    expect(html).toContain('data-nomadic-slot="1"');
    expect(html).toContain('24 materials');
    expect(html).toContain('Gather more resources');
    expect(html).toContain('Shared attack damage');
    expect(html).toContain('disabled');
    expect(run).toEqual(before);
  });
  it('reflects headquarters prerequisites and shows unsupported effects explicitly as planned', () => {
    const run = createRun();
    run.phase = 'building';
    run.clan.materials = 1000;
    run.clan.spirit = 100;
    expect(purchaseNomadicBuilding(run, 'archery-range', 0)).toBe(true);
    const html = buildingMenu(run, {
      ...view,
      campPopup: true,
      campTarget: 'building',
      nomadicSelection: 'archery-range',
    });
    expect(html).toContain('Requires Khan&#39;s Ger level 2');
    expect(html).toContain('Building level 1 / 3');
    const planned = buildingMenu(run, {
      ...view,
      campPopup: true,
      campTarget: 'building',
      nomadicSelection: 'trading-post',
    });
    expect(planned).toContain('Planned · trade rates');
  });
  it('removes an owned option from the empty-slot list and reflects every level visual and completion', () => {
    const run = createRun();
    run.phase = 'building';
    run.clan.materials = 1000;
    run.clan.spirit = 100;
    purchaseNomadicBuilding(run, 'khans-ger');
    purchaseNomadicBuilding(run, 'khans-ger');
    for (let rank = 1; rank <= 3; rank++) {
      expect(purchaseNomadicBuilding(run, 'healers-ger', 3)).toBe(true);
      const html = buildingMenu(run, {
        ...view,
        campPopup: true,
        campTarget: 'building',
        nomadicSelection: 'healers-ger',
      });
      expect(html).toContain(`data-visual-level="${rank}"`);
      expect(html).toContain(`camp-scene/healers-ger-${rank}.webp`);
      expect(html).toContain(`Building level ${rank} / 3`);
      if (rank === 3) {
        expect(html).toContain('All building levels completed');
        expect(html).toContain('Maximum level reached');
      }
    }
    const choices = buildingMenu(run, {
      ...view,
      campPopup: true,
      campTarget: 'slot',
      campSlot: 0,
    });
    expect(choices.match(/class="camp-building-choice"/g)).toHaveLength(13);
  });
  it('normalizes accents and safely escapes unmatched search text', () => {
    const run = createRun();
    const found = buildingMenu(run, {
      ...view,
      query: 'héaler',
      campPopup: true,
      campTarget: 'search',
    });
    expect(found.match(/class="camp-building-choice"/g)).toHaveLength(1);
    expect(found).toContain('data-nomadic-site="healers-ger"');
    const missing = buildingMenu(run, {
      ...view,
      query: '"><img src=x>',
      campPopup: true,
      campTarget: 'search',
    });
    expect(missing).not.toContain('<img src=x>');
    expect(missing).toContain('No matching buildings');
  });
  it('keeps economy and combination content selectable without changing the paused run', () => {
    const run = createRun(),
      before = structuredClone(run);
    expect(buildingMenu(run, { ...view, campPopup: true, campTarget: 'economy' })).toContain(
      'aria-label="Camp economy"',
    );
    const combinations = buildingMenu(run, { ...view, campPopup: true, recipes: true });
    expect(combinations).toContain('Burning Tempest');
    expect(combinations).toContain('fletchers-workshop');
    expect(combinations).not.toContain('Established Encampment');
    expect(run).toEqual(before);
  });
});
