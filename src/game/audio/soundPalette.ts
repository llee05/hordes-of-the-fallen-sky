import type { AudioChannel } from '../../shared/audioSettings';
import type { AudioAssetId } from './assets';

export interface SoundLayer {
  samples: readonly AudioAssetId[];
  gain: number;
  delay?: number;
  jitter?: number;
  rate?: number;
  lowpass?: number;
  /** Long recorded air can supply a short, quiet physical tail without looping it. */
  duration?: number;
}
export interface SoundCue {
  channel: AudioChannel;
  scope: 'world' | 'interface';
  volume: number;
  cooldown: number;
  voices: number;
  priority: number;
  layers: readonly SoundLayer[];
}
export const BOW = ['bow1', 'bow2', 'bow3', 'bow4'] as const;
export const WOOD = ['wood1', 'wood2', 'wood3'] as const;
export const BODY = ['body1', 'body2', 'body3'] as const;
export const LEATHER = ['leather1', 'leather2'] as const;
export const PAPER = ['paper1', 'paper2'] as const;
export const DRUM = ['drum1', 'drum2', 'drum3'] as const;
export const HOOVES = ['hoof1', 'hoof2', 'hoof3', 'hoof4', 'hoof5'] as const;
export const WIND = ['wind1', 'wind2', 'wind3'] as const;
const layer = (
  samples: readonly AudioAssetId[],
  gain: number,
  extra: Partial<SoundLayer> = {},
): SoundLayer => ({ samples, gain, ...extra });
const world = (
  volume: number,
  cooldown: number,
  voices: number,
  layers: SoundLayer[],
  priority = 1,
  channel: AudioChannel = 'combat',
): SoundCue => ({ scope: 'world', channel, volume, cooldown, voices, priority, layers });
const signal = (volume: number, layers: SoundLayer[], priority = 4): SoundCue => ({
  scope: 'interface',
  channel: 'ui',
  volume,
  cooldown: 0.18,
  voices: 1,
  priority,
  layers,
});
/** Recorded Foley, conservative layered gains. Event IDs preserve existing scene integration. */
export const SOUND_CUES = {
  encounter: signal(0.2, [layer(DRUM, 0.65), layer(LEATHER, 0.08, { delay: 0.15 })], 4),
  shoot: world(0.32, 0.11, 2, [
    layer(BOW, 0.82, { rate: 0.012 }),
    layer(['feather'], 0.12, { delay: 0.008, jitter: 0.006, rate: 0.015 }),
  ]),
  impact: world(0.23, 0.13, 2, [
    layer(BODY, 0.6, { rate: 0.018 }),
    layer(WOOD, 0.22, { delay: 0.006, jitter: 0.008, rate: 0.015 }),
    layer(LEATHER, 0.1, { delay: 0.02, lowpass: 5000 }),
  ]),
  stoneImpact: world(0.22, 0.15, 2, [
    layer(WOOD, 0.6, { rate: 0.012 }),
    layer(['twig1', 'twig2'], 0.24, { delay: 0.01 }),
    layer(['metal1', 'metal2'], 0.08, { lowpass: 2800 }),
  ]),
  hoof: world(
    0.27,
    0.085,
    2,
    [layer(HOOVES, 0.83, { rate: 0.012 }), layer(LEATHER, 0.08, { duration: 0.16 })],
    0,
    'ambience',
  ),
  dash: world(
    0.28,
    0.35,
    1,
    [layer(LEATHER, 0.7, { rate: 0.015 }), layer(['feather'], 0.2, { delay: 0.02 })],
    2,
  ),
  hit: world(0.37, 0.2, 1, [layer(BODY, 0.68), layer(LEATHER, 0.2, { delay: 0.015 })], 3),
  barrier: world(
    0.3,
    0.24,
    2,
    [layer(['twig1', 'twig2'], 0.65, { rate: 0.015 }), layer(WOOD, 0.24, { delay: 0.016 })],
    3,
  ),
  defeat: world(0.18, 0.2, 1, [
    layer(BODY, 0.48),
    layer(LEATHER, 0.28, { delay: 0.035, jitter: 0.02 }),
  ]),
  gem: world(0.045, 0.65, 1, [layer(PAPER, 0.65)], 0),
  ui: signal(0.2, [layer(PAPER, 0.78, { rate: 0.008 }), layer(WOOD, 0.1, { lowpass: 3000 })], 2),
  build: signal(0.28, [
    layer(WOOD, 0.52),
    layer(WOOD, 0.24, { delay: 0.13, jitter: 0.025 }),
    layer(LEATHER, 0.12, { delay: 0.2 }),
  ]),
  research: signal(0.23, [layer(PAPER, 0.65), layer(['woodChime'], 0.15, { delay: 0.09 })]),
  level: signal(0.25, [layer(['woodChime'], 0.62), layer(DRUM, 0.22, { delay: 0.08 })]),
  spell: world(
    0.28,
    0.6,
    1,
    [
      layer(DRUM, 0.62, { lowpass: 1800 }),
      layer(WIND, 0.25, { delay: 0.035, duration: 1.4, lowpass: 3600 }),
    ],
    3,
  ),
  thunder: world(
    0.38,
    0.7,
    1,
    [
      layer(DRUM, 0.55, { lowpass: 1100 }),
      layer(['twig1', 'twig2'], 0.15),
      layer(WIND, 0.18, { delay: 0.1, duration: 1.8, lowpass: 2200 }),
    ],
    4,
  ),
  wind: world(0.09, 8, 1, [layer(WIND, 0.8, { duration: 4 })], 0, 'ambience'),
  caravan: world(
    0.16,
    1.4,
    1,
    [layer(['creak'], 0.66, { rate: 0.01 }), layer(LEATHER, 0.16, { delay: 0.08 })],
    0,
    'ambience',
  ),
  depart: signal(0.28, [
    layer(DRUM, 0.48),
    layer(['creak'], 0.24, { delay: 0.12 }),
    layer(LEATHER, 0.16, { delay: 0.24 }),
  ]),
  arrive: signal(0.24, [layer(['woodChime'], 0.65), layer(PAPER, 0.15, { delay: 0.14 })]),
  fall: signal(
    0.32,
    [layer(DRUM, 0.62, { lowpass: 1400 }), layer(LEATHER, 0.22, { delay: 0.15 })],
    5,
  ),
  succession: signal(0.29, [layer(DRUM, 0.36), layer(['woodChime'], 0.43, { delay: 0.22 })], 5),
  victory: signal(
    0.32,
    [
      layer(DRUM, 0.32),
      layer(['woodChime'], 0.43, { delay: 0.25 }),
      layer(PAPER, 0.15, { delay: 0.55 }),
    ],
    5,
  ),
  loss: signal(0.27, [layer(LEATHER, 0.45), layer(DRUM, 0.4, { delay: 0.24, lowpass: 950 })], 5),
} satisfies Record<string, SoundCue>;
export type SoundKind = keyof typeof SOUND_CUES;
export const SOUND_KINDS = Object.keys(SOUND_CUES) as SoundKind[];
export const AUDIO_REFERENCE_CUES = ['shoot', 'impact', 'spell', 'ui', 'wind'] as const;
