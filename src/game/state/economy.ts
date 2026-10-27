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
    run.patrons.land.pastureRecovery
  );
}

export function migrationMobility(run: RunState): number {
  return (
    (1 + run.clan.herd * 0.012) *
    (hasDevelopment(run, 'herd', 'remount-herds') ? 1.2 : 1) *
    (run.clan.region === 1 ? 0.8 : 1) *
    run.patrons.banner.mobility *
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
    grazing *
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
      grazing *
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
  const foodNeeded = economyRates(run).foodConsumption * remaining;
  const foodBeforeArrival = Math.max(0, run.clan.food - foodNeeded);
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

/** Integrate the linear change in grazing until pasture reaches 0% or 100%, then the steady rate. */
function campFoodSeconds(run: RunState): number | undefined {
  const food = run.clan.food;
  if (food <= 0) return 0;
  const net = economyRates(run).foodNet;
  const slope = -pastureDepletion(run) / 100;
  if (slope === 0) return net < 0 ? food / -net : undefined;
  const pasture = Math.max(0, Math.min(1, run.clan.pasture / 100));
  const boundary = slope < 0 ? pasture / -slope : (1 - pasture) / slope;
  const acceleration = economyRates(run, 100).foodProduction * slope;
  const discriminant = net * net - 2 * acceleration * food;
  if (discriminant >= 0 && (net < 0 || acceleration < 0)) {
    // This form avoids cancellation when a gentle pasture change is close to a constant rate.
    const denominator = -net + Math.sqrt(discriminant);
    const root = denominator > 0 ? (2 * food) / denominator : Infinity;
    if (root <= boundary) return root;
  }
  const reserves = food + net * boundary + (acceleration * boundary * boundary) / 2;
  const finalNet = economyRates(run, slope < 0 ? 0 : 100).foodNet;
  return finalNet < 0 ? boundary + Math.max(0, reserves) / -finalNet : undefined;
}

/** Forecasts use active seconds and hold population, improvements, and regional conditions fixed. */
export function economyForecast(run: RunState): EconomyForecast {
  const rates = economyRates(run);
  let foodSeconds: number | undefined;
  if (run.clan.stage === 'migration') {
    const route = ROUTES.find((entry) => entry.id === run.clan.routeId);
    const remaining = route ? crossingForecast(run, route).remaining : 0;
    const emptyAt =
      run.clan.food <= 0
        ? 0
        : rates.foodConsumption > 0
          ? run.clan.food / rates.foodConsumption
          : Infinity;
    if (emptyAt <= remaining) foodSeconds = emptyAt;
  } else {
    foodSeconds = campFoodSeconds(run);
    if (
      run.clan.stage === 'final' &&
      foodSeconds !== undefined &&
      foodSeconds > Math.max(0, GAME.clan.finalDuration - run.clan.stageTime)
    )
      foodSeconds = undefined;
  }
  return { ...rates, foodSeconds };
}
