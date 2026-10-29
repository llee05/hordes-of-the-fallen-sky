import { GAME } from '../config';
import type { RunState } from '../types';
import { ownsResearch } from './researchRuntime';

export function constructionMaterials(
  run: RunState,
  establishing: boolean,
  materials: number,
): number {
  if (
    !establishing ||
    run.researchRuntime?.firstConstructionCrossing === run.story.crossings.length
  )
    return materials;
  let result = materials;
  if (ownsResearch(run, 'gu-fast-unpacking') && run.story.crossings.length > 0)
    result = Math.ceil(result * GAME.research.fastUnpackingCost);
  if (ownsResearch(run, 'gu-city-of-felt-and-wood'))
    result = Math.max(0, result - GAME.research.cityFreeMaterials);
  return result;
}
export function recordConstruction(run: RunState): void {
  (run.researchRuntime ??= {}).firstConstructionCrossing = run.story.crossings.length;
}
export function claimArrowPlatform(run: RunState, release: () => boolean): boolean {
  if (
    run.phase !== 'playing' ||
    !run.clan.buildings.wagon ||
    !ownsResearch(run, 'gu-arrow-platforms')
  )
    return false;
  if ((run.researchRuntime?.arrowPlatformAt ?? 0) > run.elapsed || !release()) return false;
  const r = (run.researchRuntime ??= {});
  r.arrowPlatformAt = run.elapsed + GAME.research.arrowPlatformEvery;
  return true;
}
export function circlingVolley(run: RunState, boss = false, roll = Math.random()): boolean {
  return (
    run.phase === 'playing' &&
    ownsResearch(run, 'gu-circling-volley') &&
    !boss &&
    roll < GAME.research.circlingVolleyChance
  );
}
export function wagonDamageMultiplier(run: RunState): number {
  return ownsResearch(run, 'gu-iron-rimmed-wagons') && run.clan.stage === 'migration'
    ? GAME.research.ironWagonDamage
    : 1;
}
export function wagonRangeMultiplier(run: RunState): number {
  return ownsResearch(run, 'gu-iron-rimmed-wagons') ? GAME.research.ironWagonRange : 1;
}
/** Re-entry is a new entry; periodic ward cadence remains independent. */
export function claimWardEntries(run: RunState, inside: string[]): string[] {
  if (run.phase !== 'playing') return [];
  const r = (run.researchRuntime ??= {}),
    previous = new Set(r.wardInside ?? []);
  r.wardInside = inside.slice(0, GAME.maxEnemies);
  return ownsResearch(run, 'gu-defended-passage')
    ? r.wardInside.filter((key) => !previous.has(key))
    : [];
}
