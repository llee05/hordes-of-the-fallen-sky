export const AUDIO_CHANNELS = ['music', 'ambience', 'combat', 'ui'] as const;
export type AudioChannel = (typeof AUDIO_CHANNELS)[number];
export type AudioMix = Record<AudioChannel, number>;
export const DEFAULT_AUDIO_MIX: Readonly<AudioMix> = {
  music: 0.35,
  ambience: 0.55,
  combat: 0.8,
  ui: 0.65,
};
export function isAudioMix(value: unknown): value is AudioMix {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return AUDIO_CHANNELS.every((key) => {
    const n = (value as Record<string, unknown>)[key];
    return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
  });
}
export function normalizeAudioMix(value: unknown): AudioMix {
  const mix = { ...DEFAULT_AUDIO_MIX };
  if (typeof value !== 'object' || value === null) return mix;
  for (const key of AUDIO_CHANNELS) {
    const n = (value as Record<string, unknown>)[key];
    if (typeof n === 'number' && Number.isFinite(n)) mix[key] = Math.max(0, Math.min(1, n));
  }
  return mix;
}
