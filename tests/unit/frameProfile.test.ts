import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  profileFrames,
  seededRandom,
  summariseProfile,
  wrapTargets,
} from '../../src/game/dev/frameProfile';

class Emitter {
  private readonly listeners = new Map<string, Set<() => void>>();
  on(event: string, listener: () => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
  }
  off(event: string, listener: () => void) {
    this.listeners.get(event)?.delete(listener);
  }
  emit(event: string) {
    for (const listener of [...(this.listeners.get(event) ?? [])]) listener();
  }
  count() {
    return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0);
  }
}

class System {
  calls = 0;
  update(value: number) {
    this.calls += value;
    return this.calls;
  }
}

afterEach(() => vi.restoreAllMocks());

describe('development frame profiler', () => {
  it('times and counts wrapped methods, then restores own and prototype methods', () => {
    let clock = 0;
    const system = new System();
    const owner = { step: (n: number) => n * 2 };
    const ownStep = owner.step;
    const time: Record<string, number> = {};
    const calls: Record<string, number> = {};
    const unwrap = wrapTargets(
      [
        { name: 'system', owner: system, method: 'update' },
        { name: 'own', owner, method: 'step' },
        { name: 'missing', owner: undefined, method: 'update' },
        { name: 'not-a-method', owner: system, method: 'calls' },
      ],
      time,
      calls,
      () => (clock += 2),
    );
    expect(system.update(3)).toBe(3);
    expect(system.update(1)).toBe(4);
    expect(owner.step(5)).toBe(10);
    expect(calls).toEqual({ system: 2, own: 1 });
    expect(time).toEqual({ system: 4, own: 2 });
    unwrap();
    expect(Object.prototype.hasOwnProperty.call(system, 'update')).toBe(false);
    expect(owner.step).toBe(ownStep);
    system.update(1);
    expect(calls.system).toBe(2);
  });

  it('still records time when a wrapped method throws', () => {
    const owner = {
      fail() {
        throw new Error('boom');
      },
    };
    const time: Record<string, number> = {};
    const calls: Record<string, number> = {};
    wrapTargets([{ name: 'fail', owner, method: 'fail' }], time, calls, () => 1);
    expect(() => owner.fail()).toThrow('boom');
    expect(calls.fail).toBe(1);
  });

  it('summarises frame intervals, work and idle time per frame', () => {
    const profile = summariseProfile(
      [20, 30, 40, 30],
      { simulation: 40, render: 60, frames: 4 },
      { enemies: 8 },
      { enemies: 4 },
    );
    expect(profile).toMatchObject({
      frames: 4,
      seconds: 0.12,
      fps: 33.333,
      frame: { mean: 30, p50: 30, p95: 40, max: 40 },
      simulation: 10,
      render: 15,
      idle: 5,
      sections: { enemies: 2 },
      calls: { enemies: 1 },
    });
    expect(summariseProfile([], { simulation: 0, render: 0, frames: 0 }, {}, {})).toMatchObject({
      frames: 0,
      fps: 0,
      frame: { mean: 0, p50: 0, max: 0 },
    });
  });

  it('samples whole frames from game step events and removes its listeners', async () => {
    let clock = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    const events = new Emitter();
    const system = new System();
    const result = profileFrames(
      events,
      [{ name: 'system', owner: system, method: 'update' }],
      0.05,
    );
    // A call before the first frame starts must not count.
    system.update(1);
    for (let frame = 0; frame < 4; frame++) {
      events.emit('prestep');
      clock += 3;
      system.update(1);
      events.emit('poststep');
      clock += 5;
      events.emit('postrender');
      clock += 12;
    }
    const profile = await result;
    expect(profile.frames).toBe(4);
    expect(profile.frame.mean).toBe(20);
    expect(profile.simulation).toBe(3);
    expect(profile.render).toBe(5);
    expect(profile.calls.system).toBe(1);
    expect(events.count()).toBe(0);
    expect(Object.prototype.hasOwnProperty.call(system, 'update')).toBe(false);
  });

  it('repeats seeded sequences', () => {
    const a = seededRandom(7),
      b = seededRandom(7),
      c = seededRandom(8);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect(c()).not.toBe(first[0]);
    expect(first.every((value) => value >= 0 && value < 1)).toBe(true);
  });
});
