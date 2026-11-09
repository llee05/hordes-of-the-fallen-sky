import { describe, expect, it } from 'vitest';
import { createLegacyCampRun as createRun } from '../support/legacyCamp';
import { LOCATIONS } from '../../src/game/data/clan';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import { advanceClan, beginMigration } from '../../src/game/state/clan';
import { damageKhan, advanceSuccession } from '../../src/game/state/khan';
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
    expect(mountain.match(/data-destination=/g)).toHaveLength(7);
    expect(mountain.match(/data-route=/g)).toHaveLength(3);
    expect(mountain).toContain('Food needed en route ~19.3');
    expect(mountain).toContain('Tian Shan');
    expect(mountain).toContain('Approach time +25%');
    expect(routeMenu(run, 'orkhon-valley')).toContain('Food needed en route ~14.7');
    expect(routeMenu(run, 'retired-place')).toContain('Bogd Khan Uul');
    expect(run).toEqual(before);
    for (const place of LOCATIONS.filter((location) => location.id !== 'otgontenger')) {
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
    expect(journalMenu(run, 'journey')).toContain('on the road to Orkhon Valley');
    expect(journalMenu(run, 'journey')).toContain('ON THE ROAD');
    run.phase = 'playing';
    advanceClan(run, 100);
    run.phase = 'route';
    run.clan.stageTime = 45;
    beginMigration(run, 'ridge', 'belukha');
    run.phase = 'playing';
    advanceClan(run, 100);
    expect(run.legacy.crossings.map((crossing) => crossing.locationId)).toEqual([
      'orkhon-valley',
      'belukha',
    ]);
    const before = structuredClone(run);
    const html = journalMenu(run, 'journey');
    expect(html).toContain('Orkhon Valley');
    expect(html).toContain('Mount Belukha (Üch-Sümer)');
    expect(html).toContain('CAMP 3');
    expect(html).toContain('REACHED');
    expect(html).not.toContain('Heart of the Steppe');
    expect(clanMemories(run)).toContain('reached Orkhon Valley');
    expect(run).toEqual(before);
    damageKhan(run, 1000);
    expect(khanRecords(run)).toContain('Fell in Mount Belukha (Üch-Sümer)');
    advanceSuccession(run, 10);
    expect(khanRecords(run)).toContain('Chosen in Mount Belukha (Üch-Sümer)');
  });

  it('gracefully handles a clan that is already on the road', () => {
    const run = createRun();
    run.clan.stage = 'migration';
    expect(routeMenu(run)).toContain('No departure available');
  });
});
