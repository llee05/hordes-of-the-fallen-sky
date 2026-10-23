import Phaser from 'phaser';
import { GAME } from '../config';
import { characterTexture, isCharacterKind, MOTION_SHEETS } from '../animation/CharacterMotion';
import type { SceneryProp } from '../data/landscapes';

/** Two motion atlases and one prop atlas keep painted actors on shared textures. */
const PROPS = new Set(['ger', 'cart', 'banner', 'sheep', 'rock', 'pillar']);
/** Scales the camp presentation around its world anchor, independently of combat. */
export const CAMP_VISUAL_SCALE = GAME.camp.visualScale;
export const ART_WIDTH: Readonly<Record<string, number>> = {
  worker: 30,
  packhorse: 58,
  player: 62,
  rider: 50,
  wolf: 45,
  shade: 52,
  earth: 72,
  ghost: 61,
  seer: 46,
  skybreaker: 160,
  ger: 144,
  cart: 110,
  banner: 62,
  sheep: 25,
  rock: 90,
  pillar: 72,
};

export function artTexture(name: string): [string, string?] {
  if (isCharacterKind(name)) return characterTexture(name);
  if (PROPS.has(name)) return ['steppe-props', name];
  return [name];
}

export function preloadPainterlyArt(scene: Phaser.Scene): void {
  const root = `${import.meta.env.BASE_URL}art/`;
  scene.load.image('ground', `${root}steppe-ground.png`);
  for (const sheet of MOTION_SHEETS) {
    const key = `steppe-${sheet}-motion`;
    scene.load.atlas(key, `${root}${key}.png`, `${root}${key}.json`);
  }
  scene.load.atlas('steppe-props', `${root}steppe-props.png`, `${root}steppe-props.json`);
  scene.load.atlas('steppe-scenery', `${root}steppe-scenery-v2.png`, `${root}steppe-scenery.json`);
}

export function sceneryImage(
  scene: Phaser.Scene,
  x: number,
  y: number,
  name: SceneryProp,
  width: number,
): Phaser.GameObjects.Image {
  const image = scene.add.image(x, y, 'steppe-scenery', name).setOrigin(0.5, 0.9);
  return image.setScale(width / image.width).setName(`scenery-${name}`);
}

export function paintedImage(
  scene: Phaser.Scene,
  x: number,
  y: number,
  name: string,
  width = ART_WIDTH[name] ?? 40,
): Phaser.GameObjects.Image {
  const image = scene.add.image(x, y, ...artTexture(name)).setOrigin(0.5, 0.9);
  return image.setScale(width / image.width);
}

/** Physics remains in world units, independent of atlas resolution or visual footprint. */
export function styleActor(
  sprite: Phaser.Physics.Arcade.Sprite,
  name: string,
  width: number,
  radius: number,
): void {
  sprite.setTexture(...artTexture(name)).setOrigin(0.5, 0.9);
  sprite.setScale(width / sprite.width);
  const localRadius = radius / sprite.scaleX;
  sprite.setCircle(localRadius, sprite.width / 2 - localRadius, sprite.height * 0.9 - localRadius);
  // setCircle uses the body's cached scale. Synchronize immediately so a newly
  // spawned or reused actor has the right world radius before the next step.
  sprite.body!.updateFromGameObject();
  sprite.setDepth(100 + sprite.y);
}

function canvasTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D) => void,
): void {
  if (scene.textures.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, width, height)!;
  draw(canvas.context);
  canvas.refresh();
}

/** Small brush marks and light effects are deterministic code-native textures. */
export function createPainterlyEffects(scene: Phaser.Scene): void {
  canvasTexture(scene, 'spark', 24, 24, (ctx) => {
    const light = ctx.createRadialGradient(12, 12, 0, 12, 12, 12);
    light.addColorStop(0, '#fff4ce');
    light.addColorStop(0.25, '#efdb9dbb');
    light.addColorStop(1, '#efdb9d00');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, 24, 24);
  });
  canvasTexture(scene, 'shadow', 96, 48, (ctx) => {
    ctx.scale(1, 0.5);
    const shade = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
    shade.addColorStop(0, '#333c2f55');
    shade.addColorStop(0.5, '#333c2f33');
    shade.addColorStop(1, '#333c2f00');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, 96, 96);
  });
  canvasTexture(scene, 'gem', 12, 16, (ctx) => {
    ctx.fillStyle = '#375c61';
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(11, 7);
    ctx.lineTo(6, 15);
    ctx.lineTo(1, 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8bd1cc';
    ctx.beginPath();
    ctx.moveTo(6, 1);
    ctx.lineTo(9, 7);
    ctx.lineTo(6, 13);
    ctx.lineTo(3, 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e5f3d4';
    ctx.beginPath();
    ctx.moveTo(6, 2);
    ctx.lineTo(6, 8);
    ctx.lineTo(3, 7);
    ctx.closePath();
    ctx.fill();
  });
  canvasTexture(scene, 'bolt', 12, 12, (ctx) => {
    ctx.strokeStyle = '#553b30';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(1, 11);
    ctx.lineTo(10, 2);
    ctx.stroke();
    ctx.fillStyle = '#f1e5b9';
    ctx.beginPath();
    ctx.moveTo(6, 2);
    ctx.lineTo(12, 0);
    ctx.lineTo(10, 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#527e8b';
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.lineTo(4, 11);
    ctx.stroke();
  });
  canvasTexture(scene, 'grass', 80, 40, (ctx) => {
    const colors = ['#c4a14e88', '#e1c17399', '#a38c4488', '#f0d28c77'];
    for (let i = 0; i < 24; i += 1) {
      const x = 8 + ((i * 17) % 62);
      const y = 29 + (i % 7);
      ctx.strokeStyle = colors[i % colors.length]!;
      ctx.lineWidth = 0.6 + (i % 3) * 0.45;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 3, y - 7, x + 10, y - 12 - (i % 9));
      ctx.stroke();
    }
  });
  canvasTexture(scene, 'flower', 42, 30, (ctx) => {
    for (let i = 0; i < 6; i += 1) {
      const x = 5 + ((i * 13) % 31);
      const y = 10 + ((i * 7) % 16);
      ctx.strokeStyle = '#8b8d4e';
      ctx.beginPath();
      ctx.moveTo(x, y + 8);
      ctx.lineTo(x + 2, y);
      ctx.stroke();
      ctx.fillStyle = '#e6d8aa';
      ctx.beginPath();
      ctx.ellipse(x + 2, y, 2.2, 1.5, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  canvasTexture(scene, 'dust', 64, 32, (ctx) => {
    ctx.scale(1, 0.5);
    const dust = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    dust.addColorStop(0, '#ead18e55');
    dust.addColorStop(1, '#d2b87900');
    ctx.fillStyle = dust;
    ctx.fillRect(0, 0, 64, 64);
  });
}
