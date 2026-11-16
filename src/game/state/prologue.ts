import type { CharacterProfile } from '../../shared/characterProfile';
import { GAME } from '../config';
import {
  PROLOGUE_STAGE_IDS,
  prologueStage,
  type PrologueBeat,
  type PrologueCompletionRule,
  type PrologueStageId,
} from '../data/prologue';
import type { RunState } from '../types';
import type { StartingTraditionId } from '../data/clan';
import { createRun } from './run';

export interface PrologueCounters {
  lightReleases: number;
  heavyReleases: number;
  abilityUses: { q: number; w: number; e: number; r: number };
  objectivesCompleted: number;
  wavesCleared: number;
  beastDefeated: boolean;
  buildingsPurchased: number;
}

export interface PrologueState {
  stage: PrologueStageId;
  beat: number;
  stageTime: number;
  beatTime: number;
  holdTime: number;
  counters: PrologueCounters;
  campEstablished: boolean;
  routesOpened: boolean;
  completed: boolean;
}

export interface PrologueRuleContext {
  distanceToSite?: (site: PrologueCompletionRule & { site: unknown }) => number | undefined;
}

export type PrologueEvent =
  | { type: 'beat'; completedBeat: string; beat?: PrologueBeat }
  | { type: 'stage'; stage: PrologueStageId }
  | { type: 'camp-established' }
  | { type: 'complete' };

export function createPrologue(stage: PrologueStageId = 'arrival'): PrologueState {
  return {
    stage,
    beat: 0,
    stageTime: 0,
    beatTime: 0,
    holdTime: 0,
    counters: {
      lightReleases: 0,
      heavyReleases: 0,
      abilityUses: { q: 0, w: 0, e: 0, r: 0 },
      objectivesCompleted: 0,
      wavesCleared: 0,
      beastDefeated: false,
      buildingsPurchased: 0,
    },
    campEstablished: false,
    routesOpened: false,
    completed: false,
  };
}

export function createPrologueRun(
  tradition: StartingTraditionId = 'shared-hearth',
  character?: CharacterProfile,
): RunState {
  const run = createRun(tradition, character);
  run.prologue = createPrologue();
  run.clan.locationId = 'karakorum';
  run.clan.food = GAME.prologue.startingSupplies.food;
  run.clan.materials = GAME.prologue.startingSupplies.materials;
  run.clan.spirit = GAME.prologue.startingSupplies.spirit;
  run.legacy.khans[0]!.locationId = 'karakorum';
  return run;
}

export function prologueActive(run: RunState): boolean {
  return !!run.prologue && !run.prologue.completed;
}

export function currentPrologueBeat(run: RunState): PrologueBeat | undefined {
  const prologue = run.prologue;
  if (!prologue || prologue.completed) return;
  return prologueStage(prologue.stage).beats[prologue.beat];
}

export function setPrologueStage(run: RunState, stage: PrologueStageId): boolean {
  if (!run.prologue || !PROLOGUE_STAGE_IDS.includes(stage)) return false;
  Object.assign(run.prologue, {
    stage,
    beat: 0,
    stageTime: 0,
    beatTime: 0,
    holdTime: 0,
    campEstablished: false,
    routesOpened: false,
    completed: false,
  });
  return true;
}

