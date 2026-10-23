import { describe, expect, it } from 'vitest';
import {
  renderSound,
  SOUND_CUES,
  SOUND_KINDS,
  SOUND_SAMPLE_RATE,
  SOUND_VARIANTS,
} from '../../src/game/audio/soundPalette';

describe('the steppe sound materials', () => {
  it('renders every cue into finite, audible PCM with headroom, quiet endpoints, and little DC', () => {
    for (const kind of SOUND_KINDS) {
      const pcm = renderSound(kind);
      const seconds = pcm.length / SOUND_SAMPLE_RATE;
      expect(seconds).toBeGreaterThan(0.06);
      expect(seconds).toBeLessThan(2);
      let peak = 0;
      let energy = 0;
      let mean = 0;
      let finite = true;
      for (const sample of pcm) {
        finite &&= Number.isFinite(sample);
        peak = Math.max(peak, Math.abs(sample));
        energy += sample * sample;
        mean += sample;
      }
      expect(finite).toBe(true);
      expect(peak).toBeGreaterThan(0.05);
      expect(peak).toBeLessThanOrEqual(0.801);
      expect(Math.sqrt(energy / pcm.length)).toBeGreaterThan(0.005);
      expect(Math.abs(mean / pcm.length)).toBeLessThan(0.002);
      expect(Math.abs(pcm[0]!)).toBe(0);
      expect(Math.abs(pcm[pcm.length - 1]!)).toBe(0);
      expect(SOUND_CUES[kind].volume).toBeGreaterThan(0);
    }
  });

  it('varies repeated material strikes reproducibly and supports both audio device sample rates', () => {
    for (const kind of ['shoot', 'hoof', 'barrier', 'gem'] as const) {
      expect(renderSound(kind, 1)).toEqual(renderSound(kind, 1));
      expect(renderSound(kind, 1)).not.toEqual(renderSound(kind, 2));
    }
    expect(renderSound('build', 0, 48000).length / 48000).toBeCloseTo(
      renderSound('build', 0, 24000).length / 24000,
      4,
    );
    expect(() => renderSound('hoof', 0, 0)).toThrow(RangeError);
  });

  it('keeps bow releases brief and damped instead of ringing through repeated volleys', () => {
    for (const rate of [24000, 44100, 48000]) {
      for (let variant = 0; variant < SOUND_VARIANTS; variant++) {
        const pcm = renderSound('shoot', variant, rate);
        let total = 0;
        let release = 0;
        let tail = 0;
        for (let i = 0; i < pcm.length; i++) {
          const energy = pcm[i]! * pcm[i]!;
          total += energy;
          if (i < rate * 0.03) release += energy;
          if (i >= rate * 0.06) tail += energy;
        }
        expect(pcm.length / rate).toBeLessThan(0.13);
        expect(release / total).toBeGreaterThan(0.6);
        expect(tail / total).toBeLessThan(0.03);
      }
    }
  });
});
