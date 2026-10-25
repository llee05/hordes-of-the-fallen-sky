import { GAME } from '../config';
import {
  ENCOUNTER_ELITES,
  ENCOUNTER_PHASES,
  unlockedEnemy,
  type EncounterPhase,
} from '../data/encounters';
import { chooseEnemy } from '../data/enemies';
import type { RunState } from '../types';
import { currentLocation } from './journey';
import { terrainSeed } from '../terrain/noise';

export interface EncounterState {
  key: string;
  phase?: EncounterPhase;
  eliteSpawned: boolean;
}
export function createEncounters(): EncounterState {
  return { key: '', eliteSpawned: false };
}
export function encounterPlan(run: RunState) {
  const intro = GAME.spawning.openingDuration;
  const duration = ENCOUNTER_PHASES.reduce((sum, p) => sum + p.duration, 0);
  const age = Math.max(0, run.clan.stageTime - intro),
    cycle = Math.floor(age / duration);
  let time = age % duration;
  let phase = ENCOUNTER_PHASES[0] as (typeof ENCOUNTER_PHASES)[number];
  for (const p of ENCOUNTER_PHASES) {
    phase = p;
    if (time < p.duration) break;
    time -= p.duration;
  }
  const angle =
    ((terrainSeed(`${currentLocation(run).id}:${run.clan.region}:${cycle}`) % 8) * Math.PI) / 4;
  return {
    key: `${run.clan.region}:${run.clan.stage}:${currentLocation(run).id}:${cycle}`,
    phase: (run.clan.stageTime < intro ? 'probing' : phase.id) as EncounterPhase,
    title: run.clan.stageTime < intro ? 'Scattered scouts' : phase.title,
    remaining: run.clan.stageTime < intro ? intro - run.clan.stageTime : phase.duration - time,
    interval: run.clan.stageTime < intro ? 1 : phase.interval * (0.8 + run.clan.pasture * 0.002),
    angle,
    enemies: phase.enemies as readonly string[],
  };
}
/** Returns a transition once, on active simulation time; opening menus cannot consume warnings. */
export function advanceEncounters(run: RunState): boolean {
  if (run.phase !== 'playing') return false;
  const plan = encounterPlan(run),
    state = run.encounters;
  if (state.key !== plan.key) {
    state.key = plan.key;
    state.eliteSpawned = false;
    state.phase = undefined;
  }
  const changed = state.phase !== plan.phase;
  state.phase = plan.phase;
  return changed && (plan.phase === 'warning' || plan.phase === 'elite');
}
export function encounterEnemy(run: RunState, random = Math.random) {
  const plan = encounterPlan(run),
    score = run.elapsed + run.clan.region * 80;
  const elite = plan.phase === 'elite' && !run.encounters.eliteSpawned;
  const ids = elite ? ENCOUNTER_ELITES : plan.enemies;
  const available = ids.flatMap((id) => {
    const e = unlockedEnemy(id, score);
    return e ? [e] : [];
  });
  return {
    definition: available.length
      ? available[
          elite ? 0 : Math.min(available.length - 1, Math.floor(random() * available.length))
        ]!
      : chooseEnemy(score, random),
    elite,
  };
}
