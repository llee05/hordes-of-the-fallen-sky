import Phaser from 'phaser';
import { GAME } from './config';
import { ArenaScene } from './scenes/ArenaScene';

export function createGame(parent: HTMLElement, scene: ArenaScene): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME.width,
    height: GAME.height,
    backgroundColor: '#b79a50',
    pixelArt: false,
    roundPixels: false,
    antialias: true,
    // GameAudio owns the gesture-unlocked mixer; avoid an unused Phaser context.
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: {
      default: 'arcade',
      arcade: { debug: false, gravity: { x: 0, y: 0 } },
    },
    input: { activePointers: 2 },
    scene: [scene],
  });

  // Native window managers can resize the parent while Phaser's frame loop sleeps.
  // Track the actual surface independently so paused/title screens fit immediately.
  let observer: ResizeObserver | undefined;
  game.events.once(Phaser.Core.Events.READY, () => {
    const fitParent = (): void => {
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      if (width > 0 && height > 0 && (game.scale.width !== width || game.scale.height !== height)) {
        game.scale.getParentBounds();
        game.scale.resize(width, height);
      }
    };
    observer = new ResizeObserver(fitParent);
    observer.observe(parent);
    fitParent();
  });
  game.events.once(Phaser.Core.Events.DESTROY, () => observer?.disconnect());
  return game;
}
