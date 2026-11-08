import { defaultCharacterProfile, type CharacterBanner } from '../../shared/characterProfile';
import { bannerColourDefinition } from '../data/classes';

/** Empty atlas space below the first heraldry row, reserved for one cached standard. */
export const CLAN_STANDARD_CACHE_SLOT = { x: 0, y: 1120, w: 128, h: 180 } as const;

/** Derived presentation only. The saved character profile owns all banner choices. */
export function clanStandardAppearance(banner: CharacterBanner = defaultCharacterProfile().banner) {
  const colour = bannerColourDefinition(banner.fieldColour);
  const hex = (value: string) => Number.parseInt(value.slice(1), 16);
  return {
    fieldFrame: 'banner-field',
    poleFrame: 'banner-pole',
    emblemFrame: `banner-emblem-${banner.emblem}`,
    trimFrame: `banner-trim-${banner.trim}`,
    fieldTint: hex(colour.hex),
    ornamentTint: hex(colour.borderHex),
  };
}
