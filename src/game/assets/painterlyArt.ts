import Phaser from 'phaser';
import { GAME } from '../config';
import { characterTexture, isCharacterKind, MOTION_SHEETS } from '../animation/CharacterMotion';
import { LANDSCAPES, type SceneryProp } from '../data/landscapes';
import type { TerrainArt } from '../terrain/types';

/** Two motion atlases and one prop atlas keep painted actors on shared textures. */
const PROPS = new Set(['ger', 'cart', 'banner', 'sheep', 'rock', 'pillar']);
/** Scales the camp presentation around its world anchor, independently of combat. */
export const CAMP_VISUAL_SCALE = GAME.camp.visualScale;
/** Reuse local painted ground swatches for blended slopes and cliff faces. */
export const MOUNTAIN_TERRAIN_ART: TerrainArt = {
  materials: {
    grassland: { texture: 'ground-mount-otgontenger', color: 0xa7ad72 },
    'rocky-soil': { texture: 'ground-eej-khairkhan', color: 0xb49672 },
    stone: { texture: 'ground-eej-khairkhan', tint: 0x96c0ec, color: 0x92958e },
    tundra: { texture: 'ground-mount-otgontenger', tint: 0xa8b59d, color: 0xa3ad9c },
    snow: { texture: 'ground-khan-tengri', color: 0xe2e9e8 },
  },
  cliff: { color: 0x81877a, rim: 0xc5c5aa },
  dressing: {
    rubble: { texture: 'steppe-props', frame: 'rock', width: 22, tint: 0x7e9dd0 },
    scrub: { texture: 'steppe-scenery', frame: 'reeds', width: 23, tint: 0xa9b58e },
    conifer: { texture: 'steppe-scenery', frame: 'pine', width: 50, tint: 0xc0c5a7 },
  },
};
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
  const tiles = new Set(Object.values(LANDSCAPES).map((landscape) => landscape.groundTile));
  for (const tile of tiles) {
    if (tile) scene.load.image(`ground-${tile}`, `${root}${tile}.png`);
  }
  for (const sheet of MOTION_SHEETS) {
    const key = `steppe-${sheet}-motion`;
    scene.load.atlas(key, `${root}${key}.png`, `${root}${key}.json`);
  }
  scene.load.atlas('steppe-props', `${root}steppe-props.png`, `${root}steppe-props.json`);
  scene.load.atlas('steppe-scenery', `${root}steppe-scenery-v2.png`, `${root}steppe-scenery.json`);
  scene.load.atlas(
    'steppe-ground-details',
    `${root}steppe-ground-details-v1.png`,
    `${root}steppe-ground-details-v1.json`,
  );
  scene.load.image('tapestry-meadow', `${root}tapestry-meadow-v3.png`);
  scene.load.image('tapestry-stone', `${root}tapestry-stone-v3.png`);
  scene.load.atlas(
    'tapestry-scenery',
    `${root}tapestry-scenery-v3.png`,
    `${root}tapestry-scenery-v3.json`,
  );
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

