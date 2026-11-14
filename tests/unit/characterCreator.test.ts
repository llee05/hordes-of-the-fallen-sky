import { describe, expect, it } from 'vitest';
import {
  changeCreatorOption,
  createCharacterCreator,
  creatorProfile,
  randomizeCreatorName,
} from '../../src/game/state/characterCreator';
import {
  defaultCharacterProfile,
  isCharacterProfile,
  isValidCharacterName,
  STEPPE_NAMES,
} from '../../src/shared/characterProfile';
import { createRun } from '../../src/game/state/run';
import { classDefinition, oathDefinition } from '../../src/game/data/classes';
import { characterCreatorContent } from '../../src/ui/creator/characterCreatorContent';

describe('character creator profile mapping', () => {
  it('prefills legacy profiles with defaults without sharing mutable banner state', () => {
    const state = createCharacterCreator();
    expect(creatorProfile(state)).toEqual(defaultCharacterProfile());
    const snapshot = creatorProfile(state);
    changeCreatorOption(state, 'emblem', 'wolf');
    expect(snapshot.banner.emblem).toBe('flame-sun');
    expect(state.profile.banner.emblem).toBe('wolf');
  });
  it('maps every selected field into a validated independent profile and starting loadout', () => {
    const state = createCharacterCreator();
    const fields = {
      name: '  Jebe  ',
      gender: 'man',
      hairstyle: 'topknot',
      headgear: 'lamellar-helm',
      clothingColour: 'vermilion',
      background: 'artisan',
      classId: 'lancer',
      oath: 'oath-of-the-khan',
      mount: 'piebald',
      emblem: 'hawk',
      fieldColour: 'lapis',
      trim: 'cloud-scroll',
    };
    for (const [field, value] of Object.entries(fields)) changeCreatorOption(state, field, value);
    const profile = creatorProfile(state);
    expect(profile).toEqual({
      name: 'Jebe',
      gender: 'man',
      hairstyle: 'topknot',
      headgear: 'lamellar-helm',
      clothingColour: 'vermilion',
      background: 'artisan',
      classId: 'lancer',
      oath: 'oath-of-the-khan',
      mount: 'piebald',
      banner: { emblem: 'hawk', fieldColour: 'lapis', trim: 'cloud-scroll' },
    });
    expect(isCharacterProfile(profile)).toBe(true);
    const run = createRun('shared-hearth', profile);
    expect(run.character).toEqual(profile);
    expect(run.stats.damage).toBe(
      classDefinition('lancer').stats.damage +
        (oathDefinition('oath-of-the-khan').statBonuses?.damage ?? 0),
    );
    changeCreatorOption(state, 'trim', 'lattice-band');
    expect(run.character!.banner.trim).toBe('cloud-scroll');
  });
  it('restores a saved profile and keeps incomplete name edits from silently starting', () => {
    const saved = { ...defaultCharacterProfile(), classId: 'spirit-caller', gender: 'man' };
    const state = createCharacterCreator(saved);
    expect(state.profile.classId).toBe('spirit-caller');
    changeCreatorOption(state, 'name', '');
    changeCreatorOption(state, 'mount', 'white');
    expect(isValidCharacterName(state.profile.name)).toBe(false);
    expect(characterCreatorContent(state)).toMatch(
      /data-action="begin-journey"[^>]*aria-disabled="true"/,
    );
    changeCreatorOption(state, 'name', '<script>');
    expect(characterCreatorContent(state)).toContain('&lt;script&gt;');
  });
  it('uses only supported option ids and gender-specific names', () => {
    const state = createCharacterCreator();
    changeCreatorOption(state, 'classId', 'unknown');
    expect(state.profile.classId).toBe('mounted-archer');
    for (const gender of ['woman', 'man'] as const) {
      changeCreatorOption(state, 'gender', gender);
      const before = state.profile.name;
      randomizeCreatorName(state, () => 0);
      expect(STEPPE_NAMES[gender]).toContain(state.profile.name);
      expect(state.profile.name).not.toBe(before);
    }
    expect(characterCreatorContent(state)).not.toContain('data-creator-field="face"');
  });
  it('changes generated names with gender but preserves a typed name', () => {
    const state = createCharacterCreator();
    expect(state.profile.name).toBe('Altani');
    changeCreatorOption(state, 'gender', 'man');
    expect(state.profile.name).toBe(STEPPE_NAMES.man[0]);
    randomizeCreatorName(state, () => 0.5);
    changeCreatorOption(state, 'gender', 'woman');
    expect(state.profile.name).toBe(STEPPE_NAMES.woman[0]);

    changeCreatorOption(state, 'name', 'Jebe the Swift');
    changeCreatorOption(state, 'gender', 'man');
    expect(state.profile.name).toBe('Jebe the Swift');
  });
});
