import { describe, expect, it } from 'vitest';
import {
  captureExpedition,
  decodeExpedition,
  type WorldArchive,
} from '../../src/game/state/expeditionArchive';
import { createRun } from '../../src/game/state/run';
import { beginMigration } from '../../src/game/state/clan';
import { openNextStory, resolveStory } from '../../src/game/state/story';
import { CharacterMotion } from '../../src/game/animation/CharacterMotion';
import { createAreaEncounter, syncAreaEncounter } from '../../src/game/state/areaEncounters';
import { STORY_ORDER, storyEncounter } from '../../src/game/data/story';
import { LOCATIONS, ROUTES, STARTING_TRADITIONS } from '../../src/game/data/clan';
import { syncFinalStand } from '../../src/game/state/finalStand';

function world(): WorldArchive {
  const motion = new CharacterMotion('player').capture();
  const body = { x: 2600, y: 2700, vx: 13, vy: -22, flip: false };
  return {
    player: { ...body, motion },
    camp: { x: 2600, y: 2600 },
    facing: { x: 0, y: 1 },
    zoom: 0.8,
    timers: {
      spawnTimer: 0.4,
      attackTimer: 0.8,
      dashTimer: 2,
      dashRemaining: 0.1,
      invulnerable: 0.3,
      supportTimer: 1,
      wagonTimer: 2,
      wardTimer: 3,
      hazardTimer: 4,
    },
    generations: [4, 2],
    enemies: [
      {
        ...body,
        slot: 1,
        definition: 'wisp',
        motion,
        state: {
          health: 5,
          maxHealth: 20,
          spawnId: 2,
          attackTimer: 0.2,
          clanAttackTimer: 0.3,
          chargeTimer: 0,
          burning: 1,
          pinned: 0,
          lastGallop: -1,
          dangerTimer: 2,
          tacticalSlot: 1,
          preparingAttack: true,
          tactics: {
            phase: 'windup',
            remaining: 0.2,
            aim: { x: 2600, y: 2600 },
            direction: { x: 1, y: 0 },
          },
        },
      },
    ],
    projectiles: [
      {
        ...body,
        damage: 15,
        remaining: 0.8,
        fire: true,
        tempest: false,
        turn: 0,
        pierces: 1,
        pins: true,
        rotation: 0.2,
        tint: 0xffffff,
        hits: [{ slot: 1, spawnId: 2 }],
      },
    ],
    hostileShots: [],
    gems: [{ ...body, value: 23, attracted: true }],
    riders: [],
    support: { ancestorTimer: 0.8, waterTimer: 1.8, guardianTimer: 0.4, spirits: [] },
    hazards: [{ x: 2700, y: 2700, remaining: 0.4, radius: 90, damage: 8, source: 'seer' }],
    areaEncounter: createAreaEncounter(),
    areaThreats: {
      nextId: 2,
      threats: [
        {
          id: 1,
          kind: 'frost',
          x: 2700,
          y: 2800,
          age: 0.2,
          warning: 1,
          impacted: false,
          nextTick: 2,
          owner: '1:2',
        },
      ],
    },
  };
}
describe('full expedition snapshots', () => {
  it('accepts authored story images and valid chronicle indexes across all destinations', () => {
    for (const location of LOCATIONS) {
      for (const region of [0, 1, 2, 3]) {
        const run = createRun();
        run.clan.locationId = location.id;
        run.clan.region = region;
        run.legacy.khans[0]!.region = region;
        run.legacy.khans[0]!.fallenRegion = region;
        run.story.crossings = [1, 2, 3].map((region, index) => ({
          region,
          route: ROUTES[index]!.id,
          population: 8,
          locationId: location.id,
        }));
        run.story.records = STORY_ORDER.map((id) => ({
          encounter: storyEncounter(run, id),
          elapsed: 0,
          population: 8,
          status: 'skipped',
        }));
        expect(decodeExpedition(captureExpedition(run, world())).run.story.records).toEqual(
          run.story.records,
        );
      }
    }
  });

  it.each([
    [
      'Khan region',
      (s: any) => {
        s.run.legacy.khans[0].region = 4;
      },
    ],
    [
      'fallen region',
      (s: any) => {
        s.run.legacy.khans[0].fallenRegion = 7;
      },
    ],
    [
      'missing fallen region',
      (s: any) => {
        s.run.legacy.khans[0].fallenAt = 1;
        delete s.run.legacy.khans[0].fallenRegion;
      },
    ],
    [
      'memory region',
      (s: any) => {
        s.run.legacy.memories[0].region = 4;
      },
    ],
    [
      'crossing region zero',
      (s: any) => {
        s.run.story.crossings[0].region = 0;
      },
    ],
    [
      'crossing region four',
      (s: any) => {
        s.run.story.crossings[0].region = 4;
      },
    ],
    [
      'unknown route',
      (s: any) => {
        s.run.story.crossings[0].route = 'unknown';
      },
    ],
    [
      'unknown active image',
      (s: any) => {
        s.run.story.active.image = 'unknown.png';
      },
    ],
    [
      'unknown recorded image',
      (s: any) => {
        s.run.story.records[0].encounter.image = 'unknown.png';
      },
    ],
  ])('rejects incompatible chronicle content: %s', (_label, corrupt) => {
    const run = createRun();
    run.phase = 'playing';
    openNextStory(run);
    run.story.records.push({
      encounter: structuredClone(run.story.active!),
      elapsed: 0,
      population: 8,
      status: 'skipped',
    });
    run.story.crossings.push({ region: 1, route: 'river', population: 8 });
    run.legacy.memories.push({
      sequence: 1,
      elapsed: 0,
      region: 0,
      population: 8,
      title: 'Camp',
      detail: 'Remembered',
    });
    const snapshot = captureExpedition(run, world());
    corrupt(snapshot);
    expect(() => decodeExpedition(snapshot)).toThrow('damaged or incompatible');
  });

  it('preserves final warnings, work progress and already-braced barrage identities', () => {
    const run = createRun();
    run.clan.stage = 'final';
    run.clan.region = 3;
    const state = syncFinalStand(run)!;
    state.phase = 'warning';
    state.remaining = 0.8;
    state.cycle = 3;
    state.approach = 3;
    state.aim = { x: 2500, y: 2600 };
    state.lastCampBarrage = 2;
    state.works[0]!.progress = 2;
    const runtime = world();
    runtime.hostileShots = [{ ...runtime.projectiles[0]!, barrage: 2, source: 'Skybreaker' }];
    runtime.enemies[0]!.state.elite = true;
    run.safety.lastMajorLoss = {
      cause: 'attack',
      at: 0,
      amount: 20,
      people: 1,
      source: 'Skybreaker',
    };
    const restored = decodeExpedition(captureExpedition(run, runtime));
    expect(restored.run.finalStand).toEqual(state);
    expect(restored.world.hostileShots[0]!.barrage).toBe(2);
    expect(restored.world.hostileShots[0]!.source).toBe('Skybreaker');
    expect(restored.world.enemies[0]!.state.elite).toBe(true);
    expect(restored.run.safety.lastMajorLoss).toEqual(run.safety.lastMajorLoss);
  });
  it('round-trips every starting tradition without reapplying supplies or movement bonuses', () => {
    for (const entry of STARTING_TRADITIONS) {
      const run = createRun(entry.id);
      run.clan.food -= 5;
      run.clan.materials -= 3;
      expect(decodeExpedition(captureExpedition(run, world())).run).toEqual({
        ...run,
        phase: 'paused',
      });
    }
    const legacy = captureExpedition(createRun(), world());
    delete legacy.run.startingTradition;
    expect(decodeExpedition(legacy).run.startingTradition).toBeUndefined();
  });
  it('round-trips exact progression, live actors, projectile hit references, dropped XP and cooldowns', () => {
    const run = createRun();
    run.phase = 'playing';
    run.elapsed = 137.25;
    run.pendingUpgrades = 3;
    run.xp = 7;
    run.khan.generation = 2;
    run.khan.trait = 'outrider';
    run.patrons.hearth.revives = 0;
    run.combat.previous = { x: 2600, y: 2700 };
    const runtime = world();
    syncAreaEncounter(runtime.areaEncounter, run);
    const save = captureExpedition(run, runtime);
    const restored = decodeExpedition(JSON.parse(JSON.stringify(save)));
    expect(restored.run).toEqual({ ...run, phase: 'paused' });
    expect(restored.world).toEqual(runtime);
    restored.run.clan.food = 0;
    expect(save.run.clan).not.toEqual(restored.run.clan);
  });
  it('retains resolved story transcripts and resumes an unresolved choice without paying it twice', () => {
    const run = createRun();
    run.phase = 'playing';
    expect(openNextStory(run)).toBe(true);
    const saved = captureExpedition(run, world());
    const first = decodeExpedition(saved).run;
    const id = first.story.active!.choices[0]!.id;
    expect(first.phase).toBe('story');
    expect(resolveStory(first, id)).toBe(true);
    const food = first.clan.food;
    const second = decodeExpedition(captureExpedition(first, world())).run;
    expect(second.story.records).toEqual(first.story.records);
    expect(resolveStory(second, id)).toBe(false);
    expect(second.clan.food).toBe(food);
  });
  it('preserves succession and migration without healing, resetting the timer or paying arrival', () => {
    const run = createRun();
    run.phase = 'playing';
    run.story.enabled = false;
    run.clan.stageTime = 120;
    run.phase = 'route';
    expect(beginMigration(run, 'river')).toBe(true);
    run.clan.migrationProgress = 0.43;
    run.health = 0;
    run.khan.successionRemaining = 4.2;
    run.khan.candidate = 'hearthguard';
    const restored = decodeExpedition(captureExpedition(run, world())).run;
    expect(restored.clan).toEqual(run.clan);
    expect(restored.crossing).toEqual(run.crossing);
    expect(restored.khan).toEqual(run.khan);
    expect(restored.health).toBe(0);
  });

  it('accepts legacy camps and a battle at every actor pool capacity', () => {
    const run = createRun();
    delete run.clan.estate;
    const runtime = world();
    const source = runtime.enemies[0]!;
    runtime.generations = Array(350).fill(2);
    runtime.enemies = Array.from({ length: 350 }, (_, slot) => ({
      ...structuredClone(source),
      slot,
      state: { ...structuredClone(source.state), tacticalSlot: slot },
    }));
    runtime.gems = Array.from({ length: 500 }, () => structuredClone(runtime.gems[0]!));
    runtime.projectiles = Array.from({ length: 250 }, () =>
      structuredClone(runtime.projectiles[0]!),
    );
    runtime.hostileShots = Array.from({ length: 180 }, () =>
      structuredClone(runtime.projectiles[0]!),
    );
    const save = captureExpedition(run, runtime);
    expect(decodeExpedition(save).world).toEqual(runtime);
  });
  it('fails before hydration on malformed nested state, bad content, dangling references or lost expeditions', () => {
    const snapshot = captureExpedition(createRun(), world());
    const corruptions = [
      (s: any) => {
        delete s.run.patrons.water;
      },
      (s: any) => {
        s.run.clan.locationId = 'unknown';
      },
      (s: any) => {
        s.run.field.objective = { status: 'available' };
      },
      (s: any) => {
        s.run.story.active = {};
      },
      (s: any) => {
        s.run.upgrades = { missing: 1 };
      },
      (s: any) => {
        s.world.enemies[0].slot = 5;
      },
      (s: any) => {
        s.world.projectiles[0].hits[0].spawnId = 99;
      },
      (s: any) => {
        s.world.areaThreats.threats[0].kind = 'unknown';
      },
      (s: any) => {
        s.run.clan.population = 0;
      },
      (s: any) => {
        s.run.health = 9000;
      },
      (s: any) => {
        s.run.khan.successionRemaining = 4;
      },
    ];
    for (const corrupt of corruptions) {
      const copy = structuredClone(snapshot);
      corrupt(copy);
      expect(() => decodeExpedition(copy)).toThrow();
    }
  });
});
