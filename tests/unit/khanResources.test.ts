import { describe, expect, it } from 'vitest';
import { defaultCharacterProfile } from '../../src/shared/characterProfile';
import { GAME } from '../../src/game/config';
import { captureExpedition, decodeExpedition } from '../../src/game/state/expeditionArchive';
import { classDefinition } from '../../src/game/data/classes';
import {
  advanceSprint,
  affordableCharge,
  createKhanResources,
  heavyBreathCost,
  khanResourcesOf,
  restKhan,
  spendBreath,
  sprintDrain,
  sprintSpeedMultiplier,
} from '../../src/game/state/khanResources';
import { createRun } from '../../src/game/state/run';
import { chargeReadout, gallopLabel } from '../../src/ui/khanResourceHud';
import { world } from './fixtures/expedition';

const S = GAME.stamina;
const held = { held: true, able: true, drain: S.sprintDrain };
const released = { held: false, able: true, drain: S.sprintDrain };

describe('Breath and the gallop', () => {
  it('starts rested and drains Breath per second while the gallop is held', () => {
    const r = createKhanResources();
    expect(r).toEqual({ stamina: S.maximum, sprinting: false, winded: false });
    expect(advanceSprint(r, 0.1, held)).toBe('started');
    expect(r.sprinting).toBe(true);
    expect(r.stamina).toBeCloseTo(S.maximum - S.sprintDrain * 0.1);
    expect(advanceSprint(r, 1, held)).toBeUndefined();
    expect(r.stamina).toBeCloseTo(S.maximum - S.sprintDrain * 1.1);
  });

  it('gives a full pool about three and a third seconds of gallop, then winds the Khan', () => {
    const r = createKhanResources();
    let seconds = 0;
    while (r.sprinting || seconds === 0) {
      advanceSprint(r, 0.05, held);
      seconds += 0.05;
    }
    expect(seconds).toBeCloseTo(S.maximum / S.sprintDrain, 0);
    expect(r).toMatchObject({ stamina: 0, sprinting: false, winded: true });
    // Holding on refills but never restarts the gallop by itself.
    for (let i = 0; i < 100; i++) expect(advanceSprint(r, 0.05, held)).toBeUndefined();
    expect(r.sprinting).toBe(false);
    expect(r.stamina).toBeCloseTo(S.refill * 5);
    advanceSprint(r, 0.05, released);
    expect(r.winded).toBe(false);
    expect(advanceSprint(r, 0.05, held)).toBe('started');
  });

  it('refuses a press below the starting Breath until the input is released', () => {
    const r = { stamina: S.sprintMinimum - 1, sprinting: false, winded: false };
    expect(advanceSprint(r, 0.05, held)).toBe('refused');
    expect(r).toMatchObject({ sprinting: false, winded: true });
    expect(advanceSprint(r, 1, held)).toBeUndefined();
    expect(r.sprinting).toBe(false);
  });

  it('refills at the shared rate when not galloping, up to the maximum, unless paused', () => {
    const r = { stamina: 20, sprinting: false, winded: false };
    advanceSprint(r, 2, released);
    expect(r.stamina).toBeCloseTo(20 + S.refill * 2);
    advanceSprint(r, 2, { ...released, refill: false });
    expect(r.stamina).toBeCloseTo(20 + S.refill * 2);
    advanceSprint(r, 100, released);
    expect(r.stamina).toBe(S.maximum);
  });

  it('stops without draining or refilling while the Khan is down, and ignores bad steps', () => {
    const r = { stamina: 50, sprinting: true, winded: false };
    advanceSprint(r, 1, { held: true, able: false, drain: S.sprintDrain });
    expect(r).toEqual({ stamina: 50, sprinting: false, winded: false });
    for (const dt of [0, -1, NaN, Infinity]) advanceSprint(r, dt, held);
    expect(r).toEqual({ stamina: 50, sprinting: false, winded: false });
    restKhan(r);
    expect(r).toEqual(createKhanResources());
  });

  it('keeps the class and camp gallop modifiers as a Breath cost and a speed', () => {
    const drains = (['mounted-archer', 'lancer', 'iron-pagoda', 'spirit-caller'] as const).map(
      (classId) => {
        const run = createRun('shared-hearth', { ...defaultCharacterProfile(), classId });
        return [sprintDrain(run), sprintSpeedMultiplier(run)];
      },
    );
    expect(drains[0]).toEqual([30, S.sprintSpeed]);
    expect(drains[1]![0]).toBeCloseTo(24.6);
    expect(drains[1]![1]).toBeCloseTo(S.sprintSpeed * 1.12);
    expect(drains[2]![0]).toBeCloseTo(25.8);
    expect(drains[3]![0]).toBeCloseTo(27.6);
  });

  it('labels the gallop button from the Breath state', () => {
    const stamina = { current: 80, maximum: 100, sprintDrain: 30, sprinting: false, winded: false };
    expect(gallopLabel(stamina, true)).toBe('HOLD SPACE');
    expect(gallopLabel({ ...stamina, sprinting: true }, true)).toBe('GALLOPING');
    expect(gallopLabel({ ...stamina, winded: true }, true)).toBe('WINDED');
    expect(gallopLabel(stamina, false)).toBe('CHOOSING A KHAN');
  });
});

