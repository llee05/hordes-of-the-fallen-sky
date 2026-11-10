import { GAME } from '../../config';
import { ALL_ENEMIES } from '../../data/enemies';
import {
  normalizeCapture,
  normalizeScenario,
  sameView,
  snapshotGameState,
  validateCamera,
  type CameraOptions,
  type CameraState,
  type CaptureOptions,
  type GameStateSnapshot,
  type ScenarioOptions,
} from '../../dev/gameControls';
import {
  profileFrames,
  seededRandom,
  type FrameProfile,
  type ProfileTarget,
} from '../../dev/frameProfile';
import type { Enemy } from '../../entities/actors';
import { encounterEnemy } from '../../state/encounters';
import { currentLocation } from '../../state/journey';
import type { ArenaScene } from '../ArenaScene';
import type { ArenaContext } from './ArenaContext';
import { createArenaTimers, type ArenaTimers } from './ArenaTimers';

type VolleyArguments = Parameters<ArenaScene['shootVolley']>;

export interface SpawnOptions {
  id?: (typeof ALL_ENEMIES)[number]['id'];
  x: number;
  y: number;
  /** Base definition health; the director still applies its normal elapsed-time scaling. */
  health?: number;
}

export interface VolleyOptions {
  from: { x: number; y: number };
  target: Enemy;
  count: number;
  /** Same damage or multiplier semantics as CombatSystem.shootVolley. */
  damage: number;
  source: NonNullable<VolleyArguments[7]>;
  ancestral?: boolean;
  charged?: boolean;
  echoIndex?: number;
  ghost?: boolean;
  origin?: Enemy;
}

export interface CrowdOptions {
  count: number;
  /** Seeds enemy kinds and positions; the default is 1. */
  seed?: number;
  /** Ring around the Khan, in world units. Defaults reach past the view edge. */
  minRadius?: number;
  maxRadius?: number;
  /** Base definition health so the crowd survives the sample; the default is 1e6. */
  health?: number;
}

export interface CrowdProfileOptions extends CrowdOptions {
  /** Real seconds to run after spawning before sampling; the default is 2. */
  warmup?: number;
  /** Real seconds to sample; the default is 4. */
  seconds?: number;
  /** Also time terrain navigation calls. Their wrappers add overhead to enemy behaviour. */
  navigation?: boolean;
}

export interface CrowdProfile extends FrameProfile {
  location: string;
  enemies: number;
  renderScale: number;
  gpu: string;
}

export interface CaptureResult {
  /** Frames rendered while waiting for the view to settle. */
  frames: number;
  camera: CameraState;
}

export interface MetricsOptions {
  /** Real seconds to sample; default 2. */
  seconds?: number;
  /** Also time terrain navigation calls; see profileCrowd. */
  navigation?: boolean;
}

export interface GameMetrics extends FrameProfile {
  location: string;
  frozen: boolean;
  enemies: number;
  projectiles: number;
  hostileShots: number;
  gems: number;
  renderScale: number;
  pendingChunks: number;
  gpu: string;
  /** three.js renderer.info for the last drawn frame; absent without the 3D world. */
  renderer?: {
    calls: number;
    triangles: number;
    points: number;
    lines: number;
    geometries: number;
    textures: number;
    programs: number;
  };
}

/** Stable development-only operations; browser tests must not invent scene timer fields. */
export interface ArenaTestHooks {
  /** Suppress only the selected timers; clears enemies by default. */
  quietBattlefield(options?: {
    timers?: readonly (keyof ArenaTimers)[];
    clearEnemies?: boolean;
  }): void;
  setTimers(timers: Partial<ArenaTimers>): void;
  spawn(options: SpawnOptions): boolean;
  volley(options: VolleyOptions): boolean;
  /** Run real scene updates at 60Hz, including a final partial frame. Menus still freeze simulation. */
  advance(seconds: number): void;
  invincible(options: { khan?: boolean; clan?: boolean }): void;
  /** Spawns a seeded crowd of the current place's enemies around the Khan; returns the count placed. */
  crowd(options: CrowdOptions): number;
  /**
   * Repeatable heavy-fight measurement: seeds Math.random for the scenario, stops
   * new arrivals, protects the Khan and clan, spawns the crowd, pins the 3D render
   * scale to 100%, then samples real frames and reports a per-system breakdown.
   */
  profileCrowd(options: CrowdProfileOptions): Promise<CrowdProfile>;
  /** Plain JSON snapshot of the run, Khan, clan, enemies, projectiles and camera. */
  getState(): GameStateSnapshot;
  /**
   * Restarts the scene at a real place with `Math.random` seeded (it stays seeded
   * afterwards so `advance` repeats), then applies the options before the first
   * frame. Resolves with the resulting state.
   */
  loadScenario(options: ScenarioOptions): Promise<GameStateSnapshot>;
  /** Centres or re-follows the main camera; returns the applied camera. */
  setCamera(options: CameraOptions): CameraState;
  /**
   * Stops every scene step (simulation, physics, tweens, particles, animation
   * clocks) while rendering continues, and pins the 3D render scale to 100%.
   */
  freezeVisuals(on: boolean): void;
  /** Resolves once the view has rendered unchanged for `frames` frames with no pending terrain. */
  captureScene(options?: CaptureOptions): Promise<CaptureResult>;
  /** Samples real frames like profileCrowd, then adds counts and three.js renderer info. */
  exportMetrics(options?: MetricsOptions): Promise<GameMetrics>;
}

