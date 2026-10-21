import Phaser from 'phaser';
import { GAME } from './config';
import { ArenaScene } from './scenes/ArenaScene';

export function createGame(parent: HTMLElement, scene: ArenaScene): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME.width,
    height: GAME.height,
    backgroundColor: '#b79a50',
    pixelArt: false,
    roundPixels: false,
    antialias: true,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: {
      default: 'arcade',
      arcade: { debug: false, gravity: { x: 0, y: 0 } },
    },
    input: { activePointers: 2 },
    scene: [scene],
  });
}
