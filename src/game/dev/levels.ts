import {
  CHARACTER_CLASSES,
  normalizeCharacterProfile,
  type CharacterClassId,
  type CharacterProfile,
} from '../../shared/characterProfile';
import { GAME } from '../config';
import { classDefinition } from '../data/classes';
import { LOCATIONS, type StartingTraditionId } from '../data/clan';
import { PROLOGUE_STAGES, type PrologueStageId } from '../data/prologue';
import type { LocationId, RunState } from '../types';
import { advanceClan } from '../state/clan';
import { createPrologueRun, setPrologueStage } from '../state/prologue';
import { createRun, gainExperience } from '../state/run';

export interface DeveloperLevel {
  id: string;
  title: string;
  description: string;
  locationId: LocationId;
}

export interface DeveloperPrologueLevel {
  id: string;
  title: string;
  description: string;
  stage: PrologueStageId;
}

/** One fresh camp at each real place. */
export const DEVELOPER_LEVELS: readonly DeveloperLevel[] = LOCATIONS.map((location) => ({
  id: `place:${location.id}`,
  title: location.name,
  description: location.area,
  locationId: location.id,
}));

export const DEVELOPER_PROLOGUE_LEVELS: readonly DeveloperPrologueLevel[] = PROLOGUE_STAGES.map(
  (stage) => ({
    id: `prologue:${stage.id}`,
    title: `${stage.numeral} · ${stage.title}`,
    description: stage.summary,
    stage: stage.id,
  }),
);

function developerProfile(
  classId?: string,
  baseProfile?: CharacterProfile,
): CharacterProfile | undefined {
  if (classId === undefined) return baseProfile;
  if (!CHARACTER_CLASSES.includes(classId as CharacterClassId)) return;
  return {
    ...normalizeCharacterProfile(baseProfile),
    classId: classId as CharacterClassId,
  };
}

/** Fresh test expeditions use the real camp rules; only the scene may activate them in DEV. */
export function createDeveloperRun(
  id: string,
  classId?: string,
  baseProfile?: CharacterProfile,
): RunState | undefined {
  const profile = developerProfile(classId, baseProfile);
  if (classId !== undefined && !profile) return;
  const prologue = DEVELOPER_PROLOGUE_LEVELS.find((entry) => entry.id === id);
  if (prologue) {
    const run = createPrologueRun('shared-hearth', profile);
    setPrologueStage(run, prologue.stage);
    run.phase = 'playing';
    run.clan.message = `Developer prologue · ${prologue.title}. Stages II–V pass through in Phase 2.`;
    return run;
  }
  const level = DEVELOPER_LEVELS.find((entry) => entry.id === id);
  if (!level) return undefined;
  const run = createRun('shared-hearth', profile);
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
  const profile = developerProfile(classId, baseProfile);
  if (!profile) return undefined;
  const cls = classDefinition(profile.classId);
  const run = createRun(tradition, profile);
  run.phase = 'playing';
  run.clan.message = `Developer class run · ${cls.title} (${cls.weapon.title}). F8 switches classes or checkpoints.`;
  return run;
}
