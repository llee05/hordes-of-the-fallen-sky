import { isRecord } from '../../shared/expeditionSave';
import { LOCATIONS } from '../data/clan';
import { ALL_ENEMIES } from '../data/enemies';
import type { LocationId } from '../types';

/**
 * Expeditions saved before the fictional chapter camps, crossings and the final stand were
 * retired. Each former chapter maps to a real place so the save still loads as a camp.
 */
const RETIRED_CHAPTER_PLACES: readonly LocationId[] = [
  'otgontenger',
  'orkhon-valley',
  'altai-tavan-bogd',
  'khan-tengri',
];
const RETIRED_LOCATIONS: Readonly<Record<string, LocationId>> = {
  'golden-pasture': RETIRED_CHAPTER_PLACES[0]!,
  'silent-river': RETIRED_CHAPTER_PLACES[1]!,
  'broken-pass': RETIRED_CHAPTER_PLACES[2]!,
  'heart-of-the-steppe': RETIRED_CHAPTER_PLACES[3]!,
};

function realPlace(id: unknown, chapter: unknown): LocationId {
  if (typeof id === 'string') {
    if (LOCATIONS.some((location) => location.id === id)) return id as LocationId;
    if (id in RETIRED_LOCATIONS) return RETIRED_LOCATIONS[id]!;
  }
  return (
    (typeof chapter === 'number' && RETIRED_CHAPTER_PLACES[chapter]) || RETIRED_CHAPTER_PLACES[0]!
  );
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

/**
 * Rewrites a retired save in place before validation. Returns false, changing nothing, when the
 * save already uses the current format. Values the retired features alone produced are dropped.
 */
export function migrateRetiredJourney(save: Record<string, unknown>): boolean {
  const run = save.run;
  if (!isRecord(run) || !isRecord(run.clan) || !('region' in run.clan)) return false;
  const clan = run.clan;
  const chapter = clan.region;
  clan.locationId = realPlace(clan.locationId, chapter);
  if (clan.destinationId !== undefined || clan.stage === 'migration')
    clan.destinationId = realPlace(
      clan.destinationId,
      typeof chapter === 'number' ? chapter + 1 : undefined,
    );
  if (clan.stage !== 'migration') delete clan.destinationId;
  if (clan.stage === 'final') clan.stage = 'camp';
  delete clan.region;
  delete clan.finalBossSpawned;
  delete clan.finalBossDefeated;
  delete run.crossing;
  delete run.finalStand;
  if (isRecord(save.summary)) {
    save.summary.location = LOCATIONS.find((location) => location.id === clan.locationId)!.name;
    save.summary.stage = clan.stage;
  }

  if (isRecord(run.safety)) {
    delete run.safety.protectedCrossings;
    for (const damage of [run.safety.lastDamage, run.safety.lastMajorLoss])
      if (isRecord(damage) && damage.cause === 'eruption') damage.cause = 'area';
  }
  if (isRecord(run.guidance) && Array.isArray(run.guidance.completed))
    run.guidance.completed = run.guidance.completed.map((step) =>
      step === 'crossing' ? 'journey' : step,
    );
  if (isRecord(run.metrics))
    for (const stage of records(run.metrics.stages))
      if (stage.stage === 'final') stage.stage = 'camp';
  if (isRecord(run.legacy)) {
    for (const khan of records(run.legacy.khans)) {
      khan.locationId = realPlace(khan.locationId, khan.region);
      if (khan.fallenAt !== undefined)
        khan.fallenLocationId = realPlace(khan.fallenLocationId, khan.fallenRegion);
      delete khan.region;
      delete khan.fallenRegion;
    }
    for (const entry of [...records(run.legacy.memories), ...records(run.legacy.crossings)]) {
      entry.locationId = realPlace(entry.locationId, entry.region);
      delete entry.region;
    }
  }

  const world = save.world;
  if (isRecord(world)) {
    if (isRecord(world.timers)) delete world.timers.hazardTimer;
    if (Array.isArray(world.enemies))
      world.enemies = records(world.enemies).filter((enemy) => {
        if (isRecord(enemy.state)) delete enemy.state.crossingId;
        return ALL_ENEMIES.some((definition) => definition.id === enemy.definition);
      });
    for (const shot of [...records(world.projectiles), ...records(world.hostileShots)])
      delete shot.barrage;
    if (Array.isArray(world.hazards))
      world.hazards = records(world.hazards).filter((hazard) => hazard.source === 'seer');
    if (isRecord(world.areaThreats) && Array.isArray(world.areaThreats.threats))
      world.areaThreats.threats = records(world.areaThreats.threats).filter(
        (threat) => threat.kind !== 'rift',
      );
  }
  return true;
}
