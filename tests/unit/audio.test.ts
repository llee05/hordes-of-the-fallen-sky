import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameAudio } from '../../src/game/systems/Audio';
import { SOUND_KINDS } from '../../src/game/audio/soundPalette';

class Parameter {
  value = 0;
  cancelScheduledValues() {}
  setValueAtTime(value: number) {
    this.value = value;
  }
  linearRampToValueAtTime(value: number) {
    this.value = value;
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
  onended: (() => void) | null = null;
  started = Infinity;
  stopped = Infinity;
  ended = false;
  constructor(private readonly context: Context) {
    super();
  }
  start(time: number) {
    this.started = time;
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
  createDynamicsCompressor() {
    return Object.assign(new Node(), {
      threshold: new Parameter(),
      knee: new Parameter(),
      ratio: new Parameter(),
      attack: new Parameter(),
      release: new Parameter(),
    });
  }
  createBuffer(_channels: number, length: number, rate: number) {
    const samples = new Float32Array(length);
    return {
      duration: length / rate,
      copyToChannel: (pcm: Float32Array) => samples.set(pcm),
      samples,
    };
  }
  createBufferSource() {
    const source = new Source(this);
    this.sources.push(source);
    return source;
  }
  advance(seconds: number) {
    this.currentTime += seconds;
    for (const source of this.sources)
      if (
        !source.ended &&
        this.currentTime >=
          Math.min(source.stopped, source.started + (source.buffer?.duration ?? 0))
      ) {
        source.ended = true;
        source.onended?.();
      }
  }
  active() {
    return this.sources.filter((source) => !source.ended && source.stopped > this.currentTime);
  }
}

beforeEach(() => vi.stubGlobal('AudioContext', Context));
afterEach(() => vi.unstubAllGlobals());

describe('bounded steppe audio playback', () => {
  it('requires a gesture, gates world sounds, permits purchase cues, and cancels existing voices on pause and mute', () => {
    const audio = new GameAudio();
    expect(audio.play('shoot')).toBe(false);
    audio.unlock();
    const context = Context.latest;
    expect(audio.play('shoot')).toBe(false);
    audio.setPlaying(true);
    expect(audio.play('shoot')).toBe(true);
    expect(audio.play('shoot')).toBe(false);
    context.advance(0.1);
    expect(audio.play('shoot')).toBe(true);
    audio.setPlaying(false);
    expect(audio.play('shoot')).toBe(false);
    context.advance(0.02);
    expect(context.active()).toHaveLength(0);
    expect(context.sources.every((source) => source.disconnect.mock.calls.length > 0)).toBe(true);
    expect(audio.play('build')).toBe(true);
    audio.muted = true;
    context.advance(0.02);
    expect(context.active()).toHaveLength(0);
    expect(audio.play('research')).toBe(false);
    audio.muted = false;
    audio.unlock();
    expect(Context.latest).toBe(context);
    expect(audio.play('research')).toBe(true);
    audio.destroy();
    expect(context.state).toBe('closed');
    expect(audio.play('build')).toBe(false);
  });

  it('caps voices under a burst, preserves important signals, and releases every source on reset', () => {
    const audio = new GameAudio();
    audio.unlock();
    audio.setPlaying(true);
    const context = Context.latest;
    for (const kind of SOUND_KINDS.filter((kind) => kind !== 'victory')) {
      audio.play(kind);
      expect(context.active().length).toBeLessThanOrEqual(16);
    }
    expect(audio.play('victory')).toBe(true);
    expect(context.active().length).toBeLessThanOrEqual(16);
    audio.reset();
    expect(context.active()).toHaveLength(0);
    expect(context.sources.every((source) => source.disconnect.mock.calls.length > 0)).toBe(true);
    audio.setPlaying(true);
    expect(audio.play('shoot')).toBe(true);
    audio.destroy();
  });

  it('drives hoof cadence from active movement, gallops faster, and does not catch up after a menu', () => {
    const ride = (speed: number): number => {
      const audio = new GameAudio();
      audio.unlock();
      audio.setPlaying(true);
      const context = Context.latest;
      const state = {
        speed,
        galloping: speed > 190,
        caravan: false,
        region: 0,
        listener: { x: 0, y: 0 },
        camp: { x: 0, y: 0 },
      };
      for (let i = 0; i < 30; i++) {
        audio.update(0.05, state);
        context.advance(0.05);
      }
      const beats = context.sources.length;
      audio.setPlaying(false);
      context.advance(60);
      audio.update(60, state);
      expect(context.sources).toHaveLength(beats);
      audio.setPlaying(true);
      audio.update(0.05, state);
      expect(context.sources).toHaveLength(beats + 1);
      audio.destroy();
      return beats;
    };
    expect(ride(570)).toBeGreaterThan(ride(190));
  });

  it('keeps audio optional when no device or Web Audio API is available', () => {
    vi.stubGlobal('AudioContext', undefined);
    const unavailable = new GameAudio();
    expect(() => unavailable.unlock()).not.toThrow();
    expect(unavailable.play('build')).toBe(false);
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('No device');
        }
      },
    );
    const failed = new GameAudio();
    expect(() => failed.unlock()).not.toThrow();
    expect(() => failed.destroy()).not.toThrow();
    expect(failed.play('build')).toBe(false);
  });
});
