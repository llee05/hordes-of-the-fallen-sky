import Phaser from 'phaser';
import * as THREE from 'three';
import { MOUNTAIN_TERRAIN_ART } from '../assets/painterlyArt';
import type { WorldGeometry } from './mountainGeometry';
import type { TerrainNavigation } from '../terrain/TerrainNavigation';
import { WORLD_DEBUG_MODES, type WorldDebugMode } from './worldProjection';
import { TERRAIN_COLOR, TERRAIN_SAMPLING } from './terrainShader';
import type { ScenePalette } from '../data/worldRegions';
export { WORLD_DEBUG_MODES, type WorldDebugMode } from './worldProjection';

/** Reuses painted textures; all elevation, walls, lighting and shadows come from geometry. */
export class MountainMaterials {
  readonly surface: THREE.MeshLambertMaterial;
  readonly wall: THREE.MeshLambertMaterial;
  readonly debug = { value: 0 };
  private readonly textures: THREE.Texture[] = [];

  constructor(scene: Phaser.Scene, palette?: ScenePalette, anisotropy = 1) {
    const texture = (key: string): THREE.Texture => {
      const image = scene.textures.get(key).getSourceImage() as HTMLImageElement;
      const map = new THREE.Texture(image);
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = anisotropy;
      map.minFilter = THREE.LinearMipmapLinearFilter;
      map.magFilter = THREE.LinearFilter;
      map.needsUpdate = true;
      this.textures.push(map);
      return map;
    };
    const tint = (color: number | undefined, reference: number) => {
      const ratio = new THREE.Color(color ?? reference);
      const base = new THREE.Color(reference);
      ratio.setRGB(ratio.r / base.r, ratio.g / base.g, ratio.b / base.b);
      return ratio.setRGB(
        Math.max(0.7, Math.min(1.3, ratio.r)),
        Math.max(0.7, Math.min(1.3, ratio.g)),
        Math.max(0.7, Math.min(1.3, ratio.b)),
      );
    };
    const maps = {
      meadow: {
        value: texture(
          palette ? 'tapestry-meadow' : MOUNTAIN_TERRAIN_ART.materials.grassland.texture!,
        ),
      },
      dryMeadow: { value: texture('ground') },
      soil: { value: texture(MOUNTAIN_TERRAIN_ART.materials['rocky-soil'].texture!) },
      stone: {
        value: texture(palette ? 'tapestry-stone' : MOUNTAIN_TERRAIN_ART.materials.stone.texture!),
      },
      snow: { value: texture(MOUNTAIN_TERRAIN_ART.materials.snow.texture!) },
      worldDebug: this.debug,
      grassTint: { value: tint(palette?.grass, 0xa3ad69) },
      soilTint: { value: tint(palette?.soil, 0xc3a574) },
      rockTint: { value: tint(palette?.rock, 0x8d8f85) },
      snowTint: { value: tint(palette?.snow, 0xe4e9df) },
    };
    const make = (wall: boolean): THREE.MeshLambertMaterial => {
      const material = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, maps);
        shader.uniforms.isWall = { value: wall ? 1 : 0 };
        shader.vertexShader =
          `attribute vec4 weightsA; attribute vec3 weightsB; attribute float contact; attribute float blocked; varying float traversal;
          varying vec3 worldPoint; varying vec3 worldNormal; varying vec4 materialA; varying vec3 materialB; varying float occlusion;\n${shader.vertexShader}`.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            worldPoint = position; worldNormal = normal; materialA=weightsA; materialB=weightsB; occlusion=contact; traversal=blocked;`,
          );
        shader.fragmentShader = `${TERRAIN_SAMPLING}\n${shader.fragmentShader}`.replace(
          '#include <color_fragment>',
          `#include <color_fragment>\n${TERRAIN_COLOR}`,
        );
      };
      material.customProgramCacheKey = () => `living-steppe-materials-v4-${wall}`;
      return material;
    };
    this.surface = make(false);
    this.wall = make(true);
  }

  setDebug(mode: WorldDebugMode): void {
    this.debug.value = WORLD_DEBUG_MODES.indexOf(mode);
    this.surface.wireframe = this.wall.wireframe = mode === 'wireframe';
  }

  geometry(data: WorldGeometry, navigation: TerrainNavigation): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
    const a: number[] = [];
    const b: number[] = [];
    for (let i = 0; i < data.weights.length; i += 7) {
      a.push(...data.weights.slice(i, i + 4));
      b.push(...data.weights.slice(i + 4, i + 7));
    }
    geometry.setAttribute('weightsA', new THREE.Float32BufferAttribute(a, 4));
    geometry.setAttribute('weightsB', new THREE.Float32BufferAttribute(b, 3));
    geometry.setAttribute('contact', new THREE.Float32BufferAttribute(data.occlusion, 1));
    const blocked: number[] = [];
    for (let i = 0; i < data.positions.length; i += 9) {
      const x = (data.positions[i]! + data.positions[i + 3]! + data.positions[i + 6]!) / 3;
      const z = (data.positions[i + 2]! + data.positions[i + 5]! + data.positions[i + 8]!) / 3;
      const index =
        Math.floor(z / navigation.terrain.cellSize) * navigation.columns +
        Math.floor(x / navigation.terrain.cellSize);
      const value =
        x < 0 || z < 0 || x >= navigation.terrain.worldSize || z >= navigation.terrain.worldSize
          ? 1
          : (navigation.blocked[index] ?? 1);
      blocked.push(value, value, value);
    }
    geometry.setAttribute('blocked', new THREE.Float32BufferAttribute(blocked, 1));
    geometry.computeBoundingSphere();
    return geometry;
  }

  destroy(): void {
    this.surface.dispose();
    this.wall.dispose();
    for (const texture of this.textures) texture.dispose();
  }
}
