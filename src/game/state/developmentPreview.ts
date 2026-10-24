import type { BuildingId, RunState } from '../types';
import { buildingBlocker, buildingCost, buildStructure } from './clan';
import { crossingForecast, economyForecast } from './economy';
import { ROUTES } from '../data/clan';
import { availableDestinations } from './journey';

/** Evaluate the real purchase on an isolated copy. Missing supplies can still be planned for. */
export function developmentPreview(run: RunState, id: BuildingId, path?: string) {
  const blocker = buildingBlocker(run, id, path);
  if (blocker && blocker !== 'Gather more resources') return undefined;
  const preview = structuredClone(run);
  const cost = buildingCost(run, id, path);
  preview.phase = 'building';
  preview.clan.materials = Math.max(cost.materials, preview.clan.materials);
  preview.clan.spirit = Math.max(cost.spirit, preview.clan.spirit);
  if (!buildStructure(preview, id, path)) return undefined;
  return {
    projected: preview,
    before: economyForecast(run),
    after: economyForecast(preview),
    foodGift: preview.clan.food - run.clan.food,
    crossingFood:
      run.clan.stage === 'camp' && run.clan.region < 3
        ? {
            before: availableDestinations(run).flatMap((destination) =>
              ROUTES.map((route) => crossingForecast(run, route, destination).foodNeeded),
            ),
            after: availableDestinations(preview).flatMap((destination) =>
              ROUTES.map((route) => crossingForecast(preview, route, destination).foodNeeded),
            ),
          }
        : undefined,
  };
}
