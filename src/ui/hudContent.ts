import { GAME } from '../game/config';
import { AREA_ENCOUNTERS } from '../game/data/areaEncounters';
import { FIELD_OBJECTIVES } from '../game/data/fieldObjectives';
import { prologueStage } from '../game/data/prologue';
import { encounterPlan } from '../game/state/encounters';
import { arrivalLocation, currentLocation } from '../game/state/journey';
import { currentPrologueBeat } from '../game/state/prologue';
import { canMigrate } from '../game/state/clan';
import type { RunState } from '../game/types';

/** Renderer-independent text for the battlefield HUD. GameUI only places these strings. */

const LOSS_CAUSES = {
  attack: 'Enemy attacks',
  starvation: 'Starvation',
  seer: 'Seer strike',
  area: 'Local terrain or spell',
} as const;

/** How long a clan loss stays on the objective panel, in active seconds. */
export const RECENT_LOSS_SECONDS = 10;

export interface LossReport {
  /** The latest hit while it is fresh; empty once it ages out. */
  recent: string;
  /** Running tally for the collapsed clan details; empty until something is lost. */
  tally: string;
}

export function lossReport(run: RunState): LossReport {
  const last = run.safety.lastDamage;
  const recent = last && run.elapsed - last.at < RECENT_LOSS_SECONDS;
  const total = run.safety.combatLosses + run.safety.starvationLosses;
  return {
    recent: recent
      ? `${LOSS_CAUSES[last.cause]}: −${last.amount.toFixed(1)} resolve${last.people ? ` (${last.people} people)` : ''}`
      : '',
    tally: total
      ? `Lost ${run.safety.combatLosses} to combat · ${run.safety.starvationLosses} to hunger`
      : '',
  };
}

const APPROACHES = {
  flanks: 'Alternating flanks',
  banks: 'Both banks',
  shelves: 'Ridge approaches',
  shelter: 'Outcrop approaches',
  crossfire: 'Crossfire approaches',
} as const;

export interface EncounterLine {
  text: string;
  /** The local rule and counter, kept for the tooltip and the chronicle. */
  title: string;
}

export function encounterLine(run: RunState): EncounterLine {
  const encounter = encounterPlan(run);
  const area = AREA_ENCOUNTERS[currentLocation(run).id];
  const tactical = ['warning', 'assault', 'elite'].includes(encounter.phase);
  return {
    text: `${encounter.title}${tactical ? ` · ${APPROACHES[area.pattern]}` : ''} · ${Math.ceil(encounter.remaining)}s`,
    title: `${area.title}. ${area.rule} ${area.counter}`,
  };
}

export interface FieldObjectiveLine {
  text: string;
  /** The full instruction stays one hover away instead of filling the panel. */
  title: string;
}

/** The optional field objective in one short line, or undefined when nothing is on offer. */
export function fieldObjectiveLine(
  run: RunState,
  bearing: string | undefined,
): FieldObjectiveLine | undefined {
  const objective = run.field.objective;
  if (run.prologue && !run.prologue.completed) return;
  if (!objective || !['available', 'returning'].includes(objective.status)) return;
  const definition = FIELD_OBJECTIVES[objective.kind];
  const progress =
    objective.kind === 'gathering' ? ` · ${objective.defeated}/${GAME.field.guards}` : '';
  const stage = objective.status === 'returning' ? 'Escort to camp' : definition.reward;
  return {
    text: `Optional${bearing ? ` ${bearing}` : ''}: ${definition.title} · ${stage}${progress}`,
    title: `${definition.title}. ${definition.instruction} ${definition.reward}`,
  };
}

/** The camp pressure sentinel for an idle camp; nothing to show while approaches are clear. */
export function campPressureLine(pressure: string | undefined): string {
  return !pressure || pressure === 'Camp approaches clear' ? '' : pressure;
}

export interface StageLabels {
  location: string;
  age: string;
  stage: string;
  objective: string;
  hint: string;
}

export function stageLabels(run: RunState, fieldBearing: string | undefined): StageLabels {
  const clan = run.clan;
  const beat = currentPrologueBeat(run);
  const prologue = run.prologue && beat ? prologueStage(run.prologue.stage) : undefined;
  const region = currentLocation(run);
  const migrating = clan.stage === 'migration';
  return {
    location: prologue ? `${prologue.numeral} · ${prologue.title.toUpperCase()}` : region.short,
    age: prologue
      ? 'PROLOGUE'
      : migrating
        ? 'ON THE MOVE'
        : `DAY ${1 + Math.floor(clan.stageTime / 30)}`,
    stage: prologue ? prologue.title.toUpperCase() : migrating ? 'THE GREAT FLIGHT' : 'ENCAMPMENT',
    objective: beat
      ? `${beat.objective}${fieldBearing ? ` · ${fieldBearing}` : ''}`
      : migrating
        ? `Escort the caravan to ${arrivalLocation(run).name}.`
        : 'Grow the camp. Keep your people alive.',
    hint: beat
      ? beat.rule.kind === 'hold-site'
        ? `Hold position · ${run.prologue!.holdTime.toFixed(1)} / ${beat.rule.seconds.toFixed(1)}s`
        : 'Follow the brass marker.'
      : migrating
        ? 'Guard the wagons on the road east.'
        : canMigrate(run)
          ? 'The roads are open. Pack up with M.'
          : `Routes open in ${Math.ceil(GAME.clan.minimumCamp - clan.stageTime)}s. Build up the camp with B.`,
  };
}

export function dashLabel(khanActive: boolean, dashReady: number, dashCooldown: number): string {
  if (!khanActive) return 'CHOOSING A KHAN';
  return dashReady >= 1
    ? 'SPACE / READY'
    : `RECHARGING ${((1 - dashReady) * dashCooldown).toFixed(1)}s`;
}

export function abilityStatus(remaining: number): string {
  return remaining > 0 ? `${remaining.toFixed(1)}s` : 'READY';
}

export interface CommandVisibility {
  build: boolean;
  formation: boolean;
  migrate: boolean;
  /** The whole command group, hidden before the Blue Banner camp exists. */
  dock: boolean;
}

/** Commands that cannot apply right now leave the screen instead of sitting disabled. */
export function commandVisibility(run: RunState, formations: number): CommandVisibility {
  const established = !run.prologue || run.prologue.campEstablished;
  const migrating = run.clan.stage === 'migration';
  return {
    dock: established,
    build: established && !migrating,
    formation: established && formations > 1,
    migrate: established && !migrating,
  };
}
