import { describe, expect, it } from 'vitest';
import { areaIntel } from '../../src/ui/areaContent';
import { AREA_ENCOUNTERS } from '../../src/game/data/areaEncounters';
import { AREA_ENEMIES } from '../../src/game/data/enemies';
import { createRun } from '../../src/game/state/run';
import { routeMenu } from '../../src/ui/migrationContent';
import { journalMenu } from '../../src/ui/menuContent';
import type { LocationId } from '../../src/game/types';

describe('local threat planning', () => {
  it.each(Object.keys(AREA_ENCOUNTERS) as LocationId[])(
    'describes %s natives, counterplay, and shared enemies',
    (id) => {
      const html = areaIntel(id);
      expect(html).toContain(AREA_ENCOUNTERS[id].counter);
      for (const key of AREA_ENCOUNTERS[id].natives)
        expect(html).toContain(AREA_ENEMIES.find((e) => e.id === key)!.title);
      expect(html).toContain('Shared unreturned');
      expect(html).toContain('Hollow wolf');
      expect(html).toContain('art/steppe-actors.png');
      expect(html.match(/class="local-enemy"/g)).toHaveLength(2);
    },
  );
  it('previews a destination without replacing the current physical roster or changing the run', () => {
    const r = createRun();
    r.phase = 'route';
    r.clan.stageTime = 45;
    const before = structuredClone(r),
      preview = routeMenu(r, 'belukha');
    expect(preview).toContain('Frostwood prowler');
    expect(preview).toContain('Meltwater caller');
    expect(journalMenu(r, 'journey')).toContain('Thistle prowler');
    expect(journalMenu(r, 'journey')).not.toContain('Frostwood prowler');
    expect(r).toEqual(before);
  });
});
