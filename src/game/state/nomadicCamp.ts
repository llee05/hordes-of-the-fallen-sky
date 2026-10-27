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
import { applyCampEffects } from './camp';

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
        materials: Math.ceil(next.cost.materials * run.patrons.guardian.cost),
        spirit: next.cost.spirit,
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
