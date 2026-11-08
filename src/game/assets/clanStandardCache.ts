import Phaser from 'phaser';
import type { CharacterBanner } from '../../shared/characterProfile';
import { clanStandardAppearance, CLAN_STANDARD_CACHE_SLOT as SLOT } from './clanStandardAppearance';

export const PAINTED_ATLAS_CHANGED = 'painted-atlas-changed';
const KEY = 'steppe-classes-motion';
const FRAME = 'banner-composite';
// Unused space below the first row of small heraldry parts; no atlas growth.
const cachedProfiles = new WeakMap<Phaser.Textures.CanvasTexture, string>();

function canvasAtlas(scene: Phaser.Scene): Phaser.Textures.CanvasTexture {
  const original = scene.textures.get(KEY);
  if (original instanceof Phaser.Textures.CanvasTexture) return original;
  const source = original.getSourceImage() as HTMLImageElement;
  const frames = original.getFrameNames().map((name) => {
    const frame = original.get(name);
    return {
      name,
      x: frame.cutX,
      y: frame.cutY,
      w: frame.cutWidth,
      h: frame.cutHeight,
      width: frame.realWidth,
      height: frame.realHeight,
      trim: { x: frame.x, y: frame.y, w: frame.cutWidth, h: frame.cutHeight },
    };
  });
  // Runs before the first class actor/standard is created. Subsequent scene
  // restarts reuse this same CanvasTexture and its immutable painted parts.
  scene.textures.remove(KEY);
  const texture = scene.textures.createCanvas(KEY, source.width, source.height)!;
  texture.context.drawImage(source, 0, 0);
  for (const frame of frames) {
    texture
      .add(frame.name, 0, frame.x, frame.y, frame.w, frame.h)!
      .setTrim(frame.width, frame.height, frame.trim.x, frame.trim.y, frame.trim.w, frame.trim.h);
  }
  texture.add(FRAME, 0, SLOT.x, SLOT.y, SLOT.w, SLOT.h);
  return texture;
}

/** One profile-wide cached standard. Refreshes with unchanged choices do no
 * painting or GPU upload; ordinary frames only transform a single sprite. */
export function cachedClanStandard(scene: Phaser.Scene, banner?: CharacterBanner) {
  const appearance = clanStandardAppearance(banner);
  const profileKey = JSON.stringify(appearance);
  const texture = canvasAtlas(scene);
  if (cachedProfiles.get(texture) !== profileKey) {
    const composite = document.createElement('canvas');
    composite.width = SLOT.w;
    composite.height = SLOT.h;
    const target = composite.getContext('2d')!;
    const layer = document.createElement('canvas');
    layer.width = SLOT.w;
    layer.height = SLOT.h;
    const context = layer.getContext('2d')!;
    for (const [name, tint] of [
      [appearance.poleFrame, 0xffffff],
      [appearance.fieldFrame, appearance.fieldTint],
      [appearance.trimFrame, appearance.ornamentTint],
      [appearance.emblemFrame, appearance.ornamentTint],
    ] as const) {
      const frame = texture.get(name);
      const trim = { x: frame.x, y: frame.y, w: frame.cutWidth, h: frame.cutHeight };
      const draw = () =>
        context.drawImage(
          texture.canvas,
          frame.cutX,
          frame.cutY,
          frame.cutWidth,
          frame.cutHeight,
          trim.x / 2,
          trim.y / 2,
          trim.w / 2,
          trim.h / 2,
        );
      context.clearRect(0, 0, SLOT.w, SLOT.h);
      draw();
      if (tint !== 0xffffff) {
        context.globalCompositeOperation = 'multiply';
        context.fillStyle = `#${tint.toString(16).padStart(6, '0')}`;
        context.fillRect(0, 0, SLOT.w, SLOT.h);
        context.globalCompositeOperation = 'destination-in';
        draw();
        context.globalCompositeOperation = 'source-over';
      }
      target.drawImage(layer, 0, 0);
    }
    texture.context.clearRect(SLOT.x, SLOT.y, SLOT.w, SLOT.h);
    texture.context.drawImage(composite, SLOT.x, SLOT.y);
    texture.refresh();
    cachedProfiles.set(texture, profileKey);
    scene.events.emit(PAINTED_ATLAS_CHANGED, texture.canvas);
  }
  return { frame: FRAME, appearance };
}
