import { describe, expect, it } from 'vitest';
import {
  CHARACTER_BANNER_COLOURS,
  CHARACTER_BANNER_EMBLEMS,
  CHARACTER_BANNER_TRIMS,
  defaultCharacterProfile,
} from '../../src/shared/characterProfile';
import { clanStandardAppearance } from '../../src/game/assets/clanStandardAppearance';
import atlasSource from '/art/steppe-classes-motion.json?raw';

const atlas = JSON.parse(atlasSource);

describe('painted clan standards', () => {
  it('has registered local layers for every saved emblem and trim choice', () => {
    for (const emblem of CHARACTER_BANNER_EMBLEMS) {
      for (const trim of CHARACTER_BANNER_TRIMS) {
        const style = clanStandardAppearance({ emblem, trim, fieldColour: 'lapis' });
        for (const name of [
          style.emblemFrame,
          style.trimFrame,
          style.fieldFrame,
          style.poleFrame,
        ]) {
          const frame = atlas.frames[name];
          expect(frame, name).toBeDefined();
          expect(frame.sourceSize).toEqual({ w: 256, h: 360 });
          expect(frame.frame.x + frame.frame.w).toBeLessThanOrEqual(atlas.meta.size.w);
          expect(frame.frame.y + frame.frame.h).toBeLessThanOrEqual(atlas.meta.size.h);
        }
        expect(atlas.frames[style.trimFrame].spriteSourceSize).toEqual(
          atlas.frames[style.fieldFrame].spriteSourceSize,
        );
      }
    }
  });

  it('changes field and contrast ink independently while preserving the chosen painted motifs', () => {
    const banner = {
      ...defaultCharacterProfile().banner,
      emblem: 'wolf',
      trim: 'braided-cord',
    } as const;
    const fields = new Set<number>();
    for (const fieldColour of CHARACTER_BANNER_COLOURS) {
      const appearance = clanStandardAppearance({ ...banner, fieldColour });
      fields.add(appearance.fieldTint);
      expect(appearance.fieldTint).not.toBe(appearance.ornamentTint);
      expect(appearance.emblemFrame).toBe('banner-emblem-wolf');
      expect(appearance.trimFrame).toBe('banner-trim-braided-cord');
    }
    expect(fields.size).toBe(CHARACTER_BANNER_COLOURS.length);
    expect(clanStandardAppearance()).toEqual(
      clanStandardAppearance(defaultCharacterProfile().banner),
    );
  });
});
