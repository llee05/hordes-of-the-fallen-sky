import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfileStore } from '../../desktop/profile';
import { STARTING_TRADITIONS } from '../../src/game/data/clan';
import { createArenaTimers } from '../../src/game/scenes/arena/ArenaTimers';
import { syncAreaEncounter } from '../../src/game/state/areaEncounters';
import { beginMigration } from '../../src/game/state/clan';
import { captureExpedition, decodeExpedition } from '../../src/game/state/expeditionArchive';
import { purchaseNomadicBuilding } from '../../src/game/state/nomadicCamp';
import { createRun } from '../../src/game/state/run';
import { GamePlatform } from '../../src/platform/GamePlatform';
import { clanMemories } from '../../src/ui/legacyContent';
import { createLegacyCampRun } from '../support/legacyCamp';
import { world } from './fixtures/expedition';

const directories: string[] = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('full expedition snapshots', () => {
  it('loads old knowledge and research without restoring purchases or their gameplay bonuses', () => {
    const run = createRun('pathfinders');
    run.phase = 'playing';
    run.clan.materials = 1000;
    run.clan.spirit = 1000;
    run.phase = 'building';
    expect(purchaseNomadicBuilding(run, 'khans-ger')).toBe(true);
    expect(purchaseNomadicBuilding(run, 'khans-ger')).toBe(true);
    for (let level = 0; level < 3; level++)
      expect(purchaseNomadicBuilding(run, 'fletchers-workshop')).toBe(true);
    run.phase = 'playing';
    run.xp = 3;
    const save = captureExpedition(run, world());
    const legacy = save.run as Record<string, any>;
    legacy.pendingUpgrades = 99;
    legacy.clan.formation = 'wedge';
    (save.world as Record<string, unknown>).support = { retired: true };
    legacy.upgrades = { power: 2, 'retired-future-research': 50 };
    legacy.patrons = { anything: 'ignored' };
    legacy.researchPurchases = [{ id: 'unknown', rank: 50 }];
    legacy.researchObservations = { removed: true };
    legacy.researchRuntime = { unknown: 'ignored' };
    legacy.stats.damage += 100;
    legacy.stats.maxHealth += 60;
    delete legacy.stats.pierce;
    legacy.clan.campEffects.multipliers.wagonDamage = 20;
    const restored = decodeExpedition(save).run;
    expect(restored.stats).toEqual(run.stats);
    expect(restored.clan.formation).toBe('guard');
    expect(restored.clan.campEffects).toEqual(run.clan.campEffects);
    expect(restored.clan.nomadicCamp).toEqual(run.clan.nomadicCamp);
    expect(restored.clan.spirit).toBe(run.clan.spirit);
    expect(restored.xp).toBe(3);
    for (const key of [
      'pendingUpgrades',
      'upgrades',
      'patrons',
      'researchPurchases',
      'researchObservations',
      'researchRuntime',
    ])
      expect(restored).not.toHaveProperty(key);
  });
  it('migrates old full-run camps without resetting XP, health or chronology', () => {
    const run = createLegacyCampRun();
    run.xp = 3;
    run.health = 40;
    const snapshot = captureExpedition(run, world());
    const restored = decodeExpedition(snapshot).run;
    expect(restored.clan.nomadicCamp!.slots).toHaveLength(5);
    expect(Object.values(restored.clan.nomadicCamp!.core)).toEqual([1, 1, 1, 1, 1]);
    expect(restored.clan.estate).toBeUndefined();
    expect(restored.xp).toBe(3);
    expect(restored.health).toBe(40);
    expect(restored.legacy).toEqual(run.legacy);
  });

  it('loads a pre-change save fixture with story records, resolved choices and story camp effects', () => {
    const run = createRun('pathfinders');
    run.phase = 'building';
    run.clan.materials = 1000;
    run.clan.spirit = 1000;
    expect(purchaseNomadicBuilding(run, 'khans-ger')).toBe(true);
    expect(purchaseNomadicBuilding(run, 'fletchers-workshop')).toBe(true);
    const expectedEffects = structuredClone(run.clan.campEffects);
    const expectedIdentity = structuredClone(run.clan.identity);
    run.legacy.memories.push({
      sequence: 1,
      elapsed: 12,
      locationId: 'otgontenger',
      population: 8,
      title: 'Fletcher’s Workshop · Lv 1',
      detail: 'Fletcher’s Workshop reached level 1.',
    });
    const preChangeSave = captureExpedition(run, world()) as Record<string, any>;
    preChangeSave.run.clan.region = 1;
    preChangeSave.run.phase = 'story';
    preChangeSave.run.clan.message =
      'Saran sets the spare bowl beside the others. Someone hands Nara a mallet.';
    preChangeSave.run.clan.campEffects.multipliers.materialProduction *= 1.03;
    preChangeSave.run.clan.campEffects.bonuses.refugePeople += 1;
    preChangeSave.run.clan.identity.iron += 1;
    preChangeSave.run.clan.identity.wander += 1;
    delete preChangeSave.run.legacy.crossings;
    delete preChangeSave.run.legacy.peopleLost;
    preChangeSave.run.legacy.reactionUntil = 25;
    preChangeSave.run.legacy.memories[0].line = {
      speaker: 'boro',
      text: 'Straight shafts win before the horses meet.',
    };
    preChangeSave.run.story = {
      enabled: true,
      seen: ['fire', 'departure'],
      peopleLost: 2,
      crossings: [{ route: 'river', region: 1, population: 11, locationId: 'orkhon-valley' }],
      active: {
        id: 'river',
        act: 1,
        title: 'Where the water narrows.',
        image: 'pasture-camp.png',
        setting: 'At the ford.',
        lines: [{ speaker: 'boro', text: 'Hold the bank.' }],
        choices: [
          {
            id: 'hold-bank',
            label: 'Hold the bank',
            description: 'Keep the line.',
            response: 'The riders steady.',
            benefit: 'resolve',
            doctrine: 'iron',
          },
        ],
      },
      records: [
        {
          encounter: {
            id: 'fire',
            act: 1,
            title: 'A place beside the fire.',
            image: 'hearth-fire.png',
            setting: 'Around the first fire.',
            lines: [{ speaker: 'saran', text: 'Keep the hearth.' }],
            choices: [],
          },
          choice: {
            id: 'share-work',
            label: 'Share the work',
            description: 'Every hand helps.',
            response: 'The camp settles.',
            benefit: 'materials',
            doctrine: 'iron',
          },
          elapsed: 5,
          population: 8,
          status: 'chosen',
        },
        {
          encounter: {
            id: 'departure',
            act: 1,
            title: 'Before the wagons turn.',
            image: 'caravan-wagons.png',
            setting: 'By the wagons.',
            lines: [{ speaker: 'erden', text: 'Count the stores.' }],
            choices: [],
          },
          choice: {
            id: 'travel-light',
            label: 'Travel light',
            description: 'Move quickly.',
            response: 'The wagons roll.',
            benefit: 'food',
            doctrine: 'wander',
          },
          elapsed: 48,
          population: 9,
          status: 'chosen',
        },
      ],
    };

    const restored = decodeExpedition(preChangeSave).run;
    expect(restored.phase).toBe('paused');
    expect(restored.clan.message).toBe('');
    expect(restored).not.toHaveProperty('story');
    expect(restored.clan.campEffects).toEqual(expectedEffects);
    expect(restored.clan.identity).toEqual(expectedIdentity);
    expect(restored.legacy.peopleLost).toBe(2);
    expect(restored.legacy.crossings).toEqual([
      { route: 'river', population: 11, locationId: 'orkhon-valley' },
    ]);
    expect(restored.legacy).not.toHaveProperty('reactionUntil');
    expect(restored.legacy.totalMemories).toBe(0);
    expect(restored.legacy.memories).toEqual([]);

    restored.phase = 'building';
    expect(purchaseNomadicBuilding(restored, 'fletchers-workshop')).toBe(true);
    expect(restored.legacy.totalMemories).toBe(1);
    expect(restored.legacy.memories).toEqual([
      expect.objectContaining({
        sequence: 1,
        title: "Fletcher's Workshop",
        detail: 'The clan improved this household to level 2.',
      }),
    ]);
  });

  it('clears retired story memories and restarts purchase chronology', () => {
    const run = createRun('pathfinders');
    run.phase = 'building';
    run.clan.materials = 1000;
    run.clan.spirit = 1000;
    expect(purchaseNomadicBuilding(run, 'khans-ger')).toBe(true);
    expect(purchaseNomadicBuilding(run, 'fletchers-workshop')).toBe(true);
    run.legacy.memories.push({
      sequence: 1,
      elapsed: 12,
      locationId: 'otgontenger',
      population: 8,
      title: 'Fletcher’s Workshop · Lv 1',
      detail: 'Fletcher’s Workshop reached level 1.',
    });
    const preChangeSave = captureExpedition(run, world()) as Record<string, any>;
    preChangeSave.run.clan.region = 0;
    preChangeSave.run.legacy.totalMemories = 2;
    preChangeSave.run.story = {
      enabled: true,
      seen: ['fire'],
      peopleLost: 0,
      crossings: [],
      records: [],
    };

    const restored = decodeExpedition(preChangeSave).run;
    expect(restored.legacy.totalMemories).toBe(0);
    expect(restored.legacy.memories).toEqual([]);
    expect(clanMemories(restored)).toBe('');

    restored.phase = 'building';
    expect(purchaseNomadicBuilding(restored, 'fletchers-workshop')).toBe(true);
    expect(restored.legacy.totalMemories).toBe(1);
    expect(restored.legacy.memories.map((memory) => memory.sequence)).toEqual([1]);
    expect(restored.legacy.memories.at(-1)).toMatchObject({
      sequence: 1,
      title: "Fletcher's Workshop",
      detail: 'The clan improved this household to level 2.',
    });
  });

  it.each([
    [
      'Khan location',
      (s: any) => {
        s.run.legacy.khans[0].locationId = 'golden-pasture';
      },
    ],
    [
      'missing Khan location',
      (s: any) => {
        delete s.run.legacy.khans[0].locationId;
      },
    ],
    [
      'memory location',
      (s: any) => {
        s.run.legacy.memories[0].locationId = 'silent-river';
      },
    ],
    [
      'missing crossing location',
      (s: any) => {
        delete s.run.legacy.crossings[0].locationId;
      },
    ],
    [
      'camp location',
      (s: any) => {
        s.run.clan.locationId = 'heart-of-the-steppe';
      },
    ],
    [
      'final stage',
      (s: any) => {
        s.run.clan.stage = 'final';
      },
    ],
    [
      'unknown route',
      (s: any) => {
        s.run.legacy.crossings[0].route = 'unknown';
      },
    ],
  ])('rejects incompatible chronicle content: %s', async (_label, corrupt) => {
    const run = createRun();
    run.phase = 'playing';
    run.legacy.crossings.push({ route: 'river', population: 8, locationId: 'belukha' });
    run.legacy.memories.push({
      sequence: 1,
      elapsed: 0,
      locationId: 'otgontenger',
      population: 8,
      title: 'Camp',
      detail: 'Remembered',
    });
    const snapshot = captureExpedition(run, world());
    const incompatible = structuredClone(snapshot);
    corrupt(incompatible);
    expect(() => decodeExpedition(incompatible)).toThrow('damaged or incompatible');
    const valid = JSON.stringify(snapshot);
    const invalid = JSON.stringify(incompatible);
    const directory = await mkdtemp(join(process.cwd(), '.expedition-compatibility-'));
    directories.push(directory);
    const profiles = new ProfileStore(directory);
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    for (const native of [false, true]) {
      vi.stubGlobal('window', {
        desktop: native
          ? {
              loadProfile: () => profiles.load(),
              listExpeditions: () => profiles.listExpeditions(),
              loadExpedition: (slot: 'slot-1') => profiles.loadExpedition(slot),
            }
          : undefined,
      });
      for (const backup of [false, true]) {
        const key = `gloam-expedition-slot-1${backup ? '-backup' : ''}`;
        const file = join(directory, `expedition-slot-1.json${backup ? '.bak' : ''}`);
        values.set('gloam-expedition-slot-1', backup ? '{interrupted' : valid);
        values.set('gloam-expedition-slot-1-backup', valid);
        await writeFile(join(directory, 'expedition-slot-1.json'), backup ? '{interrupted' : valid);
        await writeFile(join(directory, 'expedition-slot-1.json.bak'), valid);
        const platform = await GamePlatform.create();
        expect(platform.saves[0]?.status).toBe(backup ? 'recovered' : 'ready');
        values.set(key, invalid);
        await writeFile(file, invalid);
        await expect(platform.loadExpedition('slot-1')).rejects.toThrow('damaged or incompatible');
        expect(platform.saves).toEqual([{ slot: 'slot-1', status: 'incompatible' }]);
        await platform.refreshSaves();
        expect(platform.saves).toEqual([{ slot: 'slot-1', status: 'incompatible' }]);
        const reopened = await GamePlatform.create();
        expect(reopened.saveStorageError).toBe(false);
        expect(reopened.saves).toEqual([{ slot: 'slot-1', status: 'incompatible' }]);
      }
    }
  });

  it('maps a retired journey to real places and clears its Chronicle history', () => {
    const run = createRun();
    run.phase = 'playing';
    run.legacy.memories.push({
      sequence: 1,
      elapsed: 0,
      locationId: 'otgontenger',
      population: 8,
      title: 'Camp',
      detail: 'Remembered',
    });
    run.legacy.crossings.push({ route: 'river', population: 8, locationId: 'orkhon-valley' });
    const runtime = world();
    runtime.hazards = [
      { x: 1, y: 2, remaining: 1 },
      { x: 3, y: 4, remaining: 1, radius: 75, damage: 12, source: 'seer' },
    ];
    const retired = captureExpedition(run, runtime) as Record<string, any>;
    const clan = retired.run.clan;
    clan.region = 3;
    clan.stage = 'final';
    clan.locationId = 'heart-of-the-steppe';
    clan.finalBossSpawned = true;
    clan.finalBossDefeated = false;
    retired.summary.stage = 'final';
    retired.run.finalStand = { phase: 'advance', remaining: 4, cycle: 0, approach: 0, works: [] };
    retired.run.crossing = { key: '2:river:1', route: 'river', phase: 'ended' };
    retired.run.safety.protectedCrossings = 2;
    retired.run.safety.lastDamage = { cause: 'eruption', at: 1, amount: 3, people: 0 };
    retired.run.guidance.completed = ['ride', 'crossing'];
    retired.run.metrics.stages = [
      {
        ...retired.run.metrics.stages[0],
        key: '0:final:golden-pasture',
        location: 'The Golden Pasture',
        stage: 'final',
      },
    ];
    Object.assign(retired.run.legacy.khans[0], { region: 0, fallenAt: 5, fallenRegion: 2 });
    delete retired.run.legacy.khans[0].locationId;
    Object.assign(retired.run.legacy.memories[0], {
      region: 1,
      locationId: 'golden-pasture',
      title: 'The Broken Pass',
      detail: 'The clan set out for The Silent River and The Heart of the Steppe.',
    });
    delete retired.run.legacy.memories[0].locationId;
    Object.assign(retired.run.legacy.crossings[0], { region: 1, locationId: 'silent-river' });
    retired.world.timers.hazardTimer = 3;
    retired.world.enemies[0].state.crossingId = '2:river:1';
    retired.world.enemies.push({
      ...retired.world.enemies[0],
      slot: 0,
      definition: 'skybreaker',
      state: { ...retired.world.enemies[0].state, spawnId: 4, tacticalSlot: 0 },
    });
    retired.world.hostileShots = [{ ...retired.world.projectiles[0], barrage: 2 }];

    const { run: restored, world: restoredWorld } = decodeExpedition(retired);
    expect(restored.clan).toMatchObject({ stage: 'camp', locationId: 'khan-tengri' });
    expect('region' in restored.clan).toBe(false);
    expect('finalBossSpawned' in restored.clan).toBe(false);
    expect(restored.clan.message).toContain('Khan Tengri Peak');
    expect('finalStand' in restored).toBe(false);
    expect('crossing' in restored).toBe(false);
    expect('protectedCrossings' in restored.safety).toBe(false);
    expect(restored.safety.lastDamage?.cause).toBe('area');
    expect(restored.guidance.completed).toEqual(['ride', 'journey']);
    expect(restored.legacy.khans[0]).toMatchObject({
      locationId: 'otgontenger',
      fallenLocationId: 'altai-tavan-bogd',
    });
    expect(restored.metrics?.stages).toEqual([]);
    expect(restored.legacy.memories).toEqual([]);
    expect(restored.legacy.totalMemories).toBe(0);
    expect(restored.legacy.crossings).toEqual([
      { route: 'river', population: 8, locationId: 'orkhon-valley' },
    ]);
    const restoredText = JSON.stringify(restored);
    for (const retiredLocation of [
      'The Golden Pasture',
      'The Silent River',
      'The Broken Pass',
      'The Heart of the Steppe',
      'golden-pasture',
      'silent-river',
      'broken-pass',
      'heart-of-the-steppe',
    ])
      expect(restoredText).not.toContain(retiredLocation);
    expect('hazardTimer' in restoredWorld.timers).toBe(false);
    expect(restoredWorld.enemies.map((enemy) => enemy.definition)).toEqual([
      retired.world.enemies[0].definition,
    ]);
    expect(restoredWorld.hazards).toHaveLength(1);
    expect('barrage' in restoredWorld.hostileShots[0]!).toBe(false);

    const current = captureExpedition(restored, restoredWorld);
    expect(decodeExpedition(current).run.clan.locationId).toBe('khan-tengri');
  });

  it('lists retired saves at their mapped real place', async () => {
    const save = captureExpedition(createRun(), world()) as Record<string, any>;
    save.run.clan.region = 3;
    save.run.clan.stage = 'final';
    save.run.clan.locationId = 'heart-of-the-steppe';
    save.summary.location = 'The Heart of the Steppe';
    save.summary.stage = 'final';
    const values = new Map([['gloam-expedition-slot-1', JSON.stringify(save)]]);
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });

    const platform = await GamePlatform.create();

    expect(platform.saves[0]?.summary).toMatchObject({
      location: 'Khan Tengri Peak',
      stage: 'camp',
    });
  });

  it('captures unbounded run progress with bounded listing values', () => {
    const run = createRun();
    run.elapsed = 90_000;
    run.level = 10_001;
    const save = captureExpedition(run, world());
    expect(save.summary.elapsed).toBe(86_400);
    expect(save.summary.level).toBe(10_000);
    expect(save.run.elapsed).toBe(90_000);
    expect(save.run.level).toBe(10_001);
    expect(decodeExpedition(save).run).toMatchObject({ elapsed: 90_000, level: 10_001 });
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
    run.xp = 7;
    run.khan.generation = 2;
    run.khan.trait = 'outrider';
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
  it('accepts and ignores the retired close-defense timer in older version 1 saves', () => {
    const save = captureExpedition(createRun(), world()) as Record<string, any>;
    save.world.timers.closeDefenseTimer = 0.73;
    const restored = decodeExpedition(save);
    expect(restored.world.timers.closeDefenseTimer).toBe(0.73);
    expect(createArenaTimers()).not.toHaveProperty('closeDefenseTimer');
  });
  it('moves legacy Orkhon actors into the wide terrain once and marks the new coordinates', () => {
    const run = createRun();
    run.clan.locationId = 'orkhon-valley';
    run.combat.previous = { x: 2600, y: 2700 };
    run.combat.heading = { x: 0, y: 1 };
    run.combat.trails = [{ x: 2500, y: 2500, remaining: 1 }];
    run.field.objective = {
      id: 1,
      kind: 'gathering',
      x: 2800,
      y: 2900,
      progress: 0,
      status: 'available',
      guards: 0,
      defeated: 0,
    };
    const runtime = world();
    runtime.enemies[0]!.state.tactics.aim = { x: 2500, y: 2400 };
    runtime.projectiles[0]!.previous = { x: 2550, y: 2650 };
    runtime.hostileShots = [
      { ...structuredClone(runtime.projectiles[0]!), x: 0, y: 0, previous: { x: 0, y: 0 } },
    ];
    runtime.riders = [
      { x: 2400, y: 2500, flip: false, motion: structuredClone(runtime.player.motion) },
    ];
    const save = captureExpedition(run, runtime);
    delete save.world.orkhonLayout;
    const restored = decodeExpedition(save);
    const first = restored.world;
    expect(first.orkhonLayout).toBe(2);
    expect(first.camp).toEqual({ x: 2650, y: 3620 });
    expect(first.player).toMatchObject({ x: 2650, y: 3720 });
    expect(first.enemies[0]).toMatchObject({ x: 2650, y: 3720 });
    expect(first.enemies[0]!.state.tactics.aim).toEqual({ x: 2550, y: 3420 });
    expect(first.projectiles[0]).toMatchObject({ x: 2650, y: 3720 });
    expect(first.projectiles[0]!.previous).toEqual({ x: 2600, y: 3670 });
    expect(first.hostileShots[0]).toMatchObject({ x: 50, y: 1224 });
    expect(first.hostileShots[0]!.previous).toEqual({ x: 50, y: 1224 });
    expect(first.gems[0]).toMatchObject({ x: 2650, y: 3720 });
    expect(first.riders[0]).toMatchObject({ x: 2450, y: 3520 });
    expect(first.hazards[0]).toMatchObject({ x: 2750, y: 3720 });
    expect(first.areaThreats.threats[0]).toMatchObject({ x: 2750, y: 3820 });
    expect(restored.run.combat.previous).toEqual({ x: 2650, y: 3720 });
    expect(restored.run.combat.heading).toEqual({ x: 0, y: 1 });
    expect(restored.run.combat.trails[0]).toMatchObject({ x: 2550, y: 3520 });
    expect(restored.run.field.objective).toMatchObject({ x: 2850, y: 3920 });
    expect(first.facing).toEqual({ x: 0, y: 1 });
    const second = decodeExpedition(captureExpedition(run, first)).world;
    expect(second.camp).toEqual(first.camp);
    expect(second.player).toEqual(first.player);
  });
  it('loads saves from before status effects with neutral statuses', () => {
    const save = captureExpedition(createRun(), world()) as Record<string, any>;
    delete save.world.timers.khanStatus;
    delete save.world.enemies[0].state.status;
    const restored = decodeExpedition(save);
    expect(restored.world.timers.khanStatus).toBeUndefined();
    expect(restored.world.enemies[0]!.state.status).toBeUndefined();
  });
  it('rejects saves with a malformed status effect', () => {
    const save = captureExpedition(createRun(), world()) as Record<string, any>;
    save.world.enemies[0].state.status.stun = 'long';
    expect(() => decodeExpedition(save)).toThrow();
  });
  it('loads saves from before class abilities with ready cooldowns', () => {
    const save = captureExpedition(createRun(), world()) as Record<string, any>;
    delete save.world.timers.abilityCooldowns;
    const restored = decodeExpedition(save);
    expect({ ...createArenaTimers(), ...restored.world.timers }.abilityCooldowns).toEqual({
      q: 0,
      w: 0,
      e: 0,
      r: 0,
    });
  });
  it('round-trips Spirit Caller energy, summons, areas, veil and pending drum waves', () => {
    const runtime = world();
    runtime.timers.spiritCaller = {
      energy: 7,
      guardians: { remaining: 4, attackTimer: 0.3, count: 2, intercepts: 1 },
      ovoo: { x: 1200, y: 1300, remaining: 5, pulseTimer: 0.2 },
      veilRemaining: 3,
      echoTimer: 0.4,
      drumWaves: [{ delay: 0.1, range: 180, damage: 0.8, slowDuration: 1.4 }],
    };
    const restored = decodeExpedition(captureExpedition(createRun(), runtime));
    expect(restored.world.timers.spiritCaller).toEqual(runtime.timers.spiritCaller);
  });
  it('loads saves from before the Spirit Caller resource with empty spiritual energy', () => {
    const save = captureExpedition(createRun(), world()) as Record<string, any>;
    delete save.world.timers.spiritCaller;
    const restored = decodeExpedition(save);
    expect({ ...createArenaTimers(), ...restored.world.timers }.spiritCaller).toEqual({
      energy: 0,
      veilRemaining: 0,
      echoTimer: 0,
      drumWaves: [],
    });
  });
  it('preserves succession and migration without healing, resetting the timer or paying arrival', () => {
    const run = createRun();
    run.phase = 'playing';
    run.clan.stageTime = 120;
    run.phase = 'route';
    expect(beginMigration(run, 'river')).toBe(true);
    run.clan.migrationProgress = 0.43;
    run.health = 0;
    run.khan.successionRemaining = 4.2;
    run.khan.candidate = 'hearthguard';
    const restored = decodeExpedition(captureExpedition(run, world())).run;
    expect(restored.clan).toEqual(run.clan);
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
        delete s.run.clan.campEffects;
      },
      (s: any) => {
        s.run.clan.locationId = 'unknown';
      },
      (s: any) => {
        s.run.field.objective = { status: 'available' };
      },
      (s: any) => {
        s.run.legacy.crossings = [{}];
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
