import { AUDIO_ASSETS, audioAssetUrl, type AudioAssetId } from './assets';

/** One local fetch and decode per recording; failures are explicit, cached, and silent. */
export class SampleBank {
  readonly buffers = new Map<AudioAssetId, AudioBuffer>();
  readonly failures = new Map<AudioAssetId, string>();
  private readonly encoded = new Map<AudioAssetId, ArrayBuffer>();
  private fetching?: Promise<void>;
  private decoding?: Promise<void>;
  private disposed = false;

  prepare(): Promise<void> {
    return (this.fetching ??= this.fetchAll());
  }
  private async fetchAll(): Promise<void> {
    const pending = (Object.keys(AUDIO_ASSETS) as AudioAssetId[]).filter(
      (id) => AUDIO_ASSETS[id].status === 'ready',
    );
    // Avoid competing with the painted atlases with dozens of simultaneous requests.
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        let id: AudioAssetId | undefined;
        while (!this.disposed && (id = pending.shift())) {
          try {
            const response = await fetch(audioAssetUrl(AUDIO_ASSETS[id]));
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const bytes = await response.arrayBuffer();
            if (!bytes.byteLength) throw new Error('Empty recording');
            if (!this.disposed) this.encoded.set(id, bytes);
          } catch (error) {
            if (!this.disposed) this.failures.set(id, String(error));
          }
        }
      }),
    );
  }
  decode(context: AudioContext): Promise<void> {
    return (this.decoding ??= this.decodeAll(context));
  }
  private async decodeAll(context: AudioContext): Promise<void> {
    await this.prepare();
    const pending = [...this.encoded.entries()];
    await Promise.all(
      Array.from({ length: 3 }, async () => {
        let item: [AudioAssetId, ArrayBuffer] | undefined;
        while (!this.disposed && (item = pending.shift())) {
          const [id, bytes] = item;
          try {
            const buffer = await context.decodeAudioData(bytes);
            if (!Number.isFinite(buffer.duration) || buffer.duration <= 0 || buffer.duration > 65)
              throw new Error('Invalid recording duration');
            if (!this.disposed) this.buffers.set(id, buffer);
          } catch (error) {
            if (!this.disposed) this.failures.set(id, String(error));
          }
          this.encoded.delete(id);
        }
      }),
    );
  }
  destroy(): void {
    this.disposed = true;
    this.buffers.clear();
    this.encoded.clear();
  }
}
