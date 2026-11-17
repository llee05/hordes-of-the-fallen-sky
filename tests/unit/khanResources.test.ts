import { describe, expect, it } from 'vitest';
import { defaultCharacterProfile } from '../../src/shared/characterProfile';
import { GAME } from '../../src/game/config';
import { captureExpedition, decodeExpedition } from '../../src/game/state/expeditionArchive';
import {
  advanceSprint,
  createKhanResources,
  khanResourcesOf,
  restKhan,
  sprintDrain,
  sprintSpeedMultiplier,
} from '../../src/game/state/khanResources';
import { createRun } from '../../src/game/state/run';
import { gallopLabel } from '../../src/ui/khanResourceHud';
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
