import { ALL_ENEMIES } from '../../data/enemies';
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
    advance(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0)
        throw new Error('Advance requires finite, nonnegative seconds');
      const frames = Math.floor(seconds * 60);
      for (let frame = 0; frame < frames; frame++) scene.update(0, 1000 / 60);
      const remainder = seconds - frames / 60;
      if (remainder > 1e-10) scene.update(0, remainder * 1000);
    },
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
        const gl = world?.renderer.getContext();
        const debug = gl?.getExtension('WEBGL_debug_renderer_info');
        return {
          ...profile,
          location: currentLocation(arena.run).id,
          enemies: arena.enemies.countActive(true),
          renderScale: world?.renderScale ?? 1,
          gpu: gl && debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : 'unknown',
        };
      } finally {
        Math.random = random;
        if (world) world['qualityTime'] = performance.now();
      }
    },
  };
}

declare global {
  interface Window {
    /** Only installed by development bootstrap; unavailable in production. */
    __gloam: { game: Phaser.Game; scene: ArenaScene; hooks: ArenaTestHooks };
  }
}
