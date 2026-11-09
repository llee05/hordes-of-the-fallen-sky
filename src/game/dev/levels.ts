import {
  CHARACTER_CLASSES,
  normalizeCharacterProfile,
  type CharacterClassId,
  type CharacterProfile,
} from '../../shared/characterProfile';
import { GAME } from '../config';
import { classDefinition } from '../data/classes';
import { LOCATIONS, type StartingTraditionId } from '../data/clan';
import type { LocationId, RunState } from '../types';
import { advanceClan } from '../state/clan';
import { createRun, gainExperience } from '../state/run';

export interface DeveloperLevel {
  id: string;
  title: string;
  description: string;
  locationId: LocationId;
}

/** One fresh camp at each real place. */
export const DEVELOPER_LEVELS: readonly DeveloperLevel[] = LOCATIONS.map((location) => ({
  id: `place:${location.id}`,
  title: location.name,
  description: location.area,
  locationId: location.id,
}));

/** Fresh test expeditions use the real camp rules; only the scene may activate them in DEV. */
export function createDeveloperRun(id: string): RunState | undefined {
  const level = DEVELOPER_LEVELS.find((entry) => entry.id === id);
  if (!level) return undefined;
  const run = createRun();
  run.phase = 'playing';
  run.guidance.enabled = false;
  Object.assign(run.clan, {
    locationId: level.locationId,
    food: GAME.developer.food,
    materials: GAME.developer.materials,
    spirit: GAME.developer.spirit,
    population: GAME.developer.population,
    herd: GAME.developer.herd,
  });
  Object.assign(run.legacy.khans[0]!, {
    locationId: level.locationId,
    people: run.clan.population,
  });
  run.elapsed += GAME.clan.minimumCamp;
  advanceClan(run, GAME.clan.minimumCamp);
  for (let point = 0; point < GAME.developer.experienceLevels; point += 1)
    gainExperience(run, run.nextLevelXp);
  run.clan.message = `Developer run · ${level.title}. F8 opens the level selector.`;
  return run;
}

/** Starts a fresh playable expedition as the specified class for testing in DEV. */
export function createDeveloperClassRun(
  classId: string,
  tradition: StartingTraditionId = 'shared-hearth',
  baseProfile?: CharacterProfile,
): RunState | undefined {
  if (!CHARACTER_CLASSES.includes(classId as CharacterClassId)) return undefined;
  const profile: CharacterProfile = {
    ...normalizeCharacterProfile(baseProfile),
    classId: classId as CharacterClassId,
  };
  const cls = classDefinition(profile.classId);
  const run = createRun(tradition, profile);
  run.phase = 'playing';
  run.clan.message = `Developer class run · ${cls.title} (${cls.weapon.title}). F8 switches classes or checkpoints.`;
  return run;
}
