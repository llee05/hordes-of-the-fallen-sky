import { GAME } from '../../config';
import type { WorldArchive } from '../../state/expeditionArchive';

/**
 * The nine timers a full save keeps, in one record shared by the scene and its
 * systems. Saves capture it with `{ ...timers }` and restore it with
 * `Object.assign(timers, saved)`, so a timer never lands on a field nobody reads.
 */
export type ArenaTimers = WorldArchive['timers'];

/** Timers at the start of a new or restarted scene, in saved key order. */
export function createArenaTimers(): ArenaTimers {
  return {
    spawnTimer: 0,
    attackTimer: 0,
    dashTimer: 0,
    dashRemaining: 0,
    invulnerable: 0,
    supportTimer: 0,
    wagonTimer: 0,
    wardTimer: 0,
    hazardTimer: GAME.hazards.initialDelay,
  };
}
