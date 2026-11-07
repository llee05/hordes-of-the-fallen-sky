import Phaser from 'phaser';
import { GAME } from '../../config';
import type { SuccessorTrait } from '../../data/successors';
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
  menuInput(action: 'next' | 'previous' | 'confirm'): void;
}

/** Phases where a controller Back press acts like Escape. */
const BACK_PHASES = [
  'playing',
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
  private readonly touchMove = new Phaser.Math.Vector2();
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
    bindAction('ONE', () => actions.selectSuccessor('outrider'));
    bindAction('TWO', () => actions.selectSuccessor('hearthguard'));
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
      if (pointer.wasTouch && this.arena.run.phase === 'playing')
        this.dragOrigin = new Phaser.Math.Vector2(pointer.x, pointer.y);
    });
    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragOrigin) return;
      this.touchMove
        .set(pointer.x - this.dragOrigin.x, pointer.y - this.dragOrigin.y)
        .limit(45)
        .scale(1 / 45);
    });
    scene.input.on('pointerup', () => this.clearTouch());
    scene.input.on('pointerupoutside', () => this.clearTouch());
  }

  /**
   * Polls the controller once per frame and dispatches its menu and gameplay
   * presses. Returns false when a press changed the phase.
   */
  pollController(): boolean {
    const actions = this.actions;
    const controller = this.controller.poll();
    this.controllerMove.set(controller.x, controller.y);
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
      if (controller.confirm) actions.dash();
      if (controller.build) actions.openBuildings();
      else if (controller.migrate) actions.openRoutes();
      else if (controller.formation) actions.cycleFormation();
      else if (controller.journal) actions.toggleJournal();
    } else {
      if (controller.journal && this.arena.run.phase === 'journal') actions.toggleJournal();
      if (controller.next) actions.menuInput('next');
      if (controller.previous) actions.menuInput('previous');
      if (controller.confirm) actions.menuInput('confirm');
    }
    return this.arena.run.phase === phaseBeforeInput;
  }

  /** The Khan's movement intent: keys first, then the controller stick, then touch. */
  movement(): Phaser.Math.Vector2 {
    const x =
      Number(this.keys.right.isDown || this.keys.d.isDown) -
      Number(this.keys.left.isDown || this.keys.a.isDown);
    const y =
      Number(this.keys.down.isDown || this.keys.s.isDown) -
      Number(this.keys.up.isDown || this.keys.w.isDown);
    const movement = new Phaser.Math.Vector2(x, y);
    if (movement.lengthSq() > 0) movement.normalize();
    else if (this.controllerMove.lengthSq() > 0) movement.copy(this.controllerMove);
    else movement.copy(this.touchMove);
    return movement;
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
    this.clearTouch();
  }

  clearTouch(): void {
    this.dragOrigin = undefined;
    this.touchMove.set(0, 0);
    this.joystick?.clear();
  }
}
