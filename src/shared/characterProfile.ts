export const CHARACTER_GENDERS = ['woman', 'man'] as const;
export type CharacterGender = (typeof CHARACTER_GENDERS)[number];

export const CHARACTER_HAIRSTYLES = [
  'warrior-plaits',
  'topknot',
  'twin-braids',
  'flowing-locks',
  'shaved-tresses',
] as const;
export type CharacterHairstyleId = (typeof CHARACTER_HAIRSTYLES)[number];

export const CHARACTER_HEADGEAR = [
  'sable-cap',
  'felt-kalpak',
  'plumed-cap',
  'lamellar-helm',
  'wolfskin-hood',
] as const;
export type CharacterHeadgearId = (typeof CHARACTER_HEADGEAR)[number];

export const CHARACTER_CLOTHING_COLOURS = [
  'ivory',
  'vermilion',
  'ochre',
  'lapis',
  'sage',
  'umber',
  'charcoal',
] as const;
export type CharacterClothingColourId = (typeof CHARACTER_CLOTHING_COLOURS)[number];

export const CHARACTER_BACKGROUNDS = [
  'steppe-herder',
  'imperial-retainer',
  'artisan',
  'caravan-trader',
  'ritual-apprentice',
] as const;
export type CharacterBackgroundId = (typeof CHARACTER_BACKGROUNDS)[number];

export const CHARACTER_CLASSES = [
  'mounted-archer',
  'lancer',
  'iron-pagoda',
  'spirit-caller',
] as const;
export type CharacterClassId = (typeof CHARACTER_CLASSES)[number];

export const CHARACTER_OATHS = [
  'oath-of-the-steppe',
  'oath-of-the-khan',
  'oath-of-the-spirits',
] as const;
export type CharacterOathId = (typeof CHARACTER_OATHS)[number];

export const CHARACTER_MOUNTS = ['bay', 'white', 'black', 'dun', 'piebald'] as const;
export type CharacterMountId = (typeof CHARACTER_MOUNTS)[number];

export const CHARACTER_BANNER_EMBLEMS = ['flame-sun', 'wolf', 'hawk', 'cloud', 'knot'] as const;
export type CharacterBannerEmblemId = (typeof CHARACTER_BANNER_EMBLEMS)[number];

export const CHARACTER_BANNER_COLOURS = [
  'ivory',
  'vermilion',
  'lapis',
  'sage',
  'ochre',
  'umber',
] as const;
export type CharacterBannerColourId = (typeof CHARACTER_BANNER_COLOURS)[number];

export const CHARACTER_BANNER_TRIMS = [
  'steppe-fret',
  'cloud-scroll',
  'horn-curl',
  'braided-cord',
  'lattice-band',
] as const;
export type CharacterBannerTrimId = (typeof CHARACTER_BANNER_TRIMS)[number];

export interface CharacterBanner {
  emblem: CharacterBannerEmblemId;
  fieldColour: CharacterBannerColourId;
  trim: CharacterBannerTrimId;
}

export interface CharacterProfile {
  name: string;
  gender: CharacterGender;
  hairstyle: CharacterHairstyleId;
  headgear: CharacterHeadgearId;
  clothingColour: CharacterClothingColourId;
  background: CharacterBackgroundId;
  classId: CharacterClassId;
  oath: CharacterOathId;
  mount: CharacterMountId;
  banner: CharacterBanner;
}

export const MAX_CHARACTER_NAME_LENGTH = 28;
export const DEFAULT_CHARACTER_NAME = 'Altani';

export const STEPPE_NAMES: Record<CharacterGender, readonly string[]> = {
  woman: [
    'Altani',
    'Mandukhai',
    'Khutulun',
    'Börte',
    'Sorghaghtani',
    'Chaka',
    'Töreghène',
    'Orqina',
  ],
  man: ['Temüjin', 'Subutai', 'Jebe', 'Muqali', 'Batu', 'Khubilai', 'Bo’orchu', 'Jelme'],
};

