import { LOCATIONS, type MigrationLocation } from '../data/clan';
import type { LocationId, RunState } from '../types';

/** Normal expeditions begin at Mount Otgontenger, the first real place in the catalogue. */
export const STARTING_LOCATION_ID: LocationId = 'otgontenger';

export function locationById(id: string): MigrationLocation | undefined {
  return LOCATIONS.find((location) => location.id === id);
}

export function currentLocation(run: RunState): MigrationLocation {
  return locationById(run.clan.locationId) ?? LOCATIONS[0]!;
}

/** Completed migrations; also the index of the clan's current camp along this expedition. */
export function completedMigrations(run: RunState): number {
  return run.legacy.crossings.length;
}

/** The chosen target while travelling, otherwise the first destination still open. */
export function arrivalLocation(run: RunState): MigrationLocation {
  return (
    (run.clan.destinationId && locationById(run.clan.destinationId)) ||
    availableDestinations(run)[0] ||
    currentLocation(run)
  );
}

/** While camped, the clan may migrate to any other real place, including ones it left before. */
export function availableDestinations(run: RunState): readonly MigrationLocation[] {
  if (run.clan.stage !== 'camp') return [];
  return LOCATIONS.filter((location) => location.id !== currentLocation(run).id);
}
