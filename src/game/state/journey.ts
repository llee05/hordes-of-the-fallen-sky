import { LOCATIONS, REGIONS, type MigrationLocation } from '../data/clan';
import type { RunState } from '../types';

export function locationById(id: string): MigrationLocation | undefined {
  return LOCATIONS.find((location) => location.id === id);
}

export function chapterLocation(region: number): MigrationLocation {
  return locationById(REGIONS[region]!.id)!;
}

export function currentLocation(run: RunState): MigrationLocation {
  return (
    (run.clan.locationId && locationById(run.clan.locationId)) || chapterLocation(run.clan.region)
  );
}

export function arrivalLocation(run: RunState): MigrationLocation {
  return (
    (run.clan.destinationId && locationById(run.clan.destinationId)) ||
    chapterLocation(Math.min(REGIONS.length - 1, run.clan.region + 1))
  );
}

/** Two freely chosen camp stops precede the original, explicitly fictional final refuge. */
export function availableDestinations(run: RunState): readonly MigrationLocation[] {
  if (run.clan.stage !== 'camp' || run.clan.region >= REGIONS.length - 1) return [];
  const next = chapterLocation(run.clan.region + 1);
  if (run.clan.region === REGIONS.length - 2) return [next];
  const visited = new Set(run.story.crossings.map((crossing) => crossing.locationId));
  return [
    next,
    ...LOCATIONS.filter(
      (location) =>
        location.context && location.id !== currentLocation(run).id && !visited.has(location.id),
    ),
  ];
}
