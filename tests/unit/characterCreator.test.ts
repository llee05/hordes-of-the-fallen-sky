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
import { classPortrait } from '../../src/ui/creator/components';

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
    expect(characterCreatorContent(state)).toMatch(/data-action="begin-journey"[^>]*disabled/);
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
  it('wires class choice portraits with 2x versions and fallback figures', () => {
    const markup = classPortrait('lancer', 'woman', '<svg class="fallback-figure"></svg>');
    expect(markup).toContain('portrait-lancer-woman.png');
    expect(markup).toContain('portrait-lancer-woman@2x.png 2x');
    expect(markup).toContain('creator-portrait-fallback');
    expect(markup).toContain('fallback-figure');

    const state = createCharacterCreator();
    const html = characterCreatorContent(state);
    expect(html).toContain('portrait-mounted-archer-woman.png');
    expect(html).toContain('portrait-lancer-woman.png');
    expect(html).toContain('portrait-iron-pagoda-woman.png');
    expect(html).toContain('portrait-spirit-caller-woman.png');
    expect(html).toContain('creator-figures');

    state.profile.gender = 'man';
    const htmlMan = characterCreatorContent(state);
    expect(htmlMan).toContain('portrait-mounted-archer-man.png');
    expect(htmlMan).toContain('portrait-lancer-man.png');
    expect(htmlMan).toContain('portrait-iron-pagoda-man.png');
    expect(htmlMan).toContain('portrait-spirit-caller-man.png');
  });
});
