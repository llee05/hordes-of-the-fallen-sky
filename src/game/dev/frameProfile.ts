/**
 * Development-only frame-time breakdown. It wraps named methods for a sampling
 * window, then restores them, so production builds carry no timing code.
 */

/** One method to time: `owner[method]` is replaced for the window and restored after. */
export interface ProfileTarget {
  name: string;
  owner: object | undefined;
  method: string;
}

/** Mean milliseconds per frame unless noted. */
export interface FrameProfile {
  frames: number;
  seconds: number;
  fps: number;
  frame: { mean: number; p50: number; p95: number; max: number };
  /** Game step from PRE_STEP to POST_STEP: input, physics, scene update. */
  simulation: number;
  /** POST_STEP to POST_RENDER: Phaser and 3D world drawing (GL command submission). */
  render: number;
  /** Rest of the frame interval: vsync, GPU or compositor wait, browser work. */
  idle: number;
  sections: Record<string, number>;
  /** Mean calls per frame for each timed target. */
  calls: Record<string, number>;
}

interface Emitter {
  on(event: string, listener: (...args: never[]) => void): unknown;
  off(event: string, listener: (...args: never[]) => void): unknown;
}

type Method = (this: unknown, ...args: unknown[]) => unknown;

/** Installs timing wrappers; returns a function that removes them. */
export function wrapTargets(
  targets: readonly ProfileTarget[],
  time: Record<string, number>,
  calls: Record<string, number>,
  now: () => number = () => performance.now(),
): () => void {
  const restore: (() => void)[] = [];
  for (const { name, owner, method } of targets) {
    if (!owner) continue;
    const record = owner as Record<string, unknown>;
    const original = record[method];
    if (typeof original !== 'function') continue;
    const own = Object.prototype.hasOwnProperty.call(owner, method);
    time[name] ??= 0;
    calls[name] ??= 0;
    record[method] = function (this: unknown, ...args: unknown[]) {
      const start = now();
      try {
        return (original as Method).apply(this, args);
      } finally {
        time[name]! += now() - start;
        calls[name]! += 1;
      }
    };
    restore.push(() => {
      if (own) record[method] = original;
      else delete record[method];
    });
  }
  return () => {
    for (const undo of restore.reverse()) undo();
  };
}

function percentile(sorted: readonly number[], fraction: number): number {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))]!;
}

/** Summarises raw totals; work totals divide by the frames that finished rendering. */
export function summariseProfile(
  intervals: readonly number[],
  totals: { simulation: number; render: number; frames: number },
  time: Record<string, number>,
  calls: Record<string, number>,
): FrameProfile {
  const frames = totals.frames;
  const sum = intervals.reduce((total, value) => total + value, 0);
  const sorted = [...intervals].sort((a, b) => a - b);
  const per = (value: number) => (frames ? value / frames : 0);
  const round = (value: number) => Math.round(value * 1000) / 1000;
  const mean = intervals.length ? sum / intervals.length : 0;
  return {
    frames,
    seconds: round(sum / 1000),
    fps: round(sum ? (intervals.length * 1000) / sum : 0),
    frame: {
      mean: round(mean),
      p50: round(percentile(sorted, 0.5)),
      p95: round(percentile(sorted, 0.95)),
      max: round(sorted.at(-1) ?? 0),
    },
    simulation: round(per(totals.simulation)),
    render: round(per(totals.render)),
    idle: round(Math.max(0, mean - per(totals.simulation) - per(totals.render))),
    sections: Object.fromEntries(
      Object.entries(time).map(([key, value]) => [key, round(per(value))]),
    ),
    calls: Object.fromEntries(
      Object.entries(calls).map(([key, value]) => [key, round(per(value))]),
    ),
  };
}

/**
 * Samples real browser frames for `seconds` of wall time. Frame intervals run
 * from one PRE_STEP to the next; only frames that complete inside the window count.
 */
export function profileFrames(
  events: Emitter,
  targets: readonly ProfileTarget[],
  seconds: number,
): Promise<FrameProfile> {
  const time: Record<string, number> = {};
  const calls: Record<string, number> = {};
  const intervals: number[] = [];
  const totals = { simulation: 0, render: 0, frames: 0 };
  let stepStart = 0;
  let stepEnd = 0;
  let previous: number | undefined;
  let started: number | undefined;
  return new Promise((resolve) => {
    // Wrap at the first frame start so a partial frame never contributes.
    let unwrap = () => {};
    const preStep = () => {
      const now = performance.now();
      if (previous === undefined) unwrap = wrapTargets(targets, time, calls);
      else intervals.push(now - previous);
      previous = now;
      started ??= now;
      stepStart = now;
    };
    const postStep = () => {
      if (previous === undefined) return;
      stepEnd = performance.now();
      totals.simulation += stepEnd - stepStart;
    };
    const postRender = () => {
      if (previous === undefined) return;
      const now = performance.now();
      totals.render += now - stepEnd;
      totals.frames += 1;
      if (started !== undefined && now - started >= seconds * 1000) {
        events.off('prestep', preStep);
        events.off('poststep', postStep);
        events.off('postrender', postRender);
        unwrap();
        resolve(summariseProfile(intervals, totals, time, calls));
      }
    };
    events.on('prestep', preStep);
    events.on('poststep', postStep);
    events.on('postrender', postRender);
  });
}

/** Mulberry32: a small seeded generator for repeatable development scenarios. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
