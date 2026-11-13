import Phaser from 'phaser';
import * as THREE from 'three';
import { MOUNTAIN_TERRAIN_ART } from '../assets/painterlyArt';
import { ORKHON_TILE_WORLD_SIZE, orkhonTileKey, type OrkhonTile } from '../assets/orkhonValleyArt';
import type { WorldGeometry } from './mountainGeometry';
import type { TerrainNavigation } from '../terrain/TerrainNavigation';
import { WORLD_DEBUG_MODES, type WorldDebugMode } from './worldProjection';
import { cliffFaceUniforms } from './orkhonCliffs';
import { terrainShaderSource } from './terrainShader';
import type { ScenePalette } from '../data/worldRegions';
import type { ComposedTerrain } from './ComposedTerrain';
import { ALTAN_OVOO_GRASS_FALLBACK } from './altanOvooPaintedGround';
import { EEJ_KHAIRKHAN_GRANITE_FALLBACK } from './eejKhairkhanPaintedGround';
import { bakeOrkhonGroundMask, ORKHON_GROUND_MASK, orkhonRampUniforms } from './orkhonGround';
import {
  PAINTED_GROUND_QUADRANTS,
  paintedGroundWorldBounds,
  type PaintedGroundDefinition,
} from './paintedGround';
export { WORLD_DEBUG_MODES, type WorldDebugMode } from './worldProjection';

/** Reuses painted textures; all elevation, walls, lighting and shadows come from geometry. */
export class MountainMaterials {
  readonly surface: THREE.MeshLambertMaterial;
  readonly wall: THREE.MeshLambertMaterial;
  readonly bedTexture: THREE.Texture;
  /** Supplied calm-flow and rapids tiles for authored rivers. */
  readonly waterTextures?: readonly [THREE.Texture, THREE.Texture];
  readonly debug = { value: 0 };
  readonly samplingDetail = { value: 1 };
  private readonly textures: THREE.Texture[] = [];