/** Small brush marks and combat effects are deterministic manuscript-styled textures. */
export function createPainterlyEffects(scene: Phaser.Scene): void {
  canvasTexture(scene, 'spark', 24, 24, (ctx) => {
    // Manuscript pigment splash with fine dark-ink radial strokes
    const wash = ctx.createRadialGradient(12, 12, 1, 12, 12, 11);
    wash.addColorStop(0, '#f2e6cc');
    wash.addColorStop(0.55, '#d9c8a5cc');
    wash.addColorStop(1, '#d9c8a500');
    ctx.fillStyle = wash;
    ctx.beginPath();
    ctx.arc(12, 12, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#43382ccc';
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + 0.25;
      ctx.beginPath();
      ctx.moveTo(12 + Math.cos(a) * 3, 12 + Math.sin(a) * 3);
      ctx.lineTo(12 + Math.cos(a) * 9.5, 12 + Math.sin(a) * 9.5);
      ctx.stroke();
    }
  });
  canvasTexture(scene, 'shadow', 96, 48, (ctx) => {
    ctx.scale(1, 0.5);
    const shade = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
    shade.addColorStop(0, '#43382c52');
    shade.addColorStop(0.55, '#43382c2e');
    shade.addColorStop(1, '#43382c00');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, 96, 96);
  });
  canvasTexture(scene, 'gem', 12, 16, (ctx) => {
    // Ink-outlined spirit talisman / hostile seal
    ctx.fillStyle = '#43382c';
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(11.5, 7.5);
    ctx.lineTo(6, 15.5);
    ctx.lineTo(0.5, 7.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8ba3b0';
    ctx.beginPath();
    ctx.moveTo(6, 1.6);
    ctx.lineTo(10, 7.5);
    ctx.lineTo(6, 13.8);
    ctx.lineTo(2, 7.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2e6cc';
    ctx.beginPath();
    ctx.moveTo(6, 2.4);
    ctx.lineTo(8.2, 7.5);
    ctx.lineTo(6, 11.5);
    ctx.lineTo(3.8, 7.5);
    ctx.closePath();
    ctx.fill();
  });
  canvasTexture(scene, 'bolt', 12, 12, (ctx) => {
    // Subtle parchment/ink motion trail + dark-ink outlined steppe arrow
    ctx.strokeStyle = '#e8d9b988';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(0.5, 11.5);
    ctx.lineTo(9.5, 2.5);
    ctx.stroke();
    ctx.strokeStyle = '#43382c';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(1, 11);
    ctx.lineTo(10, 2);
    ctx.stroke();
    // Fletching in terracotta & dusty blue
    ctx.strokeStyle = '#98614d';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0.5, 8);
    ctx.lineTo(3.5, 11);
    ctx.stroke();
    // Broadhead in light parchment with dark ink border
    ctx.fillStyle = '#e8d9b9';
    ctx.strokeStyle = '#43382c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(5.5, 2);
    ctx.lineTo(11.5, 0.5);
    ctx.lineTo(10, 6.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
  canvasTexture(scene, 'grass', 80, 40, (ctx) => {
    const colors = ['#7d896caa', '#ad824daa', '#43382c88', '#d9c8a599'];
    for (let i = 0; i < 18; i += 1) {
      const x = 8 + ((i * 19) % 62);
      const y = 30 + (i % 6);
      ctx.strokeStyle = colors[i % colors.length]!;
      ctx.lineWidth = 0.75 + (i % 2) * 0.45;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 2, y - 7, x + 8, y - 12 - (i % 8));
      ctx.stroke();
    }
  });
  canvasTexture(scene, 'flower', 42, 30, (ctx) => {
    const petals = ['#e8d9b9', '#98614d', '#ad824d'];
    for (let i = 0; i < 6; i += 1) {
      const x = 5 + ((i * 13) % 31);
      const y = 10 + ((i * 7) % 16);
      ctx.strokeStyle = '#43382c99';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(x, y + 8);
      ctx.lineTo(x + 2, y);
      ctx.stroke();
      ctx.fillStyle = petals[i % petals.length]!;
      ctx.beginPath();
      ctx.ellipse(x + 2, y, 2.3, 1.6, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  canvasTexture(scene, 'dust', 64, 32, (ctx) => {
    // Stylised manuscript wind/dust curl strokes on warm parchment wash
    ctx.scale(1, 0.5);
    const dust = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    dust.addColorStop(0, '#e8d9b977');
    dust.addColorStop(0.7, '#d9c8a538');
    dust.addColorStop(1, '#d9c8a500');
    ctx.fillStyle = dust;
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#43382c55';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(28, 32, 14, -0.6, 1.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(38, 28, 9, 0.4, 2.7);
    ctx.stroke();
  });
}
