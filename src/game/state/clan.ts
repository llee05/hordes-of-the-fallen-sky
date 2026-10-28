import { nomadicAssignedWorkers, nomadicPopulationCapacity } from './nomadicCamp';
import {
  createCampEstate,
  estateAssignedWorkers,
  estateBuildingBlocker,
  reserveBuildingSlot,
} from './campEstate';
import { recordClanDamage, type ClanDamageCause } from './clanSafety';
import { rememberClan } from './legacy';
import {
  ARRIVAL_REMNANT,
  BUILDING_REMNANT,
  ROUTE_ACCOUNTS,
  DEPARTURE_REMNANT,
  STARVATION_REMNANT,
  arrivalReaction,
  buildingReaction,
  departureReaction,
  lossReaction,
  starvationReaction,
} from '../data/storyReactions';
import { beginCrossingEncounter, settleCrossingEncounter } from './crossingEncounters';
import { GAME } from '../config';
import { BUILDINGS, ROUTES, startingTradition } from '../data/clan';
import type { BuildingId, ClanState, Formation, RunState } from '../types';
import { applyCampEffects, createCampEffects, hasDevelopment } from './camp';
import { economyRates, crossingDuration, pastureDepletion } from './economy';
import { arrivalLocation, availableDestinations } from './journey';
import { completeGuidance } from './guidance';
import { isKhanActive } from './khan';
import { markExpedition, metricCasualties, metricStage } from './expeditionMetrics';
import { passageProgress } from './finalStand';
import { researchResolveProtection, researchCommonProtection } from './researchRuntime';

export function createClan(): ClanState {
  return {
    campEffects: createCampEffects(),
    estate: createCampEstate(),
    stage: 'camp',
    region: 0,
    stageTime: 0,
    pasture: 100,
    threat: 0,
    food: 70,
    materials: 50,
    spirit: 0,
    population: 8,
    herd: 3,
    integrity: GAME.clan.maxResolve,
    migrationProgress: 0,
    routeId: '',
    buildings: Object.fromEntries(
      BUILDINGS.map((building) => [building.id, building.startsBuilt ? 1 : 0]),
    ) as Record<BuildingId, number>,
    paths: {},
    identity: { iron: 0, sky: 0, wander: 0 },
    formation: 'guard',
    momentum: 0,
    finalBossSpawned: false,
    finalBossDefeated: false,
    rescuedRiders: 0,
    message: 'Eight people. Three horses. One last patch of blue sky. Build your clan with B.',
  };
}

/** Restore clan resolve up to the shared cap; amount is supplied by gameplay rules. */
export function restoreResolve(run: RunState, amount: number): void {
  run.clan.integrity = Math.min(GAME.clan.maxResolve, run.clan.integrity + amount);
}

export function assignedWorkers(run: RunState): number {
  return run.clan.nomadicCamp
    ? nomadicAssignedWorkers(run.clan.nomadicCamp)
    : estateAssignedWorkers(run);
}

export { hasDevelopment } from './camp';

/** An excluded ancestor also excludes its descendants, without hard-coded path depths. */
export function developmentExcluded(run: RunState, id: BuildingId, path: string): boolean {
  const paths = BUILDINGS.find((building) => building.id === id)?.paths ?? [];
  const visit = (pathId: string, visited: Set<string>): boolean => {
    if (visited.has(pathId)) return false;
    visited.add(pathId);
    const node = paths.find((entry) => entry.id === pathId);
    if (!node || hasDevelopment(run, id, pathId)) return false;
    return !!(
      (node.exclusiveGroup &&
        paths.some(
          (other) =>
            other.exclusiveGroup === node.exclusiveGroup && hasDevelopment(run, id, other.id),
        )) ||
      node.requires?.some((parent) => visit(parent, visited))
    );
  };
  return visit(path, new Set());
}

export function riderCount(run: RunState): number {
  const clan = run.clan;
  return Math.min(
    16,
    1 +
      startingTradition(run.startingTradition).balance.riders +
      (clan.buildings.archery ? 3 : 0) +
      (hasDevelopment(run, 'archery', 'veteran-riders') ? 3 : 0) +
      run.patrons.banner.riders +
      clan.rescuedRiders,
  );
}

export function burningTempest(run: RunState): boolean {
  return (
    hasDevelopment(run, 'archery', 'fire-arrows') &&
    hasDevelopment(run, 'sanctuary', 'wind-shamans')
  );
}

