import { rememberClan } from './legacy';
import { GAME } from '../config';
import { BUILDINGS, ROUTES } from '../data/clan';
import type { BuildingId, ClanState, Formation, RunState } from '../types';
import { applyCampEffects, createCampEffects, hasDevelopment } from './camp';
import { economyRates, crossingDuration, pastureDepletion } from './economy';
import { arrivalLocation, availableDestinations } from './journey';
import { completeGuidance } from './guidance';
import { isKhanActive } from './khan';

export function createClan(): ClanState {
  return {
    campEffects: createCampEffects(),
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
    integrity: 100,
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

export function assignedWorkers(run: RunState): number {
  return BUILDINGS.reduce((sum, b) => sum + (run.clan.buildings[b.id] ? b.workers : 0), 0);
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

export function buildingBlocker(run: RunState, id: BuildingId, path?: string): string | undefined {
  const definition = BUILDINGS.find((building) => building.id === id);
  if (!definition) return 'Unknown structure';
  const clan = run.clan;
  if (clan.stage === 'migration') return 'Unpack at the next pasture';
  if (path === undefined) {
    if (clan.buildings[id]) return 'Already established';
    if (assignedWorkers(run) + definition.workers > clan.population) return 'More families needed';
  } else {
    const development = definition.paths.find((entry) => entry.id === path);
    if (!development) return 'Unknown development';
    if (!clan.buildings[id]) return `Establish ${definition.title} first`;
    if (hasDevelopment(run, id, path)) return 'Already learned';
    if (developmentExcluded(run, id, path)) return 'Another path chosen';
    for (const parent of development.requires ?? []) {
      if (!hasDevelopment(run, id, parent))
        return `Requires ${definition.paths.find((entry) => entry.id === parent)?.title ?? parent}`;
    }
  }
  const cost = buildingCost(run, id, path);
  if (clan.materials < cost.materials || clan.spirit < cost.spirit) return 'Gather more resources';
  return undefined;
}

export function buildStructure(run: RunState, id: BuildingId, path?: string): boolean {
  if (run.phase !== 'building' || buildingBlocker(run, id, path)) return false;
  const clan = run.clan;
  const definition = BUILDINGS.find((building) => building.id === id)!;
  const development = definition.paths.find((entry) => entry.id === path);
  const cost = buildingCost(run, id, path);
  const hadTempest = burningTempest(run);
  completeGuidance(run, 'build');
  clan.materials -= cost.materials;
  clan.spirit -= cost.spirit;
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
    `${development ? 'Learned' : 'Established'} for the travelling camp.`,
    {
      speaker: 'saran',
      text: 'Give each new craft a place beside the hearth. These are skills we can carry.',
    },
    'The remaining hands make room for another craft.',
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
  const clan = run.clan;
  completeGuidance(run, 'depart');
  clan.stage = 'migration';
  clan.stageTime = 0;
  clan.routeId = route.id;
  clan.destinationId = destination.id;
  clan.migrationProgress = 0;
  clan.identity[route.doctrine] += 2;
  clan.message = `The gers are packed for ${destination.name}. Stay close to the caravan and bring your people through.`;
  rememberClan(
    run,
    'The camp packed for the road',
    `${clan.population} people set out toward ${destination.name} along ${route.title}.`,
    {
      speaker: 'boro',
      text: 'Count the households before we move. Keep the packs balanced and the herd beside us.',
    },
    'The remaining hands load the wagons and count before leaving.',
  );
  return true;
}

export function damageClan(run: RunState, amount: number): void {
  const clan = run.clan;
  const protection =
    (clan.formation === 'guard' ? 0.7 : 1) *
    (hasDevelopment(run, 'wagon', 'felt-armor') ? 0.5 : 1) *
    (hasDevelopment(run, 'sanctuary', 'ancestral-ward') ? 0.8 : 1) *
    run.patrons.guardian.protection *
    clan.campEffects.multipliers.clanProtection;
  const previousPopulation = clan.population;
  const previous = clan.integrity;
  clan.integrity = Math.max(0, previous - amount * protection);
  if (Math.floor((100 - previous) / 20) < Math.floor((100 - clan.integrity) / 20)) {
    if (clan.population > 0) run.story.peopleLost += 1;
    clan.population = Math.max(0, clan.population - 1);
    clan.herd = Math.max(0, clan.herd - 1);
    clan.message = 'The clan has suffered losses. Bring your riders back to guard.';
    if (clan.population < previousPopulation)
      rememberClan(
        run,
        'A place left empty',
        'An attack cost the clan a person. The surviving households carried on.',
        {
          speaker: 'erden',
          text: 'One fewer at the fire. I will keep the loss in the tally, where we can all see it.',
        },
        'One fewer beneath the banner. The loss remains in the tally.',
      );
  }
}

/** All economy and journey clocks stop outside the active simulation phase. */
export function advanceClan(run: RunState, dt: number): 'arrived' | 'lost' | 'saved' | undefined {
  if (run.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
  const clan = run.clan;
  const previousTime = clan.stageTime;
  const { bonuses } = clan.campEffects;
  clan.stageTime += dt;
  if (clan.stage !== 'migration') {
    clan.pasture = Math.max(0, Math.min(100, clan.pasture - dt * pastureDepletion(run)));
    const rates = economyRates(run);
    clan.food += dt * rates.foodNet;
    clan.materials += dt * rates.materials;
    clan.integrity = Math.min(
      100,
      clan.integrity +
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
    clan.food === 0 &&
    Math.floor(previousTime / GAME.clan.starvationInterval) <
      Math.floor(clan.stageTime / GAME.clan.starvationInterval)
  ) {
    if (clan.population > 0) run.story.peopleLost += 1;
    clan.population = Math.max(0, clan.population - 1);
    clan.herd = Math.max(0, clan.herd - 1);
    damageClan(run, 8);
    clan.message = 'The provisions are gone. Families and livestock are being lost.';
    rememberClan(
      run,
      'The provisions ran out',
      'Starvation cost a person and livestock; low resolve may bring further losses.',
      {
        speaker: 'boro',
        text: 'There is nothing left to share. Keep the remaining stores close when we find them.',
      },
      'Empty stores cost another life. The remaining people keep moving.',
    );
  }
  if (clan.population === 0 || clan.integrity === 0) return 'lost';
  if (clan.stage === 'migration' && clan.migrationProgress >= 1) {
    const route = ROUTES.find((r) => r.id === clan.routeId)!;
    const destination = arrivalLocation(run);
    clan.food = Math.max(0, clan.food + route.food + bonuses.arrivalFood);
    clan.materials += route.materials + bonuses.arrivalMaterials;
    clan.spirit += route.id === 'ridge' ? 10 : 0;
    const newPeople = route.population + (route.id === 'refuge' ? bonuses.refugePeople : 0);
    const arrivedPeople = Math.min(GAME.clan.maxPopulation - clan.population, newPeople);
    clan.population = Math.min(GAME.clan.maxPopulation, clan.population + newPeople);
    if (route.id === 'refuge') clan.rescuedRiders += 2;
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
    clan.integrity = Math.min(100, clan.integrity + 12 + bonuses.arrivalResolve);
    if (isKhanActive(run))
      run.health = Math.min(run.stats.maxHealth, run.health + 25 + bonuses.arrivalHealth);
    clan.message =
      clan.stage === 'final'
        ? 'The Red Eclipse. Protect your people for three minutes while the mountain passage opens.'
        : `${destination.name}. ${arrivedPeople ? `${arrivedPeople} survivors join the clan. ` : ''}Fresh pasture. Unpack, rebuild, and decide how long to stay.`;
    rememberClan(
      run,
      arrivedPeople ? 'New households at the fire' : 'The caravan arrived',
      `${clan.population} people reached ${destination.name} by ${route.title}.`,
      arrivedPeople
        ? {
            speaker: 'nara',
            text: 'Move the bowls closer. There are more people to make room for.',
          }
        : {
            speaker: 'saran',
            text: 'Set the covered embers down gently. We can make a hearth here.',
          },
      'Those who reached the pasture make another small hearth.',
    );
    return 'arrived';
  }
  if (clan.stage === 'final' && clan.stageTime >= GAME.clan.finalDuration) return 'saved';
}

export function clanDoctrine(run: RunState): string {
  const { iron, sky, wander } = run.clan.identity;
  if (Math.max(iron, sky, wander) < 4) return 'A people taking shape';
  if (iron >= sky && iron >= wander) return 'The Iron Horde';
  if (sky >= wander) return 'Children of the Eternal Sky';
  return 'The Wandering Nation';
}
