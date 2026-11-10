import { GAME } from '../config';
import { ORKHON_ENEMY_CAMPS, ORKHON_FIELD_SITES } from '../data/orkhonValley';
import type { TerrainPoint } from '../terrain/types';
import type { LocationId } from '../types';

/** Authored landmark sites, camp-relative, for locations with a hand-made level. */
const FIELD_SITES: Partial<Record<LocationId, readonly TerrainPoint[]>> = {
  'orkhon-valley': ORKHON_FIELD_SITES,
};
const RAIDER_CAMPS: Partial<Record<LocationId, readonly TerrainPoint[]>> = {
  'orkhon-valley': ORKHON_ENEMY_CAMPS,
};

/** World position of the landmark hosting the next field objective, if the level authors one. */
export function authoredFieldSite(location: LocationId, issued: number): TerrainPoint | undefined {
  const sites = FIELD_SITES[location];
  if (!sites?.length) return undefined;
  const site = sites[issued % sites.length]!;
  return { x: GAME.worldSize / 2 + site.x, y: GAME.worldSize / 2 + site.y };
}

/**
 * Bearing for an ordinary arrival. Authored levels send arrivals from the direction of a raider
 * camp; every other location keeps the uniform random bearing with the same single draw.
 */
export function ambientArrivalAngle(
  location: LocationId,
  anchor: TerrainPoint,
  random: () => number = Math.random,
): number {
  const camps = RAIDER_CAMPS[location];
  if (!camps?.length) return random() * Math.PI * 2;
  const camp = camps[Math.floor(random() * camps.length)]!;
  const spread = (random() - 0.5) * 0.9;
  return (
    Math.atan2(GAME.worldSize / 2 + camp.y - anchor.y, GAME.worldSize / 2 + camp.x - anchor.x) +
    spread
  );
}
