import {
  researchFoodProductionMultiplier,
  researchGrazing,
  researchMaterialGrazing,
  researchPastureRecoveryBonus,
} from './researchRuntime';
import { leadershipMobility } from './researchLeadership';
import { GAME } from '../config';
import { ROUTES, startingTradition, type MigrationLocation } from '../data/clan';
import type { RunState } from '../types';
import { hasDevelopment } from './camp';
import { arrivalLocation, currentLocation } from './journey';

export interface EconomyRates {
  foodProduction: number;
  foodConsumption: number;
  foodNet: number;
  materials: number;
}

export interface EconomyForecast extends EconomyRates {
  /** Active seconds until stores empty in this stage; undefined means no projected shortage. */
  foodSeconds?: number;
}

export function pastureDepletion(run: RunState): number {
  return (
    (100 / GAME.clan.pastureLifetime) *
      run.patrons.land.pastureUse *
      run.clan.campEffects.multipliers.pastureUse -
    run.patrons.land.pastureRecovery -
    researchPastureRecoveryBonus(run)
  );
}

export function migrationMobility(run: RunState): number {
  return (
    (1 + run.clan.herd * 0.012) *
    (hasDevelopment(run, 'herd', 'remount-herds') ? 1.2 : 1) *
    (run.clan.region === 1 ? 0.8 : 1) *
    run.patrons.banner.mobility *
    leadershipMobility(run) *
    run.clan.campEffects.multipliers.mobility *
    currentLocation(run).balance.mobility *
    startingTradition(run.startingTradition).balance.mobility
  );
}

/** Shared by simulation and forecasts, including when menus freeze the actual economy. */
export function economyRates(run: RunState, pasture = run.clan.pasture): EconomyRates {
  const { clan, patrons } = run;
  const { multipliers } = clan.campEffects;
  const location = currentLocation(run).balance;
  const foodConsumption =
    clan.population *
    GAME.clan.foodPerPerson *
    (hasDevelopment(run, 'herd', 'winter-stores') ? 0.5 : 1) *
    patrons.land.consumption *
    multipliers.consumption;
  const grazing = clan.stage === 'migration' ? 0 : Math.max(0, Math.min(pasture, 100)) / 100;
  const foodProduction =
    (0.65 + (clan.buildings.herd ? 0.65 : 0)) *
    researchGrazing(run, grazing, pasture) *
    researchFoodProductionMultiplier(run) *
    (clan.region === 1 ? 0.7 : 1) *
    patrons.land.food *
    multipliers.foodProduction *
    location.food;
  return {
    foodProduction,
    foodConsumption,
    foodNet: foodProduction - foodConsumption,
    materials:
      (0.28 + clan.population * 0.018) *
      researchMaterialGrazing(run, grazing, pasture) *
      patrons.land.materials *
      multipliers.materialProduction *
      location.materials,
  };
}

/** No losses or purchases are assumed; arrival gifts cannot feed people during the crossing. */
export function crossingDuration(
  run: RunState,
  route: (typeof ROUTES)[number],
  destination: MigrationLocation = arrivalLocation(run),
): number {
  return (
    (GAME.clan.migrationDuration * route.duration * destination.balance.crossing) /
    migrationMobility(run)
  );
}

export function crossingForecast(
  run: RunState,
  route: (typeof ROUTES)[number],
  destination: MigrationLocation = arrivalLocation(run),
) {
  const duration = crossingDuration(run, route, destination);
  const remaining = Math.max(
    0,
    duration -
      (run.clan.stage === 'migration' && run.clan.routeId === route.id ? run.clan.stageTime : 0),
  );
  const migration =
    run.clan.stage === 'migration'
      ? run
      : { ...run, clan: { ...run.clan, stage: 'migration' as const } };
  const { foodChange } = projectFood(migration, remaining);
  const foodNeeded = Math.max(0, -foodChange);
  const foodBeforeArrival = Math.max(0, run.clan.food + foodChange);
  const arrivalChange = route.food + run.clan.campEffects.bonuses.arrivalFood;
  return {
    duration,
    remaining,
    foodNeeded,
    foodBeforeArrival,
    arrivalChange,
    foodAfterArrival: Math.max(0, foodBeforeArrival + arrivalChange),
    shortfall: Math.max(0, foodNeeded - run.clan.food),
  };
}

function projectFood(run: RunState, duration = Infinity) {
  const projected = { ...run, clan: { ...run.clan } };
  let elapsed = 0;
  let foodChange = 0;
  let foodSeconds: number | undefined = run.clan.food <= 0 ? 0 : undefined;
  while (elapsed < duration) {
    const pasture = Math.max(0, Math.min(100, projected.clan.pasture));
    let slope = projected.clan.stage === 'migration' ? 0 : -pastureDepletion(projected);
    if ((slope < 0 && pasture === 0) || (slope > 0 && pasture === 100)) slope = 0;
    const pastureBoundary =
      slope < 0 ? pasture / -slope : slope > 0 ? (100 - pasture) / slope : Infinity;
    const buffRemaining =
      (projected.researchRuntime?.vigilantHerdersUntil ?? 0) - projected.elapsed;
    const segment = Math.min(
      duration - elapsed,
      pastureBoundary,
      buffRemaining > 0 ? buffRemaining : Infinity,
    );
    const net = economyRates(projected, pasture).foodNet;
    const acceleration =
      ((economyRates(projected, 100).foodProduction - economyRates(projected, 0).foodProduction) *
        slope) /
      100;
    const food = run.clan.food + foodChange;
    const discriminant = net * net - 2 * acceleration * food;
    if (foodSeconds === undefined && discriminant >= 0 && (net < 0 || acceleration < 0)) {
      const denominator = -net + Math.sqrt(discriminant);
      const root = denominator > 0 ? (2 * food) / denominator : Infinity;
      if (root <= segment) foodSeconds = elapsed + root;
    }
    if (!Number.isFinite(segment)) break;
    foodChange += net * segment + (acceleration * segment * segment) / 2;
    elapsed += segment;
    projected.elapsed = run.elapsed + elapsed;
    projected.clan.pasture = Math.max(0, Math.min(100, pasture + slope * segment));
  }
  return { foodChange, foodSeconds };
}

/** Forecasts use active seconds and hold population, improvements, and regional conditions fixed. */
export function economyForecast(run: RunState): EconomyForecast {
  const rates = economyRates(run);
  let foodSeconds: number | undefined;
  if (run.clan.stage === 'migration') {
    const route = ROUTES.find((entry) => entry.id === run.clan.routeId);
    const remaining = route ? crossingForecast(run, route).remaining : 0;
    foodSeconds = projectFood(run, remaining).foodSeconds;
  } else {
    foodSeconds = projectFood(run).foodSeconds;
    if (
      run.clan.stage === 'final' &&
      foodSeconds !== undefined &&
      foodSeconds > Math.max(0, GAME.clan.finalDuration - run.clan.stageTime)
    )
      foodSeconds = undefined;
  }
  return { ...rates, foodSeconds };
}
