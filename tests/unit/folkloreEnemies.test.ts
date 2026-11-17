import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('../support/mockPhaser')).mockPhaser());

import {
  ALL_ENEMIES,
  ENCOUNTER_ENEMIES,
  FOLKLORE_ENEMIES,
  areaRoster,
  chooseEnemy,
} from '../../src/game/data/enemies';
import { GAME } from '../../src/game/config';
import { createDeveloperClassRun } from '../../src/game/dev/levels';
import type { Enemy } from '../../src/game/entities/actors';
import { CombatSystem } from '../../src/game/scenes/arena/CombatSystem';
import {
  EnemyBehaviour,
  type EnemyBehaviourHost,
} from '../../src/game/scenes/arena/EnemyBehaviour';
import { EnemyDirector } from '../../src/game/scenes/arena/EnemyDirector';
import { captureExpedition, decodeExpedition } from '../../src/game/state/expeditionArchive';
import { khanResourcesOf } from '../../src/game/state/khanResources';
import { createRun } from '../../src/game/state/run';
import {
  advanceAlmas,
  advanceDeathWorm,
  advanceMuuShuuvuu,
  createFolkloreEnemyState,
  muuShuuvuuOrbit,
  type FolkloreEnemyState,
} from '../../src/game/systems/folkloreEnemies';
import { createFakeArena } from '../support/fakeArena';
import { world } from './fixtures/expedition';

const origin = { x: 0, y: 0 };

function ready(): FolkloreEnemyState {
  return { ...createFolkloreEnemyState(), cooldown: 0 };
}

describe('folklore enemy catalog', () => {
  it('keeps the Almas spawnable and save-valid without adding it to any live roster', () => {
    const almas = FOLKLORE_ENEMIES.find((enemy) => enemy.id === 'almas');
    expect(almas).toMatchObject({ behavior: 'almas', health: 240, speed: 28, damage: 20 });
    expect(ALL_ENEMIES).toContain(almas);
    expect(ENCOUNTER_ENEMIES).not.toContain(almas);
    expect(areaRoster('orkhon-valley', Number.MAX_SAFE_INTEGER, 9999)).not.toContain(almas);
    for (const roll of [0, 0.25, 0.5, 0.75, 0.999])
      expect(chooseEnemy(9999, () => roll)).not.toBe(almas);
  });
  it('keeps the Death Worm in the developer-only folklore catalog', () => {
    const worm = FOLKLORE_ENEMIES.find((enemy) => enemy.id === 'death-worm');
    expect(worm).toMatchObject({
      title: 'Olgoi-Khorkhoi',
      behavior: 'death-worm',
      health: 110,
      speed: 40,
    });
    expect(ALL_ENEMIES).toContain(worm);
    expect(ENCOUNTER_ENEMIES).not.toContain(worm);
    expect(areaRoster('orkhon-valley', Number.MAX_SAFE_INTEGER, 9999)).not.toContain(worm);
  });
  it('keeps the Muu Shuuvuu in the developer-only folklore catalog', () => {
    const bird = FOLKLORE_ENEMIES.find((enemy) => enemy.id === 'muu-shuuvuu');
    expect(bird).toMatchObject({ behavior: 'muu-shuuvuu', health: 75, speed: 72, damage: 10 });
    expect(ALL_ENEMIES).toContain(bird);
    expect(ENCOUNTER_ENEMIES).not.toContain(bird);
    expect(areaRoster('orkhon-valley', Number.MAX_SAFE_INTEGER, 9999)).not.toContain(bird);
  });
});

