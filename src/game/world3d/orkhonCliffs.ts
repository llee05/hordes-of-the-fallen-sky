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

/**
 * Shader inputs for the painted Orkhon cliff walls: the terrain kit atlas and each face band's source
 * rectangle in atlas pixels. Without a scene the uniforms are inert placeholders.
 */
export function cliffFaceUniforms(scene?: Phaser.Scene) {
  const faces = ORKHON_CLIFF_FACES.map(() => new THREE.Vector4());
  let atlas = new THREE.Texture();
  const size = new THREE.Vector2(1, 1);
  if (scene) {
    const source = scene.textures.get(ORKHON_KIT_ATLAS);
    const image = source.getSourceImage() as HTMLImageElement;
    atlas = new THREE.Texture(image);
    atlas.colorSpace = THREE.SRGBColorSpace;
    atlas.minFilter = THREE.LinearFilter;
    atlas.magFilter = THREE.LinearFilter;
    atlas.generateMipmaps = false;
    atlas.needsUpdate = true;
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
    cliffPixel: { value: cliffFacePixel() },
    cliffRise: { value: ORKHON_VALLEY.rise },
    cliffTop: { value: WORLD_REGIONS['orkhon-valley'].floor + ORKHON_VALLEY.rise },
  };
}
