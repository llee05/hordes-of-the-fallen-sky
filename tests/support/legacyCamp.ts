import { createRun } from '../../src/game/state/run';
import { BUILDINGS, type StartingTraditionId } from '../../src/game/data/clan';
import { createCampEstate } from '../../src/game/state/campEstate';
import { createCampEffects } from '../../src/game/state/camp';
import type { BuildingId } from '../../src/game/types';

/** Explicit pre-nomadic checkpoint fixture for migration and isolated legacy-rule regression tests. */
export function createLegacyCampRun(tradition: StartingTraditionId = 'shared-hearth') {
  const run = createRun(tradition);
  delete run.clan.nomadicCamp;
  run.clan.estate = createCampEstate();
  run.clan.campEffects = createCampEffects();
  run.clan.buildings = Object.fromEntries(
    BUILDINGS.map((b) => [b.id, b.startsBuilt ? 1 : 0]),
  ) as Record<BuildingId, number>;
  run.clan.paths = {};
  return run;
}
