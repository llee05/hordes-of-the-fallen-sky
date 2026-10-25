import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameAudio } from '../../src/game/systems/Audio';
import { SOUND_KINDS } from '../../src/game/audio/soundPalette';
import { AUDIO_LIMITS } from '../../src/game/audio/mixing';
import { AUDIO_ASSETS } from '../../src/game/audio/assets';

class Parameter {
  value = 0;
  ramps: number[] = [];
  cancelAndHoldAtTime = vi.fn();
  setValueAtTime(value: number) {
    this.value = value;
  }
  linearRampToValueAtTime(value: number) {
    this.value = value;
    this.ramps.push(value);
  }
}
class Node {
  disconnect = vi.fn();
  connect(node: unknown) {
    return node;
  }
}
class Source extends Node {
  buffer?: { duration: number };
  playbackRate = new Parameter();
  onended: (() => void) | null = null;
  started = Infinity;
  stopped = Infinity;
  duration = Infinity;
  ended = false;
  constructor(private readonly context: Context) {
    super();
    this.playbackRate.value = 1;
  }
  start(time: number, _offset = 0, duration = this.buffer?.duration ?? 0) {
    this.started = time;
    this.duration = duration / this.playbackRate.value;
  }
  stop(time = this.context.currentTime) {
    this.stopped = time;
  }
}
class Context {
  static latest: Context;
  state = 'suspended';
  currentTime = 0;
  destination = new Node();
  sources: Source[] = [];
  decoded = 0;
  constructor() {
    Context.latest = this;
  }
  async resume() {
    this.state = 'running';
  }
  async close() {
    this.state = 'closed';
  }
  createGain() {
    return Object.assign(new Node(), { gain: new Parameter() });
  }
  createStereoPanner() {
    return Object.assign(new Node(), { pan: new Parameter() });
  }
  createBiquadFilter() {
    return Object.assign(new Node(), { type: 'lowpass', frequency: new Parameter() });
  }
  createDynamicsCompressor() {
    return Object.assign(new Node(), {
      threshold: new Parameter(),
      knee: new Parameter(),
      ratio: new Parameter(),
      attack: new Parameter(),
      release: new Parameter(),
    });
  }
  async decodeAudioData(bytes: ArrayBuffer) {
    this.decoded++;
    const name = new TextDecoder().decode(bytes);
    if (name.includes('broken')) throw new Error('Bad recording');
    return { duration: /wind|fire|river/.test(name) ? 32 : 0.5, sampleRate: 44100 };
  }
  createBufferSource() {
    const source = new Source(this);
    this.sources.push(source);
    return source;
  }
  advance(seconds: number) {
    this.currentTime += seconds;
    for (const s of this.sources)
      if (!s.ended && this.currentTime >= Math.min(s.stopped, s.started + s.duration)) {
        s.ended = true;
        s.onended?.();
      }
  }
  active() {
    return this.sources.filter((s) => !s.ended && s.stopped > this.currentTime);
  }
}
const fetcher = vi.fn(async (path: string) => ({
  ok: true,
  arrayBuffer: async () => new TextEncoder().encode(path).buffer,
}));
beforeEach(() => {
  vi.stubGlobal('AudioContext', Context);
  vi.stubGlobal('fetch', fetcher);
  fetcher.mockClear();
});
afterEach(() => vi.unstubAllGlobals());
async function prepared() {
  const audio = new GameAudio(() => 0.42);
  audio.unlock();
  await audio.ready();
  audio.setPlaying(true);
  return audio;
}
const state = {
  speed: 190,
  galloping: false,
  caravan: false,
  region: 0,
  listener: { x: 0, y: 0 },
  camp: { x: 0, y: 0 },
};

