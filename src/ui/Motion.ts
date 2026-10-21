/** Bounded, presentation-only feedback. Displayed values update immediately;
 * these animations never schedule actions or change the simulation. */
export class UIMotion {
  private readonly preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly running = new Map<HTMLElement, Animation>();
  private playing = false;

  constructor(private readonly root: HTMLElement) {
    this.preference.addEventListener('change', this.onPreference);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
    if (!playing) this.cancel();
  }

  change(element: HTMLElement, increasing: boolean): void {
    this.play(element, [
      { offset: 0, transform: 'none' },
      {
        offset: 0.35,
        transform: 'translateY(-2px) scale(1.1)',
        color: increasing ? '#fff0b6' : '#efb394',
      },
      { offset: 1, transform: 'none' },
    ]);
  }

  damage(element: HTMLElement): void {
    this.play(element, [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-2px)', offset: 0.2, borderColor: '#e4a17d' },
      { transform: 'translateX(2px)', offset: 0.45 },
      { transform: 'translateX(0)' },
    ]);
  }

  notice(element: HTMLElement): void {
    this.play(element, [
      { scale: '1' },
      { scale: '1.18', color: '#ffebae', offset: 0.4 },
      { scale: '1' },
    ]);
  }

  cancel(): void {
    for (const animation of this.running.values()) animation.cancel();
    this.running.clear();
  }

  destroy(): void {
    this.cancel();
    this.preference.removeEventListener('change', this.onPreference);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  private readonly onPreference = (): void => {
    if (this.preference.matches) this.cancel();
  };

  private readonly onVisibility = (): void => {
    if (document.hidden) this.cancel();
  };

  private play(element: HTMLElement, frames: Keyframe[]): void {
    if (
      !this.playing ||
      this.root.dataset.phase !== 'playing' ||
      this.preference.matches ||
      document.hidden ||
      this.running.has(element)
    )
      return;
    const animation = element.animate(frames, {
      duration: 380,
      easing: 'cubic-bezier(0.22, 0.75, 0.25, 1)',
    });
    this.running.set(element, animation);
    // Event handlers avoid rejected `finished` promises when a phase change
    // cancels feedback. Only one transient animation can exist per element.
    animation.onfinish = animation.oncancel = () => {
      if (this.running.get(element) === animation) this.running.delete(element);
    };
  }
}
