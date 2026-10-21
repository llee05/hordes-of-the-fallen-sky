/** Tiny synthesized sounds. Created only after a user gesture; no audio downloads. */
export class GameAudio {
  private context?: AudioContext;
  muted = false;

  unlock(): void {
    this.context ??= new AudioContext();
    void this.context.resume().catch(() => undefined);
  }

  play(kind: 'shoot' | 'gem' | 'hit' | 'level' | 'dash'): void {
    if (this.muted || !this.context || this.context.state !== 'running') return;
    const notes = {
      shoot: [280, 90, 0.045, 0.016],
      gem: [900, 1400, 0.07, 0.025],
      hit: [100, 35, 0.15, 0.07],
      level: [440, 880, 0.35, 0.06],
      dash: [160, 55, 0.12, 0.035],
    } as const;
    const [start, end, duration, volume] = notes[kind];
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }

  destroy(): void {
    void this.context?.close();
  }
}
