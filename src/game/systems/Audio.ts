import {
  renderSound,
  SOUND_CUES,
  SOUND_SAMPLE_RATE,
  SOUND_VARIANTS,
  type SoundKind,
} from '../audio/soundPalette';

interface GroundPoint {
  x: number;
  y: number;
}
interface Voice {
  kind: SoundKind;
  priority: number;
  source: AudioBufferSourceNode;
  gain: GainNode;
  pan: StereoPannerNode;
  stopping: boolean;
}

const MAX_VOICES = 16;
const HOOF_STRIDE = 45;

/** Gesture-unlocked local PCM, with bounded mixing and scene-owned world time. */
export class GameAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private compressor?: DynamicsCompressorNode;
  private readonly voices = new Set<Voice>();
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly variants = new Map<SoundKind, number>();
  private readonly lastPlayed = new Map<SoundKind, number>();
  private mutedValue = false;
  private playing = false;
  private destroyed = false;
  private listener: GroundPoint = { x: 0, y: 0 };
  private hoofDistance = 0;
  private hoofBeat = 0;
  private moving = false;
  private cartTimer = 0;
  private windTimer = 3.5;

  get muted(): boolean {
    return this.mutedValue;
  }
  set muted(value: boolean) {
    this.mutedValue = value;
    if (value) this.stopAll();
  }

  unlock(): void {
    if (this.destroyed || this.muted || typeof AudioContext === 'undefined') return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0.65;
        this.compressor = this.context.createDynamicsCompressor();
        this.compressor.threshold.value = -16;
        this.compressor.knee.value = 12;
        this.compressor.ratio.value = 6;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.18;
        this.master.connect(this.compressor);
        this.compressor.connect(this.context.destination);
      }
      void this.context.resume().catch(() => undefined);
    } catch {
      // A missing audio device must never interrupt an expedition.
      this.destroy();
    }
  }

  setPlaying(playing: boolean): void {
    if (this.playing === playing) return;
    this.playing = playing;
    if (!playing) {
      this.stopAll();
      this.moving = false;
    }
  }

  play(kind: SoundKind, position?: GroundPoint, strength = 1): boolean {
    const context = this.context;
    const cue = SOUND_CUES[kind];
    if (
      this.destroyed ||
      this.muted ||
      !context ||
      context.state !== 'running' ||
      (!this.playing && cue.scope === 'world') ||
      !Number.isFinite(strength) ||
      strength <= 0
    )
      return false;
    const now = context.currentTime;
    if (now - (this.lastPlayed.get(kind) ?? -Infinity) < cue.cooldown) return false;
    if (
      [...this.voices].filter((voice) => voice.kind === kind && !voice.stopping).length >=
      cue.voices
    )
      return false;
    const dx = position ? position.x - this.listener.x : 0;
    const dy = position ? position.y - this.listener.y : 0;
    const attenuation = Math.max(
      kind === 'barrier' ? 0.18 : 0,
      1 / (1 + (dx * dx + dy * dy) / 422500),
    );
    if (attenuation < 0.04) return false;
    if (this.voices.size >= MAX_VOICES) {
      const quiet = [...this.voices].sort(
        (a, b) => Number(b.stopping) - Number(a.stopping) || a.priority - b.priority,
      )[0]!;
      if (!quiet.stopping && quiet.priority >= cue.priority) return false;
      this.stopVoice(quiet, true);
    }
    const variant = (this.variants.get(kind) ?? 0) % SOUND_VARIANTS;
    const key = `${kind}:${variant}`;
    let buffer = this.buffers.get(key);
    if (!buffer) {
      const pcm = renderSound(kind, variant);
      buffer = context.createBuffer(1, pcm.length, SOUND_SAMPLE_RATE);
      buffer.copyToChannel(pcm, 0);
      this.buffers.set(key, buffer);
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    const pan = context.createStereoPanner();
    source.buffer = buffer;
    gain.gain.value = cue.volume * Math.min(1.3, strength) * attenuation;
    pan.pan.value = Math.max(-0.8, Math.min(0.8, dx / 650));
    source.connect(gain);
    gain.connect(pan);
    pan.connect(this.master!);
    const voice: Voice = { kind, priority: cue.priority, source, gain, pan, stopping: false };
    source.onended = () => this.removeVoice(voice);
    this.voices.add(voice);
    this.lastPlayed.set(kind, now);
    this.variants.set(kind, variant + 1);
    source.start(now);
    return true;
  }

  update(
    dt: number,
    state: {
      speed: number;
      galloping: boolean;
      caravan: boolean;
      region: number;
      listener: GroundPoint;
      camp: GroundPoint;
    },
  ): void {
    if (!this.playing || !Number.isFinite(dt) || dt <= 0) return;
    this.listener = { x: state.listener.x, y: state.listener.y };
    if (state.speed > 5) {
      if (!this.moving) this.hoofDistance = HOOF_STRIDE;
      this.hoofDistance += state.speed * dt;
      if (this.hoofDistance >= HOOF_STRIDE) {
        const weight = [1, 0.65, 0.9, 0.55][this.hoofBeat++ % 4]!;
        this.play('hoof', undefined, weight * (state.galloping ? 1.1 : 0.75));
        this.hoofDistance %= HOOF_STRIDE;
      }
    } else this.hoofDistance = 0;
    this.moving = state.speed > 5;
    if (state.caravan) {
      this.cartTimer -= dt;
      if (this.cartTimer <= 0) {
        this.play('caravan', state.camp);
        this.cartTimer = 1.1;
      }
    } else this.cartTimer = 0;
    this.windTimer -= dt;
    if (this.windTimer <= 0) {
      this.play('wind', undefined, 0.45 + state.region * 0.1);
      this.windTimer = 4.5 + state.region * 0.2;
    }
  }

  reset(): void {
    for (const voice of this.voices) this.stopVoice(voice, true);
    this.lastPlayed.clear();
    this.variants.clear();
    this.playing = this.moving = false;
    this.hoofDistance = this.hoofBeat = this.cartTimer = 0;
    this.windTimer = 3.5;
    this.listener = { x: 0, y: 0 };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.reset();
    this.destroyed = true;
    this.buffers.clear();
    this.master?.disconnect();
    this.compressor?.disconnect();
    void this.context?.close().catch(() => undefined);
    this.context = undefined;
  }

  private stopAll(): void {
    this.lastPlayed.clear();
    for (const voice of this.voices) this.stopVoice(voice);
  }

  private stopVoice(voice: Voice, immediate = false): void {
    if (immediate) {
      voice.source.stop();
      this.removeVoice(voice);
    } else if (!voice.stopping) {
      const now = this.context!.currentTime;
      voice.stopping = true;
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
      voice.gain.gain.linearRampToValueAtTime(0, now + 0.012);
      voice.source.stop(now + 0.015);
    }
  }

  private removeVoice(voice: Voice): void {
    this.voices.delete(voice);
    voice.source.onended = null;
    voice.source.disconnect();
    voice.gain.disconnect();
    voice.pan.disconnect();
  }
}
