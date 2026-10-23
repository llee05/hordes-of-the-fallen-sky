import { GAME } from '../config';
import { LOCATIONS, REGIONS, ROUTES } from '../data/clan';
import type { LocationId, RunState } from '../types';
import { advanceClan, beginMigration } from '../state/clan';
import { crossingDuration } from '../state/economy';
import { chapterLocation } from '../state/journey';
import { createRun, gainExperience } from '../state/run';
import { openNextStory } from '../state/story';

export interface DeveloperLevel {
  id: string;
  group: 'chapters' | 'crossings' | 'destinations';
  title: string;
  description: string;
  region: number;
  locationId: LocationId;
  routeId?: (typeof ROUTES)[number]['id'];
}

/** Every chapter, crossing approach, and optional camp under both playable chapter pressures. */
export const DEVELOPER_LEVELS: readonly DeveloperLevel[] = [
  ...REGIONS.map((chapter, region): DeveloperLevel => ({
    id: `chapter:${chapter.id}`,
    group: 'chapters',
    title: chapter.name,
    description: `Chapter ${region + 1} · ${chapter.event}`,
    region,
    locationId: chapter.id,
  })),
  ...REGIONS.slice(0, -1).flatMap((chapter, region) =>
    ROUTES.map((route): DeveloperLevel => ({
      id: `crossing:${chapter.id}:${route.id}`,
      group: 'crossings',
      title: `${chapterLocation(region + 1).name} · ${route.title}`,
      description: `Crossing ${region + 1} · ${route.description}`,
      region,
      locationId: chapter.id,
      routeId: route.id,
    })),
  ),
  ...[1, 2].flatMap((region) =>
    LOCATIONS.filter((location) => location.context).map((location): DeveloperLevel => ({
      id: `destination:${region + 1}:${location.id}`,
      group: 'destinations',
      title: location.name,
      description: `Chapter ${region + 1} · ${REGIONS[region]!.event}`,
      region,
      locationId: location.id,
    })),
  ),
];

/** Fresh test expeditions use the real journey rules; only the scene may activate them in DEV. */
export function createDeveloperRun(id: string): RunState | undefined {
  const level = DEVELOPER_LEVELS.find((entry) => entry.id === id);
  if (!level) return undefined;
  const run = createRun();
  run.phase = 'playing';
  run.story.enabled = false;
  run.guidance.enabled = false;
  Object.assign(run.clan, {
    food: GAME.developer.food,
    materials: GAME.developer.materials,
    spirit: GAME.developer.spirit,
    population: GAME.developer.population,
    herd: GAME.developer.herd,
  });
  run.legacy.khans[0]!.people = run.clan.population;
  for (let region = 0; region < level.region; region += 1) {
    run.elapsed += GAME.developer.campDuration;
    advanceClan(run, GAME.developer.campDuration);
    openNextStory(run);
    run.phase = 'route';
    const destination =
      region + 1 === level.region ? level.locationId : chapterLocation(region + 1).id;
    if (!beginMigration(run, 'river', destination)) return undefined;
    run.phase = 'playing';
    const duration = crossingDuration(run, ROUTES[0]);
    run.elapsed += duration;
    if (advanceClan(run, duration) !== 'arrived') return undefined;
  }
  if (run.clan.stage === 'camp') {
    run.elapsed += GAME.clan.minimumCamp;
    advanceClan(run, GAME.clan.minimumCamp);
  }
  openNextStory(run);
  if (level.routeId) {
    run.phase = 'route';
    if (!beginMigration(run, level.routeId)) return undefined;
    run.phase = 'playing';
  }
  for (let point = 0; point < GAME.developer.knowledgePoints; point += 1)
    gainExperience(run, run.nextLevelXp);
  run.clan.message = `Developer run · ${level.title}. F8 opens the level selector.`;
  return run;
}
