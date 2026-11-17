import { GAME } from '../config';
import {
  classDefinition,
  type ClassAbilityDefinition,
  type ClassHeavyAttackDefinition,
  type ClassResourceDefinition,
  type ClassResourceEvent,
} from '../data/classes';
import type { RunState } from '../types';
import { drumWaveCount } from './classActions';

/**
 * The Khan's expedition resources. Breath is the stamina every class shares: it pays for the
 * gallop and for heavy attacks, and refills over active time. The class resource (Focus, Momentum,
 * Mettle or Spiritual Energy) is earned by fighting, never refills by itself, and is spent only on
 * abilities 1 to 4.
 */
export interface KhanResources {
  /** Breath, from 0 to `GAME.stamina.maximum`. */
  stamina: number;
  /** The class resource, in whole points from 0 to the class maximum. */
  classPower: number;
  /** A gallop is in progress and draining Breath. */
  sprinting: boolean;
  /** The gallop input must be released before another gallop can start. */
  winded: boolean;
}

export function createKhanResources(): KhanResources {
  return { stamina: GAME.stamina.maximum, classPower: 0, sprinting: false, winded: false };
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

/** Spends Breath when the pool can pay in full; otherwise spends nothing. */
export function spendBreath(resources: KhanResources, amount: number): boolean {
  if (!Number.isFinite(amount) || amount < 0 || resources.stamina + 1e-9 < amount) return false;
  resources.stamina = Math.max(0, resources.stamina - amount);
  return true;
}

/** How far a hold of `charge` seconds is from the shortest release (0) to a full charge (1). */
function heavyChargeRatio(heavy: ClassHeavyAttackDefinition, charge: number): number {
  const maximum = (heavy.charge ?? heavy.holdCharge)?.maxDuration;
  if (maximum === undefined || maximum <= heavy.windup || !Number.isFinite(charge)) return 0;
  return Math.max(0, Math.min(1, (charge - heavy.windup) / (maximum - heavy.windup)));
}

/** Breath a heavy attack costs when released after `charge` seconds of hold. */
export function heavyBreathCost(heavy: ClassHeavyAttackDefinition, charge: number): number {
  const { tap, full } = heavy.breath;
  if (heavy.charge?.kind === 'waves')
    return tap * drumWaveCount(charge, heavy.windup, heavy.charge.waveEvery, heavy.charge.maxWaves);
  return tap + (full - tap) * heavyChargeRatio(heavy, charge);
}

/**
 * The longest hold, in seconds, that `breath` can pay for, or undefined when it cannot pay for
 * the shortest release. A heavy attack without a charge returns its windup.
 */
export function affordableCharge(
  heavy: ClassHeavyAttackDefinition,
  breath: number,
): number | undefined {
  const { tap, full } = heavy.breath;
  if (breath + 1e-9 < tap) return undefined;
  const maximum = (heavy.charge ?? heavy.holdCharge)?.maxDuration;
  if (maximum === undefined) return heavy.windup;
  if (breath + 1e-9 >= full) return maximum;
  if (heavy.charge?.kind === 'waves') {
    // Hold halfway into the last wave Breath can pay for, clear of the next wave's threshold.
    const waves = Math.min(heavy.charge.maxWaves, Math.floor((breath + 1e-9) / tap));
    return Math.min(maximum, heavy.windup + (waves - 0.5) * heavy.charge.waveEvery);
  }
  return heavy.windup + ((breath - tap) / (full - tap)) * (maximum - heavy.windup);
}

/** Earns class resource for `times` occurrences of `event`; returns the points gained. */
export function earnClassPower(
  resources: KhanResources,
  resource: ClassResourceDefinition,
  event: ClassResourceEvent,
  times = 1,
): number {
  const points = (resource.earn[event] ?? 0) * Math.max(0, Math.floor(times));
  const before = resources.classPower;
  resources.classPower = Math.max(0, Math.min(resource.maximum, before + points));
  return resources.classPower - before;
}

/** Whether the stored class resource can pay for `ability`. */
export function canAffordAbility(
  resources: KhanResources,
  ability: Pick<ClassAbilityDefinition, 'cost'>,
): boolean {
  return resources.classPower >= ability.cost;
}

/** Points `ability` would spend now: its cost, or everything stored when it takes all. */
export function abilitySpend(
  resources: KhanResources,
  ability: Pick<ClassAbilityDefinition, 'cost' | 'spendsAll'>,
): number {
  return ability.spendsAll ? Math.max(ability.cost, resources.classPower) : ability.cost;
}

/** A successor Khan returns rested, having earned nothing yet. */
export function restKhan(resources: KhanResources): void {
  resources.stamina = GAME.stamina.maximum;
  resources.classPower = 0;
  resources.sprinting = false;
  resources.winded = false;
}
