import { constructionMaterials, recordConstruction } from './researchGuardian';
import { recordMaterialSpend } from './researchRuntime';
import { markExpedition } from './expeditionMetrics';
import { completeGuidance } from './guidance';
import { rememberClan } from './legacy';
import { BUILDING_REMNANT, buildingReaction } from '../data/storyReactions';
import {
  CORE_CAMP_BUILDINGS,
  OPTIONAL_CAMP_SLOTS,
  type NomadicBuildingId,
  type NomadicCamp,
} from '../../shared/nomadicCamp.js';
import {
  NOMADIC_BUILDINGS,
  nomadicBuilding,
  type NomadicBuildingEffects,
} from '../data/nomadicCamp';
import type { RunState } from '../types';
import { applyCampEffects, createCampEffects } from './camp';
import { createNomadicCamp } from '../../shared/nomadicCamp.js';
import { GAME } from '../config';
import type { BuildingId } from '../types';

export function nomadicBuildingLevel(camp: NomadicCamp, id: NomadicBuildingId): number {
  return (
    (camp.core as Record<string, number>)[id] ??
    camp.slots.find((slot) => slot?.id === id)?.level ??
    0
  );
}
export function nomadicBuildingCost(run: RunState, id: NomadicBuildingId) {
  const camp = run.clan.nomadicCamp;
  const next = nomadicBuilding(id).levels[camp ? nomadicBuildingLevel(camp, id) : 0];
  return next
    ? {
        materials: constructionMaterials(
          run,
          !camp || nomadicBuildingLevel(camp, id) === 0,
          Math.ceil(next.cost.materials * run.patrons.guardian.cost),
        ),
        spirit: next.cost.spirit,
        workers: camp && nomadicBuildingLevel(camp, id) ? 0 : nomadicBuilding(id).workers,
      }
    : undefined;
}
export function nomadicBuildingBlocker(
  run: RunState,
  id: NomadicBuildingId,
  slot?: number,
): string | undefined {
  const definition = NOMADIC_BUILDINGS.find((entry) => entry.id === id);
  if (!definition) return 'Unknown building';
  const camp = run.clan.nomadicCamp;
  if (!camp) return 'Camp migration required';
  if (run.clan.stage === 'migration') return 'Unpack at the next pasture';
  const level = nomadicBuildingLevel(camp, id),
    next = definition.levels[level];
  if (!next) return 'Maximum level reached';
  if (!level) {
    if (definition.category === 'Core') return 'Core buildings cannot be removed';
    if (
      slot !== undefined &&
      (!Number.isInteger(slot) ||
        slot < 0 ||
        slot >= OPTIONAL_CAMP_SLOTS ||
        camp.slots[slot] !== null)
    )
      return 'Choose an empty optional slot';
    if (!camp.slots.includes(null)) return 'All five optional slots are occupied';
  } else if (slot !== undefined && camp.slots[slot]?.id !== id)
    return 'This building occupies another location';
  for (const requirement of next.requires ?? [])
    if (nomadicBuildingLevel(camp, requirement.building) < requirement.level)
      return `Requires ${nomadicBuilding(requirement.building).title} level ${requirement.level}`;
  if (!level && nomadicAssignedWorkers(camp) + definition.workers > run.clan.population)
    return 'More families needed';
  const cost = nomadicBuildingCost(run, id)!;
  if (run.clan.materials < cost.materials || run.clan.spirit < cost.spirit)
    return 'Gather more resources';
  return undefined;
}
export function applyNomadicBuildingEffects(run: RunState, effects: NomadicBuildingEffects): void {
  applyCampEffects(run.clan.campEffects, effects.ongoing);
  for (const [key, value] of Object.entries(effects.player ?? {}))
    run.stats[key as keyof NonNullable<NomadicBuildingEffects['player']>] += value;
  run.stats.attackInterval *= effects.attackInterval ?? 1;
  run.patrons.bow.pierce += effects.pierce ?? 0;
}
/** One validated transaction owns placement, deduction, rank and effects. Inspecting never calls it. */
export function purchaseNomadicBuilding(
  run: RunState,
  id: NomadicBuildingId,
  slot?: number,
): boolean {
  if (run.phase !== 'building' || nomadicBuildingBlocker(run, id, slot)) return false;
  const camp = run.clan.nomadicCamp!,
    definition = nomadicBuilding(id);
  const level = nomadicBuildingLevel(camp, id),
    next = definition.levels[level]!;
  const cost = nomadicBuildingCost(run, id)!;
  run.clan.materials -= cost.materials;
  run.clan.spirit -= cost.spirit;
  recordMaterialSpend(run, cost.materials);
  if (level === 0) recordConstruction(run);
  if ((CORE_CAMP_BUILDINGS as readonly string[]).includes(id)) {
    (camp.core as Record<string, number>)[id] = level + 1;
  } else if (level) {
    camp.slots.find((entry) => entry?.id === id)!.level += 1;
  } else {
    camp.slots[slot ?? camp.slots.indexOf(null)] = {
      id: id as NonNullable<NomadicCamp['slots'][number]>['id'],
      level: 1,
    };
  }
  applyNomadicBuildingEffects(run, next.effects);
  run.clan.identity[definition.doctrine] += 2;
  syncNomadicBuildings(run);
  markExpedition(run, 'construction');
  completeGuidance(run, 'build');
  rememberClan(
    run,
    definition.title,
    `The clan ${level ? 'improved' : 'established'} this household to level ${level + 1}.`,
    NOMADIC_LEGACY_BUILDINGS[id] ? buildingReaction(NOMADIC_LEGACY_BUILDINGS[id]!) : undefined,
    BUILDING_REMNANT,
  );
  run.clan.message = `${definition.title} reaches level ${level + 1}.`;
  return true;
}
/** Deferred systems consume this typed catalog later; no timers or simulated trading are introduced. */
export function nomadicFutureEffects(
  camp: NomadicCamp,
): NonNullable<NomadicBuildingEffects['future']> {
  const effects: NonNullable<NomadicBuildingEffects['future']> = {};
  for (const definition of NOMADIC_BUILDINGS)
    for (const level of definition.levels.slice(0, nomadicBuildingLevel(camp, definition.id)))
      for (const [key, value] of Object.entries(level.effects.future ?? {})) {
        const typed = key as keyof typeof effects;
        effects[typed] = (effects[typed] ?? 0) + value;
      }
  return effects;
}