  constructor(
    scene: Phaser.Scene,
    palette?: ScenePalette,
    anisotropy = 1,
    /** Authored terrain using the shared masks, painted cliffs and tiled fallback. */
    authoredTerrain?: ComposedTerrain,
    /** Optional four-quadrant macro painting projected over the authored geometry. */
    paintedGround?: PaintedGroundDefinition,
  ) {
    const texture = (key: string, repeat = true, srgb = true): THREE.Texture => {
      const image = scene.textures.get(key).getSourceImage() as HTMLImageElement;
      const map = new THREE.Texture(image);
      map.wrapS = map.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
      map.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
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
    // Orkhon Valley uses the terrain kit tiles untinted, at one shared painted scale.
    const authored = authoredTerrain !== undefined;
    const altan = authoredTerrain?.region.scene.id === 'altan-ovoo';
    const otgontenger = authoredTerrain?.region.scene.id === 'otgontenger';
    const eejKhairkhan = authoredTerrain?.region.scene.id === 'eej-khairkhan';
    const belukha = authoredTerrain?.region.scene.id === 'belukha';
    const khanTengri = authoredTerrain?.region.scene.id === 'khan-tengri';
    const localFallback = altan
      ? ALTAN_OVOO_GRASS_FALLBACK
      : eejKhairkhan
        ? EEJ_KHAIRKHAN_GRANITE_FALLBACK
        : undefined;
    const tile = (name: OrkhonTile) => texture(orkhonTileKey(name));
    // Authored channels: calm valley grass with regions of the olive variant, rare sun-cured
    // straw, the darker plateau moss on top, trail dirt on paths and ramps, scree at cliff feet.
    const meadowTex = authored
      ? localFallback
        ? texture(localFallback.texture)
        : otgontenger
          ? texture('ground-mount-otgontenger')
          : belukha
            ? texture('ground-mount-belukha')
            : khanTengri
              ? texture('ground-khan-tengri')
              : tile('valleyCalm')
      : texture(palette ? 'tapestry-meadow' : MOUNTAIN_TERRAIN_ART.materials.grassland.texture!);
    const dryMeadowTex = authored
      ? localFallback || otgontenger || khanTengri
        ? meadowTex
        : tile('valleyStraw')
      : texture('ground');
    const soilTex = authored
      ? tile('trailDirt')
      : texture(MOUNTAIN_TERRAIN_ART.materials['rocky-soil'].texture!);
    const stoneTex = authored
      ? tile('screeGravel')
      : texture(palette ? 'tapestry-stone' : MOUNTAIN_TERRAIN_ART.materials.stone.texture!);
    const gravelTex = authored ? stoneTex : soilTex;
    // Authored channel 4 is the upper-tier ground. Altan remains warm olive; Otgontenger uses
    // its existing alpine swatch for lower ground and the bundled snow swatch on the high bench.
    const snowTex = authored
      ? localFallback || khanTengri
        ? meadowTex
        : otgontenger
          ? texture('ground-khan-tengri')
          : tile('plateauMoss')
      : texture(MOUNTAIN_TERRAIN_ART.materials.snow.texture!);
    const meadowAltTex = authored
      ? localFallback || otgontenger || khanTengri
        ? meadowTex
        : tile('valleyOlive')
      : meadowTex;
    const paintedGroundTextures =
      authored && paintedGround
        ? {
            quadrants: PAINTED_GROUND_QUADRANTS.map((quadrant) =>
              texture(paintedGround.quadrants[quadrant].texture, false),
            ),
            detail: texture(paintedGround.detail.texture, true, false),
          }
        : undefined;
    this.bedTexture = authored ? gravelTex : soilTex;
    this.waterTextures =
      authored && !belukha && !khanTengri ? [tile('riverChannel'), tile('riverRapids')] : undefined;
    const authoredMaps = authoredTerrain
      ? this.authoredUniforms(
          scene,
          authoredTerrain,
          meadowAltTex,
          paintedGround,
          paintedGroundTextures,
        )
      : undefined;

    const maps = {
      meadow: { value: meadowTex },
      dryMeadow: { value: dryMeadowTex },
      soil: { value: soilTex },
      gravelMap: { value: gravelTex },
      stone: { value: stoneTex },
      snow: { value: snowTex },
      // Generated places keep the inert uniforms their unchanged program declares.
      ...(authoredMaps ?? {
        meadowAlt: { value: meadowAltTex },
        patchMap: { value: snowTex },
        authored: { value: 0 },
        tileSize: { value: ORKHON_TILE_WORLD_SIZE },
        ...cliffFaceUniforms(),
      }),
      worldDebug: this.debug,
      samplingDetail: this.samplingDetail,
      grassTint: { value: tint(palette?.grass, 0xa3ad69) },
      soilTint: { value: tint(palette?.soil, 0xc3a574) },
      rockTint: { value: tint(palette?.rock, 0x8d8f85) },
      snowTint: { value: tint(palette?.snow, 0xe4e9df) },
      cliffTint: {
        value: new THREE.Color(palette?.rock ?? 0xffffff).multiplyScalar(khanTengri ? 1.55 : 1),
      },
      cliffTintAmount: { value: khanTengri ? 0.78 : 0 },
    };
    const source = terrainShaderSource(
      authoredTerrain
        ? {
            ramps: authoredTerrain.region.scene.ground?.ramps?.length ?? 0,
            paintedGround: paintedGroundTextures !== undefined,
          }
        : undefined,
    );
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
        shader.fragmentShader = `${source.sampling}\n${shader.fragmentShader}`.replace(
          '#include <color_fragment>',
          `#include <color_fragment>\n${source.color}`,
        );
      };
      // Generated places keep their program; Orkhon's carries its own code.
      material.customProgramCacheKey = () =>
        authored
          ? paintedGroundTextures
            ? `authored-terrain-painted-v3-${paintedGround?.query}-${wall}`
            : `authored-terrain-v5-${wall}`
          : `living-steppe-materials-v7-${wall}`;
      return material;
    };
    this.surface = make(false);
    this.wall = make(true);
  }

  /**
   * Authored-level uniforms: grass variants, painted cliff bands, the baked ground mask (worn
   * earth, dry-grass potential, ramp neighbourhoods), graded ramps and optional macro paintings.
   */
  private authoredUniforms(
    scene: Phaser.Scene,
    terrain: ComposedTerrain,
    meadowAlt: THREE.Texture,
    definition?: PaintedGroundDefinition,
    paintedGround?: { quadrants: THREE.Texture[]; detail: THREE.Texture },
  ) {
    const ground = terrain.region.scene;
    const size = ORKHON_GROUND_MASK.size;
    const mask = new THREE.DataTexture(bakeOrkhonGroundMask(terrain), size, size);
    mask.minFilter = mask.magFilter = THREE.LinearFilter;
    mask.wrapS = mask.wrapT = THREE.ClampToEdgeWrapping;
    mask.generateMipmaps = false;
    mask.needsUpdate = true;
    const plateauRise = Math.max(1, ...ground.shelves.map((shelf) => shelf.rise));
    const cliffs = cliffFaceUniforms(scene, plateauRise, ground.floor);
    this.textures.push(mask, cliffs.cliffAtlas.value);
    const ramps = orkhonRampUniforms(terrain);
    const vectors = (rows: number[][]) =>
      (rows.length ? rows : [[-1e5, -1e5, 1, 0]]).map((row) => new THREE.Vector4(...row));
    const bounds = definition
      ? paintedGroundWorldBounds(definition, terrain.worldSize)
      : ([0, 0, terrain.worldSize, terrain.worldSize] as const);
    return {
      meadowAlt: { value: meadowAlt },
      tileSize: { value: ORKHON_TILE_WORLD_SIZE },
      ...cliffs,
      cliffTint: {
        value:
          ground.id === 'eej-khairkhan'
            ? new THREE.Vector3(1.3, 0.88, 0.72)
            : ground.id === 'bogd-khan-uul'
              ? new THREE.Vector3(0.78, 0.67, 0.5)
              : new THREE.Vector3(1, 1, 1),
      },
      groundMask: { value: mask },
      worldSize: { value: terrain.worldSize },
      floorHeight: { value: ground.floor },
      plateauRise: { value: plateauRise },
      rampAxis: { value: vectors(ramps.axis) },
      rampSize: { value: vectors(ramps.size.length ? ramps.size : [[1, 0, 0, 0]]) },
      ...(paintedGround
        ? {
            paintedGroundNW: { value: paintedGround.quadrants[0] },
            paintedGroundNE: { value: paintedGround.quadrants[1] },
            paintedGroundSW: { value: paintedGround.quadrants[2] },
            paintedGroundSE: { value: paintedGround.quadrants[3] },
            paintedGroundDetail: { value: paintedGround.detail },
            paintedGroundBounds: { value: new THREE.Vector4(...bounds) },
            paintedGroundFeather: { value: definition?.outerFeather ?? 170 },
          }
        : {}),
    };
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