/** The bootstrap imports this module only in DEV. Context getters survive scene restarts. */
export function createTestHooks(
  scene: ArenaScene,
  // The single typed boundary to scene internals. Indexed access keeps TypeScript
  // checking without adding a production-facing context accessor to ArenaScene.
  arena: ArenaContext = scene['createArenaContext'](),
): ArenaTestHooks {
  const timerKeys = new Set(Object.keys(createArenaTimers()));
  const invincible = ({ khan, clan }: { khan?: boolean; clan?: boolean }): void => {
    const tools = arena.developerTools;
    if (!tools) throw new Error('Development tools are unavailable');
    if (khan !== undefined) tools.invincible = khan;
    if (clan !== undefined) tools.clanInvincible = clan;
  };
  const crowd = ({
    count,
    seed = 1,
    minRadius = 240,
    maxRadius = 1400,
    health = 1e6,
  }: CrowdOptions): number => {
    if (!Number.isInteger(count) || count < 0)
      throw new Error('Crowd count must be a whole number');
    const random = seededRandom(seed);
    const { player } = arena;
    let placed = 0;
    for (let attempt = 0; placed < count && attempt < count * 12; attempt++) {
      const angle = random() * Math.PI * 2;
      const radius = minRadius + Math.sqrt(random()) * (maxRadius - minRadius);
      const definition = encounterEnemy(arena.run, random).definition;
      const point = {
        x: player.x + Math.cos(angle) * radius,
        y: player.y + Math.sin(angle) * radius,
      };
      if (scene.spawnEnemy({ ...definition, health }, { point })) placed++;
    }
    return placed;
  };
  const profileTargets = (navigation: boolean): ProfileTarget[] => {
    const world = arena.landscape.world3d;
    const nav = arena.landscape.navigation;
    const parts: [string, object | undefined, string][] = [
      ['scene.update', scene.sys, 'sceneUpdate'],
      ['physics.step', scene.physics.world, 'step'],
      ['enemyBehaviour', scene['enemyBehaviour'], 'update'],
      ['spatial.rebuild', arena.spatial, 'rebuild'],
      ['campDefences', scene['campDefences'], 'update'],
      ['combat.tickFire', scene['combat'], 'tickFire'],
      ['combat.projectiles', scene['combat'], 'updateProjectiles'],
      ['combat.gems', scene['combat'], 'collectGems'],
      ['riders.fire', scene['riderHost'], 'fire'],
      ['riders.update', scene['riderHost'], 'update'],
      ['spawns', scene['enemyDirector'], 'tickSpawns'],
      ['areaCombat', scene['areaCombat'], 'update'],
      ['hazards', scene['hazardSystem'], 'update'],
      ['fieldObjectives', scene['fieldObjectives'], 'update'],
      ['campPresenter', scene['campPresenter'], 'update'],
      ['landscape.update', arena.landscape, 'update'],
      ['animator', scene['animator'], 'update'],
      ['hud', scene['callbacks'], 'onHud'],
      ['world3d.render', world, 'render'],
      ['world3d.sprites', world?.sprites, 'update'],
      ['world3d.effects', world?.effects, 'update'],
      ['world3d.draw', world?.renderer, 'render'],
    ];
    if (navigation)
      parts.push(
        ['nav.waypoint', nav, 'waypoint'],
        ['nav.lineClear', nav, 'lineClear'],
        ['nav.nearestWalkable', nav, 'nearestWalkable'],
      );
    return parts.map(([name, owner, method]) => ({ name, owner, method }));
  };
  const setTimers = (values: Partial<ArenaTimers>): void => {
    // Validate the entire patch before mutating anything, including JS/untyped callers.
    for (const key of Reflect.ownKeys(values)) {
      if (typeof key !== 'string' || !timerKeys.has(key))
        throw new Error(`Unknown arena timer: ${String(key)}`);
      const value: unknown = Reflect.get(values, key);
      if (typeof value !== 'number' || !Number.isFinite(value))
        throw new Error(`Invalid arena timer value: ${key}`);
    }
    Object.assign(arena.timers, values);
  };
  let frozen = false;
  const sys = scene.sys as unknown as { step(time: number, delta: number): void };
  const freezeVisuals = (on: boolean): void => {
    if (typeof on !== 'boolean') throw new Error('freezeVisuals requires true or false');
    // An own no-op step shadows Phaser's Systems.step; rendering continues.
    if (on) sys.step = () => {};
    else if (Object.prototype.hasOwnProperty.call(sys, 'step')) Reflect.deleteProperty(sys, 'step');
    frozen = on;
    const world = arena.landscape.world3d;
    if (!world) return;
    if (on) {
      world.setRenderScale(1);
      world['qualityTime'] = Infinity;
    } else world['qualityTime'] = performance.now();
  };
  const cameraState = (): CameraState => {
    const camera = scene.cameras.main;
    const world = arena.landscape.world3d;
    return {
      x: Math.round(camera.midPoint.x * 10) / 10,
      y: Math.round(camera.midPoint.y * 10) / 10,
      zoom: camera.zoom,
      following: !!(camera as unknown as { _follow: unknown })._follow,
      ...(world ? { angle: world.angle } : {}),
    };
  };
  const getState = (): GameStateSnapshot =>
    snapshotGameState({
      run: arena.run,
      player: arena.player,
      enemies: arena.enemies.getChildren() as Enemy[],
      projectiles: arena.projectiles.getChildren() as Phaser.Physics.Arcade.Image[],
      hostileShots: arena.hostileShots.getChildren() as Phaser.Physics.Arcade.Image[],
      gems: arena.gems.getChildren() as Phaser.Physics.Arcade.Image[],
      camera: cameraState(),
      frozen,
    });
  const gpuName = (): string => {
    const gl = arena.landscape.world3d?.renderer.getContext();
    const debug = gl?.getExtension('WEBGL_debug_renderer_info');
    return gl && debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : 'unknown';
  };
  const advance = (seconds: number): void => {
    if (!Number.isFinite(seconds) || seconds < 0)
      throw new Error('Advance requires finite, nonnegative seconds');
    const frames = Math.floor(seconds * 60);
    for (let frame = 0; frame < frames; frame++) scene.update(0, 1000 / 60);
    const remainder = seconds - frames / 60;
    if (remainder > 1e-10) scene.update(0, remainder * 1000);
  };
  return {
    setTimers,
    quietBattlefield({ timers = ['spawnTimer', 'attackTimer'], clearEnemies = true } = {}) {
      setTimers(Object.fromEntries(timers.map((key) => [key, 999])));
      if (clearEnemies)
        for (const enemy of arena.enemies.getChildren()) (enemy as Enemy).disableBody(true, true);
    },
    spawn({ id, x, y, health }) {
      const definition =
        id === undefined
          ? health === undefined
            ? undefined
            : encounterEnemy(arena.run).definition
          : ALL_ENEMIES.find((enemy) => enemy.id === id);
      if (id !== undefined && !definition) throw new Error(`Unknown enemy: ${id}`);
      return scene.spawnEnemy(
        definition && health !== undefined ? { ...definition, health } : definition,
        { point: { x, y } },
      );
    },
    volley({ from, target, count, damage, source, ancestral, charged, echoIndex, ghost, origin }) {
      return scene.shootVolley(
        from.x,
        from.y,
        target,
        count,
        damage,
        ancestral,
        charged,
        source,
        echoIndex,
        ghost,
        origin,
      );
    },
    advance,
    invincible,
    crowd,
    async profileCrowd({ warmup = 2, seconds = 4, navigation = false, ...options }) {
      const world = arena.landscape.world3d;
      const random = Math.random;
      Math.random = seededRandom(options.seed ?? 1);
      try {
        setTimers({ spawnTimer: 999 });
        for (const enemy of arena.enemies.getChildren()) (enemy as Enemy).disableBody(true, true);
        invincible({ khan: true, clan: true });
        crowd(options);
        if (world) {
          world.setRenderScale(1);
          // Hold quality steady so before/after samples draw the same pixels.
          world['qualityTime'] = Infinity;
        }
        await new Promise((resolve) => setTimeout(resolve, warmup * 1000));
        const profile = await profileFrames(scene.game.events, profileTargets(navigation), seconds);
        return {
          ...profile,
          location: currentLocation(arena.run).id,
          enemies: arena.enemies.countActive(true),
          renderScale: world?.renderScale ?? 1,
          gpu: gpuName(),
        };
      } finally {
        Math.random = random;
        if (world) world['qualityTime'] = performance.now();
      }
    },
    getState,
    loadScenario(options) {
      const scenario = normalizeScenario(options, GAME.maxEnemies);
      // Unfrozen so the restart's loader and create run normally; the CREATE
      // handler below applies everything before the next scene step.
      freezeVisuals(false);
      return new Promise((resolve, reject) => {
        // Seed when the restarted scene starts, so its create draws the same numbers.
        const seed = (): void => {
          Math.random = seededRandom(scenario.seed);
        };
        const created = (): void => {
          try {
            if (scenario.elapsed !== undefined) arena.run.elapsed = scenario.elapsed;
            if (!scenario.arrivals) setTimers({ spawnTimer: 999 });
            if (scenario.protect) invincible({ khan: true, clan: true });
            crowd({
              count: scenario.enemies,
              seed: scenario.seed,
              minRadius: scenario.minRadius,
              maxRadius: scenario.maxRadius,
            });
            advance(scenario.settle);
            freezeVisuals(scenario.freeze);
            resolve(getState());
          } catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        };
        scene.events.once('start', seed);
        scene.events.once('create', created);
        scene.scene.restart({ developerLevel: `place:${scenario.place}` });
      });
    },
    setCamera(options) {
      const { x, y, zoom, follow } = validateCamera(options);
      const camera = scene.cameras.main;
      if (follow) camera.startFollow(arena.player, true, 0.09, 0.09).setFollowOffset(0, 0);
      else if (x !== undefined && y !== undefined) {
        camera.stopFollow();
        camera.centerOn(x, y);
      }
      if (zoom !== undefined) scene['applyCameraZoom'](zoom);
      // Snap the 3D focus height instead of easing toward the new ground level.
      const world = arena.landscape.world3d;
      if (world) world['focusHeight'] = undefined;
      return cameraState();
    },
    freezeVisuals,
    async captureScene(options) {
      const { frames, timeout } = normalizeCapture(options);
      // Webfonts change HUD text metrics; wait for them before the first stable frame.
      await globalThis.document?.fonts.ready;
      return new Promise((resolve, reject) => {
        type View = Parameters<typeof sameView>[0];
        let previous: View | undefined;
        let stable = 0;
        let rendered = 0;
        const read = (): View => {
          const camera = scene.cameras.main;
          const world = arena.landscape.world3d;
          return {
            x: camera.midPoint.x,
            y: camera.midPoint.y,
            zoom: camera.zoom,
            focus: world?.['focusHeight'],
            scale: world?.renderScale ?? 1,
            pending: world?.pendingChunks ?? 0,
          };
        };
        const finish = (): void => {
          clearTimeout(timer);
          scene.game.events.off('postrender', onRender);
        };
        const onRender = (): void => {
          rendered += 1;
          const view = read();
          stable = previous && sameView(previous, view) ? stable + 1 : 0;
          previous = view;
          if (stable < frames) return;
          finish();
          resolve({ frames: rendered, camera: cameraState() });
        };
        const timer = setTimeout(() => {
          finish();
          reject(new Error(`Scene did not settle within ${timeout}ms`));
        }, timeout);
        scene.game.events.on('postrender', onRender);
      });
    },
    async exportMetrics({ seconds = 2, navigation = false } = {}) {
      if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 60)
        throw new Error('Metrics seconds must be from 0 to 60');
      const profile = await profileFrames(scene.game.events, profileTargets(navigation), seconds);
      const world = arena.landscape.world3d;
      const info = world?.renderer.info;
      return {
        ...profile,
        location: currentLocation(arena.run).id,
        frozen,
        enemies: arena.enemies.countActive(true),
        projectiles: arena.projectiles.countActive(true),
        hostileShots: arena.hostileShots.countActive(true),
        gems: arena.gems.countActive(true),
        renderScale: world?.renderScale ?? 1,
        pendingChunks: world?.pendingChunks ?? 0,
        gpu: gpuName(),
        ...(info
          ? {
              renderer: {
                calls: info.render.calls,
                triangles: info.render.triangles,
                points: info.render.points,
                lines: info.render.lines,
                geometries: info.memory.geometries,
                textures: info.memory.textures,
                programs: info.programs?.length ?? 0,
              },
            }
          : {}),
      };
    },
  };
}

declare global {
  interface Window {
    /** Only installed by development bootstrap; unavailable in production. */
    __gloam: { game: Phaser.Game; scene: ArenaScene; hooks: ArenaTestHooks };
  }
}
