import { describe, expect, it } from 'vitest';
import { BUILDINGS } from '../../src/game/data/clan';
import { buildingBlocker, buildStructure } from '../../src/game/state/clan';
import { developmentPreview } from '../../src/game/state/developmentPreview';
import { economyForecast } from '../../src/game/state/economy';
import { createRun } from '../../src/game/state/run';
import { clanWarning } from '../../src/game/state/guidance';
import { buildingMenu } from '../../src/ui/campModel';
import { developmentOutlook, foodOutlook, signedRate } from '../../src/ui/economyContent';
import { routeMenu } from '../../src/ui/menuContent';

describe('economy planning interfaces', () => {
  it('previews actual data-defined purchases without granting resources, guidance, or memories', () => {
    const run = createRun();
    delete run.clan.estate; // Legacy craft-price and effect contract.
    run.phase = 'building';
    run.clan.materials = 5000;
    run.clan.spirit = 5000;
    run.clan.population = 110;
    let purchases = 0;
    for (const building of BUILDINGS) {
      for (const path of [undefined, ...building.paths.map((entry) => entry.id)]) {
        if (buildingBlocker(run, building.id, path)) continue;
        const before = structuredClone(run);
        const preview = developmentPreview(run, building.id, path)!;
        expect(run).toEqual(before);
        expect(buildStructure(run, building.id, path)).toBe(true);
        expect(preview.after).toEqual(economyForecast(run));
        expect(preview.foodGift).toBe(run.clan.food - before.clan.food);
        purchases += 1;
      }
    }
    expect(purchases).toBeGreaterThan(25);
  });

  it('allows planning an unaffordable craft while respecting prerequisites, workers, and exclusions', () => {
    const run = createRun();
    run.phase = 'building';
    run.clan.materials = 0;
    const before = structuredClone(run);
    expect(developmentPreview(run, 'herd')?.after.foodNet).toBeCloseTo(1.1);
    expect(run).toEqual(before);
    expect(buildStructure(run, 'herd')).toBe(false);
    expect(developmentPreview(run, 'herd', 'winter-stores')).toBeUndefined();
    run.clan.population = 1;
    expect(developmentPreview(run, 'herd')).toBeUndefined();
    run.clan.population = 8;
    run.clan.materials = 500;
    buildStructure(run, 'herd');
    expect(developmentOutlook(run, 'herd', 'remount-herds')).toContain(
      'Crossing food (route range)',
    );
    buildStructure(run, 'herd', 'winter-stores');
    expect(developmentPreview(run, 'herd', 'remount-herds')).toBeUndefined();
    expect(developmentPreview(run, 'herd', 'winter-stores')).toBeUndefined();
    expect(developmentPreview(run, 'herd', 'dairy-reserves')?.foodGift).toBe(25);
  });

  it('shows both helpful production and the extra mouths welcomed by households', () => {
    const run = createRun();
    expect(developmentOutlook(run, 'herd')).toContain('Food net +0.45/s → +1.10/s');
    expect(developmentOutlook(run, 'ger', 'hearthkeepers')).toContain('Food net +0.45/s → +0.30/s');
    expect(developmentOutlook(run, 'ger', 'hearthkeepers')).toContain(
      'Materials +0.42/s → +0.53/s',
    );
    run.phase = 'building';
    buildStructure(run, 'herd');
    expect(developmentOutlook(run, 'herd', 'winter-stores')).toContain('+45 food now');
    expect(developmentOutlook(run, 'herd', 'winter-stores')).toContain(
      'Food net +1.10/s → +1.20/s',
    );
    expect(developmentOutlook(run, 'herd', 'winter-stores')).toContain(
      'Crossing food (route range)',
    );
    const before = structuredClone(run);
    const html = buildingMenu(run, { category: 'all', query: '' }, 'herd');
    expect(html).toContain('aria-label="Camp economy"');
    expect(html).toContain('tree-node-forecast');
    expect(html).toContain('changing pasture');
    expect(run).toEqual(before);
  });

  it('separates crossing provisions from arrival rewards and keeps risky routes selectable', () => {
    const run = createRun();
    run.clan.food = 1;
    const before = structuredClone(run);
    const html = routeMenu(run);
    expect(html).toContain('Food needed en route ~13.9');
    expect(html).toContain('Food after arrival ~35.0');
    expect(html.match(/Food runs out before arrival/g)).toHaveLength(3);
    expect(html).not.toContain('disabled');
    expect(run).toEqual(before);
  });

  it('describes each stage, empty stores, sustained grazing, and rounded rates', () => {
    const run = createRun();
    expect(foodOutlook(run)).toContain('~11:32');
    run.clan.stage = 'final';
    expect(foodOutlook(run)).toBe('Food lasts to passage');
    run.clan.stage = 'migration';
    run.clan.routeId = 'river';
    expect(foodOutlook(run)).toBe('Food lasts to arrival');
    run.clan.food = 0;
    expect(foodOutlook(run)).toBe('Stores empty');
    run.clan.food = 70;
    run.clan.stage = 'camp';
    run.patrons.land.pastureUse = 0;
    expect(foodOutlook(run)).toBe('Stores sustained');
    expect(signedRate(-0.001)).toBe('0.00/s');
  });

  it('warns about an imminent shortage with large stores and leaves urgent loss warnings first', () => {
    const run = createRun();
    run.clan.population = 120;
    run.clan.food = 20;
    expect(clanWarning(run)).toContain('Food will run out soon');
    run.clan.stage = 'migration';
    run.clan.routeId = 'river';
    expect(clanWarning(run)).toContain('before arrival');
    run.clan.stage = 'final';
    expect(clanWarning(run)).toContain('before the passage');
    run.clan.integrity = 20;
    expect(clanWarning(run)).toContain('resolve is critical');
  });
});
