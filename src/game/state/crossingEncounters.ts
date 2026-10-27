import { restoreResolve } from './clan';
import { GAME } from '../config';
import { CROSSING_ENCOUNTERS, type CrossingRoute } from '../data/crossings';
import {
  CROSSING_OBJECTIVE_ACCOUNTS,
  CROSSING_OBJECTIVE_REMNANT,
  SAFE_CROSSING_REMNANT,
  crossingObjectiveReaction,
  safeCrossingReaction,
} from '../data/storyReactions';
import { rememberClan } from './legacy';
import type { RunState } from '../types';
import { isKhanActive } from './khan';
export interface CrossingEncounter {
  key: string;
  route: CrossingRoute;
  phase: 'waiting' | 'warning' | 'assault' | 'cleared' | 'ended';
  remaining: number;
  spawnDelay: number;
  spawned: number;
  defeated: number;
  paid: boolean;
  lossesAtDeparture: number;
  escort?: {
    x: number;
    y: number;
    progress: number;
    exposure: number;
    joined: boolean;
    lost: boolean;
  };
}
export function beginCrossingEncounter(run: RunState): void {
  const route = run.clan.routeId as CrossingRoute;
  if (!(route in CROSSING_ENCOUNTERS)) {
    run.crossing = undefined;
    return;
  }
  run.crossing = {
    key: `${run.clan.region}:${route}:${run.elapsed}`,
    route,
    phase: 'waiting',
    remaining: GAME.crossings.warningSeconds,
    spawned: 0,
    defeated: 0,
    paid: false,
    lossesAtDeparture: run.story.peopleLost,
    spawnDelay: 0,
  };
}
/** Non-blocking encounters never hold a caravan indefinitely or change its provisions forecast. */
export function advanceCrossingEncounter(
  run: RunState,
  dt: number,
  player: { x: number; y: number },
  camp: { x: number; y: number },
  threats: number,
): boolean {
  const c = run.crossing;
  if (
    run.phase !== 'playing' ||
    run.clan.stage !== 'migration' ||
    !c ||
    !Number.isFinite(dt) ||
    dt <= 0
  )
    return false;
  if (c.phase === 'waiting' && run.clan.migrationProgress >= GAME.crossings.triggerProgress) {
    c.phase = 'warning';
    run.clan.message = CROSSING_ENCOUNTERS[c.route].warning;
    return true;
  }
  if (c.phase === 'warning') {
    c.remaining = Math.max(0, c.remaining - dt);
    if (c.remaining === 0) c.phase = 'assault';
  }
  if (c.spawned >= CROSSING_ENCOUNTERS[c.route].guards && c.defeated >= c.spawned)
    c.phase = 'cleared';
  const e = c.escort;
  if (e && !e.joined && !e.lost) {
    if (threats > 0) e.exposure += dt;
    else e.exposure = Math.max(0, e.exposure - dt * 0.5);
    if (e.exposure >= GAME.crossings.escortExposure) {
      e.lost = true;
      run.clan.message =
        'The scattered households could not reach the column. The caravan must keep moving.';
    }
    if (
      isKhanActive(run) &&
      threats === 0 &&
      Math.hypot(player.x - e.x, player.y - e.y) < GAME.field.escortLeash &&
      Math.hypot(camp.x - e.x, camp.y - e.y) < GAME.crossings.joinRadius
    ) {
      e.progress += dt;
      if (e.progress >= GAME.crossings.joinSeconds) {
        e.joined = true;
        run.clan.message =
          'The households have joined the column. Their arrival is secured if the crossing succeeds.';
      }
    }
  }
  return false;
}
/** Optional benefits are transactions at successful arrival, alongside the original route reward. */
export function settleCrossingEncounter(run: RunState): boolean {
  const c = run.crossing;
  if (
    !c ||
    c.paid ||
    run.phase !== 'playing' ||
    run.clan.stage !== 'migration' ||
    run.clan.migrationProgress < 1 ||
    run.clan.population <= 0 ||
    run.clan.integrity <= 0
  )
    return false;
  c.paid = true;
  c.phase = 'ended';
  if (run.story.peopleLost === c.lossesAtDeparture) {
    run.safety.protectedCrossings++;
    restoreResolve(run, GAME.crossings.safeResolve);
    rememberClan(
      run,
      'Every household arrived',
      `No one was lost on the crossing, and the clan’s resolve rose by ${GAME.crossings.safeResolve}.`,
      safeCrossingReaction(run, c.route),
      SAFE_CROSSING_REMNANT,
    );
  }
  const success =
    c.route === 'refuge'
      ? !!c.escort?.joined
      : c.spawned >= CROSSING_ENCOUNTERS[c.route].guards && c.defeated >= c.spawned;
  if (!success) return false;
  if (c.route === 'river') restoreResolve(run, GAME.crossings.riverResolve);
  if (c.route === 'ridge') {
    run.clan.materials += GAME.crossings.ridgeMaterials;
    restoreResolve(run, GAME.crossings.ridgeResolve);
  }
  if (c.route === 'refuge') {
    run.clan.population = Math.min(
      GAME.clan.maxPopulation,
      run.clan.population + GAME.crossings.refugePeople,
    );
    restoreResolve(run, GAME.crossings.refugeResolve);
  }
  rememberClan(
    run,
    CROSSING_ENCOUNTERS[c.route].title,
    `${CROSSING_OBJECTIVE_ACCOUNTS[c.route]} ${CROSSING_ENCOUNTERS[c.route].reward}.`,
    crossingObjectiveReaction(run, c.route),
    CROSSING_OBJECTIVE_REMNANT,
  );
  return true;
}
