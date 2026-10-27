import { researchKhanHitProtection, stillwaterRefuge } from './researchRuntime';
import { rememberFallenKhan, rememberChosenKhan } from './legacy';
import { SUCCESSORS, type SuccessorTrait } from '../data/successors';
import { GAME } from '../config';
import type { RunState } from '../types';

export function isKhanActive(run: RunState): boolean {
  return run.health > 0 && run.khan.successionRemaining <= 0;
}

/** Falling starts succession; it never creates an ended expedition phase. */
export function beginSuccession(run: RunState): boolean {
  if (run.phase !== 'playing' || run.health > 0 || run.khan.successionRemaining > 0) return false;
  rememberFallenKhan(run);
  delete run.khan.candidate;
  run.khan.successionRemaining = GAME.khan.successionDelay;
  run.clan.momentum = 0;
  run.clan.message = 'The Khan has fallen. The clan is choosing a new Khan.';
  return true;
}

export function damageKhan(
  run: RunState,
  amount: number,
): 'hit' | 'revived' | 'fallen' | undefined {
  if (run.phase !== 'playing' || !isKhanActive(run) || !Number.isFinite(amount) || amount <= 0)
    return;
  run.health = Math.max(
    0,
    run.health -
      amount *
        (stillwaterRefuge(run) ? GAME.research.refugeProtection : 1) *
        researchKhanHitProtection(run) *
        run.patrons.hearth.damageTaken *
        (run.khan.trait ? SUCCESSORS[run.khan.trait].protection : 1),
  );
  if (run.health > 0) return 'hit';
  if (run.patrons.hearth.revives > 0) {
    run.patrons.hearth.revives -= 1;
    run.health = run.stats.maxHealth * GAME.patrons.fire.revival;
    return 'revived';
  }
  beginSuccession(run);
  return 'fallen';
}

/** Only active gameplay seconds count; a lost clan cannot choose a successor. */
export function advanceSuccession(run: RunState, dt: number): boolean {
  if (
    run.phase !== 'playing' ||
    !Number.isFinite(dt) ||
    dt <= 0 ||
    run.khan.successionRemaining <= 0 ||
    run.clan.population <= 0 ||
    run.clan.integrity <= 0
  )
    return false;
  run.khan.successionRemaining = Math.max(0, run.khan.successionRemaining - dt);
  if (run.khan.successionRemaining > 0) return false;
  run.khan.generation += 1;
  delete run.khan.trait;
  if (run.khan.candidate) run.khan.trait = run.khan.candidate;
  delete run.khan.candidate;
  run.health = run.stats.maxHealth;
  rememberChosenKhan(run);
  run.clan.message = `A new Khan has been chosen. Khan ${run.khan.generation} rides from the camp.`;
  return true;
}

/** An optional, once-only preference during the existing active-time countdown. */
export function chooseSuccessor(run: RunState, trait: SuccessorTrait): boolean {
  if (
    run.phase !== 'playing' ||
    run.khan.successionRemaining <= 0 ||
    run.khan.candidate ||
    !Object.hasOwn(SUCCESSORS, trait)
  )
    return false;
  run.khan.candidate = trait;
  run.clan.message = `${SUCCESSORS[trait].title} will take the banner when the clan is ready.`;
  return true;
}
export function khanSpeedMultiplier(run: RunState): number {
  return run.khan.trait ? SUCCESSORS[run.khan.trait].speed : 1;
}
