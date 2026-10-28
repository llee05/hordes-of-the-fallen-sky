import { NOMADIC_BUILDINGS } from '../data/nomadicCamp';
import {
  nomadicBuildingLevel,
  applyNomadicBuildingEffects,
  syncNomadicBuildings,
} from './nomadicCamp';
import { migrateLegacyNomadicCamp } from './nomadicCampMigration';
import { createCampEffects } from './camp';
import type { CampArchive } from '../../shared/campArchive';
import { isCampArchive } from '../../shared/campArchive';
import { GAME } from '../config';
import { BUILDINGS } from '../data/clan';
import { ENCAMPMENT_TIERS, INTERNAL_DEVELOPMENTS } from '../data/campEstate';
import type { BuildingId, RunState } from '../types';
import { applyCampEffects } from './camp';
import { campSlots, encampment } from './campEstate';
import { createRun } from './run';

export function captureCampArchive(run: RunState): CampArchive {
  const { food, materials, spirit, population, herd, integrity } = run.clan;
  return structuredClone({
    version: 1,
    ...(run.clan.nomadicCamp ? { nomadicCamp: run.clan.nomadicCamp } : {}),
    tier: encampment(run).tier,
    slots: campSlots(run),
    buildings: BUILDINGS.filter((b) => run.clan.buildings[b.id] > 0).map((b) => b.id),
    paths: run.clan.paths,
    internals: run.clan.estate?.internals ?? {},
    supplies: { food, materials, spirit, population, herd, integrity },
  });
}
/** Restore the portable camp into a fresh expedition, not a frozen battle or a second purchase. */
export function runFromCampArchive(value: unknown): RunState | undefined {
  if (!isCampArchive(value)) return undefined;
  const run = createRun();
  if (value.nomadicCamp) {
    run.clan.nomadicCamp = structuredClone(value.nomadicCamp);
    for (const definition of NOMADIC_BUILDINGS) {
      const first = definition.category === 'Core' ? 1 : 0;
      for (const level of definition.levels.slice(
        first,
        nomadicBuildingLevel(value.nomadicCamp, definition.id),
      )) {
        applyNomadicBuildingEffects(run, level.effects);
        run.clan.identity[definition.doctrine] += 2;
      }
    }
    syncNomadicBuildings(run);
    Object.assign(run.clan, value.supplies);
    run.health = run.stats.maxHealth;
    return run;
  }
  delete run.clan.nomadicCamp;
  run.clan.campEffects = createCampEffects();
  const known = new Set(BUILDINGS.map((b) => b.id));
  const owned = new Set(
    value.buildings.filter((id): id is BuildingId => known.has(id as BuildingId)),
  );
  owned.add('ger');
  for (const definition of BUILDINGS) {
    const built = owned.has(definition.id),
      requested = new Set(value.paths[definition.id] ?? []),
      groups = new Map<string, string>();
    for (const path of definition.paths)
      if (requested.has(path.id) && path.exclusiveGroup && !groups.has(path.exclusiveGroup))
        groups.set(path.exclusiveGroup, path.id);
    const closed = (id: string, visited = new Set<string>()): boolean => {
      if (visited.has(id)) return false;
      visited.add(id);
      const path = definition.paths.find((p) => p.id === id);
      return !!(
        path &&
        ((path.exclusiveGroup &&
          groups.has(path.exclusiveGroup) &&
          groups.get(path.exclusiveGroup) !== path.id) ||
          path.requires?.some((parent) => closed(parent, visited)))
      );
    };
    const learned = definition.paths.filter((path) => {
      if (!built || !requested.has(path.id)) return false;
      return !closed(path.id);
    });
    run.clan.buildings[definition.id] = built ? 1 + learned.length : 0;
    if (!built) continue;
    run.clan.paths[definition.id] = learned.map((p) => p.id);
    if (!definition.startsBuilt) {
      definition.onBuild?.(run);
      run.clan.identity[definition.doctrine] += 2;
    }
    applyCampEffects(run.clan.campEffects, definition.effects);
    for (const path of learned) {
      path.apply?.(run);
      applyCampEffects(run.clan.campEffects, path.effects);
      run.clan.identity[definition.doctrine] += 2;
    }
  }
  const placed = new Set<string>();
  const slots = value.slots.map((id) => {
    if (!id || !owned.has(id as BuildingId) || placed.has(id)) return null;
    placed.add(id);
    return id as BuildingId;
  });
  while (slots.length < 6) slots.push(null);
  run.clan.estate = { tier: value.tier, slots, internals: {} };
  run.clan.estate.slots = campSlots(run);
  for (const tier of ENCAMPMENT_TIERS.slice(1, value.tier))
    applyCampEffects(run.clan.campEffects, tier.effects);
  for (const development of INTERNAL_DEVELOPMENTS) {
    const ranks = Math.min(development.ranks.length, value.internals[development.id] ?? 0);
    if (ranks) run.clan.estate.internals[development.id] = ranks;
    for (const rank of development.ranks.slice(0, ranks))
      applyCampEffects(run.clan.campEffects, rank.effects);
  }
  Object.assign(run.clan, value.supplies, {
    population: Math.min(GAME.clan.maxPopulation, value.supplies.population),
    herd: Math.min(GAME.clan.maxHerd, value.supplies.herd),
  });
  // Immediate food/people/repair gifts have already happened. Saved stores replace those callbacks' gifts.
  run.health = run.stats.maxHealth;
  run.clan.message =
    'Your saved households unpack their knowledge, tools, and provisions for another road.';
  migrateLegacyNomadicCamp(run);
  return run;
}
