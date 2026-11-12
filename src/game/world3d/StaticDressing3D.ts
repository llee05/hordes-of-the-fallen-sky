import type Phaser from 'phaser';
import * as THREE from 'three';
import { ORKHON_KIT_ATLAS } from '../assets/orkhonValleyArt';
import type { MountainHeightfield } from './MountainHeightfield';
import type { SceneDressing } from './sceneDressing';

interface Entry {
  prop: SceneDressing;
  frame: Phaser.Textures.Frame;
}

interface Batch {
  entries: Entry[];
  geometry: THREE.BufferGeometry;
  material: THREE.MeshBasicMaterial;
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
}

/**
 * Static authored scenery uses one immutable quad batch per atlas instead of visiting hundreds of
 * Phaser images every frame. Quads are rebuilt only when the camera pitch changes.
 */
export class StaticDressing3D {
  readonly group = new THREE.Group();
  private readonly batches: Batch[] = [];
  private readonly textures = new Map<string, THREE.Texture>();
  private pitch = Number.NaN;

  constructor(
    scene: Phaser.Scene,
    private readonly terrain: MountainHeightfield,
    props: readonly SceneDressing[],
  ) {
    this.group.name = 'static-authored-dressing';
    const groups = new Map<string, Entry[]>();
    for (const prop of props) {
      const key = `${prop.texture}:${prop.shadow ? 'shadow' : 'plain'}`;
      const entries = groups.get(key) ?? [];
      entries.push({ prop, frame: scene.textures.get(prop.texture).get(prop.frame) });
      groups.set(key, entries);
    }
    for (const [key, entries] of groups) {
      const [textureKey, shadow] = key.split(':') as [string, 'shadow' | 'plain'];
      const texture = this.texture(scene, textureKey);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.06,
        depthWrite: true,
        side: THREE.DoubleSide,
      });
      const geometry = new THREE.BufferGeometry();
      const uv = new Float32Array(entries.length * 4 * 2);
      const indices: number[] = [];
      for (let index = 0; index < entries.length; index++) {
        const { prop, frame } = entries[index]!;
        const left = prop.flip ? frame.u1 : frame.u0;
        const right = prop.flip ? frame.u0 : frame.u1;
        uv.set(
          [left, 1 - frame.v0, right, 1 - frame.v0, right, 1 - frame.v1, left, 1 - frame.v1],
          index * 8,
        );
        const vertex = index * 4;
        indices.push(vertex, vertex + 1, vertex + 2, vertex, vertex + 2, vertex + 3);
      }
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(entries.length * 12), 3),
      );
      geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geometry.setIndex(indices);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `static-dressing-${textureKey}`;
      mesh.frustumCulled = false;
      mesh.castShadow = shadow === 'shadow';
      if (mesh.castShadow)
        mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
          map: texture,
          alphaTest: 0.1,
          depthPacking: THREE.RGBADepthPacking,
        });
      this.group.add(mesh);
      this.batches.push({ entries, geometry, material, mesh });
    }
  }

  private texture(scene: Phaser.Scene, key: string): THREE.Texture {
    const cached = this.textures.get(key);
    if (cached) return cached;
    const texture = new THREE.Texture(scene.textures.get(key).getSourceImage() as TexImageSource);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mipmaps = key === ORKHON_KIT_ATLAS;
    texture.minFilter = mipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = mipmaps;
    texture.needsUpdate = true;
    this.textures.set(key, texture);
    return texture;
  }

  update(camera: THREE.OrthographicCamera): void {
    const pitch = Math.acos(Math.max(-1, Math.min(1, camera.matrixWorld.elements[5]!)));
    if (Math.abs(pitch - this.pitch) < 0.0001) return;
    this.pitch = pitch;
    const basis = camera.matrixWorld.elements;
    for (const { entries, geometry } of this.batches) {
      const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let index = 0; index < entries.length; index++) {
        const { prop, frame } = entries[index]!;
        const width = prop.width;
        const height = (frame.realHeight / frame.realWidth) * width * prop.heightScale;
        const originY = prop.originY ?? 0.9;
        const ground =
          this.terrain.actorHeight(prop.x, prop.z) * this.terrain.region.biome.heightScale + 2;
        const corners = [
          [-width / 2, -height * originY],
          [width / 2, -height * originY],
          [width / 2, height * (1 - originY)],
          [-width / 2, height * (1 - originY)],
        ] as const;
        for (let corner = 0; corner < corners.length; corner++) {
          const [dx, dy] = corners[corner]!;
          positions.setXYZ(
            index * 4 + corner,
            prop.x + dx * basis[0]! - dy * basis[4]!,
            ground + dx * basis[1]! - dy * basis[5]!,
            prop.z + dx * basis[2]! - dy * basis[6]!,
          );
        }
      }
      positions.needsUpdate = true;
      geometry.computeBoundingSphere();
    }
  }

  destroy(): void {
    for (const { geometry, material, mesh } of this.batches) {
      geometry.dispose();
      material.dispose();
      mesh.customDepthMaterial?.dispose();
    }
    for (const texture of this.textures.values()) texture.dispose();
    this.group.removeFromParent();
  }
}