export function availableFormations(run: RunState): Formation[] {
  return [
    'guard',
    ...(run.clan.buildings.archery ? (['encircle', 'wedge'] as const) : []),
    ...(run.clan.buildings.herd ? (['retreat'] as const) : []),
  ];
}

export function buildingCost(
  run: RunState,
  id: BuildingId,
  path?: string,
): { materials: number; spirit: number } {
  const definition = BUILDINGS.find((building) => building.id === id)!;
  const development = definition.paths.find((entry) => entry.id === path);
  return {
    materials: Math.ceil(
      (path === undefined
        ? definition.materials
        : (development?.materials ?? Math.ceil(definition.materials * 1.5))) *
        run.patrons.guardian.cost,
    ),
    spirit:
      path === undefined
        ? definition.spirit
        : (development?.spirit ?? Math.ceil(definition.spirit * 1.5)),
  };
}

export function buildingBlocker(
  run: RunState,
  id: BuildingId,
  path?: string,
  slot?: number,
): string | undefined {
  if (run.clan.nomadicCamp) return 'Use the nomadic building levels';
  const definition = BUILDINGS.find((building) => building.id === id);
  if (!definition) return 'Unknown structure';
  const clan = run.clan;
  if (clan.stage === 'migration') return 'Unpack at the next pasture';
  if (path === undefined) {
    if (clan.buildings[id]) return 'Already established';
    if (definition.workers > 0 && assignedWorkers(run) + definition.workers > clan.population)
      return 'More families needed';
  } else {
    const development = definition.paths.find((entry) => entry.id === path);
    if (!development) return 'Unknown development';
    if (!clan.buildings[id]) return `Establish ${definition.title} first`;
    if (hasDevelopment(run, id, path)) return 'Already learned';
    if (developmentExcluded(run, id, path)) return 'Another path chosen';
    for (const parent of development.requires ?? []) {
      const parentNode = definition.paths.find((p) => p.id === parent);
      if (!clan.estate && parentNode?.level && !parentNode.exclusiveGroup) continue;
      if (!hasDevelopment(run, id, parent))
        return `Requires ${definition.paths.find((entry) => entry.id === parent)?.title ?? parent}`;
    }
  }
  const estateReason = estateBuildingBlocker(run, id, path, slot);
  if (estateReason) return estateReason;
  const cost = buildingCost(run, id, path);
  if (clan.materials < cost.materials || clan.spirit < cost.spirit) return 'Gather more resources';
  return undefined;
}

export function buildStructure(
  run: RunState,
  id: BuildingId,
  path?: string,
  slot?: number,
): boolean {
  if (run.phase !== 'building' || buildingBlocker(run, id, path, slot)) return false;
  markExpedition(run, 'construction');
  const clan = run.clan;
  const definition = BUILDINGS.find((building) => building.id === id)!;
  const development = definition.paths.find((entry) => entry.id === path);
  const cost = buildingCost(run, id, path);
  const hadTempest = burningTempest(run);
  completeGuidance(run, 'build');
  clan.materials -= cost.materials;
  clan.spirit -= cost.spirit;
  if (path === undefined) reserveBuildingSlot(run, id, slot);
  clan.buildings[id] += 1;
  clan.identity[definition.doctrine] += 2;
  if (development) {
    clan.paths[id] = [...(clan.paths[id] ?? []), development.id];
    development.apply?.(run);
  } else definition.onBuild?.(run);
  applyCampEffects(
    clan.campEffects,
    development?.effects ?? (path === undefined ? definition.effects : undefined),
  );
  clan.message =
    !hadTempest && burningTempest(run)
      ? 'THE BURNING TEMPEST — fire arrows meet the wind shamans.'
      : `${development?.title ?? definition.title} joins your living civilization.`;
  rememberClan(
    run,
    development?.title ?? definition.title,
    development
      ? 'The households learned a new craft for the travelling camp.'
      : 'The households raised it in the travelling camp.',
    buildingReaction(id, development?.id),
    BUILDING_REMNANT,
  );
  return true;
}

export function canMigrate(run: RunState): boolean {
  return (
    run.clan.stage === 'camp' && run.clan.stageTime >= GAME.clan.minimumCamp && run.clan.region < 3
  );
}

