/**
 * Automatic 3D render scale: the fraction of device pixels the angled world draws. It trades
 * sharpness for frame rate only when frames are slow for a sustained stretch, and recovers as
 * soon as they are comfortably fast again. Times are real seconds (presentation, not gameplay).
 */

/** `auto` adapts the scale to the frame rate; `full` always draws every pixel. */
export type RenderResolution = 'auto' | 'full';

export const RENDER_SCALE = {
  /** Seconds after a level loads (or a hold ends) before the scale reacts: uploads and compiles stall. */
  settle: 6,
  /** Size of one change. */
  step: 0.125,
  /** Below this frame rate for `dropAfter` seconds, the scale steps down to `floor`. */
  dropFps: 28,
  dropAfter: 3,
  /** Lowest scale for ordinary slow frames. */
  floor: 0.75,
  /** Only frames below `poorFps` for `poorAfter` seconds take the scale below `floor`. */
  poorFps: 20,
  poorAfter: 8,
  /** Lowest scale at all, for genuinely poor hardware. */
  minimum: 0.5,
  /** Above this frame rate for `raiseAfter` seconds, the scale steps back up. */
  raiseFps: 45,
  raiseAfter: 4,
  /** A drop within `bounceWindow` seconds of a raise doubles the wait before the next raise. */
  bounceWindow: 10,
  maxRaiseAfter: 32,
  /** Seconds after any change before the next. */
  cooldown: 2,
} as const;

export interface RenderScaleState {
  scale: number;
  /** Seconds since the level loaded or the last hold ended. */
  age: number;
  /** Seconds the frame rate has stayed below `dropFps`, below `poorFps`, and above `raiseFps`. */
  slow: number;
  poor: number;
  fast: number;
  /** Seconds until another change is allowed. */
  cooldown: number;
  /** Current wait before a raise, lengthened when raises bounce back down. */
  raiseAfter: number;
  /** Seconds since the last raise. */
  sinceRaise: number;
}

export function initialRenderScale(scale = 1): RenderScaleState {
  return {
    scale,
    age: 0,
    slow: 0,
    poor: 0,
    fast: 0,
    cooldown: 0,
    raiseAfter: RENDER_SCALE.raiseAfter,
    sinceRaise: Infinity,
  };
}

export interface RenderScaleInput {
  /** Real seconds since the previous frame. */
  dt: number;
  /** Smoothed frames per second; 0 or less when unknown. */
  fps: number;
  mode: RenderResolution;
  /** Terrain still streaming, a debug view, or a held scale: measure nothing. */
  busy: boolean;
}

/** The next automatic render scale state for one rendered frame. */
export function stepRenderScale(
  state: RenderScaleState,
  input: RenderScaleInput,
): RenderScaleState {
  const dt = Math.max(0, Math.min(1, Number.isFinite(input.dt) ? input.dt : 0));
  if (input.mode === 'full') return { ...initialRenderScale(1), age: state.age + dt };
  const next: RenderScaleState = {
    ...state,
    age: state.age + dt,
    cooldown: Math.max(0, state.cooldown - dt),
    sinceRaise: state.sinceRaise + dt,
  };
  if (next.age < RENDER_SCALE.settle || input.busy || !(input.fps > 0)) {
    next.slow = next.poor = next.fast = 0;
    return next;
  }
  next.slow = input.fps < RENDER_SCALE.dropFps ? next.slow + dt : 0;
  next.poor = input.fps < RENDER_SCALE.poorFps ? next.poor + dt : 0;
  next.fast = input.fps > RENDER_SCALE.raiseFps ? next.fast + dt : 0;
  if (next.cooldown > 0) return next;
  const change = (scale: number): RenderScaleState => ({
    ...next,
    scale,
    slow: 0,
    poor: 0,
    fast: 0,
    cooldown: RENDER_SCALE.cooldown,
  });
  const lower = (limit: number): RenderScaleState => {
    const changed = change(Math.max(limit, next.scale - RENDER_SCALE.step));
    if (next.sinceRaise < RENDER_SCALE.bounceWindow)
      changed.raiseAfter = Math.min(RENDER_SCALE.maxRaiseAfter, next.raiseAfter * 2);
    return changed;
  };
  if (next.slow >= RENDER_SCALE.dropAfter && next.scale > RENDER_SCALE.floor)
    return lower(RENDER_SCALE.floor);
  if (next.poor >= RENDER_SCALE.poorAfter && next.scale > RENDER_SCALE.minimum)
    return lower(RENDER_SCALE.minimum);
  if (next.fast >= next.raiseAfter && next.scale < 1) {
    const raised = change(Math.min(1, next.scale + RENDER_SCALE.step));
    raised.sinceRaise = 0;
    if (raised.scale === 1) raised.raiseAfter = RENDER_SCALE.raiseAfter;
    return raised;
  }
  return next;
}
