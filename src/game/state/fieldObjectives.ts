import { GAME } from '../config';
import { FIELD_OBJECTIVES, type FieldObjectiveKind } from '../data/fieldObjectives';
import type { RunState } from '../types';
import { currentLocation } from './journey';
import { rememberClan } from './legacy';
import { isKhanActive } from './khan';

export interface FieldObjective {
  id: number;
  kind: FieldObjectiveKind;
  x: number;
  y: number;
  progress: number;
  status: 'available' | 'returning' | 'complete' | 'abandoned';
  guards: number;
  defeated: number;
}
export interface FieldState {
  key: string;
  issued: number;
  nextAt: number;
  objective?: FieldObjective;
}
export function createFieldState(): FieldState {
  return { key: '', issued: 0, nextAt: GAME.field.firstAt };
}
export function syncFieldState(run: RunState): void {
  const key = `${run.clan.region}:${run.clan.stage}:${currentLocation(run).id}`;
  if (run.field.key === key) return;
  const objective = run.field.objective;
  if (objective && (objective.status === 'available' || objective.status === 'returning'))
    objective.status = 'abandoned';
  run.field = { key, issued: 0, nextAt: GAME.field.firstAt };
}
export function fieldObjectiveDue(run: RunState): boolean {
  const old = run.field.objective;
  return (
    run.phase === 'playing' &&
    run.clan.stage === 'camp' &&
    run.field.issued < GAME.field.perCamp &&
    run.clan.stageTime >= run.field.nextAt &&
    (!old || old.status === 'complete' || old.status === 'abandoned')
  );
}
export function startFieldObjective(
  run: RunState,
  point: { x: number; y: number },
  kind?: FieldObjectiveKind,
): boolean {
  if (!fieldObjectiveDue(run) || !Number.isFinite(point.x + point.y)) return false;
  const kinds = Object.keys(FIELD_OBJECTIVES) as FieldObjectiveKind[];
  const selected = kind ?? kinds[(run.clan.region * 2 + run.field.issued) % kinds.length]!;
  run.field.issued++;
  run.field.objective = {
    id: run.field.issued,
    kind: selected,
    ...point,
    progress: 0,
    status: 'available',
    guards: 0,
    defeated: 0,
  };
  return true;
}
export function completeFieldObjective(run: RunState): boolean {
  const objective = run.field.objective;
  if (
    run.phase !== 'playing' ||
    !objective ||
    !['available', 'returning'].includes(objective.status)
  )
    return false;
  objective.status = 'complete';
  const definition = FIELD_OBJECTIVES[objective.kind];
  const reward = GAME.field.rewards[objective.kind];
  run.clan.food += reward.food;
  run.clan.materials += reward.materials;
  run.clan.spirit += reward.spirit;
  run.clan.herd = Math.min(GAME.clan.maxHerd, run.clan.herd + reward.horses);
  run.clan.population = Math.min(GAME.clan.maxPopulation, run.clan.population + reward.people);
  run.clan.integrity = Math.min(100, run.clan.integrity + reward.resolve);
  run.field.nextAt = run.clan.stageTime + GAME.field.between;
  run.clan.message = `${definition.title} secured. ${definition.reward}.`;
  rememberClan(
    run,
    definition.title,
    `${definition.instruction} Secured: ${definition.reward}.`,
    {
      speaker: 'boro',
      text: 'Another journey made together. Bring what we found beside the fire.',
    },
    'The remaining hands bring the rescued supplies and travellers into camp.',
  );
  return true;
}
export function advanceFieldObjective(
  run: RunState,
  dt: number,
  player: { x: number; y: number },
  camp: { x: number; y: number },
  threats: number,
): void {
  if (run.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0 || !isKhanActive(run)) return;
  const o = run.field.objective;
  if (!o || !['available', 'returning'].includes(o.status)) return;
  const near = Math.hypot(o.x - player.x, o.y - player.y) <= GAME.field.interactRadius;
  if (o.kind === 'gathering') {
    if (o.guards === GAME.field.guards && o.defeated >= o.guards) completeFieldObjective(run);
  } else if (o.status === 'available') {
    if (near && threats === 0) o.progress = Math.min(GAME.field.gatherSeconds, o.progress + dt);
    if (o.progress >= GAME.field.gatherSeconds) {
      if (o.kind === 'supplies') completeFieldObjective(run);
      else {
        o.status = 'returning';
        run.clan.message = 'They are following. Bring them safely back to camp.';
      }
    }
  } else if (Math.hypot(o.x - camp.x, o.y - camp.y) < GAME.field.returnRadius)
    completeFieldObjective(run);
}