export function beginMigration(
  run: RunState,
  routeId: string,
  destinationId: string = arrivalLocation(run).id,
): boolean {
  const route = ROUTES.find((entry) => entry.id === routeId);
  const destination = availableDestinations(run).find((entry) => entry.id === destinationId);
  if (run.phase !== 'route' || !canMigrate(run) || !route || !destination) return false;
  markExpedition(run, 'departure');
  const clan = run.clan;
  completeGuidance(run, 'depart');
  clan.stage = 'migration';
  clan.stageTime = 0;
  clan.routeId = route.id;
  clan.destinationId = destination.id;
  clan.migrationProgress = 0;
  beginCrossingEncounter(run);
  clan.identity[route.doctrine] += 2;
  clan.message = `The gers are packed for ${destination.name}. Stay close to the caravan and bring your people through.`;
  rememberClan(
    run,
    'The camp packed for the road',
    `${clan.population} people set out for ${destination.name}. ${ROUTE_ACCOUNTS[route.id].departed}`,
    departureReaction(run, route.id),
    DEPARTURE_REMNANT,
  );
  return true;
}

/** Transient simulation options supplied by the scene, never stored in a run or profile. */
export interface ClanProtection {
  invincible: boolean;
}

export function clanDamageMultiplier(run: RunState): number {
  return (
    (run.clan.formation === 'guard' ? GAME.clan.protection.guard : 1) *
    (hasDevelopment(run, 'wagon', 'felt-armor') ? GAME.clan.protection.feltArmor : 1) *
    (hasDevelopment(run, 'sanctuary', 'ancestral-ward') ? GAME.clan.protection.ancestralWard : 1) *
    run.patrons.guardian.protection *
    researchResolveProtection(run) *
    researchCommonProtection(run) *
    run.clan.campEffects.multipliers.clanProtection *
    startingTradition(run.startingTradition).balance.protection
  );
}

export function damageClan(
  run: RunState,
  amount: number,
  protectionOptions?: ClanProtection,
  cause: ClanDamageCause = 'attack',
  source?: string,
): void {
  if (protectionOptions?.invincible || !Number.isFinite(amount) || amount <= 0) return;
  const clan = run.clan;
  const protection = clanDamageMultiplier(run);
  const previousPopulation = clan.population;
  const previous = clan.integrity;
  clan.integrity = Math.max(0, previous - amount * protection);
  const bandsCrossed =
    Math.floor((GAME.clan.maxResolve - clan.integrity) / GAME.clan.resolveLossBand) -
    Math.floor((GAME.clan.maxResolve - previous) / GAME.clan.resolveLossBand);
  if (bandsCrossed > 0) {
    const peopleLost = Math.min(clan.population, bandsCrossed);
    run.story.peopleLost += peopleLost;
    clan.population -= peopleLost;
    clan.herd = Math.max(0, clan.herd - 1);
    clan.message = 'The clan has suffered losses. Bring your riders back to guard.';
    if (peopleLost > 0) {
      const loss = peopleLost === 1 ? 'a person' : `${peopleLost} people`;
      rememberClan(
        run,
        'A place left empty',
        cause === 'starvation'
          ? `With the provisions gone, the clan lost ${loss}. The other households carried on.`
          : `${cause === 'eruption' ? 'The ground erupted and' : cause === 'seer' ? 'A seer struck and' : cause === 'area' ? 'A spell or a shifting of the land near camp' : 'An attack'} cost the clan ${loss}. The other households carried on.`,
        lossReaction(run, peopleLost),
        `${peopleLost === 1 ? 'One' : peopleLost} fewer beneath the banner. The loss remains in the tally.`,
      );
    }
  }
  recordClanDamage(
    run,
    cause,
    previous - clan.integrity,
    previousPopulation - clan.population,
    source,
  );
}