describe('recorded, layered and bounded steppe audio', () => {
  it('preloads only local supplied files without creating an audio device and decodes exactly once', async () => {
    const audio = new GameAudio();
    await audio.prepare();
    expect(audio.diagnostics.ready).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(
      Object.values(AUDIO_ASSETS).filter((a) => a.status === 'ready').length,
    );
    expect(
      fetcher.mock.calls.every(([url]) => url.startsWith('./audio/') || url.startsWith('/audio/')),
    ).toBe(true);
    audio.unlock();
    await audio.ready();
    const context = Context.latest;
    const decoded = context.decoded;
    audio.unlock();
    await audio.ready();
    expect(Context.latest).toBe(context);
    expect(context.decoded).toBe(decoded);
    expect(audio.diagnostics.ready).toBe(decoded);
    audio.destroy();
  });
  it('requires loading and an unlocked device, gates world cues, and cleans every layer on pause/mute', async () => {
    const audio = new GameAudio();
    expect(audio.play('shoot')).toBe(false);
    audio.unlock();
    expect(audio.play('shoot')).toBe(false);
    await audio.ready();
    expect(audio.play('shoot')).toBe(false);
    audio.setPlaying(true);
    expect(audio.play('shoot')).toBe(true);
    expect(audio.play('shoot')).toBe(false);
    const context = Context.latest;
    expect(context.active()).toHaveLength(2);
    audio.setPlaying(false);
    context.advance(0.04);
    expect(context.active()).toHaveLength(0);
    expect(audio.play('build')).toBe(true);
    audio.muted = true;
    context.advance(0.08);
    expect(context.active()).toHaveLength(0);
    expect(audio.play('research')).toBe(false);
    audio.muted = false;
    audio.unlock();
    expect(Context.latest).toBe(context);
    expect(audio.play('research')).toBe(true);
    audio.reset();
    expect(context.active()).toHaveLength(0);
    expect(context.sources.every((s) => s.disconnect.mock.calls.length > 0)).toBe(true);
    audio.destroy();
    expect(context.state).toBe('closed');
  });
  it('survives missing and corrupt files silently, and never fetches requested-but-unsupplied recordings', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string) => ({
        ok: !path.includes('bow-'),
        status: 404,
        arrayBuffer: async () =>
          new TextEncoder().encode(path.includes('paper-') ? 'broken' : path).buffer,
      })),
    );
    const audio = await prepared();
    expect(audio.diagnostics.failed).toHaveProperty('bow1');
    expect(audio.diagnostics.failed).toHaveProperty('paper1');
    // A missing primary recording stays silent; there is no generated replacement.
    expect(audio.play('shoot')).toBe(false);
    expect(Context.latest.sources.every((s) => s.buffer)).toBe(true);
    expect(audio.diagnostics.needed).toContain('music-steppe.ogg');
    expect(audio.play('impact')).toBe(true);
    audio.destroy();
  });
  it('keeps independent channel gains and silence-at-zero; invalid values cannot poison the mixer', async () => {
    const audio = await prepared();
    audio.setVolume('combat', 0);
    expect(audio.play('shoot')).toBe(false);
    expect(audio.play('ui')).toBe(true);
    audio.setVolume('ui', 0);
    Context.latest.advance(0.04);
    expect(Context.latest.active()).toHaveLength(0);
    audio.setVolume('ambience', 3);
    audio.setVolume('music', -0.5);
    audio.setVolume('combat', NaN);
    expect(audio.volumes).toMatchObject({ ambience: 1, music: 0, combat: 0, ui: 0 });
    const copy = audio.volumes;
    copy.combat = 1;
    expect(audio.volumes.combat).toBe(0);
    audio.destroy();
  });
  it('bounds thousands of simultaneous requests, prioritises important events, and caches decoded samples', async () => {
    const audio = await prepared(),
      context = Context.latest,
      decoded = context.decoded;
    const crowd = SOUND_KINDS.filter((kind) => kind !== 'victory');
    for (let i = 0; i < 1200; i++) {
      audio.play(crowd[i % crowd.length]!);
      expect(context.active().length).toBeLessThanOrEqual(AUDIO_LIMITS.sources);
      expect(audio.diagnostics.events).toBeLessThanOrEqual(AUDIO_LIMITS.events);
    }
    context.advance(0.2);
    expect(audio.play('victory')).toBe(true);
    expect(context.decoded).toBe(decoded);
    expect(context.active().length).toBeLessThanOrEqual(AUDIO_LIMITS.sources);
    audio.reset();
    expect(context.active()).toHaveLength(0);
    audio.destroy();
  });
  it('uses active movement for hooves, freezes presentation clocks in menus, and retains only bounded fading beds', async () => {
    const audio = await prepared(),
      context = Context.latest;
    let accepted = 0;
    const play = audio.play.bind(audio);
    audio.play = (...args) => {
      const ok = play(...args);
      if (ok && args[0] === 'hoof') accepted++;
      return ok;
    };
    for (let i = 0; i < 30; i++) {
      audio.update(0.05, state);
      context.advance(0.05);
    }
    expect(accepted).toBeGreaterThan(2);
    expect(audio.diagnostics.beds).toBeLessThanOrEqual(AUDIO_LIMITS.beds);
    const slow = accepted;
    audio.reset();
    audio.setPlaying(true);
    accepted = 0;
    for (let i = 0; i < 30; i++) {
      audio.update(0.05, { ...state, speed: 570, galloping: true });
      context.advance(0.05);
    }
    expect(accepted).toBeGreaterThan(slow);
    audio.setPlaying(false);
    const count = accepted;
    context.advance(60);
    audio.update(60, state);
    expect(accepted).toBe(count);
    audio.setPlaying(true);
    audio.update(0.05, state);
    expect(accepted).toBe(count + 1);
    for (const environment of ['river', 'mountain', 'forest', 'desert', 'steppe'] as const) {
      audio.update(0.1, { ...state, speed: 0, environment });
      context.advance(3);
      expect(audio.diagnostics.beds).toBeLessThanOrEqual(AUDIO_LIMITS.beds);
    }
    audio.reset();
    expect(context.active()).toHaveLength(0);
    audio.destroy();
  });
  it('keeps gameplay operational when the device or Web Audio API is unavailable', () => {
    vi.stubGlobal('AudioContext', undefined);
    const audio = new GameAudio();
    expect(() => audio.unlock()).not.toThrow();
    expect(audio.play('build')).toBe(false);
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('No device');
        }
      },
    );
    expect(() => new GameAudio().unlock()).not.toThrow();
  });
  it('crossfades camp ambience beyond a whole passage without advancing movement clocks', async () => {
    vi.useFakeTimers();
    const audio = await prepared(),
      context = Context.latest;
    try {
      audio.setPlaying(false, true);
      context.advance(0.2);
      const first = context.sources.length;
      for (let i = 0; i < 30; i++) {
        context.advance(1.5);
        vi.advanceTimersByTime(1500);
        expect(audio.diagnostics.beds).toBeLessThanOrEqual(AUDIO_LIMITS.beds);
      }
      expect(context.sources.length).toBeGreaterThan(first);
      expect(audio.diagnostics.events).toBe(0);
      audio.reset();
      expect(vi.getTimerCount()).toBe(0);
      expect(context.active()).toHaveLength(0);
    } finally {
      audio.destroy();
      vi.useRealTimers();
    }
  });
});
