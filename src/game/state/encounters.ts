import { GAME } from '../config';
import {
  ENCOUNTER_ELITES,
  ENCOUNTER_PHASES,
  unlockedEnemy,
  type EncounterPhase,
} from '../data/encounters';
import { AREA_ENCOUNTERS } from '../data/areaEncounters';
import { areaRoster } from '../data/enemies';
import { chooseEnemy } from '../data/enemies';
import type { RunState } from '../types';
import { currentLocation } from './journey';
import { recordWaveEnded } from './researchRuntime';
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
    area: AREA_ENCOUNTERS[currentLocation(run).id],
  };
}
/** Returns a transition once, on active simulation time; opening menus cannot consume warnings. */
export function advanceEncounters(run: RunState, combatActive: boolean): boolean {
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
  if (changed && plan.phase === 'recovery') recordWaveEnded(run, combatActive);
  return changed && (plan.phase === 'warning' || plan.phase === 'elite');
}
export function encounterEnemy(run: RunState, random = Math.random) {
  const plan = encounterPlan(run),
    score = run.elapsed + run.clan.region * 80;
  const elite =
    plan.phase === 'elite' &&
    !run.encounters.eliteSpawned &&
    ENCOUNTER_ELITES.some((id) => !!unlockedEnemy(id, score));
  const ids = elite ? ENCOUNTER_ELITES : plan.enemies;
  const available = ids.flatMap((id) => {
    const e = unlockedEnemy(id, score);
    return e ? [e] : [];
  });
  const locals = areaRoster(currentLocation(run).id, score, run.clan.stageTime).filter(
    (e) => !!e.home,
  );
  const gentleOpening = run.clan.region === 0 && run.clan.stageTime < GAME.spawning.openingDuration;
  if (!elite && !gentleOpening && locals.length && random() < GAME.areaEnemies.localShare) {
    return {
      definition: locals[Math.min(locals.length - 1, Math.floor(random() * locals.length))]!,
      elite: false,
    };
  }
  return {
    definition: available.length
      ? available[
          elite ? 0 : Math.min(available.length - 1, Math.floor(random() * available.length))
        ]!
      : chooseEnemy(score, random),
    elite,
  };
}

/** Crossing waves and gatherings retain familiar enemies while admitting natives of the physical area. */
export function supportingAreaEnemy(run: RunState, index: number, preferred: readonly string[]) {
  const score = run.elapsed + run.clan.region * 80;
  const local = areaRoster(currentLocation(run).id, score, run.clan.stageTime).filter(
    (e) => !!e.home,
  );
  if (index % 3 === 0 && local.length) return local[Math.floor(index / 3) % local.length]!;
  return preferred.map((id) => unlockedEnemy(id, score)).find(Boolean) ?? chooseEnemy(score);
}