function isOneOf<T extends readonly string[]>(list: T, value: unknown): value is T[number] {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

export function isValidCharacterName(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return (
    trimmed.length >= 1 && trimmed.length <= MAX_CHARACTER_NAME_LENGTH && !/[\r\n\0\t]/.test(value)
  );
}

export function sanitizeCharacterName(value: unknown, fallback = DEFAULT_CHARACTER_NAME): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value
    .replace(/[\r\n\0\t]+/g, ' ')
    .trim()
    .slice(0, MAX_CHARACTER_NAME_LENGTH)
    .trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

export function defaultCharacterProfile(): CharacterProfile {
  return {
    name: DEFAULT_CHARACTER_NAME,
    gender: 'woman',
    hairstyle: 'warrior-plaits',
    headgear: 'sable-cap',
    clothingColour: 'ivory',
    background: 'steppe-herder',
    classId: 'mounted-archer',
    oath: 'oath-of-the-steppe',
    mount: 'bay',
    banner: {
      emblem: 'flame-sun',
      fieldColour: 'ivory',
      trim: 'steppe-fret',
    },
  };
}

export function isCharacterBanner(value: unknown): value is CharacterBanner {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    isOneOf(CHARACTER_BANNER_EMBLEMS, candidate.emblem) &&
    isOneOf(CHARACTER_BANNER_COLOURS, candidate.fieldColour) &&
    isOneOf(CHARACTER_BANNER_TRIMS, candidate.trim)
  );
}

export function isCharacterProfile(value: unknown): value is CharacterProfile {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    isValidCharacterName(candidate.name) &&
    isOneOf(CHARACTER_GENDERS, candidate.gender) &&
    isOneOf(CHARACTER_HAIRSTYLES, candidate.hairstyle) &&
    isOneOf(CHARACTER_HEADGEAR, candidate.headgear) &&
    isOneOf(CHARACTER_CLOTHING_COLOURS, candidate.clothingColour) &&
    isOneOf(CHARACTER_BACKGROUNDS, candidate.background) &&
    isOneOf(CHARACTER_CLASSES, candidate.classId) &&
    isOneOf(CHARACTER_OATHS, candidate.oath) &&
    isOneOf(CHARACTER_MOUNTS, candidate.mount) &&
    isCharacterBanner(candidate.banner)
  );
}

export function normalizeCharacterProfile(value: unknown): CharacterProfile {
  const defaults = defaultCharacterProfile();
  if (!value || typeof value !== 'object') return defaults;
  const candidate = value as Record<string, unknown>;
  const bannerCandidate =
    candidate.banner && typeof candidate.banner === 'object'
      ? (candidate.banner as Record<string, unknown>)
      : {};
  const gender = isOneOf(CHARACTER_GENDERS, candidate.gender) ? candidate.gender : defaults.gender;
  return {
    name: sanitizeCharacterName(
      candidate.name,
      gender === 'man' ? STEPPE_NAMES.man[0]! : defaults.name,
    ),
    gender,
    hairstyle: isOneOf(CHARACTER_HAIRSTYLES, candidate.hairstyle)
      ? candidate.hairstyle
      : defaults.hairstyle,
    headgear: isOneOf(CHARACTER_HEADGEAR, candidate.headgear)
      ? candidate.headgear
      : defaults.headgear,
    clothingColour: isOneOf(CHARACTER_CLOTHING_COLOURS, candidate.clothingColour)
      ? candidate.clothingColour
      : defaults.clothingColour,
    background: isOneOf(CHARACTER_BACKGROUNDS, candidate.background)
      ? candidate.background
      : defaults.background,
    classId: isOneOf(CHARACTER_CLASSES, candidate.classId) ? candidate.classId : defaults.classId,
    oath: isOneOf(CHARACTER_OATHS, candidate.oath) ? candidate.oath : defaults.oath,
    mount: isOneOf(CHARACTER_MOUNTS, candidate.mount) ? candidate.mount : defaults.mount,
    banner: {
      emblem: isOneOf(CHARACTER_BANNER_EMBLEMS, bannerCandidate.emblem)
        ? bannerCandidate.emblem
        : defaults.banner.emblem,
      fieldColour: isOneOf(CHARACTER_BANNER_COLOURS, bannerCandidate.fieldColour)
        ? bannerCandidate.fieldColour
        : defaults.banner.fieldColour,
      trim: isOneOf(CHARACTER_BANNER_TRIMS, bannerCandidate.trim)
        ? bannerCandidate.trim
        : defaults.banner.trim,
    },
  };
}
