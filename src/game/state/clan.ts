import { GAME } from '../config';
import { BUILDINGS, ROUTES } from '../data/clan';
import type { BuildingId, ClanState, Formation, RunState } from '../types';

export function createClan(): ClanState {
  return {
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
    buildings: { ger: 1, archery: 0, herd: 0, sanctuary: 0, wagon: 0 },
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

export function riderCount(run: RunState): number {
  const clan = run.clan;
  return Math.min(
    16,
    1 +
      (clan.buildings.archery ? 3 : 0) +
      (clan.paths.archery === 1 ? 3 : 0) +
      (run.upgrades.multishot ?? 0) +
      clan.rescuedRiders,
  );
}

export function burningTempest(run: RunState): boolean {
  return run.clan.paths.archery === 0 && run.clan.paths.sanctuary === 0;
}

export function availableFormations(run: RunState): Formation[] {
  return [
    'guard',
    ...(run.clan.buildings.archery ? (['encircle', 'wedge'] as const) : []),
    ...(run.clan.buildings.herd ? (['retreat'] as const) : []),
  ];
}

export function buildingCost(run: RunState, id: BuildingId): { materials: number; spirit: number } {
  const definition = BUILDINGS.find((building) => building.id === id)!;
  const multiplier = run.clan.buildings[id] ? 1.5 : 1;
  return {
    materials: Math.ceil(definition.materials * multiplier),
    spirit: Math.ceil(definition.spirit * multiplier),
  };
}

export function buildingBlocker(run: RunState, id: BuildingId): string | undefined {
  const clan = run.clan;
  if (clan.stage === 'migration') return 'Unpack at the next pasture';
  if (clan.buildings[id] >= 2) return 'Fully developed';
  const cost = buildingCost(run, id);
  if (clan.materials < cost.materials || clan.spirit < cost.spirit) return 'Gather more resources';
  const definition = BUILDINGS.find((building) => building.id === id)!;
  if (!clan.buildings[id] && assignedWorkers(run) + definition.workers > clan.population)
    return 'More families needed';
  return undefined;
}

export function buildStructure(run: RunState, id: BuildingId, path?: number): boolean {
  if (run.phase !== 'building' || !BUILDINGS.some((b) => b.id === id) || buildingBlocker(run, id))
    return false;
  const clan = run.clan;
  const upgrading = clan.buildings[id] === 1;
  if (upgrading && path !== 0 && path !== 1) return false;
  if (!upgrading && path !== undefined) return false;
  const definition = BUILDINGS.find((building) => building.id === id)!;
  const cost = buildingCost(run, id);
  clan.materials -= cost.materials;
  clan.spirit -= cost.spirit;
  clan.buildings[id] += 1;
  clan.identity[definition.doctrine] += 2;
  if (upgrading) clan.paths[id] = path!;
  if (id === 'ger')
    clan.population = Math.min(GAME.clan.maxPopulation, clan.population + (path === 1 ? 10 : 6));
  if (id === 'herd' && !upgrading) clan.herd += 4;
  if (id === 'herd' && path === 0) run.stats.speed *= 1.12;
  if (id === 'herd' && path === 1) clan.food += 45;
  if (id === 'wagon' && path === 1) clan.integrity = Math.min(100, clan.integrity + 30);
  clan.message = burningTempest(run)
    ? 'THE BURNING TEMPEST — fire arrows meet the wind shamans.'
    : `${upgrading ? definition.paths[path!]!.title : definition.title} joins your living civilization.`;
  return true;
}

export function canMigrate(run: RunState): boolean {
  return (
    run.clan.stage === 'camp' && run.clan.stageTime >= GAME.clan.minimumCamp && run.clan.region < 3
  );
}

export function beginMigration(run: RunState, routeId: string): boolean {
  const route = ROUTES.find((entry) => entry.id === routeId);
  if (run.phase !== 'route' || !canMigrate(run) || !route) return false;
  const clan = run.clan;
  clan.stage = 'migration';
  clan.stageTime = 0;
  clan.routeId = route.id;
  clan.migrationProgress = 0;
  clan.identity[route.doctrine] += 2;
  clan.message = 'The gers are packed. Stay close to the caravan and bring your people through.';
  return true;
}

export function damageClan(run: RunState, amount: number): void {
  const clan = run.clan;
  const protection =
    (clan.formation === 'guard' ? 0.7 : 1) *
    (clan.paths.wagon === 1 ? 0.5 : 1) *
    (clan.paths.sanctuary === 1 ? 0.8 : 1);
  const previous = clan.integrity;
  clan.integrity = Math.max(0, previous - amount * protection);
  if (Math.floor((100 - previous) / 20) < Math.floor((100 - clan.integrity) / 20)) {
    clan.population = Math.max(0, clan.population - 1);
    clan.herd = Math.max(0, clan.herd - 1);
    clan.message = 'The clan has suffered losses. Bring your riders back to guard.';
  }
}

/** All economy and journey clocks stop outside the active simulation phase. */
export function advanceClan(run: RunState, dt: number): 'arrived' | 'lost' | 'saved' | undefined {
  if (run.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
  const clan = run.clan;
  const previousTime = clan.stageTime;
  clan.stageTime += dt;
  const consumption = clan.population * GAME.clan.foodPerPerson * (clan.paths.herd === 1 ? 0.5 : 1);
  if (clan.stage !== 'migration') {
    clan.pasture = Math.max(0, clan.pasture - (dt * 100) / GAME.clan.pastureLifetime);
    const pasture = clan.pasture / 100;
    const winter = clan.region === 1 ? 0.7 : 1;
    clan.food += dt * ((0.65 + (clan.buildings.herd ? 0.65 : 0)) * pasture * winter - consumption);
    clan.materials += dt * (0.28 + clan.population * 0.018) * pasture;
    if (clan.paths.ger === 0) clan.integrity = Math.min(100, clan.integrity + dt * 0.25);
  } else {
    clan.food -= dt * consumption;
    const route = ROUTES.find((r) => r.id === clan.routeId)!;
    const mobility =
      (1 + clan.herd * 0.012) * (clan.paths.herd === 0 ? 1.2 : 1) * (clan.region === 1 ? 0.8 : 1);
    clan.migrationProgress = Math.min(
      1,
      (clan.stageTime * mobility) / (GAME.clan.migrationDuration * route.duration),
    );
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
    clan.population = Math.max(0, clan.population - 1);
    clan.herd = Math.max(0, clan.herd - 1);
    damageClan(run, 8);
    clan.message = 'The provisions are gone. Families and livestock are being lost.';
  }
  if (clan.population === 0 || clan.integrity === 0) return 'lost';
  if (clan.stage === 'migration' && clan.migrationProgress >= 1) {
    const route = ROUTES.find((r) => r.id === clan.routeId)!;
    clan.food = Math.max(0, clan.food + route.food);
    clan.materials += route.materials;
    clan.spirit += route.id === 'ridge' ? 10 : 0;
    clan.population = Math.min(GAME.clan.maxPopulation, clan.population + route.population);
    if (route.id === 'refuge') clan.rescuedRiders += 2;
    clan.herd = Math.min(GAME.clan.maxHerd, clan.herd + route.herd);
    clan.region += 1;
    clan.stage = clan.region === 3 ? 'final' : 'camp';
    clan.stageTime = 0;
    clan.pasture = 100;
    clan.integrity = Math.min(100, clan.integrity + 12);
    run.health = Math.min(run.stats.maxHealth, run.health + 25);
    clan.message =
      clan.stage === 'final'
        ? 'The Red Eclipse. Protect your people for three minutes while the mountain passage opens.'
        : `${route.population ? 'Eight survivors join the clan. ' : ''}Fresh pasture. Unpack, rebuild, and decide how long to stay.`;
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
