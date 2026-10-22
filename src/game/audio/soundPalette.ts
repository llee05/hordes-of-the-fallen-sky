/** Original, locally synthesized materials for the fictional mounted clan.
 * These are game sound designs, not recordings of historical instruments or rites. */
type Material = 'string' | 'skin' | 'wood' | 'horn' | 'metal' | 'air';

interface Layer {
  material: Material;
  frequency: number;
  duration: number;
  gain: number;
  at: number;
}

interface SoundCue {
  scope: 'world' | 'interface';
  volume: number;
  cooldown: number;
  voices: number;
  priority: number;
  layers: readonly Layer[];
}

const layer = (
  material: Material,
  frequency: number,
  duration: number,
  gain: number,
  at = 0,
): Layer => ({ material, frequency, duration, gain, at });
const world = (
  volume: number,
  cooldown: number,
  voices: number,
  layers: Layer[],
  priority = 1,
): SoundCue => ({ scope: 'world', volume, cooldown, voices, priority, layers });
const signal = (volume: number, layers: Layer[]): SoundCue => ({
  scope: 'interface',
  volume,
  cooldown: 0.18,
  voices: 1,
  priority: 3,
  layers,
});

export const SOUND_CUES = {
  shoot: world(0.27, 0.085, 2, [
    layer('string', 196, 0.16, 0.8),
    layer('wood', 540, 0.045, 0.3),
    layer('air', 2100, 0.13, 0.3, 0.015),
  ]),
  hoof: world(
    0.29,
    0.075,
    2,
    [layer('skin', 105, 0.09, 0.65), layer('wood', 390, 0.055, 0.55), layer('air', 650, 0.07, 0.2)],
    0,
  ),
  dash: world(
    0.4,
    0.3,
    1,
    [
      layer('skin', 110, 0.13, 0.65),
      layer('wood', 420, 0.065, 0.4, 0.045),
      layer('wood', 360, 0.07, 0.45, 0.115),
      layer('air', 800, 0.32, 0.55),
    ],
    2,
  ),
  hit: world(
    0.48,
    0.14,
    2,
    [layer('skin', 92, 0.24, 0.95), layer('wood', 230, 0.11, 0.5), layer('air', 520, 0.16, 0.25)],
    2,
  ),
  impact: world(0.24, 0.065, 3, [
    layer('wood', 280, 0.095, 0.65),
    layer('skin', 145, 0.12, 0.5),
    layer('air', 1400, 0.08, 0.3),
  ]),
  barrier: world(
    0.4,
    0.16,
    2,
    [
      layer('wood', 165, 0.22, 0.9),
      layer('wood', 390, 0.095, 0.5, 0.012),
      layer('string', 98, 0.2, 0.35),
      layer('air', 1300, 0.09, 0.3),
    ],
    2,
  ),
  defeat: world(0.25, 0.12, 2, [
    layer('wood', 220, 0.12, 0.6),
    layer('wood', 300, 0.09, 0.25, 0.06),
    layer('air', 450, 0.3, 0.55),
  ]),
  gem: world(0.19, 0.09, 2, [
    layer('metal', 587.33, 0.28, 0.55),
    layer('string', 293.66, 0.2, 0.6),
  ]),
  level: signal(0.42, [
    layer('string', 196, 0.45, 0.85),
    layer('string', 293.66, 0.45, 0.75, 0.095),
    layer('metal', 440, 0.38, 0.4, 0.19),
  ]),
  build: signal(0.4, [
    layer('wood', 180, 0.18, 0.9),
    layer('wood', 260, 0.16, 0.75, 0.11),
    layer('string', 146.83, 0.25, 0.45, 0.16),
  ]),
  research: signal(0.4, [
    layer('string', 146.83, 0.5, 0.8),
    layer('string', 220, 0.48, 0.65, 0.08),
    layer('metal', 587.33, 0.32, 0.25, 0.16),
  ]),
  depart: signal(0.46, [
    layer('skin', 85, 0.28, 0.75),
    layer('horn', 110, 0.6, 0.7, 0.06),
    layer('horn', 146.83, 0.55, 0.65, 0.45),
    layer('wood', 170, 0.22, 0.5, 0.15),
  ]),
  arrive: signal(0.42, [
    layer('string', 146.83, 0.6, 0.8),
    layer('string', 220, 0.55, 0.65, 0.12),
    layer('metal', 440, 0.5, 0.45, 0.24),
  ]),
  caravan: world(
    0.22,
    0.7,
    2,
    [
      layer('wood', 115, 0.38, 0.65),
      layer('string', 73.42, 0.4, 0.5),
      layer('metal', 880, 0.18, 0.13, 0.08),
      layer('wood', 180, 0.18, 0.35, 0.26),
    ],
    0,
  ),
  wind: world(0.11, 2, 1, [layer('air', 200, 1.3, 0.7), layer('air', 750, 0.8, 0.15, 0.25)], 0),
  spell: world(0.3, 0.25, 2, [
    layer('air', 1000, 0.4, 0.55),
    layer('horn', 196, 0.32, 0.4),
    layer('metal', 392, 0.35, 0.3, 0.08),
  ]),
  thunder: world(
    0.5,
    0.45,
    2,
    [
      layer('air', 1800, 0.12, 0.55),
      layer('skin', 58, 0.7, 0.95),
      layer('air', 140, 0.85, 0.8, 0.025),
      layer('wood', 130, 0.2, 0.35, 0.12),
    ],
    2,
  ),
  fall: signal(0.48, [
    layer('skin', 73.42, 0.65, 0.9),
    layer('string', 110, 0.65, 0.7),
    layer('air', 220, 0.75, 0.5, 0.1),
  ]),
  succession: signal(0.45, [
    layer('skin', 98, 0.22, 0.55),
    layer('horn', 146.83, 0.6, 0.6, 0.04),
    layer('string', 220, 0.55, 0.7, 0.16),
    layer('metal', 440, 0.4, 0.3, 0.3),
  ]),
  victory: signal(0.48, [
    layer('skin', 98, 0.3, 0.7),
    layer('horn', 146.83, 0.65, 0.6, 0.03),
    layer('string', 220, 0.6, 0.75, 0.18),
    layer('horn', 220, 0.6, 0.55, 0.45),
    layer('string', 293.66, 0.65, 0.7, 0.65),
    layer('metal', 440, 0.55, 0.35, 0.8),
  ]),
  loss: signal(0.44, [
    layer('skin', 73.42, 0.65, 0.85),
    layer('wood', 146.83, 0.3, 0.55, 0.3),
    layer('air', 160, 1, 0.6, 0.12),
  ]),
} satisfies Record<string, SoundCue>;