/** Pure completion checks shared by future training, patrol, omen and boss directors. */
export function prologueRuleSatisfied(
  run: RunState,
  rule: PrologueCompletionRule,
  distanceToSite?: (
    site: Extract<PrologueCompletionRule, { site: unknown }>['site'],
  ) => number | undefined,
): boolean {
  const state = run.prologue;
  if (!state) return false;
  switch (rule.kind) {
    case 'reach-site':
      return (distanceToSite?.(rule.site) ?? Infinity) <= rule.radius;
    case 'hold-site':
      return state.holdTime >= rule.seconds;
    case 'light-releases':
      return state.counters.lightReleases >= rule.count;
    case 'heavy-releases':
      return state.counters.heavyReleases >= rule.count;
    case 'ability-used':
      return state.counters.abilityUses[rule.slot] > 0;
    case 'galloped':
      return run.combat.gallopSerial > 0;
    case 'objective-complete':
      return state.counters.objectivesCompleted > 0;
    case 'wave-cleared':
      return state.counters.wavesCleared >= rule.wave;
    case 'level':
      return run.level >= rule.level;
    case 'beast-defeated':
      return state.counters.beastDefeated;
    case 'camp-established':
      return state.campEstablished;
    case 'building-purchased':
      return state.counters.buildingsPurchased > 0;
    case 'routes-opened':
      return state.routesOpened;
  }
}

function nextStage(state: PrologueState): PrologueStageId | undefined {
  return PROLOGUE_STAGE_IDS[PROLOGUE_STAGE_IDS.indexOf(state.stage) + 1];
}

function enterStage(state: PrologueState, stage: PrologueStageId): void {
  Object.assign(state, { stage, beat: 0, stageTime: 0, beatTime: 0, holdTime: 0 });
}

function establishCamp(run: RunState): void {
  const state = run.prologue!;
  state.campEstablished = true;
  state.routesOpened = true;
  state.completed = true;
  state.beat = prologueStage('return').beats.length;
  run.clan.food = Math.max(run.clan.food, GAME.prologue.establishedSupplies.food);
  run.clan.materials = Math.max(run.clan.materials, GAME.prologue.establishedSupplies.materials);
  run.clan.message = 'The Blue Banner camp is established. The road into Orkhon Valley is open.';
}

/**
 * Advances only active gameplay time. Phase 2 passes the authored combat stages straight through,
 * leaving their content and rule contracts ready for the later focused phases.
 */
export function advancePrologue(
  run: RunState,
  dt: number,
  distanceToSite?: (
    site: Extract<PrologueCompletionRule, { site: unknown }>['site'],
  ) => number | undefined,
): PrologueEvent[] {
  const state = run.prologue;
  if (!state || state.completed || run.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0)
    return [];
  state.stageTime += dt;
  state.beatTime += dt;
  const events: PrologueEvent[] = [];
  while (prologueStage(state.stage).phase2PassThrough) {
    const next = nextStage(state);
    if (!next) break;
    enterStage(state, next);
    events.push({ type: 'stage', stage: next });
  }
  const beat = currentPrologueBeat(run);
  if (!beat) return events;
  if (beat.rule.kind === 'hold-site') {
    const near = (distanceToSite?.(beat.rule.site) ?? Infinity) <= beat.rule.radius;
    state.holdTime = near ? state.holdTime + dt : 0;
  }
  if (!prologueRuleSatisfied(run, beat.rule, distanceToSite)) return events;
  const completedBeat = beat.id;
  state.beat += 1;
  state.beatTime = 0;
  state.holdTime = 0;
  let nextBeat = currentPrologueBeat(run);
  events.push({ type: 'beat', completedBeat, beat: nextBeat });
  if (nextBeat) return events;
  if (state.stage === 'return') {
    establishCamp(run);
    events.push({ type: 'camp-established' }, { type: 'complete' });
    return events;
  }
  const next = nextStage(state);
  if (!next) return events;
  enterStage(state, next);
  events.push({ type: 'stage', stage: next });
  while (prologueStage(state.stage).phase2PassThrough) {
    const following = nextStage(state);
    if (!following) break;
    enterStage(state, following);
    events.push({ type: 'stage', stage: following });
  }
  nextBeat = currentPrologueBeat(run);
  return events;
}

/** Skip has the same deterministic endpoint as the temporary Stage 6. */
export function skipPrologue(run: RunState): boolean {
  if (!run.prologue || run.prologue.completed) return false;
  enterStage(run.prologue, 'return');
  establishCamp(run);
  return true;
}
