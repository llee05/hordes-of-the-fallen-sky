import {
  DEFAULT_AUDIO_MIX,
  AUDIO_CHANNELS,
  normalizeAudioMix,
  type AudioChannel,
  type AudioMix,
} from '../../shared/audioSettings';
import { AUDIO_ASSETS, type AudioAssetId } from '../audio/assets';
import { SampleBank } from '../audio/SampleBank';
import {
  AUDIO_LIMITS,
  ENVIRONMENTS,
  SampleSelector,
  spatialMix,
  type AudioEnvironment,
  type Point,
} from '../audio/mixing';
import { SOUND_CUES, WIND, type SoundKind, type SoundLayer } from '../audio/soundPalette';

interface LayerVoice {
  source: AudioBufferSourceNode;
  gain: GainNode;
  pan: StereoPannerNode;
  filter?: BiquadFilterNode;
}
interface Voice {
  kind: SoundKind;
  priority: number;
  channel: AudioChannel;
  layers: LayerVoice[];
  stopping: boolean;
  /** First layer remains convenient for development inspection; this is one grouped event. */
  source: AudioBufferSourceNode;
  loudness: number;
  audition: boolean;
}
interface Bed extends LayerVoice {
  family: 'wind' | 'river' | 'fire' | 'music';
  asset: AudioAssetId;
  ends: number;
  stopping: boolean;
  target: number;
}

