import { BUILDINGS } from '../data/clan';
import type { BuildingId, RunState } from '../types';

export const CAMP_SITES: Record<BuildingId, { x: number; y: number }> = {
  ger: { x: -64, y: 0 },
  archery: { x: -130, y: -35 },
  herd: { x: -25, y: 100 },
  sanctuary: { x: 128, y: 58 },
  wagon: { x: 100, y: 0 },
  felt: { x: -190, y: -75 },
  provisions: { x: 178, y: -70 },
  relay: { x: 185, y: 75 },
};

export const CAMP_LIFE_LIMITS = { workers: 24, horses: 10 } as const;

export function campWorkers(run: RunState): BuildingId[] {
  const work: BuildingId[] = [];
  const visible = Math.min(CAMP_LIFE_LIMITS.workers, run.clan.population);
  for (const building of BUILDINGS) {
    if (!run.clan.buildings[building.id]) continue;
    for (let i = 0; i < building.workers && work.length < visible; i++) work.push(building.id);
  }
  while (work.length < visible) work.push('ger');
  return work;
}

export function campShelters(run: RunState): { x: number; y: number }[] {
  const improved = (run.clan.paths.ger?.length ?? 0) > 0;
  const count = Math.min(
    6,
    Math.max(improved ? 4 : 2, 2 + Math.floor(Math.max(0, run.clan.population - 8) / 6)),
  );
  return [
    CAMP_SITES.ger,
    { x: 65, y: 28 },
    { x: -110, y: 55 },
    { x: 110, y: -55 },
    { x: -65, y: -100 },
    { x: 55, y: 100 },
  ].slice(0, count);
}

/** A representative's route joins a workplace to the shared stores. No additional economy is simulated. */
export function campWorkerPosition(
  run: RunState,
  index: number,
  job: BuildingId,
  travelling = run.clan.stage === 'migration',
): { x: number; y: number } {
  const column = index % 6;
  const row = Math.floor(index / 6);
  if (travelling) return { x: -150 + column * 43, y: 72 + row * 21 };
  const site = CAMP_SITES[job];
  const offset = (column - 2.5) * 17;
  const store = { x: -35 + column * 23, y: 80 + row * 19 };
  const target = { x: site.x + offset, y: site.y + 35 + row * 10 };
  const cycle = (run.elapsed + index * 1.73) % 16;
  const progress = cycle < 4 ? cycle / 4 : cycle < 10 ? 1 : cycle < 14 ? 1 - (cycle - 10) / 4 : 0;
  return {
    x: store.x + (target.x - store.x) * progress,
    y: store.y + (target.y - store.y) * progress,
  };
}

export function campHorsePosition(run: RunState, index: number): { x: number; y: number } {
  if (run.clan.stage === 'migration')
    return { x: -105 + (index % 5) * 48, y: 140 + Math.floor(index / 5) * 32 };
  return {
    x: -110 + (index % 5) * 48 + Math.sin(run.elapsed * 0.16 + index) * 10,
    y: 132 + Math.floor(index / 5) * 35,
  };
}
