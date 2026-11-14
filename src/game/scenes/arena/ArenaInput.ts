import Phaser from 'phaser';
import { GAME } from '../../config';
import type { ClassAbilitySlot } from '../../data/classes';
import type { SuccessorTrait } from '../../data/successors';
import { combatNumberAction, digitalMovement } from '../../state/khanControls';
import { isKhanActive } from '../../state/khan';
import type { ActionKeys } from '../../systems/ActionKeys';
import type { GamepadInput } from '../../systems/GamepadInput';
import type { ArenaContext } from './ArenaContext';

/** Scene actions that keyboard, wheel, touch and controller input trigger. */
export interface ArenaActions {
  togglePause(): void;
  openBuildings(): void;
  openRoutes(): void;
  cycleFormation(): void;
  selectSuccessor(trait: SuccessorTrait): void;
  toggleJournal(): void;
  toggleDeveloperMenu(): void;
  toggleDeveloperConsole(): void;
  changeZoom(steps: number): void;
  dash(): void;
  useAbility(slot: ClassAbilitySlot): void;
  menuInput(action: 'next' | 'previous' | 'up' | 'down' | 'left' | 'right' | 'confirm'): void;
}

/** Phases where a controller Back press acts like Escape. */
const BACK_PHASES = [
  'paused',
  'building',
  'route',
  'journal',
  'settings',
  'help',
  'traditions',
  'character',
  'developer',
  'console',
];

/**
 * Keyboard, wheel, touch and controller input for the arena. The scene creates
 * this once and owns the controller and ActionKeys, so a held button or a
 * replayed key event cannot fire twice across a restart. `bind` runs in every
 * `create`; the scene removes all keyboard listeners on shutdown.
 */
export class ArenaInput {
  /** The touch joystick origin while a touch drag is held. */
  dragOrigin?: Phaser.Math.Vector2;
  /** Screen-space joystick drawing for touch movement. */
  joystick?: Phaser.GameObjects.Graphics;
  private keys!: Record<
    'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd',
    Phaser.Input.Keyboard.Key
  >;
  private actions!: ArenaActions;
  private readonly controllerMove = new Phaser.Math.Vector2();
  private readonly controllerAim = new Phaser.Math.Vector2();
  private controllerAimActive = false;
  private readonly touchMove = new Phaser.Math.Vector2();
  private readonly pointerTarget = new Phaser.Math.Vector2();
  private hasPointerTarget = false;
  private pointerLightAttackHeld = false;
  private pointerHeavyAttackHeld = false;
  private controllerLightAttackHeld = false;
  private controllerHeavyAttackHeld = false;
  private wheelZoomDelta = 0;

  constructor(
    private readonly arena: ArenaContext,
    private readonly controller: GamepadInput,
    private readonly actionKeys: ActionKeys,
  ) {}