/** Recorded, locally bundled audio. ArenaScene alone drives active-time presentation clocks. */
export class GameAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private compressor?: DynamicsCompressorNode;
  private readonly buses = new Map<AudioChannel, GainNode>();
  private readonly voices = new Set<Voice>();
  private readonly beds = new Set<Bed>();
  private readonly bank = new SampleBank();
  private readonly selector: SampleSelector;
  private readonly lastPlayed = new Map<SoundKind, number>();
  private readonly random: () => number;
  private mix: AudioMix = { ...DEFAULT_AUDIO_MIX };
  private mutedValue = false;
  private playing = false;
  private campScene = false;
  private destroyed = false;
  private listener: Point = { x: 0, y: 0 };
  private hoofDistance = 0;
  private hoofBeat = 0;
  private moving = false;
  private cartTimer = 0;
  private activity = 0;
  private duckUntil = 0;
  private environment: AudioEnvironment = 'steppe';
  private campDistance = Infinity;
  private windowStarted = 0;
  private windowEvents = 0;
  private generation = 0;
  private campRefresh?: ReturnType<typeof setTimeout>;

  constructor(random: () => number = Math.random) {
    this.random = random;
    this.selector = new SampleSelector(random);
  }
  get muted(): boolean {
    return this.mutedValue;
  }
  set muted(value: boolean) {
    this.mutedValue = value;
    if (value) {
      this.stopAll();
      this.fade(this.master?.gain, 0, 0.06);
    } else this.fade(this.master?.gain, 0.72, 0.08);
  }
  get volumes(): AudioMix {
    return { ...this.mix };
  }
  get diagnostics() {
    return {
      ready: this.bank.buffers.size,
      failed: Object.fromEntries(this.bank.failures),
      needed: Object.values(AUDIO_ASSETS)
        .filter((a) => a.status === 'needed')
        .map((a) => a.file),
      events: this.voices.size,
      sources: this.sourceCount(),
      beds: this.beds.size,
    };
  }
  prepare(): Promise<void> {
    return this.bank.prepare();
  }
  async ready(): Promise<void> {
    if (this.context) await this.bank.decode(this.context);
  }
  unlock(): void {
    if (this.destroyed || this.muted || typeof AudioContext === 'undefined') return;
    try {
      if (!this.context) {
        const context = (this.context = new AudioContext());
        this.master = context.createGain();
        this.master.gain.value = 0.72;
        this.compressor = context.createDynamicsCompressor();
        this.compressor.threshold.value = -7;
        this.compressor.knee.value = 9;
        this.compressor.ratio.value = 4;
        this.compressor.attack.value = 0.005;
        this.compressor.release.value = 0.18;
        this.master.connect(this.compressor);
        this.compressor.connect(context.destination);
        for (const channel of AUDIO_CHANNELS) {
          const bus = context.createGain();
          bus.gain.value = this.mix[channel];
          bus.connect(this.master);
          this.buses.set(channel, bus);
        }
      }
      void this.context.resume().catch(() => undefined);
      void this.bank.decode(this.context).then(() => this.updateBeds());
    } catch {
      this.destroy();
    }
  }
  setVolume(channel: AudioChannel, value: number): void {
    if (!AUDIO_CHANNELS.includes(channel) || !Number.isFinite(value)) return;
    this.mix[channel] = Math.max(0, Math.min(1, value));
    this.fade(this.buses.get(channel)?.gain, this.mix[channel], 0.08);
    if (!this.mix[channel]) {
      for (const voice of this.voices) if (voice.channel === channel) this.stopVoice(voice);
      for (const bed of this.beds)
        if ((bed.family === 'music' ? 'music' : 'ambience') === channel) this.stopBed(bed, 0.08);
    }
  }
  setMix(value: AudioMix): void {
    const mix = normalizeAudioMix(value);
    for (const channel of AUDIO_CHANNELS) this.setVolume(channel, mix[channel]);
  }
  setPlaying(playing: boolean, campScene = false): void {
    if (this.playing === playing && this.campScene === campScene) return;
    this.playing = playing;
    this.campScene = campScene;
    clearTimeout(this.campRefresh);
    for (const voice of this.voices) if (voice.audition) this.stopVoice(voice);
    if (!playing) {
      for (const voice of this.voices) this.stopVoice(voice);
      for (const bed of this.beds) this.stopBed(bed, 0.18);
      this.moving = false;
    }
    // Planning can retain a quiet camp atmosphere, but never advances world presentation timers.
    if (campScene) this.refreshCampBeds();
  }
  private refreshCampBeds(): void {
    if (!this.campScene || this.destroyed) return;
    this.updateBeds();
    // Only ambience uses wall time while planning; horse/cart clocks and simulation stay frozen.
    this.campRefresh = setTimeout(() => this.refreshCampBeds(), 1500);
  }
  /** Explicit reference auditions can play in Settings without changing the simulation phase. */
  audition(kind: SoundKind): void {
    this.unlock();
    const generation = this.generation;
    void this.ready().then(() => {
      if (generation === this.generation) this.play(kind, undefined, 1, true);
    });
  }
  play(kind: SoundKind, position?: Point, strength = 1, audition = false): boolean {
    const context = this.context,
      cue = SOUND_CUES[kind];
    if (
      !cue ||
      this.destroyed ||
      this.muted ||
      !context ||
      context.state !== 'running' ||
      (!this.playing && cue.scope === 'world' && !audition) ||
      this.mix[cue.channel] === 0 ||
      !Number.isFinite(strength) ||
      strength <= 0
    )
      return false;
    const now = context.currentTime;
    if (
      now - (this.lastPlayed.get(kind) ?? -Infinity) < cue.cooldown ||
      [...this.voices].filter((v) => v.kind === kind && !v.stopping).length >= cue.voices
    )
      return false;
    const spatial = spatialMix(position, this.listener, kind === 'barrier' ? 0.12 : 0);
    if (spatial.attenuation < 0.04) return false;
    if (now - this.windowStarted >= 1) {
      this.windowStarted = now;
      this.windowEvents = 0;
    }
    if (cue.priority < 3 && this.windowEvents >= AUDIO_LIMITS.eventsPerSecond) return false;
    const planned = cue.layers.map((layer, index) => ({
      layer,
      id: this.selector.pick(layer, this.bank.buffers, `${kind}:${index}`),
    }));
    // An optional tail cannot impersonate an unavailable primary recording.
    if (!planned[0]?.id) return false;
    const chosen = planned.filter((p): p is { layer: SoundLayer; id: AudioAssetId } => !!p.id);
    if (!chosen.length) return false;
    const loudness = cue.volume * Math.min(1.2, strength) * spatial.attenuation;
    while (
      this.voices.size >= AUDIO_LIMITS.events ||
      this.sourceCount() + chosen.length > AUDIO_LIMITS.sources ||
      (cue.channel === 'combat' &&
        [...this.voices].filter((v) => v.channel === 'combat').length >= AUDIO_LIMITS.combatEvents)
    ) {
      const candidate = [...this.voices].sort(
        (a, b) => a.priority - b.priority || a.loudness - b.loudness,
      )[0];
      if (!candidate || (candidate.priority >= cue.priority && !candidate.stopping)) return false;
      this.stopVoice(candidate, true);
    }
    const layers: LayerVoice[] = [];
    const eventVariation = 0.94 + this.random() * 0.1;
    // Keep the sum of layer gains within an event budget even if content authors add layers.
    const layerBudget = Math.max(
      1,
      chosen.reduce((sum, p) => sum + p.layer.gain, 0),
    );
    for (const { layer, id } of chosen) {
      const source = context.createBufferSource();
      source.buffer = this.bank.buffers.get(id)!;
      const rate = Math.min(0.025, Math.max(0, layer.rate ?? 0));
      source.playbackRate.value = 1 + (this.random() * 2 - 1) * rate;
      const gain = context.createGain(),
        pan = context.createStereoPanner();
      const level = (loudness * eventVariation * layer.gain) / layerBudget;
      const start = now + (layer.delay ?? 0) + this.random() * (layer.jitter ?? 0);
      const duration =
        Math.min(layer.duration ?? source.buffer.duration, source.buffer.duration) /
        source.playbackRate.value;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(level, start + 0.004);
      gain.gain.setValueAtTime(level, Math.max(start + 0.004, start + duration - 0.04));
      gain.gain.linearRampToValueAtTime(0, start + duration);
      pan.pan.value = spatial.pan;
      const part: LayerVoice = { source, gain, pan };
      source.connect(gain);
      gain.connect(pan);
      if (layer.lowpass) {
        const filter = (part.filter = context.createBiquadFilter());
        filter.type = 'lowpass';
        filter.frequency.value = layer.lowpass;
        pan.connect(filter);
        filter.connect(this.buses.get(cue.channel)!);
      } else pan.connect(this.buses.get(cue.channel)!);
      layers.push(part);
      source.start(
        start,
        0,
        Math.min(layer.duration ?? source.buffer.duration, source.buffer.duration),
      );
    }
    const voice: Voice = {
      kind,
      priority: cue.priority,
      channel: cue.channel,
      layers,
      source: layers[0]!.source,
      stopping: false,
      loudness,
      audition,
    };
    for (const part of layers)
      part.source.onended = () => {
        this.disconnect(part);
        voice.layers = voice.layers.filter((l) => l !== part);
        if (!voice.layers.length) this.voices.delete(voice);
      };
    this.voices.add(voice);
    this.lastPlayed.set(kind, now);
    this.windowEvents++;
    if (cue.channel === 'combat' && cue.priority > 0) {
      this.activity = Math.min(1, this.activity + 0.13);
      this.fade(this.buses.get('music')?.gain, this.mix.music * 0.62, 0.12);
    }
    if (cue.priority >= 4) {
      this.duckUntil = now + 0.5;
      this.fade(this.buses.get('ambience')?.gain, this.mix.ambience * 0.7, 0.08);
    }
    return true;
  }
  update(
    dt: number,
    state: {
      speed: number;
      galloping: boolean;
      caravan: boolean;
      region: number;
      listener: Point;
      camp: Point;
      environment?: AudioEnvironment;
      threat?: number;
    },
  ): void {
    if (!this.playing || !Number.isFinite(dt) || dt <= 0) return;
    this.listener = { x: state.listener.x, y: state.listener.y };
    this.environment =
      state.environment ??
      (state.region === 1 ? 'river' : state.region >= 2 ? 'mountain' : 'steppe');
    this.campDistance = Math.hypot(state.camp.x - this.listener.x, state.camp.y - this.listener.y);
    this.activity = Math.max(0, this.activity - dt * 0.12);
    if (state.speed > 5) {
      if (!this.moving) this.hoofDistance = 45;
      this.hoofDistance += state.speed * dt;
      if (this.hoofDistance >= 45) {
        this.play(
          'hoof',
          undefined,
          [1, 0.62, 0.9, 0.54][this.hoofBeat++ % 4]! * (state.galloping ? 1 : 0.7),
        );
        this.hoofDistance %= 45;
      }
    } else this.hoofDistance = 0;
    this.moving = state.speed > 5;
    if (state.caravan) {
      this.cartTimer -= dt;
      if (this.cartTimer <= 0) {
        this.play('caravan', state.camp);
        this.cartTimer = 1.6 + this.random() * 1.4;
      }
    } else this.cartTimer = 0;
    this.updateBeds(state.caravan);
  }
  private updateBeds(caravan = false): void {
    const context = this.context;
    if (!context || context.state !== 'running' || this.muted || (!this.playing && !this.campScene))
      return;
    const e = ENVIRONMENTS[this.environment];
    const calm = this.campScene ? 0.5 : 1 - this.activity * 0.25;
    this.bed('wind', WIND, e.wind * calm, e.cutoff);
    this.bed('river', ['river1', 'river2'], this.campScene ? 0 : e.river, 7500);
    this.bed(
      'fire',
      ['fire1', 'fire2'],
      this.campScene
        ? 0.45
        : !caravan
          ? 0.35 / (1 + (this.campDistance * this.campDistance) / 90000)
          : 0,
      7000,
    );
    const music: AudioAssetId =
      this.campScene || (!caravan && this.campDistance < 230 && this.activity < 0.1)
        ? 'musicCamp'
        : this.activity > 0.3
          ? 'musicBattle'
          : 'musicSteppe';
    this.bed('music', [music], 1, 12000);
    this.fade(
      this.buses.get('ambience')?.gain,
      this.mix.ambience * (context.currentTime < this.duckUntil ? 0.7 : 1),
      0.4,
    );
    this.fade(this.buses.get('music')?.gain, this.mix.music * (1 - this.activity * 0.38), 0.5);
  }
  private bed(
    family: Bed['family'],
    samples: readonly AudioAssetId[],
    target: number,
    cutoff: number,
  ): void {
    const context = this.context!,
      channel = family === 'music' ? 'music' : 'ambience';
    const active = [...this.beds].filter((b) => b.family === family && !b.stopping);
    if (!this.mix[channel] || target < 0.005) {
      for (const bed of active) this.stopBed(bed, 1.5);
      return;
    }
    const current = active.at(-1);
    if (current && current.ends - context.currentTime > 2.5 && samples.includes(current.asset)) {
      if (Math.abs(current.target - target) > 0.015) {
        current.target = target;
        this.fade(current.gain.gain, target, 2);
      }
      this.fade(current.filter?.frequency, cutoff, 2.5);
      return;
    }
    const id = this.selector.pick({ samples, gain: 1 }, this.bank.buffers, `bed:${family}`);
    if (!id && current && !samples.includes(current.asset)) this.stopBed(current, 2);
    if (!id || this.beds.size >= AUDIO_LIMITS.beds || this.sourceCount() >= AUDIO_LIMITS.sources)
      return;
    const buffer = this.bank.buffers.get(id)!;
    // Preserve musical phrase starts; only environmental recordings enter at random offsets.
    const offset = family === 'music' ? 0 : this.random() * Math.max(0, buffer.duration - 18);
    const duration = buffer.duration - offset;
    if (duration < 2) return;
    for (const bed of active) this.stopBed(bed, 2.4);
    const source = context.createBufferSource(),
      gain = context.createGain(),
      pan = context.createStereoPanner(),
      filter = context.createBiquadFilter();
    source.buffer = buffer;
    source.playbackRate.value = 1;
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    pan.pan.value = 0;
    source.connect(gain);
    gain.connect(pan);
    pan.connect(filter);
    filter.connect(this.buses.get(channel)!);
    const now = context.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(target, now + 2.4);
    gain.gain.setValueAtTime(target, now + duration - 2.4);
    gain.gain.linearRampToValueAtTime(0, now + duration);
    const bed: Bed = {
      family,
      asset: id,
      source,
      gain,
      pan,
      filter,
      ends: now + duration,
      stopping: false,
      target,
    };
    source.onended = () => {
      this.beds.delete(bed);
      this.disconnect(bed);
    };
    this.beds.add(bed);
    source.start(now, offset, duration);
  }
  reset(): void {
    this.generation++;
    clearTimeout(this.campRefresh);
    for (const voice of this.voices) this.stopVoice(voice, true);
    for (const bed of this.beds) this.stopBed(bed, 0);
    this.lastPlayed.clear();
    this.selector.reset();
    this.playing = this.campScene = this.moving = false;
    this.hoofDistance = this.hoofBeat = this.cartTimer = this.activity = this.windowEvents = 0;
    this.duckUntil = 0;
    this.windowStarted = 0;
    this.listener = { x: 0, y: 0 };
    this.campDistance = Infinity;
  }
  destroy(): void {
    if (this.destroyed) return;
    this.reset();
    this.destroyed = true;
    this.bank.destroy();
    for (const bus of this.buses.values()) bus.disconnect();
    this.buses.clear();
    this.master?.disconnect();
    this.compressor?.disconnect();
    void this.context?.close().catch(() => undefined);
    this.context = undefined;
  }
  private sourceCount(): number {
    return [...this.voices].reduce((n, v) => n + v.layers.length, 0) + this.beds.size;
  }
  private fade(parameter: AudioParam | undefined, target: number, seconds: number): void {
    if (!parameter || !this.context) return;
    const now = this.context.currentTime;
    // Hold the actual interpolated value before a new fade, avoiding a discontinuity.
    parameter.cancelAndHoldAtTime(now);
    parameter.linearRampToValueAtTime(target, now + seconds);
  }
  private stopAll(): void {
    this.lastPlayed.clear();
    for (const v of this.voices) this.stopVoice(v);
    for (const b of this.beds) this.stopBed(b, 0.06);
  }
  private stopVoice(voice: Voice, immediate = false): void {
    if (!immediate && voice.stopping) return;
    voice.stopping = true;
    for (const part of voice.layers) {
      if (!immediate) this.fade(part.gain.gain, 0, 0.025);
      part.source.stop((this.context?.currentTime ?? 0) + (immediate ? 0 : 0.03));
      if (immediate) {
        part.source.onended = null;
        this.disconnect(part);
      }
    }
    if (immediate) this.voices.delete(voice);
  }
  private stopBed(bed: Bed, seconds: number): void {
    if (bed.stopping && seconds > 0) return;
    bed.stopping = true;
    this.fade(bed.gain.gain, 0, seconds);
    bed.source.stop((this.context?.currentTime ?? 0) + seconds + (seconds ? 0.005 : 0));
    if (!seconds) {
      bed.source.onended = null;
      this.beds.delete(bed);
      this.disconnect(bed);
    }
  }
  private disconnect(part: LayerVoice): void {
    part.source.onended = null;
    part.source.disconnect();
    part.gain.disconnect();
    part.pan.disconnect();
    part.filter?.disconnect();
  }
}
