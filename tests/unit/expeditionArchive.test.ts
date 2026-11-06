import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfileStore } from '../../desktop/profile';
import { STARTING_TRADITIONS } from '../../src/game/data/clan';
import { syncAreaEncounter } from '../../src/game/state/areaEncounters';
import { beginMigration } from '../../src/game/state/clan';
import { captureExpedition, decodeExpedition } from '../../src/game/state/expeditionArchive';
import { syncFinalStand } from '../../src/game/state/finalStand';
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
      region: 0,
      locationId: 'golden-pasture',
      population: 8,
      title: 'Fletcher’s Workshop · Lv 1',
      detail: 'Fletcher’s Workshop reached level 1.',
    });
    const preChangeSave = captureExpedition(run, world()) as Record<string, any>;
    preChangeSave.run.phase = 'story';
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
    expect(restored).not.toHaveProperty('story');
    expect(restored.clan.campEffects).toEqual(expectedEffects);
    expect(restored.clan.identity).toEqual(expectedIdentity);
    expect(restored.legacy.peopleLost).toBe(2);
    expect(restored.legacy.crossings).toEqual([
      { route: 'river', region: 1, population: 11, locationId: 'orkhon-valley' },
    ]);
    expect(restored.legacy).not.toHaveProperty('reactionUntil');
    expect(restored.legacy.memories[0]).not.toHaveProperty('line');
    expect(restored.legacy.totalMemories).toBe(3);
    expect(restored.legacy.memories).toEqual([
      expect.objectContaining({
        sequence: 1,
        title: "Khan's Ger",
        detail: 'The clan improved this household to level 2.',
      }),
      expect.objectContaining({
        sequence: 2,
        title: "Fletcher's Workshop",
        detail: 'The clan established this household to level 1.',
      }),
      expect.objectContaining({
        sequence: 3,
        title: 'Fletcher’s Workshop · Lv 1',
        detail: 'Fletcher’s Workshop reached level 1.',
      }),
    ]);
  });

  it('preserves migrated facts, repairs chronology, and continues recording purchases', () => {
    const run = createRun('pathfinders');
    run.phase = 'building';
    run.clan.materials = 1000;
    run.clan.spirit = 1000;
    expect(purchaseNomadicBuilding(run, 'khans-ger')).toBe(true);
    expect(purchaseNomadicBuilding(run, 'fletchers-workshop')).toBe(true);
    run.legacy.memories.push({
      sequence: 1,
      elapsed: 12,
      region: 0,
      locationId: 'golden-pasture',
      population: 8,
      title: 'Fletcher’s Workshop · Lv 1',
      detail: 'Fletcher’s Workshop reached level 1.',
    });
    const preChangeSave = captureExpedition(run, world()) as Record<string, any>;
    preChangeSave.run.legacy.totalMemories = 2;
    preChangeSave.run.story = {
      enabled: true,
      seen: ['fire'],
      peopleLost: 0,
      crossings: [],
      records: [],
    };

    const restored = decodeExpedition(preChangeSave).run;
    expect(restored.legacy.totalMemories).toBe(3);
    expect(restored.legacy.memories.map((memory) => memory.sequence)).toEqual([1, 2, 3]);
    expect(restored.legacy.memories.map((memory) => memory.title)).toEqual([
      "Khan's Ger",
      "Fletcher's Workshop",
      'Fletcher’s Workshop · Lv 1',
    ]);
    expect(clanMemories(restored)).toContain('The latest 3 of 3 moments from this expedition.');

    restored.phase = 'building';
    expect(purchaseNomadicBuilding(restored, 'fletchers-workshop')).toBe(true);
    expect(restored.legacy.totalMemories).toBe(4);
    expect(restored.legacy.memories.map((memory) => memory.sequence)).toEqual([1, 2, 3, 4]);
    expect(restored.legacy.memories.at(-1)).toMatchObject({
      sequence: 4,
      title: "Fletcher's Workshop",
      detail: 'The clan improved this household to level 2.',
    });
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
        s.run.legacy.crossings[0].region = 0;
      },
    ],
    [
      'crossing region four',
      (s: any) => {
        s.run.legacy.crossings[0].region = 4;
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
    run.legacy.crossings.push({ region: 1, route: 'river', population: 8 });
    run.legacy.memories.push({
      sequence: 1,
      elapsed: 0,
      region: 0,
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
