import { describe, expect, it } from 'vitest';
import { DEFAULT_AUDIO_MIX, isAudioMix, normalizeAudioMix } from '../../src/shared/audioSettings';
import { defaultProfile, isProfile, normalizeProfile } from '../../src/shared/profile';

describe('persistent independent audio mix', () => {
  it('preserves old profile compatibility and repairs only damaged mix preferences', () => {
    const old = { ...defaultProfile(), bestSeconds: 321, muted: true };
    expect(normalizeProfile(old)).toEqual(old);
    expect(isProfile(old)).toBe(true);
    const mixed = { ...old, audioMix: { music: 0, ambience: 0.2, combat: 0.7, ui: 1 } };
    expect(isProfile(mixed)).toBe(true);
    expect(normalizeProfile(mixed)).toEqual(mixed);
    const damaged = { ...old, audioMix: { music: Infinity, ambience: 2, combat: -1, ui: 'loud' } };
    expect(isProfile(damaged)).toBe(false);
    expect(normalizeProfile(damaged)).toEqual({
      ...old,
      audioMix: { ...DEFAULT_AUDIO_MIX, ambience: 1, combat: 0 },
    });
  });
  it('rejects invalid native payloads and returns independent default/value copies', () => {
    expect(isAudioMix({ ...DEFAULT_AUDIO_MIX, ui: NaN })).toBe(false);
    expect(isAudioMix({ ...DEFAULT_AUDIO_MIX, combat: 1.01 })).toBe(false);
    expect(isAudioMix({ ...DEFAULT_AUDIO_MIX, music: 0 })).toBe(true);
    const mix = normalizeAudioMix(undefined);
    mix.ui = 0;
    expect(DEFAULT_AUDIO_MIX.ui).toBeGreaterThan(0);
    expect(normalizeAudioMix({ music: 0 })).toEqual({ ...DEFAULT_AUDIO_MIX, music: 0 });
  });
});
