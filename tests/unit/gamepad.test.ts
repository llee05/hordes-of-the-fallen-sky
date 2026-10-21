import { describe, expect, it } from 'vitest';
import { GamepadInput } from '../../src/game/systems/GamepadInput';
import type { ControllerDevice } from '../../src/game/systems/GamepadInput';

function pad(x = 0, y = 0, pressed: number[] = []): ControllerDevice {
  return {
    connected: true,
    mapping: 'standard',
    axes: [x, y],
    buttons: Array.from({ length: 16 }, (_, index) => ({
      pressed: pressed.includes(index),
      touched: pressed.includes(index),
      value: pressed.includes(index) ? 1 : 0,
    })),
  };
}

describe('controller input', () => {
  it('filters stick drift and limits diagonal speed', () => {
    const input = new GamepadInput();
    expect(input.poll([pad(0.1, 0.1)]).x).toBe(0);
    const frame = input.poll([pad(1, 1)]);
    expect(Math.hypot(frame.x, frame.y)).toBeCloseTo(1);
  });

  it('emits one activation for a held button, then permits the next press', () => {
    const input = new GamepadInput();
    expect(input.poll([pad(0, 0, [0])]).confirm).toBe(true);
    expect(input.poll([pad(0, 0, [0])]).confirm).toBe(false);
    input.poll([pad()]);
    expect(input.poll([pad(0, 0, [0])]).confirm).toBe(true);
  });

  it('handles digital navigation and disconnecting without stuck movement', () => {
    const input = new GamepadInput();
    expect(input.poll([pad(0, 0, [15])])).toMatchObject({ x: 1, y: 0, next: true });
    expect(input.poll([pad(0, 0, [15])]).next).toBe(false);
    expect(input.poll([])).toMatchObject({ x: 0, y: 0, confirm: false });
    expect(input.poll([pad(0, 0, [9])]).pause).toBe(true);
  });
  it('opens the clan chronicle once per press of the View button', () => {
    const input = new GamepadInput();
    expect(input.poll([pad(0, 0, [8])]).journal).toBe(true);
    expect(input.poll([pad(0, 0, [8])]).journal).toBe(false);
    input.poll([pad()]);
    expect(input.poll([pad(0, 0, [8])]).journal).toBe(true);
  });
});
