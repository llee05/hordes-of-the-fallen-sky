import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ProfileStore } from '../../desktop/profile';
import { createDeveloperClassRun } from '../../src/game/dev/levels';
import { captureExpedition, decodeExpedition } from '../../src/game/state/expeditionArchive';
import { damageKhan } from '../../src/game/state/khan';
import { createRun, gainExperience } from '../../src/game/state/run';
import { world } from './fixtures/expedition';
import {
  BACKGROUNDS,
  BANNER_COLOURS,
  BANNER_EMBLEMS,
  BANNER_TRIMS,
  CHARACTER_CLASSES,
  CLASSES,
  CLOTHING_COLOURS,
  HAIRSTYLES,
  HEADGEAR_OPTIONS,
  MOUNTS,
  OATHS,
  classDefinition,
  playerVisualConfig,
} from '../../src/game/data/classes';
import {
  defaultCharacterProfile,
  isCharacterProfile,
  normalizeCharacterProfile,
  type CharacterProfile,
} from '../../src/shared/characterProfile';
import { isProfile, normalizeProfile } from '../../src/shared/profile';

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function createTempProfileStore(): Promise<ProfileStore> {
  const directory = await mkdtemp(join(tmpdir(), 'gloam-character-profile-'));
  directories.push(directory);
  return new ProfileStore(directory);
}

