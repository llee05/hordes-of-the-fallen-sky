import { GAME } from '../config';
import type { RunState } from '../types';
import { echoInterval } from './researchRuntime';
export function selectNearestCompanion(
  run: RunState,
  player: { x: number; y: number },
  companions: { kind: 'rider' | 'echo'; index: number; x: number; y: number }[],
): void {
  if (run.phase !== 'playing') return;
  let nearest: string | undefined,
    distance = Infinity;
  for (const c of companions) {
    const d = Math.hypot(c.x - player.x, c.y - player.y);
    if (d < distance) {
      distance = d;
      nearest = `${c.kind}:${c.index}`;
    }
  }
  (run.researchRuntime ??= {}).nearestCompanion = nearest;
}
export function nearestCompanion(run: RunState, kind: 'rider' | 'echo', index: number): boolean {
  return run.researchRuntime?.nearestCompanion === `${kind}:${index}`;
}
export function claimEchoVolley(run: RunState, index: number, release: () => boolean): boolean {
  if (
    run.phase !== 'playing' ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= Math.min(run.patrons.ancestors.count, GAME.patrons.ancestors.maximum)
  )
    return false;
  if ((run.researchRuntime?.echoFireAt?.[index] ?? 0) > run.elapsed || !release()) return false;
  const r = (run.researchRuntime ??= {}),
    times = (r.echoFireAt ??= []);
  while (times.length <= index) times.push(0);
  times[index] = run.elapsed + echoInterval(run, nearestCompanion(run, 'echo', index));
  return true;
}