/** These counters are a compatibility projection for existing camp combat/actor consumers. */
export const NOMADIC_LEGACY_BUILDINGS: Partial<Record<NomadicBuildingId, BuildingId>> = {
  'khans-ger': 'ger',
  'horse-lines': 'relay',
  'herding-grounds': 'herd',
  'communal-hearth': 'provisions',
  'wagon-yard': 'wagon',
  'archery-range': 'archery',
  'artisans-ger': 'felt',
  'sacred-ovoo': 'sanctuary',
};
export function syncNomadicBuildings(run: RunState): void {
  const camp = run.clan.nomadicCamp;
  if (!camp) return;
  for (const key of Object.keys(run.clan.buildings) as BuildingId[]) run.clan.buildings[key] = 0;
  run.clan.paths = {};
  for (const [id, legacy] of Object.entries(NOMADIC_LEGACY_BUILDINGS))
    run.clan.buildings[legacy] = nomadicBuildingLevel(camp, id as NomadicBuildingId);
  for (const definition of NOMADIC_BUILDINGS)
    for (const level of definition.levels.slice(0, nomadicBuildingLevel(camp, definition.id)))
      for (const unlock of level.effects.unlocks ?? [])
        run.clan.paths[unlock.building] = [
          ...new Set([...(run.clan.paths[unlock.building] ?? []), unlock.path]),
        ];
  delete run.clan.estate;
}
export function initializeNomadicCamp(run: RunState): void {
  run.clan.nomadicCamp = createNomadicCamp();
  run.clan.campEffects = createCampEffects();
  for (const id of CORE_CAMP_BUILDINGS)
    applyNomadicBuildingEffects(run, nomadicBuilding(id).levels[0]!.effects);
  syncNomadicBuildings(run);
}
export function nomadicPopulationCapacity(run: RunState): number {
  const camp = run.clan.nomadicCamp;
  if (!camp) return GAME.clan.maxPopulation;
  return Math.min(
    GAME.clan.maxPopulation,
    nomadicBuilding('khans-ger')
      .levels.slice(0, camp.core['khans-ger'])
      .reduce((sum, level) => sum + (level.effects.populationCapacity ?? 0), 0),
  );
}
export function nomadicExperienceMultiplier(run: RunState): number {
  const camp = run.clan.nomadicCamp;
  if (!camp) return 1;
  return NOMADIC_BUILDINGS.reduce(
    (multiplier, definition) =>
      definition.levels
        .slice(0, nomadicBuildingLevel(camp, definition.id))
        .reduce((m, level) => m * (level.effects.experience ?? 1), multiplier),
    1,
  );
}

export function nomadicAssignedWorkers(camp: NomadicCamp): number {
  return NOMADIC_BUILDINGS.reduce(
    (sum, definition) => sum + (nomadicBuildingLevel(camp, definition.id) ? definition.workers : 0),
    0,
  );
}
