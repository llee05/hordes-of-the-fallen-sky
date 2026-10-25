import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { AUDIO_ASSETS, audioAssetUrl } from '../../src/game/audio/assets';
import { SOUND_CUES, SOUND_KINDS, AUDIO_REFERENCE_CUES } from '../../src/game/audio/soundPalette';
import { SampleSelector, spatialMix, environmentForLocation } from '../../src/game/audio/mixing';
import { LOCATIONS } from '../../src/game/data/clan';
import credits from '../../public/audio/credits.json';

describe('licensed organic recording palette', () => {
  it('bundles every supplied recording with exact provenance, headroom, and licence metadata', () => {
    const ready = Object.values(AUDIO_ASSETS).filter((a) => a.status === 'ready');
    expect(ready).toHaveLength(credits.assets.length);
    for (const asset of ready) {
      const record = credits.assets.find((a) => a.file === asset.file)!;
      const bytes = readFileSync(new URL(`../../public/audio/${asset.file}`, import.meta.url));
      expect(bytes.subarray(0, 4).toString()).toBe('OggS');
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(record.sha256);
      expect(record.rate).toBe(44100);
      expect(record.peak).toBeLessThan(0.75);
      expect(record.rms).toBeGreaterThan(0.002);
      expect(record.seconds).toBeGreaterThan(0.1);
      expect(record.seconds).toBeLessThan(65);
      expect(credits.sources[record.source as keyof typeof credits.sources].licence).toBe(
        'CC0-1.0',
      );
      expect(audioAssetUrl(asset)).toContain(`audio/${asset.file}`);
    }
    for (const asset of Object.values(AUDIO_ASSETS).filter((a) => a.status === 'needed'))
      expect(existsSync(new URL(`../../public/audio/${asset.file}`, import.meta.url))).toBe(false);
  });
  it('uses actual sample layers with a bounded summed gain and very small pitch ranges', () => {
    for (const kind of SOUND_KINDS) {
      const cue = SOUND_CUES[kind];
      expect(cue.layers.length).toBeGreaterThan(0);
      expect(cue.layers.reduce((n, l) => n + l.gain, 0)).toBeLessThanOrEqual(1);
      for (const layer of cue.layers) {
        expect(layer.samples.length).toBeGreaterThan(0);
        expect(layer.rate ?? 0).toBeLessThanOrEqual(0.025);
        for (const id of layer.samples) expect(AUDIO_ASSETS[id].status).toBe('ready');
      }
    }
    for (const kind of AUDIO_REFERENCE_CUES)
      expect(SOUND_CUES[kind].layers.length).toBeGreaterThan(0);
    expect(SOUND_CUES.spell.layers.every((l) => !l.rate)).toBe(true);
    expect(
      credits.assets.filter((a) => a.file.startsWith('wind-')).every((a) => a.seconds >= 30),
    ).toBe(true);
  });
  it('exhausts shuffled takes without repetition, including between bags; missing takes stay silent', () => {
    const selector = new SampleSelector(() => 0.42);
    const buffer = {} as AudioBuffer;
    const available = new Map([
      ['bow1', buffer],
      ['bow2', buffer],
      ['bow3', buffer],
    ] as const);
    const layer = { samples: ['bow1', 'bow2', 'bow3'] as const, gain: 1 };
    const draws = Array.from({ length: 30 }, () => selector.pick(layer, available, 'bow'));
    for (let i = 0; i < draws.length; i++) if (i) expect(draws[i]).not.toBe(draws[i - 1]);
    for (let i = 0; i < 30; i += 3) expect(new Set(draws.slice(i, i + 3)).size).toBe(3);
    expect(
      selector.pick({ samples: ['horseVoice'], gain: 1 }, available, 'missing'),
    ).toBeUndefined();
    expect(selector.pick({ samples: ['bow1'], gain: 1 }, available, 'single')).toBe('bow1');
  });
  it('positions sound conservatively and chooses an organic environment for every destination', () => {
    expect(spatialMix({ x: 500, y: 0 }, { x: 0, y: 0 }).pan).toBeGreaterThan(0);
    expect(spatialMix({ x: -500, y: 0 }, { x: 0, y: 0 }).pan).toBeLessThan(0);
    expect(spatialMix({ x: 3000, y: 0 }, { x: 0, y: 0 }).attenuation).toBeLessThan(0.04);
    expect(spatialMix({ x: NaN, y: 0 }, { x: 0, y: 0 }).attenuation).toBe(0);
    expect(environmentForLocation(LOCATIONS.find((l) => l.id === 'silent-river')!)).toBe(
      'mountain',
    );
    for (const location of LOCATIONS)
      expect(environmentForLocation(location)).toMatch(
        /steppe|river|mountain|forest|desert|volcanic/,
      );
  });
});
