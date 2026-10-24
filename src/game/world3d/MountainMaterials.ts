import Phaser from 'phaser';
import * as THREE from 'three';
import { MOUNTAIN_TERRAIN_ART } from '../assets/painterlyArt';
import type { WorldGeometry } from './mountainGeometry';

export const WORLD_DEBUG_MODES = [
  'off',
  'wireframe',
  'elevation',
  'normals',
  'slope',
  'traversal',
  'chunks',
  'collision',
] as const;
export type WorldDebugMode = (typeof WORLD_DEBUG_MODES)[number];

/** Reuses painted textures; all elevation, walls, lighting and shadows come from geometry. */
export class MountainMaterials {
  readonly surface: THREE.MeshLambertMaterial;
  readonly wall: THREE.MeshLambertMaterial;
  readonly debug = { value: 0 };
  private readonly textures: THREE.Texture[] = [];

  constructor(scene: Phaser.Scene) {
    const texture = (key: string): THREE.Texture => {
      const image = scene.textures.get(key).getSourceImage() as HTMLImageElement;
      const map = new THREE.Texture(image);
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.colorSpace = THREE.SRGBColorSpace;
      map.needsUpdate = true;
      this.textures.push(map);
      return map;
    };
    const maps = {
      meadow: { value: texture(MOUNTAIN_TERRAIN_ART.materials.grassland.texture!) },
      soil: { value: texture(MOUNTAIN_TERRAIN_ART.materials['rocky-soil'].texture!) },
      stone: { value: texture(MOUNTAIN_TERRAIN_ART.materials.stone.texture!) },
      snow: { value: texture(MOUNTAIN_TERRAIN_ART.materials.snow.texture!) },
      worldDebug: this.debug,
    };
    const make = (wall: boolean): THREE.MeshLambertMaterial => {
      const material = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, maps);
        shader.uniforms.isWall = { value: wall ? 1 : 0 };
        shader.vertexShader =
          `attribute vec4 weightsA; attribute vec3 weightsB; attribute float contact;
          varying vec3 worldPoint; varying vec3 worldNormal; varying vec4 materialA; varying vec3 materialB; varying float occlusion;\n${shader.vertexShader}`.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            worldPoint = position; worldNormal = normal; materialA=weightsA; materialB=weightsB; occlusion=contact;`,
          );
        shader.fragmentShader =
          `uniform sampler2D meadow; uniform sampler2D soil; uniform sampler2D stone; uniform sampler2D snow;
          uniform int worldDebug; uniform int isWall;
          varying vec3 worldPoint; varying vec3 worldNormal; varying vec4 materialA; varying vec3 materialB; varying float occlusion;
          vec3 painted(sampler2D map, vec2 uv) {
            return mix(texture2D(map,uv).rgb, texture2D(map,vec2(-uv.y,uv.x)*0.71+0.37).rgb,0.28);
          }
          \n${shader.fragmentShader}`.replace(
            '#include <color_fragment>',
            `#include <color_fragment>
            vec3 n = normalize(worldNormal);
            vec3 tri = pow(abs(n),vec3(5.0)); tri /= max(0.001,tri.x+tri.y+tri.z);
            vec2 uv = worldPoint.xz / 815.0;
            vec3 grass=painted(meadow,uv);
            vec3 dirt=painted(soil,uv);
            vec3 rock=(painted(stone,worldPoint.zy/430.0)*tri.x + painted(stone,worldPoint.xz/430.0)*tri.y + painted(stone,worldPoint.xy/430.0)*tri.z)*vec3(0.63,0.76,0.82);
            vec3 white=painted(snow,uv)*vec3(0.94,0.97,1.0);
            float sum=dot(materialA,vec4(1.0))+dot(materialB,vec3(1.0));
            vec3 paintedColor=(grass*materialA.x+dirt*materialA.y+rock*materialA.z+grass*vec3(0.75,0.84,0.78)*materialA.w+
              white*materialB.x+white*vec3(0.67,0.84,0.91)*materialB.y+rock*materialB.z)/max(0.001,sum);
            if(isWall==1) paintedColor=rock;
            diffuseColor.rgb *= paintedColor*occlusion;
            if(worldDebug==2) diffuseColor.rgb=mix(vec3(0.08,0.28,0.45),vec3(1.0,0.85,0.4),clamp((worldPoint.y-230.0)/800.0,0.0,1.0));
            if(worldDebug==3) diffuseColor.rgb=n*0.5+0.5;
            if(worldDebug==4) diffuseColor.rgb=mix(vec3(0.13,0.65,0.48),vec3(0.85,0.13,0.1),1.0-n.y);
            if(worldDebug==5 || worldDebug==7) diffuseColor.rgb=n.y<0.76?vec3(0.85,0.16,0.1):vec3(0.1,0.75,0.65);
          `,
          );
      };
      material.customProgramCacheKey = () => `mountain-painted-${wall}`;
      return material;
    };
    this.surface = make(false);
    this.wall = make(true);
  }

  setDebug(mode: WorldDebugMode): void {
    this.debug.value = WORLD_DEBUG_MODES.indexOf(mode);
    this.surface.wireframe = this.wall.wireframe = mode === 'wireframe';
  }

  geometry(data: WorldGeometry): THREE.BufferGeometry {
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
    geometry.computeBoundingSphere();
    return geometry;
  }

  destroy(): void {
    this.surface.dispose();
    this.wall.dispose();
    for (const texture of this.textures) texture.dispose();
  }
}
