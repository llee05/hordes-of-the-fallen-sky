export interface ControllerFrame {
  x: number;
  y: number;
  aimX: number;
  aimY: number;
  lightAttack: boolean;
  heavyAttack: boolean;
  abilityQ: boolean;
  abilityW: boolean;
  abilityE: boolean;
  abilityR: boolean;
  gallop: boolean;
  confirm: boolean;
  back: boolean;
  pause: boolean;
  previous: boolean;
  next: boolean;
  build: boolean;
  migrate: boolean;
  formation: boolean;
  journal: boolean;
  zoomIn: boolean;
  zoomOut: boolean;
  zoomReset: boolean;
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
      aimX: 0,
      aimY: 0,
      lightAttack: false,
      heavyAttack: false,
      abilityQ: false,
      abilityW: false,
      abilityE: false,
      abilityR: false,
      gallop: false,
      confirm: false,
      back: false,
      pause: false,
      previous: false,
      next: false,
      build: false,
      migrate: false,
      formation: false,
      journal: false,
      zoomIn: false,
      zoomOut: false,
      zoomReset: false,
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
    frame.abilityQ = (tapped & 1) !== 0;
    frame.abilityW = (tapped & (1 << 1)) !== 0;
    frame.abilityE = (tapped & (1 << 2)) !== 0;
    frame.abilityR = (tapped & (1 << 3)) !== 0;
    frame.gallop = (tapped & (1 << 4)) !== 0;
    frame.lightAttack = pressed(7);
    frame.heavyAttack = pressed(6);
    frame.build = (tapped & (1 << 12)) !== 0;
    frame.migrate = (tapped & (1 << 13)) !== 0;
    frame.formation = (tapped & (1 << 5)) !== 0;
    frame.journal = (tapped & (1 << 8)) !== 0;
    frame.zoomIn = (tapped & (1 << 15)) !== 0;
    frame.zoomOut = (tapped & (1 << 14)) !== 0;
    frame.zoomReset = (tapped & (1 << 11)) !== 0;
    const x = pad.axes[0] ?? 0;
    const y = pad.axes[1] ?? 0;
    const length = Math.hypot(x, y);
    if (length > 0.18) {
      const strength = Math.min(1, (length - 0.18) / 0.82);
      frame.x = (x / length) * strength;
      frame.y = (y / length) * strength;
    }
    const aimX = pad.axes[2] ?? 0;
    const aimY = pad.axes[3] ?? 0;
    const aimLength = Math.hypot(aimX, aimY);
    if (aimLength > 0.24) {
      const strength = Math.min(1, (aimLength - 0.24) / 0.76);
      frame.aimX = (aimX / aimLength) * strength;
      frame.aimY = (aimY / aimLength) * strength;
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
