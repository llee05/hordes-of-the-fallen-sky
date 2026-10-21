export interface ControllerFrame {
  x: number;
  y: number;
  confirm: boolean;
  back: boolean;
  pause: boolean;
  previous: boolean;
  next: boolean;
  build: boolean;
  migrate: boolean;
  formation: boolean;
  journal: boolean;
}

export type ControllerDevice = Pick<Gamepad, 'connected' | 'mapping' | 'axes' | 'buttons'>;

/** Standard Gamepad mapping also accepts Steam Input's emulated Xbox controller. */
export class GamepadInput {
  private previousButtons = 0;
  private previousDirection = 0;

  poll(
    pads: readonly (ControllerDevice | null)[] = navigator.getGamepads?.() ?? [],
  ): ControllerFrame {
    const pad = Array.from(pads).find(
      (candidate) => candidate?.connected && candidate.mapping === 'standard',
    );
    const frame: ControllerFrame = {
      x: 0,
      y: 0,
      confirm: false,
      back: false,
      pause: false,
      previous: false,
      next: false,
      build: false,
      migrate: false,
      formation: false,
      journal: false,
    };
    if (!pad) {
      this.previousButtons = 0;
      this.previousDirection = 0;
      return frame;
    }
    let buttons = 0;
    pad.buttons.forEach((button, index) => {
      if (button.pressed) buttons |= 1 << index;
    });
    const tapped = buttons & ~this.previousButtons;
    this.previousButtons = buttons;
    const pressed = (index: number): boolean => (buttons & (1 << index)) !== 0;
    frame.confirm = (tapped & 1) !== 0;
    frame.back = (tapped & (1 << 1)) !== 0;
    frame.pause = (tapped & (1 << 9)) !== 0;
    frame.build = (tapped & (1 << 2)) !== 0;
    frame.migrate = (tapped & (1 << 3)) !== 0;
    frame.formation = (tapped & (1 << 5)) !== 0;
    frame.journal = (tapped & (1 << 8)) !== 0;
    const x = pad.axes[0] ?? 0;
    const y = pad.axes[1] ?? 0;
    const length = Math.hypot(x, y);
    if (length > 0.18) {
      const strength = Math.min(1, (length - 0.18) / 0.82);
      frame.x = (x / length) * strength;
      frame.y = (y / length) * strength;
    }
    const digitalX = Number(pressed(15)) - Number(pressed(14));
    const digitalY = Number(pressed(13)) - Number(pressed(12));
    if (digitalX || digitalY) {
      const magnitude = Math.hypot(digitalX, digitalY);
      frame.x = digitalX / magnitude;
      frame.y = digitalY / magnitude;
    }
    const direction =
      pressed(15) || pressed(13) || x > 0.55 || y > 0.55
        ? 1
        : pressed(14) || pressed(12) || x < -0.55 || y < -0.55
          ? -1
          : 0;
    frame.next = direction === 1 && this.previousDirection !== direction;
    frame.previous = direction === -1 && this.previousDirection !== direction;
    this.previousDirection = direction;
    return frame;
  }
}
