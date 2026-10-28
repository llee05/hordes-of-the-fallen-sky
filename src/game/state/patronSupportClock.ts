import { wardRateMultiplier } from './researchHybrids';
import { GAME } from '../config';
import type { RunState } from '../types';
import { isKhanActive } from './khan';

export interface PatronSupportTimers {
  ancestorTimer: number;
  waterTimer: number;
  guardianTimer: number;
}

export interface PatronSupportStep {
  ancestorCount: number;
  pulseWater: boolean;
  ward: boolean;
}

/** Renderer-independent cadence in active seconds. Effects fire at most once per
 * step, starting immediately; a release resets its full interval and discards
 * overshoot. Disabled effects still count down. */
export class PatronSupportClock {
  private waterTimer = 0;
  private guardianTimer = 0;

  capture(): PatronSupportTimers {
    return {
      ancestorTimer: 0,
      waterTimer: this.waterTimer,
      guardianTimer: this.guardianTimer,
    };
  }

  restore(state: PatronSupportTimers): void {
    this.waterTimer = state.waterTimer;
    this.guardianTimer = state.guardianTimer;
  }

  /** Undefined means neither simulation nor presentation should advance. The
   * caller applies water and ward releases. */
  update(run: RunState, dt: number): PatronSupportStep | undefined {
    if (run.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    const effects = run.patrons;
    this.waterTimer -= dt;
    this.guardianTimer -= dt * wardRateMultiplier(run);

    const ancestorCount = Math.min(GAME.patrons.ancestors.maximum, effects.ancestors.count);
    const pulseWater = isKhanActive(run) && effects.water.pulseDamage > 0 && this.waterTimer <= 0;
    if (pulseWater) this.waterTimer = GAME.patrons.water.pulseEvery;
    const ward = effects.guardian.wardDamage > 0 && this.guardianTimer <= 0;
    if (ward) this.guardianTimer = GAME.patrons.guardian.wardEvery;
    return { ancestorCount, pulseWater, ward };
  }
}