describe('character classes and character profile', () => {
  it('defines all four playable classes with distinct weapons, stats, abilities, and progression paths', () => {
    expect(CHARACTER_CLASSES).toEqual(['mounted-archer', 'lancer', 'iron-pagoda', 'spirit-caller']);
    expect(CLASSES).toHaveLength(4);

    const weaponIds = new Set(CLASSES.map((entry) => entry.weapon.id));
    const hudLabels = new Set(CLASSES.map((entry) => entry.weapon.hudLabel));
    expect(weaponIds.size).toBe(4);
    expect(hudLabels).toEqual(new Set(['BOW', 'LANCE', 'SABER', 'STAFF']));

    for (const cls of CLASSES) {
      expect(cls.abilities).toHaveLength(4);
      expect(cls.keyTraits).toHaveLength(3);
      expect(cls.progression.map((node) => node.level)).toEqual([3, 6, 10, 15]);
      expect(cls.stats.maxHealth).toBeGreaterThan(0);
      expect(cls.stats.speed).toBeGreaterThan(0);
      expect(cls.stats.damage).toBeGreaterThan(0);
    }

    expect(classDefinition('mounted-archer').abilities.map((a) => a.name)).toEqual([
      'Bow Shot',
      'Saber Close Slash',
      'Flurry Arrow Volley',
      'Circling Shot (Hit-and-Run)',
    ]);
    expect(classDefinition('lancer').abilities.map((a) => a.name)).toEqual([
      'Lance Thrust',
      'Sweeping Strike',
      'Devastating Charge',
      'Shock Lance (Braced Impact)',
    ]);
    expect(classDefinition('iron-pagoda').abilities.map((a) => a.name)).toEqual([
      'Saber Cleave',
      'Unbreakable Stance',
      'Iron Pagoda Aura',
      'Shielded Advance',
    ]);
    expect(classDefinition('spirit-caller').abilities.map((a) => a.name)).toEqual([
      'Spirit Bolt',
      'Ritual Staff & Drum',
      'Summon Ancestor (Call Spirit)',
      'Spirit Ward (Tengri’s Blessing)',
    ]);
  });

  it('defines appearance, background, oath, mount, and banner options with valid metadata', () => {
    expect(HAIRSTYLES).toHaveLength(5);
    expect(HEADGEAR_OPTIONS).toHaveLength(5);
    expect(CLOTHING_COLOURS).toHaveLength(7);
    expect(BACKGROUNDS).toHaveLength(5);
    expect(OATHS).toHaveLength(3);
    expect(MOUNTS).toHaveLength(5);
    expect(BANNER_EMBLEMS).toHaveLength(5);
    expect(BANNER_COLOURS).toHaveLength(6);
    expect(BANNER_TRIMS).toHaveLength(5);
  });

  it('validates and normalizes character profiles while omitting face, age, and voice fields', () => {
    const profile = defaultCharacterProfile();
    expect(isCharacterProfile(profile)).toBe(true);
    expect(profile).not.toHaveProperty('face');
    expect(profile).not.toHaveProperty('age');
    expect(profile).not.toHaveProperty('voice');

    expect(isCharacterProfile({ ...profile, name: '' })).toBe(false);
    expect(isCharacterProfile({ ...profile, name: 'Bad\nName' })).toBe(false);
    expect(isCharacterProfile({ ...profile, classId: 'invalid' })).toBe(false);
    expect(
      isCharacterProfile({
        ...profile,
        banner: { ...profile.banner, emblem: 'dragon' },
      }),
    ).toBe(false);

    const normalized = normalizeCharacterProfile({
      name: '  Subutai  ',
      gender: 'man',
      classId: 'iron-pagoda',
      hairstyle: 'unknown',
      banner: { emblem: 'wolf', fieldColour: 'lapis', trim: 'invalid' },
    });
    expect(normalized).toEqual({
      ...defaultCharacterProfile(),
      name: 'Subutai',
      gender: 'man',
      classId: 'iron-pagoda',
      banner: {
        emblem: 'wolf',
        fieldColour: 'lapis',
        trim: 'steppe-fret',
      },
    });
  });

  it('applies distinct starting loadouts, background bonuses, oath bonuses, and level progression for each class', () => {
    const archerProfile: CharacterProfile = {
      ...defaultCharacterProfile(),
      classId: 'mounted-archer',
      background: 'steppe-herder',
      oath: 'oath-of-the-steppe',
    };
    const archerRun = createRun('shared-hearth', archerProfile);
    expect(archerRun.character?.classId).toBe('mounted-archer');
    expect(archerRun.stats.damage).toBe(16);
    expect(archerRun.stats.speed).toBe(198); // 190 base + 8 Oath of the Steppe
    expect(archerRun.clan.food).toBe(82); // 70 base + 12 Steppe Herder
    expect(archerRun.clan.herd).toBe(5); // 3 base + 2 Steppe Herder

    const lancerProfile: CharacterProfile = {
      ...defaultCharacterProfile(),
      name: 'Jebe',
      gender: 'man',
      classId: 'lancer',
      background: 'artisan',
      oath: 'oath-of-the-khan',
    };
    const lancerRun = createRun('shared-hearth', lancerProfile);
    expect(lancerRun.stats.maxHealth).toBe(120);
    expect(lancerRun.stats.damage).toBe(27); // 24 base + 3 Oath of the Khan
    expect(lancerRun.stats.pierce).toBe(2);
    expect(lancerRun.clan.materials).toBe(68); // 50 base + 18 Artisan

    const pagodaProfile: CharacterProfile = {
      ...defaultCharacterProfile(),
      classId: 'iron-pagoda',
      background: 'imperial-retainer',
      oath: 'oath-of-the-khan',
    };
    const pagodaRun = createRun('shared-hearth', pagodaProfile);
    expect(pagodaRun.stats.maxHealth).toBe(170); // 155 base + 15 Imperial Retainer
    expect(pagodaRun.health).toBe(170);
    expect(pagodaRun.stats.projectiles).toBe(2);
    expect(pagodaRun.clan.campEffects.multipliers.clanProtection).toBeLessThan(0.9);

    const callerProfile: CharacterProfile = {
      ...defaultCharacterProfile(),
      classId: 'spirit-caller',
      background: 'ritual-apprentice',
      oath: 'oath-of-the-spirits',
    };
    const callerRun = createRun('shared-hearth', callerProfile);
    expect(callerRun.stats.pickupRadius).toBe(110);
    expect(callerRun.stats.projectiles).toBe(2);
    expect(callerRun.clan.spirit).toBe(18); // 0 base + 10 Ritual Apprentice + 8 Oath of the Spirits
    expect(callerRun.clan.campEffects.bonuses.resolveRecovery).toBeCloseTo(0.14); // 0.02 starting hearth + 0.12 Oath of the Spirits

    // Advance Lancer across level 3 and level 6 progression milestones
    const damageBefore = lancerRun.stats.damage;
    const pierceBefore = lancerRun.stats.pierce;
    while (lancerRun.level < 6) {
      gainExperience(lancerRun, lancerRun.nextLevelXp);
    }
    expect(lancerRun.stats.damage).toBe(damageBefore + 4);
    expect(lancerRun.stats.pierce).toBe(pierceBefore + 1);
    expect(lancerRun.stats.maxHealth).toBe(135);
  });

  it('persists character profile in PlayerProfile and rejects malformed character profiles', async () => {
    const store = await createTempProfileStore();
    const character: CharacterProfile = {
      ...defaultCharacterProfile(),
      name: 'Khutulun',
      gender: 'woman',
      hairstyle: 'twin-braids',
      headgear: 'plumed-cap',
      clothingColour: 'vermilion',
      background: 'caravan-trader',
      classId: 'lancer',
      oath: 'oath-of-the-khan',
      mount: 'dun',
      banner: {
        emblem: 'hawk',
        fieldColour: 'vermilion',
        trim: 'cloud-scroll',
      },
    };

    await store.save({
      version: 1,
      bestSeconds: 120,
      muted: false,
      character,
    });
    const loaded = await store.load();
    expect(loaded.character).toEqual(character);

    await expect(
      store.save({
        version: 1,
        bestSeconds: 120,
        muted: false,
        character: { ...character, classId: 'not-a-class' as any },
      }),
    ).rejects.toThrow('Invalid player profile');
    expect(isProfile({ version: 1, bestSeconds: 0, muted: false, character })).toBe(true);
    expect(
      normalizeProfile({
        version: 1,
        bestSeconds: 10,
        muted: false,
        character: { invalid: true },
      }).character,
    ).toBeUndefined();
  });

  it('migrates old expedition saves without a character profile to Mounted Archer default profile', () => {
    const run = createRun('shared-hearth');
    run.phase = 'paused';
    const rawSave = captureExpedition(run, world()) as unknown as {
      run: Record<string, unknown>;
    };

    delete rawSave.run.character;
    const restored = decodeExpedition(rawSave);
    expect(restored.run.character).toEqual(defaultCharacterProfile());
    expect(restored.run.character?.classId).toBe('mounted-archer');
  });

  it('applies distinct class visual tints, developer class runs, and class damage reduction', () => {
    expect(playerVisualConfig(defaultCharacterProfile())).toEqual({
      textureKey: 'steppe-mounted-motion',
      framePrefix: 'player',
      baseTint: 0xffffff,
    });
    const tints = new Set(
      CHARACTER_CLASSES.map(
        (classId) => playerVisualConfig({ ...defaultCharacterProfile(), classId }).baseTint,
      ),
    );
    expect(tints.size).toBe(4);

    const lancerVisual = playerVisualConfig({
      ...defaultCharacterProfile(),
      classId: 'lancer',
      clothingColour: 'vermilion',
      mount: 'dun',
    });
    expect(lancerVisual.textureKey).toBe('steppe-mounted-motion');
    expect(lancerVisual.framePrefix).toBe('player');
    expect(lancerVisual.baseTint).not.toBe(0xffffff);

    for (const classId of CHARACTER_CLASSES) {
      const devRun = createDeveloperClassRun(classId);
      expect(devRun).toBeDefined();
      expect(devRun!.phase).toBe('playing');
      expect(devRun!.character?.classId).toBe(classId);
    }

    const pagodaRun = createRun('shared-hearth', {
      ...defaultCharacterProfile(),
      classId: 'iron-pagoda',
    });
    pagodaRun.phase = 'playing';
    const maxHealth = pagodaRun.health;
    expect(damageKhan(pagodaRun, 100)).toBe('hit');
    expect(pagodaRun.health).toBeCloseTo(maxHealth - 72);
  });
});
