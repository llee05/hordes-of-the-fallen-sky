import { GAME } from '../config';
import type { RunState } from '../types';
import { isKhanActive } from './khan';
import { rememberClan } from './legacy';
import { skybreakerReaction } from '../data/storyReactions';
export interface PassageWork {
  x?: number;
  y?: number;
  progress: number;
  done: boolean;
}
export interface FinalStandState {
  phase: 'advance' | 'warning' | 'recovery';
  remaining: number;
  cycle: number;
  approach: number;
  aim?: { x: number; y: number };
  lastCampBarrage?: number;
  works: PassageWork[];
}
export function finalChapter(run: RunState): 0 | 1 | 2 {
  return run.clan.stageTime >= GAME.finalStand.chapterAt[1]
    ? 2
    : run.clan.stageTime >= GAME.finalStand.chapterAt[0]
      ? 1
      : 0;
}
export function syncFinalStand(run: RunState): FinalStandState | undefined {
  if (run.clan.stage !== 'final') return;
  return (run.finalStand ??= {
    phase: 'advance',
    remaining: GAME.finalStand.advanceSeconds[finalChapter(run)],
    cycle: 0,
    approach: 0,
    works: GAME.finalStand.workUnlockAt.map(() => ({ progress: 0, done: false })),
  });
}
export function passageBonus(run: RunState): number {
  return (
    (run.finalStand?.works.filter((work) => work.done).length ?? 0) * GAME.finalStand.workBonus
  );
}
export function passageProgress(run: RunState): number {
  return Math.min(1, (run.clan.stageTime + passageBonus(run)) / GAME.clan.finalDuration);
}
/** One transition per active update; no catch-up volleys after menus or loading. */
export function advanceFinalStand(
  run: RunState,
  dt: number,
  bossAlive: boolean,
  player: { x: number; y: number },
  contested: readonly boolean[],
): 'warning' | 'release' | 'approach' | undefined {
  if (run.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
  const state = syncFinalStand(run);
  if (!state) return;
  state.works.forEach((work, index) => {
    if (
      work.done ||
      run.clan.stageTime < GAME.finalStand.workUnlockAt[index]! ||
      !isKhanActive(run) ||
      contested[index] ||
      work.x === undefined ||
      work.y === undefined
    )
      return;
    if (Math.hypot(player.x - work.x, player.y - work.y) > GAME.finalStand.workRadius) return;
    work.progress = Math.min(GAME.finalStand.workSeconds, work.progress + dt);
    if (work.progress === GAME.finalStand.workSeconds) {
      work.done = true;
      run.clan.message = `A work party cleared the passage. Escape is ${GAME.finalStand.workBonus} seconds closer.`;
    }
  });
  if (!bossAlive) return;
  state.remaining = Math.max(0, state.remaining - dt);
  if (state.remaining > 0) return;
  if (state.phase === 'advance') {
    state.phase = 'warning';
    state.remaining = GAME.finalStand.warningSeconds;
    return 'warning';
  }
  if (state.phase === 'warning') {
    state.phase = 'recovery';
    state.remaining = GAME.finalStand.recoverySeconds;
    return 'release';
  }
  state.phase = 'advance';
  state.cycle++;
  state.approach = state.cycle % 4;
  state.remaining = GAME.finalStand.advanceSeconds[finalChapter(run)];
  state.aim = undefined;
  return 'approach';
}
/** The camp braces against a barrage once; its later projectiles still hit the hurdle artwork. */
export function acceptCampBarrage(run: RunState, barrage?: number): boolean {
  if (barrage === undefined || !run.finalStand) return true;
  if (barrage <= (run.finalStand.lastCampBarrage ?? -1)) return false;
  run.finalStand.lastCampBarrage = barrage;
  return true;
}
/** Returns false after the first defeat so repeated hits cannot grant rewards or memories. */
export function defeatSkybreaker(run: RunState): boolean {
  if (run.clan.finalBossDefeated) return false;
  run.clan.finalBossDefeated = true;
  run.clan.integrity = Math.min(100, run.clan.integrity + GAME.finalStand.bossResolve);
  run.clan.message = 'The Skybreaker has fallen. Protect the families until the passage opens.';
  rememberClan(
    run,
    'The Skybreaker fell',
    `${run.clan.population} people watched the great creature fall before the mountain passage.`,
    skybreakerReaction(),
    'The great creature lies still. The few who remain turn back to the wagons.',
  );
  return true;
}
