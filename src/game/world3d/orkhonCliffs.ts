import type Phaser from 'phaser';
import * as THREE from 'three';
import {
  ORKHON_CLIFF_FACE_WIDTH,
  ORKHON_CLIFF_FACES,
  ORKHON_KIT_ATLAS,
} from '../assets/orkhonValleyArt';
import { ORKHON_VALLEY } from '../data/orkhonValley';
import { WORLD_REGIONS } from '../data/worldRegions';
import { WORLD_3D } from './worldProjection';

/**
 * World units per source pixel along an Orkhon cliff. A band's rows span the full rise; columns
 * keep that painted pixel size on screen for a wall facing the fixed camera.
 */
export function cliffFacePixel(rise = ORKHON_VALLEY.rise): number {
  const tallest = Math.max(...ORKHON_CLIFF_FACES.map((face) => face.height));
  return (rise * Math.cos((WORLD_3D.angle * Math.PI) / 180)) / tallest;
}

const kitTextures = new WeakMap<object, THREE.Texture>();

/**
 * The terrain kit atlas as one texture shared by the cliff walls and the overlay cutouts, so it is
 * uploaded once. It is mipmapped and anisotropically filtered: walls and cutouts are often drawn
 * smaller than painted, and their texels are then averaged instead of skipped (shimmer). Frames
 * have 16 padding texels with 4 extruded (`scripts/cut-orkhon-terrain-kit.mjs`), so filtering
 * stays inside each frame down to mip level 3.
 */
export function orkhonKitTexture(scene: Phaser.Scene): THREE.Texture {
  const image = scene.textures.get(ORKHON_KIT_ATLAS).getSourceImage() as HTMLImageElement;
  let texture = kitTextures.get(image);
  if (!texture) {
    texture = new THREE.Texture(image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = WORLD_3D.anisotropy;
    texture.needsUpdate = true;
    kitTextures.set(image, texture);
  }
  return texture;
}

/**
 * Shader inputs for the painted Orkhon cliff walls: the shared kit texture and each face band's
 * source rectangle in atlas pixels. Without a scene the uniforms are inert placeholders.
 */
export function cliffFaceUniforms(
  scene?: Phaser.Scene,
  rise = ORKHON_VALLEY.rise,
  floor = WORLD_REGIONS['orkhon-valley'].floor,
) {
  const faces = ORKHON_CLIFF_FACES.map(() => new THREE.Vector4());
  let atlas = new THREE.Texture();
  const size = new THREE.Vector2(1, 1);
  if (scene) {
    const source = scene.textures.get(ORKHON_KIT_ATLAS);
    const image = source.getSourceImage() as HTMLImageElement;
    atlas = orkhonKitTexture(scene);
    size.set(image.width, image.height);
    ORKHON_CLIFF_FACES.forEach((face, i) => {
      const frame = source.get(face.sprite);
      faces[i]!.set(frame.cutX + face.x, frame.cutY + face.y, face.height, 0);
    });
  }
  return {
    cliffAtlas: { value: atlas },
    cliffAtlasSize: { value: size },
    cliffFaces: { value: faces },
    cliffFaceWidth: { value: ORKHON_CLIFF_FACE_WIDTH },
    cliffPixel: { value: cliffFacePixel(rise) },
    cliffRise: { value: rise },
    cliffTop: { value: floor + rise },
  };
}
