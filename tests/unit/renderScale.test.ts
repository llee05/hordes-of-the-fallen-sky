import { describe, expect, it } from 'vitest';
import {
  initialRenderScale,
  RENDER_SCALE,
  stepRenderScale,
  type RenderResolution,
  type RenderScaleState,
} from '../../src/game/world3d/renderScale';
import { WORLD_3D } from '../../src/game/world3d/worldProjection';

const FRAME = 1 / 60;

/** Run `seconds` of frames at a steady frame rate. */
function run(
  state: RenderScaleState,
  seconds: number,
  fps: number,
  options: { mode?: RenderResolution; busy?: boolean } = {},
): RenderScaleState {
  for (let t = 0; t < seconds - 1e-9; t += FRAME)
    state = stepRenderScale(state, {
      dt: FRAME,
      fps,
      mode: options.mode ?? 'auto',
      busy: options.busy ?? false,
    });
  return state;
}

/** A level that has finished loading. */
const settled = () => run(initialRenderScale(), RENDER_SCALE.settle + 0.1, 60);

describe('automatic 3D render scale', () => {
  it('ignores a load stall in the first seconds after a level loads', () => {
    const state = run(initialRenderScale(), RENDER_SCALE.settle - 0.5, 8);
    expect(state.scale).toBe(1);
    // The stall's slow frames are not carried into the settled level.
    expect(run(state, 1, 60).scale).toBe(1);
  });

  it('never drops for a one-off stall', () => {
    let state = settled();
    state = run(state, RENDER_SCALE.dropAfter - 0.5, 10);
    state = run(state, 0.5, 60);
    state = run(state, RENDER_SCALE.dropAfter - 0.5, 10);
    expect(state.scale).toBe(1);
  });

  it('steps down to the 0.75 floor for sustained slow frames, and no further', () => {
    let state = run(settled(), RENDER_SCALE.dropAfter + 0.1, 24);
    expect(state.scale).toBe(1 - RENDER_SCALE.step);
    state = run(state, 60, 24);
    expect(state.scale).toBe(RENDER_SCALE.floor);
    expect(RENDER_SCALE.floor).toBeGreaterThanOrEqual(0.75);
  });

  it('goes below the floor only for genuinely poor frames held for a long stretch', () => {
    let state = run(settled(), 30, 24);
    expect(state.scale).toBe(RENDER_SCALE.floor);
    state = run(state, RENDER_SCALE.poorAfter - 1, 15);
    expect(state.scale).toBe(RENDER_SCALE.floor);
    state = run(state, 60, 15);
    expect(state.scale).toBe(RENDER_SCALE.minimum);
    expect(RENDER_SCALE.minimum).toBe(WORLD_3D.minRenderScale);
  });

  it('steps back up once frames are comfortably above the drop threshold', () => {
    let state = run(settled(), 30, 24);
    expect(state.scale).toBe(RENDER_SCALE.floor);
    // 50 fps is well short of the old 57 fps requirement, but far above the 28 fps drop.
    state = run(state, RENDER_SCALE.raiseAfter + 0.1, 50);
    expect(state.scale).toBe(RENDER_SCALE.floor + RENDER_SCALE.step);
    state = run(state, 20, 50);
    expect(state.scale).toBe(1);
    // Frames between the thresholds hold the scale where it is.
    expect(run(run(settled(), 30, 24), 60, 35).scale).toBe(RENDER_SCALE.floor);
  });

  it('waits longer before raising again when raises keep bouncing back down', () => {
    let state = run(settled(), 30, 24);
    state = run(state, RENDER_SCALE.raiseAfter + 0.1, 50);
    expect(state.scale).toBe(RENDER_SCALE.floor + RENDER_SCALE.step);
    state = run(state, RENDER_SCALE.cooldown + RENDER_SCALE.dropAfter + 0.1, 24);
    expect(state.scale).toBe(RENDER_SCALE.floor);
    expect(state.raiseAfter).toBe(RENDER_SCALE.raiseAfter * 2);
    state = run(state, RENDER_SCALE.raiseAfter + 0.5, 50);
    expect(state.scale).toBe(RENDER_SCALE.floor);
  });

  it('keeps every pixel when resolution is locked to full', () => {
    let state = run(settled(), 30, 24);
    expect(state.scale).toBeLessThan(1);
    state = run(state, FRAME, 24, { mode: 'full' });
    expect(state.scale).toBe(1);
    expect(run(state, 60, 5, { mode: 'full' }).scale).toBe(1);
  });

  it('measures nothing while terrain streams, a debug view shows or the scale is held', () => {
    const state = run(settled(), 30, 10, { busy: true });
    expect(state.scale).toBe(1);
    expect(state.slow).toBe(0);
  });

  it('ignores unknown frame rates and long frame gaps', () => {
    let state = run(settled(), 30, 0);
    expect(state.scale).toBe(1);
    state = stepRenderScale(settled(), { dt: 120, fps: 10, mode: 'auto', busy: false });
    expect(state.scale).toBe(1);
    expect(state.slow).toBeLessThanOrEqual(1);
  });
});
