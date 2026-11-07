import { defaultCharacterProfile, type CharacterBanner } from '../../shared/characterProfile';
import { bannerColourDefinition } from '../data/classes';

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
