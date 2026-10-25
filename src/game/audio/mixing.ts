import type { AudioAssetId } from './assets';
import type { SoundLayer } from './soundPalette';
import type { MigrationLocation } from '../data/clan';
export const AUDIO_LIMITS = {
  events: 12,
  sources: 28,
  beds: 6,
  combatEvents: 7,
  eventsPerSecond: 22,
} as const;
export interface Point {
  x: number;
  y: number;
}
export function spatialMix(position: Point | undefined, listener: Point, minimum = 0) {
  const dx = position ? position.x - listener.x : 0,
    dy = position ? position.y - listener.y : 0;
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return { attenuation: 0, pan: 0 };
  return {
    attenuation: Math.max(minimum, 1 / (1 + (dx * dx + dy * dy) / 360000)),
    pan: Math.max(-0.8, Math.min(0.8, dx / 700)),
  };
}
/** Shuffled bags exhaust the available takes, and never repeat at a bag boundary. */
export class SampleSelector {
  private readonly bags = new Map<string, AudioAssetId[]>();
  private readonly previous = new Map<string, AudioAssetId>();
  constructor(private readonly random: () => number) {}
  pick(
    layer: SoundLayer,
    available: ReadonlyMap<AudioAssetId, AudioBuffer>,
    key: string,
  ): AudioAssetId | undefined {
    let bag = this.bags.get(key);
    if (!bag?.length) {
      bag = layer.samples.filter((id) => available.has(id));
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j]!, bag[i]!];
      }
      if (bag.length > 1 && bag.at(-1) === this.previous.get(key))
        [bag[0], bag[bag.length - 1]] = [bag.at(-1)!, bag[0]!];
      this.bags.set(key, bag);
    }
    const id = bag.pop();
    if (id) this.previous.set(key, id);
    return id;
  }
  reset(): void {
    this.bags.clear();
    this.previous.clear();
  }
}
export type AudioEnvironment = 'steppe' | 'river' | 'mountain' | 'forest' | 'desert' | 'volcanic';
export function environmentForLocation(
  location: Pick<MigrationLocation, 'id' | 'terrain'>,
): AudioEnvironment {
  if (location.id === 'silent-river') return 'mountain'; // frozen river: no running water bed
  if (location.id === 'belukha' || location.id === 'bogd-khan-uul') return 'forest';
  return location.terrain === 'peaks'
    ? 'mountain'
    : location.terrain === 'foothills'
      ? 'steppe'
      : location.terrain;
}
export const ENVIRONMENTS: Record<
  AudioEnvironment,
  { wind: number; cutoff: number; river: number }
> = {
  steppe: { wind: 0.23, cutoff: 7500, river: 0 },
  river: { wind: 0.17, cutoff: 6500, river: 0.23 },
  mountain: { wind: 0.34, cutoff: 6500, river: 0 },
  forest: { wind: 0.18, cutoff: 4200, river: 0 },
  desert: { wind: 0.26, cutoff: 5500, river: 0 },
  volcanic: { wind: 0.24, cutoff: 3200, river: 0 },
};
