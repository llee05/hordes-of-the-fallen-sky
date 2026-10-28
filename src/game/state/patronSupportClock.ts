import { wardRateMultiplier } from './researchHybrids';
import { GAME } from '../config';
import type { RunState } from '../types';
import { isKhanActive } from './khan';
import { echoInterval } from './researchRuntime';

export interface PatronSupportTimers {
  ancestorTimer: number;
  waterTimer: number;
  guardianTimer: number;
}

export interface PatronSupportStep {
  ancestorCount: number;
  releaseAncestors: boolean;
  pulseWater: boolean;
  ward: boolean;
}

/** Renderer-independent cadence in active seconds. Effects fire at most once per
 * step, starting immediately; a release resets its full interval and discards
 * overshoot. Disabled effects still count down, except absent ancestors reset. */
export class PatronSupportClock {
  private ancestorTimer = 0;
  private waterTimer = 0;
  private guardianTimer = 0;

  capture(): PatronSupportTimers {
    return {
      ancestorTimer: this.ancestorTimer,
      waterTimer: this.waterTimer,
      guardianTimer: this.guardianTimer,
    };
  }

  restore(state: PatronSupportTimers): void {
    this.ancestorTimer = state.ancestorTimer;
    this.waterTimer = state.waterTimer;
    this.guardianTimer = state.guardianTimer;
  }

  /** Undefined means neither simulation nor presentation should advance. The
   * caller applies releases in ancestor, water, then ward order. */
  update(run: RunState, dt: number): PatronSupportStep | undefined {
    if (run.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    const effects = run.patrons;
    this.ancestorTimer -= dt;
    this.waterTimer -= dt;
    this.guardianTimer -= dt * wardRateMultiplier(run);

    const ancestorCount = Math.min(GAME.patrons.ancestors.maximum, effects.ancestors.count);
    if (ancestorCount === 0) this.ancestorTimer = 0;
    const releaseAncestors = ancestorCount > 0 && this.ancestorTimer <= 0;
    if (releaseAncestors) this.ancestorTimer = echoInterval(run);

    const pulseWater = isKhanActive(run) && effects.water.pulseDamage > 0 && this.waterTimer <= 0;
    if (pulseWater) this.waterTimer = GAME.patrons.water.pulseEvery;
    const ward = effects.guardian.wardDamage > 0 && this.guardianTimer <= 0;
    if (ward) this.guardianTimer = GAME.patrons.guardian.wardEvery;
    return { ancestorCount, releaseAncestors, pulseWater, ward };
  }
}
