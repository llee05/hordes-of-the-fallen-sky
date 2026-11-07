import {
  normalizeCharacterProfile,
  STEPPE_NAMES,
  type CharacterProfile,
} from '../../shared/characterProfile';

/** A scene-owned draft; name may be empty while the player edits it. */
export interface CharacterCreatorState {
  profile: CharacterProfile;
}
export type CreatorField =
  Exclude<keyof CharacterProfile, 'banner'> | 'emblem' | 'fieldColour' | 'trim';

export function createCharacterCreator(profile?: unknown): CharacterCreatorState {
  return { profile: normalizeCharacterProfile(profile) };
}

export function creatorProfile(state: CharacterCreatorState): CharacterProfile {
  return normalizeCharacterProfile(state.profile);
}

export function changeCreatorOption(
  state: CharacterCreatorState,
  field: string,
  value: string,
): void {
  const profile = state.profile;
  if (field === 'name') {
    profile.name = value;
    return;
  }
  const candidate = ['emblem', 'fieldColour', 'trim'].includes(field)
    ? { ...profile, banner: { ...profile.banner, [field]: value } }
    : { ...profile, [field]: value };
  // The shared contract validates all IDs; never pass arbitrary DOM data to a run.
  state.profile = normalizeCharacterProfile(candidate);
  state.profile.name = profile.name;
}

export function randomizeCreatorName(state: CharacterCreatorState, random = Math.random): void {
  const names = STEPPE_NAMES[state.profile.gender].filter((name) => name !== state.profile.name);
  const index = Math.min(names.length - 1, Math.max(0, Math.floor(random() * names.length)));
  state.profile.name = names[index]!;
}
