import { GAME } from '../config';
import { AREA_ENCOUNTERS } from '../data/areaEncounters';
import type { RunState } from '../types';
import { currentLocation } from './journey';
import { encounterPlan } from './encounters';
export interface AreaEncounterState {
  key: string;
  clock: number;
  announced: boolean;
  nextThreat: number;
  sequence: number;
  arrivals: number;
}
export function createAreaEncounter(): AreaEncounterState {
  return {
    key: '',
    clock: 0,
    announced: false,
    nextThreat: GAME.areaCombat.ruleEvery,
    sequence: 0,
    arrivals: 0,
  };
}
export function syncAreaEncounter(state: AreaEncounterState, run: RunState): boolean {
  const key = `${run.clan.region}:${run.clan.stage}:${currentLocation(run).id}`;
  if (state.key === key) return false;
  Object.assign(state, createAreaEncounter(), { key });
  return true;
}
/** Timers advance only with simulation; recovery windows hold at most one pending terrain event. */
export function advanceAreaEncounter(
  state: AreaEncounterState,
  run: RunState,
  dt: number,
): 'lesson' | 'terrain' | undefined {
  if (run.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
  syncAreaEncounter(state, run);
  state.clock += dt;
  if (!state.announced && state.clock >= GAME.areaCombat.lessonAt) {
    state.announced = true;
    return 'lesson';
  }
  const area = AREA_ENCOUNTERS[currentLocation(run).id],
    plan = encounterPlan(run);
  if (
    area.threat &&
    state.clock >= state.nextThreat &&
    (plan.phase === 'assault' || plan.phase === 'elite') &&
    run.clan.stage !== 'migration'
  ) {
    state.nextThreat = state.clock + GAME.areaCombat.ruleEvery;
    state.sequence++;
    return 'terrain';
  }
}
export function areaArrivalAngle(state: AreaEncounterState, run: RunState, base: number): number {
  const area = AREA_ENCOUNTERS[currentLocation(run).id];
  if (run.clan.region === 0 && run.clan.stageTime < GAME.spawning.openingDuration) return base;
  const side = state.arrivals % 2 ? 1 : -1;
  if (area.pattern === 'banks') return base + (side * Math.PI) / 2;
  if (area.pattern === 'flanks') return base + (side * Math.PI) / 3;
  if (area.pattern === 'crossfire') return base + (((state.arrivals % 3) - 1) * Math.PI) / 2;
  return base + (side * Math.PI) / 6;
}
