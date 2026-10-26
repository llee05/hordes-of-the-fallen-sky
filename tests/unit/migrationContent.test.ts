import { describe, expect, it } from 'vitest';
import { createRun } from '../../src/game/state/run';
import { LOCATIONS } from '../../src/game/data/clan';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import { advanceClan, beginMigration } from '../../src/game/state/clan';
import { damageKhan, advanceSuccession } from '../../src/game/state/khan';
import { locationAtChapter } from '../../src/game/state/journey';
import { routeMenu, destinationEffects } from '../../src/ui/migrationContent';
import { journalMenu } from '../../src/ui/menuContent';
import { clanMemories, khanRecords } from '../../src/ui/legacyContent';

describe('destination planning and remembered places', () => {
  it('renders all destinations with selected forecasts without changing the expedition', () => {
    const run = createRun();
    run.phase = 'route';
    run.clan.stageTime = 45;
    const before = structuredClone(run);
    const mountain = routeMenu(run, 'khan-tengri');
    expect(mountain.match(/data-destination=/g)).toHaveLength(9);
    expect(mountain.match(/data-route=/g)).toHaveLength(3);
    expect(mountain).toContain('Food needed en route ~17.4');
    expect(mountain).toContain('Tian Shan');
    expect(mountain).toContain('Approach time +25%');
    expect(routeMenu(run, 'orkhon-valley')).toContain('Food needed en route ~13.2');
    expect(routeMenu(run, 'retired-place')).toContain('The Silent River');
    expect(run).toEqual(before);
    for (const place of LOCATIONS.filter((location) => location.context)) {
      const menu = routeMenu(run, place.id);
      expect(menu).toContain(place.name);
      expect(menu).toContain(`data-landscape="${place.id}"`);
      expect(menu).toContain(LANDSCAPES[place.id].description);
      expect(menu).toContain('art/steppe-scenery-v2.png');
      expect(destinationEffects(place)).not.toBe('Ordinary gathering and travel');
    }
  });

  it('shows the actual current, travelling, visited, and future places in the chronicle', () => {
    const run = createRun();
    run.phase = 'route';
    run.clan.stageTime = 45;
    beginMigration(run, 'river', 'orkhon-valley');
    expect(locationAtChapter(run, 1).id).toBe('orkhon-valley');
    expect(journalMenu(run, 'journey')).toContain('on the road to Orkhon Valley');
    run.phase = 'playing';
    advanceClan(run, 100);
    run.phase = 'route';
    run.clan.stageTime = 45;
    beginMigration(run, 'ridge', 'belukha');
    run.phase = 'playing';
    advanceClan(run, 100);
    expect(locationAtChapter(run, 1).id).toBe('orkhon-valley');
    expect(locationAtChapter(run, 2).id).toBe('belukha');
    const before = structuredClone(run);
    const html = journalMenu(run, 'journey');
    expect(html).toContain('Orkhon Valley');
    expect(html).toContain('Mount Belukha (Üch-Sümer)');
    expect(html).toContain('The Heart of the Steppe');
    expect(clanMemories(run)).toContain('reached Orkhon Valley');
    expect(run).toEqual(before);
    damageKhan(run, 1000);
    expect(khanRecords(run)).toContain('Fell in Mount Belukha (Üch-Sümer)');
    advanceSuccession(run, 10);
    expect(khanRecords(run)).toContain('Chosen in Mount Belukha (Üch-Sümer)');
  });

  it('keeps the final fictional refuge explicit and gracefully handles an ended journey', () => {
    const run = createRun();
    run.clan.region = 2;
    const html = routeMenu(run);
    expect(html.match(/data-destination=/g)).toHaveLength(1);
    expect(html).toContain('fictional refuge');
    run.clan.stage = 'final';
    expect(routeMenu(run)).toContain('No departure available');
  });
});
