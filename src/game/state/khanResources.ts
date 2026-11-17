import { GAME } from '../config';
import { classDefinition } from '../data/classes';
import type { RunState } from '../types';

/**
 * The Khan's expedition resources. Breath is the stamina every class shares: it pays for the
 * gallop and refills over active time.
 */
export interface KhanResources {
  /** Breath, from 0 to `GAME.stamina.maximum`. */
  stamina: number;
  /** A gallop is in progress and draining Breath. */
  sprinting: boolean;
  /** The gallop input must be released before another gallop can start. */
  winded: boolean;
}

export function createKhanResources(): KhanResources {
  return { stamina: GAME.stamina.maximum, sprinting: false, winded: false };
}

/** The Khan's resources in a timers object, created full on first use (older saves lack it). */
export function khanResourcesOf(timers: { khanResources?: KhanResources }): KhanResources {
  return (timers.khanResources ??= createKhanResources());
}

/** Breath a gallop drains per second, after the class and camp gallop modifiers. */
export function sprintDrain(run: Pick<RunState, 'clan'>): number {
  return GAME.stamina.sprintDrain * run.clan.campEffects.multipliers.gallopCooldown;
}

/** Riding speed multiplier while galloping, including the class gallop modifier. */
export function sprintSpeedMultiplier(run: Pick<RunState, 'character'>): number {
  return (
    GAME.stamina.sprintSpeed * classDefinition(run.character?.classId).stats.gallopSpeedMultiplier
  );
}

/**
 * Advances the gallop and Breath for one active step. A gallop starts on a fresh press with
 * enough Breath, drains while held and stops when released or out of Breath; Breath refills
 * whenever the Khan is not galloping and `refill` allows it. Reports the step a gallop starts,
 * and the step a press is refused for lack of Breath.
 */
export function advanceSprint(
  resources: KhanResources,
  dt: number,
  options: { held: boolean; able: boolean; drain: number; refill?: boolean },
): 'started' | 'refused' | undefined {
  if (!Number.isFinite(dt) || dt <= 0) return undefined;
  const { held, able, drain } = options;
  let outcome: 'started' | 'refused' | undefined;
  if (!held) resources.winded = false;
  if (!held || !able) resources.sprinting = false;
  else if (!resources.sprinting && !resources.winded) {
    if (resources.stamina >= GAME.stamina.sprintMinimum) {
      resources.sprinting = true;
      outcome = 'started';
    } else {
      resources.winded = true;
      outcome = 'refused';
    }
  }
  if (resources.sprinting) {
    resources.stamina -= drain * dt;
    if (resources.stamina <= 0) {
      resources.stamina = 0;
      resources.sprinting = false;
      resources.winded = true;
    }
  } else if (able && options.refill !== false)
    resources.stamina = Math.min(
      GAME.stamina.maximum,
      resources.stamina + GAME.stamina.refill * dt,
    );
  return outcome;
}

/** A successor Khan returns rested. */
export function restKhan(resources: KhanResources): void {
  resources.stamina = GAME.stamina.maximum;
  resources.sprinting = false;
  resources.winded = false;
}