export type SoundKind = keyof typeof SOUND_CUES;
export const SOUND_KINDS = Object.keys(SOUND_CUES) as SoundKind[];
export const SOUND_SAMPLE_RATE = 24000;
export const SOUND_VARIANTS = 3;

/** Reproducible mono PCM. No downloads, recordings, automatic timers, or audio devices. */
export function renderSound(
  kind: SoundKind,
  variant = 0,
  sampleRate = SOUND_SAMPLE_RATE,
): Float32Array<ArrayBuffer> {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 96000)
    throw new RangeError('Sound sample rate must be between 8000 and 96000 Hz');
  const cue = SOUND_CUES[kind];
  const duration = Math.max(...cue.layers.map((part) => part.at + part.duration)) + 0.03;
  const pcm = new Float32Array(Math.ceil(duration * sampleRate));
  const variation = ((Math.trunc(variant) % SOUND_VARIANTS) + SOUND_VARIANTS) % SOUND_VARIANTS;
  let seed = 137 + SOUND_KINDS.indexOf(kind) * 9619 + variation * 15427;
  const noise = (): number => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 2147483648 - 1;
  };
  const tuning = 1 + (variation - 1) * 0.013;
  for (const part of cue.layers) {
    const frequency = part.frequency * tuning;
    const period = Math.max(2, Math.round(sampleRate / frequency - 0.5));
    const string = new Float64Array(period);
    for (let i = 0; i < period; i++) string[i] = noise();
    let stringIndex = 0;
    let phase = 0;
    let low = 0;
    let high = 0;
    const lowRate = 1 - Math.exp((-Math.PI * 2 * frequency * 0.25) / sampleRate);
    const highRate = 1 - Math.exp((-Math.PI * 2 * Math.min(8000, frequency * 2)) / sampleRate);
    const offset = Math.round(part.at * sampleRate);
    const attack = part.material === 'horn' ? 0.055 : part.material === 'air' ? 0.015 : 0.002;
    const release = Math.min(0.08, part.duration * 0.25);
    const ratios =
      part.material === 'metal'
        ? [1, 2.72, 4.08, 5.4]
        : part.material === 'wood'
          ? [1, 2.71, 4.2]
          : part.material === 'skin'
            ? [1, 1.59, 2.14]
            : [1, 2, 3, 4, 5];
    for (let i = 0; i < Math.ceil(part.duration * sampleRate); i++) {
      const t = i / sampleRate;
      const white = noise();
      low += lowRate * (white - low);
      high += highRate * (white - high);
      const breath = (high - low) * 2;
      const envelope = Math.min(1, t / attack) * Math.min(1, (part.duration - t) / release);
      let value = 0;
      if (part.material === 'string') {
        value = string[stringIndex]!;
        const next = (stringIndex + 1) % period;
        string[stringIndex] = (value + string[next]!) * 0.496;
        stringIndex = next;
        value *= Math.exp((-t * 1.5) / part.duration);
      } else if (part.material === 'air') {
        value = breath * Math.sin((Math.PI * t) / part.duration);
      } else {
        const pitch =
          part.material === 'skin'
            ? frequency * (0.58 + 0.42 * Math.exp(-t * 32))
            : frequency * (1 + (part.material === 'horn' ? Math.sin(t * 31) * 0.003 : 0));
        phase += (Math.PI * 2 * pitch) / sampleRate;
        for (let harmonic = 0; harmonic < ratios.length; harmonic++) {
          const decay = part.material === 'horn' ? 0.85 : 3.5 + harmonic * 1.8;
          value +=
            (Math.sin(phase * ratios[harmonic]!) * Math.exp((-t * decay) / part.duration)) /
            (1 + harmonic * (part.material === 'horn' ? 3 : 2));
        }
        value += breath * (part.material === 'horn' ? 0.055 : 0.3 * Math.exp(-t * 95));
      }
      pcm[offset + i] = pcm[offset + i]! + value * envelope * part.gain;
    }
  }
  // Remove DC, soften the ends, and leave headroom before the shared output mixer.
  for (let i = 0; i < pcm.length; i++) pcm[i] = Math.tanh(pcm[i]! * 1.2);
  const mean = pcm.reduce((sum, sample) => sum + sample, 0) / pcm.length;
  let peak = 0;
  for (let i = 0; i < pcm.length; i++) {
    pcm[i] = (pcm[i]! - mean) * Math.min(1, i / 32, (pcm.length - 1 - i) / 32);
    peak = Math.max(peak, Math.abs(pcm[i]!));
  }
  const headroom = peak > 0.8 ? 0.8 / peak : 1;
  for (let i = 0; i < pcm.length; i++) pcm[i] = pcm[i]! * headroom;
  return pcm;
}