describe('Muu Shuuvuu attacks and movement', () => {
  it('circles on a stable per-actor orbit instead of steering straight at the Khan', () => {
    const target = { x: 100, y: 200 };
    const first = muuShuuvuuOrbit(target, 0, 0);
    const later = muuShuuvuuOrbit(target, 1, 0);
    expect(Math.hypot(first.x - target.x, first.y - target.y)).toBeCloseTo(
      GAME.tactics.muuShuuvuu.orbitRadius,
    );
    expect(later).not.toEqual(first);
    expect(muuShuuvuuOrbit(target, 0, 1)).not.toEqual(first);
  });

  it('telegraphs a snapshotted dive before entering its fast attack phase', () => {
    const state = ready();
    expect(advanceMuuShuuvuu(state, 0.01, origin, { x: 300, y: 400 }).started).toBe('dive');
    expect(state.direction?.x).toBeCloseTo(0.6);
    expect(state.direction?.y).toBeCloseTo(0.8);
    expect(
      advanceMuuShuuvuu(state, GAME.tactics.muuShuuvuu.diveWarning, origin, { x: -300, y: 0 })
        .released,
    ).toBe('dive');
    expect(state.phase).toBe('attack');
    advanceMuuShuuvuu(state, GAME.tactics.muuShuuvuu.diveDuration, origin, { x: -300, y: 0 });
    expect(state.phase).toBe('recover');
  });

  it('alternates the next attack to a radius-marked supernatural shriek', () => {
    const state = { ...ready(), sequence: 1 };
    expect(advanceMuuShuuvuu(state, 0.01, origin, { x: 250, y: 0 }).started).toBe('shriek');
    expect(
      advanceMuuShuuvuu(state, GAME.tactics.muuShuuvuu.shriekWarning, origin, { x: 250, y: 0 })
        .released,
    ).toBe('shriek');
    expect(state.phase).toBe('recover');
    expect(state.cooldown).toBe(GAME.tactics.muuShuuvuu.cooldown);
  });

  it('interrupts either committed attack into recovery', () => {
    const state = ready();
    advanceMuuShuuvuu(state, 0.01, origin, { x: 250, y: 0 });
    advanceMuuShuuvuu(state, 0.1, origin, { x: 250, y: 0 }, true);
    expect(state).toMatchObject({
      phase: 'recover',
      remaining: GAME.tactics.muuShuuvuu.recovery,
      hit: false,
    });
  });
});

describe('Olgoi-Khorkhoi attacks', () => {
  it('telegraphs a close bite instead of entering a ranged cycle', () => {
    const state = ready();
    expect(advanceDeathWorm(state, 0.01, origin, { x: 50, y: 0 }).started).toBe('bite');
    expect(state.phase).toBe('windup');
    expect(
      advanceDeathWorm(state, GAME.tactics.deathWorm.biteWarning, origin, { x: 50, y: 0 }).released,
    ).toBe('bite');
    expect(state.phase).toBe('recover');
  });

  it('burrows to a snapshotted emergence mark before its damage window', () => {
    const state = ready();
    expect(advanceDeathWorm(state, 0.01, origin, { x: 250, y: 0 }).started).toBe('burrow');
    expect(state.aim).toEqual({ x: 250, y: 0 });
    expect(
      advanceDeathWorm(state, GAME.tactics.deathWorm.burrowWarning, origin, { x: 500, y: 0 })
        .released,
    ).toBe('burrow');
    expect(state.phase).toBe('attack');
    expect(
      advanceDeathWorm(state, GAME.tactics.deathWorm.burrowDuration, origin, { x: 500, y: 0 })
        .emerged,
    ).toBe(true);
    expect(state.phase).toBe('recover');
  });

  it('alternates its next mid-range ambush with a poison spit', () => {
    const state = { ...ready(), sequence: 1 };
    expect(advanceDeathWorm(state, 0.01, origin, { x: 250, y: 0 }).started).toBe('poison');
    expect(
      advanceDeathWorm(state, GAME.tactics.deathWorm.poisonWarning, origin, { x: 250, y: 0 })
        .released,
    ).toBe('poison');
    expect(state.cooldown).toBe(GAME.tactics.deathWorm.cooldown);
  });

  it('interrupts an underground worm into visible recovery', () => {
    const state = ready();
    advanceDeathWorm(state, 0.01, origin, { x: 250, y: 0 });
    advanceDeathWorm(state, GAME.tactics.deathWorm.burrowWarning, origin, { x: 250, y: 0 });
    advanceDeathWorm(state, 0.1, origin, { x: 250, y: 0 }, true);
    expect(state).toMatchObject({
      phase: 'recover',
      remaining: GAME.tactics.deathWorm.recovery,
      hit: false,
    });
  });
});