describe('heavy attack Breath costs', () => {
  const heavy = (id: Parameters<typeof classDefinition>[0]) => classDefinition(id).heavyAttack;

  it('charges each heavy attack its tap cost at the shortest hold and its full cost at a full charge', () => {
    const draw = heavy('mounted-archer');
    expect(heavyBreathCost(draw, 0)).toBe(8);
    expect(heavyBreathCost(draw, draw.windup)).toBe(8);
    expect(heavyBreathCost(draw, draw.charge!.maxDuration)).toBeCloseTo(22);
    const strike = heavy('lancer');
    expect(heavyBreathCost(strike, strike.windup)).toBe(10);
    expect(heavyBreathCost(strike, strike.holdCharge!.maxDuration)).toBeCloseTo(26);
    expect(heavyBreathCost(strike, 99)).toBeCloseTo(26);
    const half = (strike.windup + strike.holdCharge!.maxDuration) / 2;
    expect(heavyBreathCost(strike, half)).toBeCloseTo(18);
    const cleave = heavy('iron-pagoda');
    expect(heavyBreathCost(cleave, 0)).toBe(14);
    expect(heavyBreathCost(cleave, 5)).toBe(14);
  });

  it('charges the Ancestral Drum eight Breath per wave', () => {
    const drum = heavy('spirit-caller');
    if (drum.charge?.kind !== 'waves') throw new Error('expected drum waves');
    const { waveEvery, maxDuration } = drum.charge;
    expect(heavyBreathCost(drum, drum.windup)).toBe(8);
    expect(heavyBreathCost(drum, drum.windup + waveEvery * 1.5)).toBe(16);
    expect(heavyBreathCost(drum, maxDuration)).toBe(24);
    expect(affordableCharge(drum, 7)).toBeUndefined();
    for (const [breath, waves] of [
      [8, 1],
      [15.9, 1],
      [16, 2],
      [23, 2],
      [24, 3],
      [100, 3],
    ] as const)
      expect(heavyBreathCost(drum, affordableCharge(drum, breath)!)).toBe(waves * 8);
  });

  it('caps a charge at the level Breath can pay for, or refuses it', () => {
    const draw = heavy('mounted-archer');
    const maximum = draw.charge!.maxDuration;
    expect(affordableCharge(draw, 100)).toBe(maximum);
    expect(affordableCharge(draw, 22)).toBe(maximum);
    expect(affordableCharge(draw, 7.9)).toBeUndefined();
    expect(affordableCharge(draw, 8)).toBeCloseTo(draw.windup);
    for (const breath of [8, 11, 15, 19, 21.9]) {
      const charge = affordableCharge(draw, breath)!;
      expect(charge).toBeLessThan(maximum);
      expect(heavyBreathCost(draw, charge)).toBeCloseTo(breath);
    }
    const cleave = heavy('iron-pagoda');
    expect(affordableCharge(cleave, 13)).toBeUndefined();
    expect(affordableCharge(cleave, 14)).toBe(cleave.windup);
  });

  it('spends Breath only when the pool can pay in full', () => {
    const r = { stamina: 20, sprinting: false, winded: false };
    expect(spendBreath(r, 26)).toBe(false);
    expect(r.stamina).toBe(20);
    expect(spendBreath(r, 20)).toBe(true);
    expect(r.stamina).toBe(0);
    expect(spendBreath(r, NaN)).toBe(false);
  });

  it('reads out a held charge and marks one Breath has capped', () => {
    expect(chargeReadout(undefined)).toBe('LMB LIGHT · RMB HEAVY');
    expect(chargeReadout({ name: 'Piercing Draw', progress: 0.6, winded: false })).toBe(
      'PIERCING DRAW 60%',
    );
    expect(chargeReadout({ name: 'Piercing Draw', progress: 0.6, winded: true })).toBe(
      'PIERCING DRAW 60% · WINDED',
    );
  });
});

describe('saved Breath', () => {
  it('round-trips Breath and loads older saves rested', () => {
    const saved = decodeExpedition(captureExpedition(createRun(), world()));
    expect(saved.world.timers.khanResources).toEqual({
      stamina: 42.5,
      sprinting: false,
      winded: false,
    });
    const old = captureExpedition(createRun(), world()) as Record<string, any>;
    delete old.world.timers.khanResources;
    old.world.timers.dashTimer = 2.4;
    const restored = decodeExpedition(old).world.timers;
    expect(restored.khanResources).toBeUndefined();
    expect(khanResourcesOf(restored)).toEqual(createKhanResources());
  });

  it('caps saved Breath at the maximum and rejects a damaged record', () => {
    const save = captureExpedition(createRun(), world()) as Record<string, any>;
    save.world.timers.khanResources.stamina = 5000;
    expect(decodeExpedition(save).world.timers.khanResources!.stamina).toBe(S.maximum);
    save.world.timers.khanResources.stamina = -1;
    expect(() => decodeExpedition(save)).toThrow();
  });
});