/** All economy and journey clocks stop outside the active simulation phase. */
export function advanceClan(
  run: RunState,
  dt: number,
  protectionOptions?: ClanProtection,
): 'arrived' | 'lost' | 'saved' | undefined {
  if (run.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
  if (run.clan.population <= 0 || run.clan.integrity <= 0) return 'lost';
  metricStage(run);
  const clan = run.clan;
  const previousTime = clan.stageTime;
  const { bonuses } = clan.campEffects;
  clan.stageTime += dt;
  if (clan.stage !== 'migration') {
    clan.pasture = Math.max(0, Math.min(clan.pasture - dt * pastureDepletion(run), 100));
    const rates = economyRates(run);
    clan.food += dt * rates.foodNet;
    clan.materials += dt * rates.materials;
    restoreResolve(
      run,
      dt * ((hasDevelopment(run, 'ger', 'hearthkeepers') ? 0.25 : 0) + bonuses.resolveRecovery),
    );
  } else {
    clan.food += dt * economyRates(run).foodNet;
    const route = ROUTES.find((r) => r.id === clan.routeId)!;
    clan.migrationProgress = Math.min(1, clan.stageTime / crossingDuration(run, route));
  }
  clan.food = Math.max(0, clan.food);
  clan.threat = Math.min(
    100,
    clan.region * 16 + clan.stageTime * (clan.stage === 'migration' ? 0.2 : 0.28),
  );
  if (
    !protectionOptions?.invincible &&
    clan.food === 0 &&
    Math.floor(previousTime / GAME.clan.starvationInterval) <
      Math.floor(clan.stageTime / GAME.clan.starvationInterval)
  ) {
    const starvationLoss = Number(clan.population > 0);
    metricCasualties(run, starvationLoss);
    if (clan.population > 0) run.story.peopleLost += 1;
    clan.population = Math.max(0, clan.population - 1);
    clan.herd = Math.max(0, clan.herd - 1);
    run.safety.starvationLosses += starvationLoss;
    damageClan(run, 8, undefined, 'starvation');
    if (run.safety.lastDamage?.cause === 'starvation') {
      run.safety.lastDamage.people += starvationLoss;
      run.safety.lastMajorLoss = { ...run.safety.lastDamage };
    }
    clan.message = 'The provisions are gone. Families and livestock are being lost.';
    rememberClan(
      run,
      'The provisions ran out',
      'Hunger cost the clan a person and a horse. If resolve stays low, more losses may follow.',
      starvationReaction(run),
      STARVATION_REMNANT,
    );
  }
  if (clan.population === 0 || clan.integrity === 0) return 'lost';
  if (clan.stage === 'migration' && clan.migrationProgress >= 1) {
    settleCrossingEncounter(run);
    const route = ROUTES.find((r) => r.id === clan.routeId)!;
    const destination = arrivalLocation(run);
    clan.food = Math.max(0, clan.food + route.food + bonuses.arrivalFood);
    clan.materials += route.materials + bonuses.arrivalMaterials;
    clan.spirit += route.id === 'ridge' ? GAME.clan.arrival.ridgeSpirit : 0;
    const newPeople = route.population + (route.id === 'refuge' ? bonuses.refugePeople : 0);
    const arrivedPeople = Math.max(
      0,
      Math.min(nomadicPopulationCapacity(run) - clan.population, newPeople),
    );
    clan.population += arrivedPeople;
    if (route.id === 'refuge') clan.rescuedRiders += GAME.clan.arrival.refugeRiders;
    clan.herd = Math.min(GAME.clan.maxHerd, clan.herd + route.herd + bonuses.arrivalHerd);
    completeGuidance(run, 'crossing');
    clan.region += 1;
    clan.locationId = destination.id;
    clan.destinationId = undefined;
    run.story.crossings.push({
      route: route.id,
      region: clan.region,
      population: clan.population,
      locationId: destination.id,
    });
    clan.stage = clan.region === 3 ? 'final' : 'camp';
    clan.stageTime = 0;
    clan.pasture = 100;
    restoreResolve(run, GAME.clan.arrival.resolve + bonuses.arrivalResolve);
    if (isKhanActive(run))
      run.health = Math.min(
        run.stats.maxHealth,
        run.health + GAME.clan.arrival.health + bonuses.arrivalHealth,
      );
    clan.message =
      clan.stage === 'final'
        ? 'The Red Eclipse. Protect your people for three minutes while the mountain passage opens.'
        : `${destination.name}. ${arrivedPeople ? `${arrivedPeople} survivors join the clan. ` : ''}Fresh pasture. Unpack, rebuild, and decide how long to stay.`;
    rememberClan(
      run,
      arrivedPeople ? 'New households at the fire' : 'The caravan arrived',
      `${clan.population} people reached ${destination.name} ${ROUTE_ACCOUNTS[route.id].arrived}.`,
      arrivalReaction(run, route.id, arrivedPeople),
      ARRIVAL_REMNANT,
    );
    return 'arrived';
  }
  if (clan.stage === 'final' && passageProgress(run) >= 1) return 'saved';
}

export function clanDoctrine(run: RunState): string {
  const { iron, sky, wander } = run.clan.identity;
  if (Math.max(iron, sky, wander) < 4) return 'A people taking shape';
  if (iron >= sky && iron >= wander) return 'The Iron Horde';
  if (sky >= wander) return 'Children of the Eternal Sky';
  return 'The Wandering Nation';
}