  /** Binds keys, wheel zoom and touch movement for a freshly created scene. */
  bind(actions: ArenaActions): void {
    const { scene } = this.arena;
    const keyboard = scene.input.keyboard!;
    this.actions = actions;
    this.wheelZoomDelta = 0;
    this.touchMove.set(0, 0);
    this.controllerAim.set(0, 0);
    this.controllerAimActive = false;
    this.pointerLightAttackHeld = false;
    this.pointerHeavyAttackHeld = false;
    this.controllerLightAttackHeld = false;
    this.controllerHeavyAttackHeld = false;
    this.hasPointerTarget = false;
    this.dragOrigin = undefined;
    this.keys = keyboard.addKeys({
      up: 'UP',
      down: 'DOWN',
      left: 'LEFT',
      right: 'RIGHT',
      w: 'W',
      a: 'A',
      s: 'S',
      d: 'D',
    }) as typeof this.keys;
    const bindAction = (key: string, action: () => void): void => {
      keyboard.on(`keydown-${key}`, (event: KeyboardEvent) => {
        if (
          key !== 'ESC' &&
          key !== 'F8' &&
          key !== 'F10' &&
          !(key === 'BACKTICK' && ['console', 'developer'].includes(this.arena.run.phase)) &&
          event.target instanceof HTMLElement &&
          event.target.closest('input, textarea, select')
        )
          return;
        if (['F6', 'F7', 'F9', 'F10', 'BACKTICK'].includes(key)) event.preventDefault();
        if (this.actionKeys.consume(event)) {
          action();
        }
      });
    };
    bindAction('ESC', () => actions.togglePause());
    bindAction('P', () => actions.togglePause());
    bindAction('B', () => actions.openBuildings());
    bindAction('M', () => actions.openRoutes());
    bindAction('F', () => actions.cycleFormation());
    const useNumber = (key: 1 | 2 | 3 | 4): void => {
      const action = combatNumberAction(key, isKhanActive(this.arena.run));
      if (action?.kind === 'ability') actions.useAbility(action.slot);
      else if (action?.kind === 'successor') actions.selectSuccessor(action.trait);
    };
    bindAction('ONE', () => useNumber(1));
    bindAction('TWO', () => useNumber(2));
    bindAction('THREE', () => useNumber(3));
    bindAction('FOUR', () => useNumber(4));
    bindAction('J', () => actions.toggleJournal());
    if (import.meta.env.DEV) {
      bindAction('F8', () => actions.toggleDeveloperMenu());
      bindAction('F9', () => this.arena.landscape.cycleTerrainDebug());
      bindAction('F7', () => {
        const world = this.arena.landscape.world3d;
        if (world) world.setTerrainOnly(!world.terrainOnly);
      });
      bindAction('F6', () => {
        const world = this.arena.landscape.world3d;
        if (world) world.setAngle(world.angle < 48 ? 48 : world.angle < 60 ? 60 : 40);
      });
      bindAction('F10', () => actions.toggleDeveloperConsole());
      bindAction('BACKTICK', () => actions.toggleDeveloperConsole());
    }
    const bindZoom = (key: string, steps: number): void => {
      keyboard.on(`keydown-${key}`, (event: KeyboardEvent) => {
        if (
          !this.actionKeys.consume(event) ||
          this.arena.run.phase !== 'playing' ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          (event.target instanceof HTMLElement && event.target.closest('input, textarea, select'))
        )
          return;
        event.preventDefault();
        actions.changeZoom(steps);
      });
    };
    for (const key of ['PLUS', 'NUMPAD_ADD']) bindZoom(key, 1);
    for (const key of ['MINUS', 'NUMPAD_SUBTRACT']) bindZoom(key, -1);
    for (const key of ['ZERO', 'NUMPAD_ZERO']) bindZoom(key, 0);
    scene.input.on(
      'wheel',
      (
        pointer: Phaser.Input.Pointer,
        _over: Phaser.GameObjects.GameObject[],
        _dx: number,
        dy: number,
      ) => {
        const event = pointer.event as WheelEvent;
        if (this.arena.run.phase !== 'playing' || event.ctrlKey || event.metaKey) return;
        if (Math.sign(dy) !== Math.sign(this.wheelZoomDelta)) this.wheelZoomDelta = 0;
        this.wheelZoomDelta += dy;
        const steps = Math.trunc(this.wheelZoomDelta / GAME.camera.wheelStep);
        if (steps) {
          this.wheelZoomDelta %= GAME.camera.wheelStep;
          actions.changeZoom(-steps);
        }
      },
    );
    keyboard.on('keydown-TAB', (event: KeyboardEvent) => {
      if (this.arena.run.phase !== 'playing' || !this.actionKeys.consume(event)) return;
      event.preventDefault();
      actions.toggleJournal();
    });
    // Native Space activation remains available to focused menu buttons.
    keyboard.removeCapture('SPACE');
    bindAction('SPACE', () => actions.dash());
    // Drag anywhere in the arena for analog movement on touch screens.
    this.joystick = scene.add.graphics().setScrollFactor(0).setDepth(10000);
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.wasTouch && this.arena.run.phase === 'playing') {
        this.dragOrigin = new Phaser.Math.Vector2(pointer.x, pointer.y);
        return;
      }
      if (this.arena.run.phase !== 'playing' || pointer.event.target !== scene.game.canvas) return;
      this.controllerAimActive = false;
      this.updatePointerTarget(pointer);
      if (pointer.button === 0) this.pointerLightAttackHeld = true;
      if (pointer.button === 2) this.pointerHeavyAttackHeld = true;
    });
    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.dragOrigin) {
        this.touchMove
          .set(pointer.x - this.dragOrigin.x, pointer.y - this.dragOrigin.y)
          .limit(45)
          .scale(1 / 45);
      } else if (!pointer.wasTouch) {
        this.controllerAimActive = false;
        this.updatePointerTarget(pointer);
      }
    });
    const releasePointer = (pointer: Phaser.Input.Pointer): void => {
      if (pointer.wasTouch) this.clearTouch();
      const button = (pointer.event as PointerEvent).button;
      if (button === 0) this.pointerLightAttackHeld = false;
      if (button === 2) this.pointerHeavyAttackHeld = false;
    };
    scene.input.on('pointerup', releasePointer);
    scene.input.on('pointerupoutside', releasePointer);
    const preventContextMenu = (event: MouseEvent): void => event.preventDefault();
    scene.game.canvas.addEventListener('contextmenu', preventContextMenu);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      scene.game.canvas.removeEventListener('contextmenu', preventContextMenu),
    );
  }

  /**
   * Polls the controller once per frame and dispatches its menu and gameplay
   * presses. Returns false when a press changed the phase.
   */
  pollController(): boolean {
    const actions = this.actions;
    const controller = this.controller.poll();
    this.controllerMove.set(controller.x, controller.y);
    if (controller.aimX || controller.aimY) {
      this.controllerAim.set(controller.aimX, controller.aimY);
      this.controllerAimActive = true;
    }
    this.controllerLightAttackHeld = controller.lightAttack;
    this.controllerHeavyAttackHeld = controller.heavyAttack;
    const phaseBeforeInput = this.arena.run.phase;
    if (controller.pause || (controller.back && BACK_PHASES.includes(this.arena.run.phase)))
      actions.togglePause();
    else if (this.arena.run.phase === 'playing') {
      if (controller.zoomReset) actions.changeZoom(0);
      else if (controller.zoomIn) actions.changeZoom(1);
      else if (controller.zoomOut) actions.changeZoom(-1);
      if (!isKhanActive(this.arena.run)) {
        if (controller.previous) actions.selectSuccessor('outrider');
        else if (controller.next) actions.selectSuccessor('hearthguard');
      }
      if (controller.gallop) actions.dash();
      if (controller.abilityQ) actions.useAbility('q');
      if (controller.abilityW) actions.useAbility('w');
      if (controller.abilityE) actions.useAbility('e');
      if (controller.abilityR) actions.useAbility('r');
      if (controller.build) actions.openBuildings();
      else if (controller.migrate) actions.openRoutes();
      else if (controller.formation) actions.cycleFormation();
      else if (controller.journal) actions.toggleJournal();
    } else {
      if (controller.journal && this.arena.run.phase === 'journal') actions.toggleJournal();
      if (controller.menuDirection) actions.menuInput(controller.menuDirection);
      else if (controller.next) actions.menuInput('next');
      else if (controller.previous) actions.menuInput('previous');
      if (controller.confirm) actions.menuInput('confirm');
    }
    return this.arena.run.phase === phaseBeforeInput;
  }

  /** The Khan's movement intent: WASD/arrows, controller, then touch drag. */
  movement(_player: { x: number; y: number }): Phaser.Math.Vector2 {
    const keyboard = digitalMovement({
      up: this.keys.up.isDown || this.keys.w.isDown,
      down: this.keys.down.isDown || this.keys.s.isDown,
      left: this.keys.left.isDown || this.keys.a.isDown,
      right: this.keys.right.isDown || this.keys.d.isDown,
    });
    const movement = new Phaser.Math.Vector2(keyboard.x, keyboard.y);
    if (movement.lengthSq() === 0) {
      if (this.controllerMove.lengthSq() > 0) movement.copy(this.controllerMove);
      else if (this.touchMove.lengthSq() > 0) movement.copy(this.touchMove);
    }
    return movement;
  }

  /** Current world-space aim from the right stick or mouse cursor. */
  aimPoint(
    player: { x: number; y: number },
    facing: { x: number; y: number },
  ): Phaser.Math.Vector2 {
    if (this.controllerAimActive && this.controllerAim.lengthSq() > 0.01) {
      const aim = this.arena.landscape.world3d
        ? this.arena.landscape.world3d.movement(this.controllerAim.x, this.controllerAim.y)
        : this.controllerAim;
      return new Phaser.Math.Vector2(player.x + aim.x * 500, player.y + aim.y * 500);
    }
    if (this.hasPointerTarget) return this.pointerTarget.clone();
    return new Phaser.Math.Vector2(player.x + facing.x * 500, player.y + facing.y * 500);
  }

  /** Whether aim came from a cursor or right stick rather than prior facing. */
  hasUsableAim(): boolean {
    return (
      (this.controllerAimActive && this.controllerAim.lengthSq() > 0.01) || this.hasPointerTarget
    );
  }

  lightAttackHeld(): boolean {
    return this.pointerLightAttackHeld || this.controllerLightAttackHeld;
  }

  heavyAttackHeld(): boolean {
    return this.pointerHeavyAttackHeld || this.controllerHeavyAttackHeld;
  }

  /** Redraws the touch joystick in screen space for the main camera's zoom. */
  drawJoystick(): void {
    // Scroll factor alone does not cancel camera zoom for the screen-space joystick.
    const camera = this.arena.scene.cameras.main;
    const inverseZoom = 1 / camera.zoom;
    this.joystick!.setScale(inverseZoom)
      .setPosition((camera.width / 2) * (1 - inverseZoom), (camera.height / 2) * (1 - inverseZoom))
      .clear();
    if (this.dragOrigin) {
      this.joystick!.lineStyle(2, 0xc8df9b, 0.3).strokeCircle(
        this.dragOrigin.x,
        this.dragOrigin.y,
        45,
      );
      this.joystick!.fillStyle(0xc8df9b, 0.3).fillCircle(
        this.dragOrigin.x + this.touchMove.x * 45,
        this.dragOrigin.y + this.touchMove.y * 45,
        12,
      );
    }
  }

  /** Drops any held touch drag and partial wheel scroll, as every phase change does. */
  release(): void {
    this.wheelZoomDelta = 0;
    this.pointerLightAttackHeld = false;
    this.pointerHeavyAttackHeld = false;
    this.controllerLightAttackHeld = false;
    this.controllerHeavyAttackHeld = false;
    this.clearTouch();
  }

  clearTouch(): void {
    this.dragOrigin = undefined;
    this.touchMove.set(0, 0);
    this.joystick?.clear();
  }

  private updatePointerTarget(pointer: Phaser.Input.Pointer): void {
    const world = this.arena.landscape.world3d?.groundPoint(pointer.x, pointer.y);
    if (world) this.pointerTarget.set(world.x, world.y);
    else this.arena.scene.cameras.main.getWorldPoint(pointer.x, pointer.y, this.pointerTarget);
    this.hasPointerTarget = true;
  }
}