describe('Almas attacks', () => {
  it.each([
    [70, 'claw'],
    [150, 'slam'],
    [350, 'charge'],
  ] as const)('commits to a telegraphed %s-distance %s attack', (distance, attack) => {
    const state = ready();
    const step = advanceAlmas(state, 1 / 60, origin, { x: distance, y: 0 });
    expect(step.started).toBe(attack);
    expect(state).toMatchObject({ phase: 'windup', attack, hit: false });
    expect(state.aim).toEqual({ x: distance, y: 0 });
    expect(state.direction).toEqual({ x: 1, y: 0 });
  });

  it('releases claw and slam only after their warning, then enforces recovery and cooldown', () => {
    for (const [distance, warning, attack] of [
      [70, GAME.tactics.almas.clawWarning, 'claw'],
      [150, GAME.tactics.almas.slamWarning, 'slam'],
    ] as const) {
      const state = ready();
      advanceAlmas(state, 0.01, origin, { x: distance, y: 0 });
      expect(
        advanceAlmas(state, warning - 0.02, origin, { x: distance, y: 0 }).released,
      ).toBeUndefined();
      expect(advanceAlmas(state, 0.021, origin, { x: distance, y: 0 }).released).toBe(attack);
      expect(state.phase).toBe('recover');
      expect(state.cooldown).toBe(GAME.tactics.almas.cooldown);
    }
  });

  it('charges along its snapshotted direction, recovers, and can be interrupted', () => {
    const state = ready();
    advanceAlmas(state, 0.01, origin, { x: 180, y: 240 });
    expect(state.direction?.x).toBeCloseTo(0.6);
    expect(state.direction?.y).toBeCloseTo(0.8);
    expect(
      advanceAlmas(state, GAME.tactics.almas.chargeWarning, origin, { x: -500, y: 0 }).released,
    ).toBe('charge');
    expect(state.phase).toBe('attack');
    advanceAlmas(state, GAME.tactics.almas.chargeDuration, origin, { x: -500, y: 0 });
    expect(state.phase).toBe('recover');
    advanceAlmas(state, 0.01, origin, { x: -500, y: 0 }, true);
    expect(state.phase).toBe('recover');
    expect(state.remaining).toBe(GAME.tactics.almas.recovery);
  });

  it('held sprint pins and interrupts a committed folklore attack, and saves round-trip both states', () => {
    const arena = createFakeArena({ run: createDeveloperClassRun('lancer')! });
    Object.assign(arena.context.landscape, { navigation: undefined });
    Object.assign(arena.context.camp, { x: 4000, y: 4000 });
    const director = new EnemyDirector(arena.context, arena.enemyDirectorHost);
    const combat = new CombatSystem(arena.context, arena.host, director, arena.clanDamage);
    const warnings = {
      clear: () => warnings,
      lineStyle: () => warnings,
      lineBetween: () => warnings,
      fillStyle: () => warnings,
      fillCircle: () => warnings,
      strokeCircle: () => warnings,
    };
    const behaviour = new EnemyBehaviour(
      arena.context,
      {
        fieldMarkers: { warnings },
        takeDamage: () => {},
      } as unknown as EnemyBehaviourHost,
      combat,
      director,
      arena.clanDamage,
    );
    const almasDef = FOLKLORE_ENEMIES.find((enemy) => enemy.id === 'almas')!;
    const almas = arena.enemies.create() as Enemy;
    director.initialize(almas, almasDef, 1040, 1000);
    almas.folklore.cooldown = 0;

    khanResourcesOf(arena.context.timers).sprinting = true;
    arena.context.run.combat.gallopSerial = 1;
    behaviour.update(0.01);
    expect(almas.pinned).toBe(GAME.mounted.pinSeconds);
    expect(almas.folklore.phase).toBe('recover');
    expect(almas.preparingAttack).toBe(false);

    const runtime = world();
    runtime.enemies[0]!.definition = 'almas';
    runtime.enemies[0]!.state.folklore = {
      phase: 'windup',
      attack: 'slam',
      remaining: 0.4,
      cooldown: 1.2,
      aim: { x: 2650, y: 2700 },
      direction: { x: 1, y: 0 },
      hit: false,
      sequence: 2,
    };
    const restored = decodeExpedition(captureExpedition(createRun(), runtime));
    expect(restored.world.enemies[0]!.state.folklore).toEqual(runtime.enemies[0]!.state.folklore);
    expect(restored.world.timers.khanResources).toEqual(runtime.timers.khanResources);
  });
});
