import {
  campfireVigilActive,
  eternalHearthActive,
  flameRefusesRegen,
  healKhan,
  researchWaterRadius,
  stillwaterRefuge,
} from './researchRuntime';
import { landWaterActive } from './researchTerrain';
import { restoreResolve } from './clan';
import { GAME } from '../config';
import type { PatronEffects, RunState } from '../types';
import { isKhanActive } from './khan';

export function createPatronEffects(): PatronEffects {
  return {
    hunt: { movingDamage: 1, executeDamage: 1, gallopCooldown: 1, killHeal: 0 },
    land: { food: 1, materials: 1, consumption: 1, pastureUse: 1, pastureRecovery: 0 },
    bow: { range: 0, pierce: 0, spread: 1 },
    hearth: { regeneration: 0, damageTaken: 1, revives: 0 },
    water: {
      slow: 0,
      radius: GAME.patrons.water.radius,
      hazardDamage: 1,
      warning: 0,
      pulseDamage: 0,
    },
    ancestors: {
      count: 0,
      damage: GAME.patrons.ancestors.damage,
      interval: GAME.patrons.ancestors.interval,
      spiritGain: 1,
    },
    banner: { riders: 0, damage: 1, mobility: 1, resolveOnKill: 0 },
    guardian: { cost: 1, protection: 1, wagonInterval: 1, wardDamage: 0 },
  };
}

export function gallopCooldown(run: RunState): number {
  return (
    GAME.dash.cooldown *
    run.patrons.hunt.gallopCooldown *
    run.clan.campEffects.multipliers.gallopCooldown
  );
}

export function friendlyDamageMultiplier(run: RunState, enemyHealthRatio: number): number {
  return (
    (run.clan.momentum > 0.5 ? run.patrons.hunt.movingDamage : 1) *
    (enemyHealthRatio < 0.5 ? run.patrons.hunt.executeDamage : 1)
  );
}

export function terrainSpeedMultiplier(run: RunState, distance: number): number {
  return distance < researchWaterRadius(run) ? Math.max(0.2, 1 - run.patrons.water.slow) : 1;
}

export function advancePatrons(run: RunState, dt: number): void {
  if (run.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0 || !isKhanActive(run)) return;
  const hearthZone = eternalHearthActive(run);
  const regen =
    run.patrons.hearth.regeneration +
    run.clan.campEffects.bonuses.commanderRecovery +
    (stillwaterRefuge(run) ? GAME.research.refugeRecovery : 0) +
    (campfireVigilActive(run) ? GAME.research.campfireVigilRegen : 0) +
    flameRefusesRegen(run) +
    (landWaterActive(run) ? GAME.research.landWaterHealing : 0) +
    (hearthZone ? GAME.research.eternalHearthHealPerSecond : 0);
  if (regen > 0) healKhan(run, regen * dt);
  if (hearthZone) restoreResolve(run, GAME.research.eternalHearthResolvePerSecond * dt);
}

export function rewardPatronKill(run: RunState): void {
  if (run.phase !== 'playing') return;
  if (isKhanActive(run) && run.clan.momentum > 0.5 && run.patrons.hunt.killHeal > 0)
    healKhan(run, run.patrons.hunt.killHeal);
  restoreResolve(run, run.patrons.banner.resolveOnKill);
}
