import type Phaser from 'phaser';
import * as THREE from 'three';
import { riverPoint } from '../assets/riverGeometry';
import {
  ORKHON_ATLAS,
  ORKHON_BANK_SHORE,
  ORKHON_KIT_ATLAS,
  ORKHON_SPRITES,
  ORKHON_TILE_WORLD_SIZE,
  orkhonAtlasOf,
  orkhonTileKey,
  type OrkhonBank,
  type OrkhonSprite,
  type OrkhonSpriteMetrics,
} from '../assets/orkhonValleyArt';
import { ART_SPEC } from '../data/artSpec';
import { ORKHON_VALLEY } from '../data/orkhonValley';
import type { TerrainPoint } from '../terrain/types';
import type { ComposedTerrain } from './ComposedTerrain';
import { orkhonKitTexture } from './orkhonCliffs';
import { WORLD_3D } from './worldProjection';

type Vec3 = readonly [number, number, number];
export interface OverlayVertex {
  position: Vec3;
  /** Source pixel of the unflipped sprite; values outside the sprite are discarded. */
  pixel: readonly [number, number];
}
export interface OverlayPiece {
  sprite: OrkhonSprite;
  part: 'deck' | 'falls' | 'pool';
  flip: boolean;
  /** Triangle list. */
  vertices: readonly OverlayVertex[];
}

/** Row of `waterfall_foam_pool` where the falling curtains meet its churning water. */
const POOL_FOOT_ROW = 105;
/** Bank band depth in world units: the 92-pixel band at the shared tile scale. */
export const BANK_ACROSS = (92 / ART_SPEC.orkhon.tilePixels) * ORKHON_TILE_WORLD_SIZE;
const radians = (degrees: number) => (degrees * Math.PI) / 180;
const metricsOf = (sprite: OrkhonSprite): OrkhonSpriteMetrics => ORKHON_SPRITES[sprite];
const YAW = radians(WORLD_3D.yaw);
const PITCH = radians(WORLD_3D.angle);

/** Horizontal direction from the scene towards the fixed camera azimuth. */
export const CAMERA_DIRECTION: TerrainPoint = { x: Math.sin(YAW), y: Math.cos(YAW) };
/** Horizontal world direction that runs left to right on screen. */
export const SCREEN_RIGHT: TerrainPoint = { x: Math.cos(YAW), y: -Math.sin(YAW) };

/** Screen offset, in world-sized screen units, of a world offset at the default camera. */
function screenOffset(dx: number, dy: number, dh: number): TerrainPoint {
  return {
    x: dx * Math.cos(YAW) - dy * Math.sin(YAW),
    y: (dx * Math.sin(YAW) + dy * Math.cos(YAW)) * Math.sin(PITCH) - dh * Math.cos(PITCH),
  };
}

/** Ground offset at relative height `dh` that appears at screen offset (sx, sy). */
function groundOffset(sx: number, sy: number, dh: number): TerrainPoint {
  const w = (sy + dh * Math.cos(PITCH)) / Math.sin(PITCH);
  return { x: sx * Math.cos(YAW) + w * Math.sin(YAW), y: -sx * Math.sin(YAW) + w * Math.cos(YAW) };
}

/**
 * Screen units per sprite pixel for a painting that spans a cliff: its rows exactly span the
 * wall's projected height at the default camera angle.
 */
export function cliffSpriteScale(sprite: OrkhonSprite, rise: number): number {
  return (rise * Math.cos(PITCH)) / metricsOf(sprite).height;
}

/**
 * Corners run top-left, top-right, bottom-right, bottom-left over source rows `rows` and
 * columns `columns` (the whole width by default).
 */
function quad(
  sprite: OrkhonSprite,
  part: OverlayPiece['part'],
  flip: boolean,
  corners: readonly [Vec3, Vec3, Vec3, Vec3],
  rows: readonly [number, number],
  columns: readonly [number, number] = [0, metricsOf(sprite).width],
): OverlayPiece {
  const pixels: [number, number][] = [
    [columns[0], rows[0]],
    [columns[1], rows[0]],
    [columns[1], rows[1]],
    [columns[0], rows[1]],
  ];
  return {
    sprite,
    part,
    flip,
    vertices: [0, 1, 2, 0, 2, 3].map((i) => ({ position: corners[i]!, pixel: pixels[i]! })),
  };
}

/**
 * Drape a painting over the actual ground with screen-projected coordinates: at the default
 * camera it looks exactly like the flat painting, while every texel keeps the ground's depth.
 */
function drape(
  terrain: ComposedTerrain,
  sprite: OrkhonSprite,
  part: OverlayPiece['part'],
  anchor: TerrainPoint,
  anchorPixel: readonly [number, number],
  scale: number,
): OverlayPiece {
  const center = terrain.worldSize / 2;
  const heightScale = terrain.region.biome.heightScale;
  const ground = (x: number, y: number) =>
    terrain.actorHeight(center + x, center + y) * heightScale;
  const base = ground(anchor.x, anchor.y);
  const { width, height } = metricsOf(sprite);
  const pixelOf = (x: number, y: number, h: number): [number, number] => {
    const screen = screenOffset(x - anchor.x, y - anchor.y, h - base);
    return [anchorPixel[0] + screen.x / scale, anchorPixel[1] + screen.y / scale];
  };
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [px, py] of [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ] as const)
    for (const dh of [-40, ORKHON_VALLEY.rise + 40]) {
      const sx = (px - anchorPixel[0]) * scale;
      const offset = groundOffset(sx, (py - anchorPixel[1]) * scale, dh);
      minX = Math.min(minX, anchor.x + offset.x);
      maxX = Math.max(maxX, anchor.x + offset.x);
      minY = Math.min(minY, anchor.y + offset.y);
      maxY = Math.max(maxY, anchor.y + offset.y);
    }
  const step = 10;
  const columns = Math.ceil((maxX - minX) / step),
    rows = Math.ceil((maxY - minY) / step);
  const grid: OverlayVertex[] = [];
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= columns; i++) {
      const x = minX + i * step,
        y = minY + j * step;
      const h = ground(x, y) + 1;
      grid.push({ position: [center + x, h, center + y], pixel: pixelOf(x, y, h - 1) });
    }
  const inside = (v: OverlayVertex) =>
    v.pixel[0] >= -2 && v.pixel[1] >= -2 && v.pixel[0] <= width + 2 && v.pixel[1] <= height + 2;
  const vertices: OverlayVertex[] = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < columns; i++) {
      const a = grid[j * (columns + 1) + i]!,
        b = grid[j * (columns + 1) + i + 1]!,
        c = grid[(j + 1) * (columns + 1) + i + 1]!,
        d = grid[(j + 1) * (columns + 1) + i]!;
      if ([a, b, c, d].some(inside)) vertices.push(a, b, c, a, c, d);
    }
  return { sprite, part, flip: false, vertices };
}

/**
 * Painted falls and bridge decks for the authored Orkhon Valley. Cliff walls are painted by the
 * terrain shader (see `orkhonCliffs.ts`), ramps by the ground materials and banks by
 * `orkhonBanks`.
 */
export function orkhonOverlay(terrain: ComposedTerrain): OverlayPiece[] {
  const pieces: OverlayPiece[] = [];
  const center = terrain.worldSize / 2;
  const scale = terrain.region.biome.heightScale;
  const rise = ORKHON_VALLEY.rise;
  const camera = CAMERA_DIRECTION;
  const height = (x: number, y: number) => terrain.actorHeight(center + x, center + y) * scale;
  const falls = ORKHON_VALLEY.waterfall;
  const floor = terrain.region.scene.floor;

  // The falls: three terrain kit curtains across the plateau edge, from its top to the river;
  // each overlaps the next and stands slightly nearer the camera, so they read as one fall.
  const edge = { x: 0.98, y: -0.2 };
  const out = { x: -edge.y, y: edge.x };
  const curtain = metricsOf('waterfall_curtain');
  const s = cliffSpriteScale('waterfall_curtain', rise);
  const width = curtain.width * s;
  for (const [side, flip, lift] of [
    [-0.5, false, 3],
    [0, true, 6],
    [0.5, false, 9],
  ] as const) {
    const c = {
      x: falls.x + edge.x * side * width,
      y: falls.y + edge.y * side * width,
    };
    const top = height(c.x - out.x * 40, c.y - out.y * 40);
    const corner = (dir: number): TerrainPoint => ({
      x: center + c.x + edge.x * dir * (width / 2) + out.x * lift,
      y: center + c.y + edge.y * dir * (width / 2) + out.y * lift,
    });
    const left = corner(-1),
      right = corner(1);
    pieces.push(
      quad(
        'waterfall_curtain',
        'falls',
        flip,
        [
          [left.x, top, left.y],
          [right.x, top, right.y],
          [right.x, floor - 1, right.y],
          [left.x, floor - 1, left.y],
        ],
        [0, curtain.height],
      ),
    );
  }

  // The plunge pool stands upright facing the camera, like the scenery billboards, so its
  // painted spray rises over the curtains' foot and its water ellipse lies on the river head.
  const pool = metricsOf('waterfall_foam_pool');
  // About as wide as the river head, so its spray hides the lower third of the curtains.
  const poolScale = (width * 1.5) / pool.width;
  const ahead = ((pool.height - POOL_FOOT_ROW) * poolScale) / Math.sin(PITCH);
  const base = { x: center + falls.x + camera.x * ahead, y: center + falls.y + camera.y * ahead };
  const half = (pool.width * poolScale) / 2;
  const tall = (pool.height * poolScale) / Math.cos(PITCH);
  const surface = floor + 0.5;
  pieces.push(
    quad(
      'waterfall_foam_pool',
      'pool',
      false,
      [
        [base.x - SCREEN_RIGHT.x * half, surface + tall, base.y - SCREEN_RIGHT.y * half],
        [base.x + SCREEN_RIGHT.x * half, surface + tall, base.y + SCREEN_RIGHT.y * half],
        [base.x + SCREEN_RIGHT.x * half, surface, base.y + SCREEN_RIGHT.y * half],
        [base.x - SCREEN_RIGHT.x * half, surface, base.y - SCREEN_RIGHT.y * half],
      ],
      [0, pool.height],
    ),
  );

  // Bridge decks: the level painting spans the deck; its plank rows match the walkable width.
  for (const bridge of ORKHON_VALLEY.river.bridges) {
    const metrics = metricsOf('bridge_horizontal');
    pieces.push(
      drape(
        terrain,
        'bridge_horizontal',
        'deck',
        { x: bridge.x, y: bridge.y },
        [metrics.width / 2, metrics.height / 2],
        bridge.length / metrics.width,
      ),
    );
  }
  return pieces;
}

export interface BankStrip {
  bank: OrkhonBank;
  /** Triangle list of world positions. */
  positions: number[];
  /** Repeating along the shore (u) and across the band (v: 0 at the land edge, 1 in the water). */
  uv: number[];
}

/** Rows of a bank strip, as fractions of the band from its land edge. */
const BANK_ROWS = [0, 0.36, ORKHON_BANK_SHORE, 1];

/**
 * Riverbank bands along both shores of the river: the kit's grass, clay lip and water edge, with
 * the painted water edge on the shoreline. Shores whose land lies toward the camera use the bank
 * seen from above, the others the bank seen from the front. Where a plateau meets the river as a
 * cliff, under the bridge deck, and at the falls, the band is left out.
 */
export function orkhonBanks(terrain: ComposedTerrain): BankStrip[] {
  const river = terrain.river;
  if (!river) return [];
  const heightScale = terrain.region.biome.heightScale;
  const floor = terrain.region.scene.floor;
  const water = river.floor - 1.5;
  const strips: Record<OrkhonBank, BankStrip> = {
    bankFar: { bank: 'bankFar', positions: [], uv: [] },
    bankNear: { bank: 'bankNear', positions: [], uv: [] },
  };
  const falls = ORKHON_VALLEY.waterfall;
  for (const channel of river.channels)
    for (const side of [-1, 1])
      for (let i = 0; i < channel.sections.length - 1; i++) {
        const a = channel.sections[i]!,
          b = channel.sections[i + 1]!;
        const points = [a, b].map((section) =>
          BANK_ROWS.map((v) => {
            const p = riverPoint(section, side, (ORKHON_BANK_SHORE - v) * BANK_ACROSS);
            const x = river.center + p.x,
              z = river.center + p.y;
            const ground = terrain.height(x, z) * heightScale;
            return { x, z, v, ground, y: Math.max(ground, water) + 1.5 };
          }),
        );
        const shore = points.map((row) => row[2]!);
        if (
          points.some((row) => row.some((p) => p.v < ORKHON_BANK_SHORE && p.ground > floor + 24)) ||
          points.some((row) => row.some((p) => river.bridgeHeight(p.x, p.z) !== undefined)) ||
          shore.some(
            (p) => Math.hypot(p.x - river.center - falls.x, p.z - river.center - falls.y) < 120,
          )
        )
          continue;
        const land = { x: side * (a.nx + b.nx), y: side * (a.ny + b.ny) };
        const strip =
          strips[
            land.x * CAMERA_DIRECTION.x + land.y * CAMERA_DIRECTION.y > 0 ? 'bankNear' : 'bankFar'
          ];
        const u = [a.distance, b.distance].map((d) => d / ORKHON_TILE_WORLD_SIZE);
        for (let r = 0; r < BANK_ROWS.length - 1; r++) {
          const corners = [
            [0, r],
            [1, r],
            [1, r + 1],
            [0, r],
            [1, r + 1],
            [0, r + 1],
          ] as const;
          for (const [end, row] of corners) {
            const p = points[end]![row]!;
            strip.positions.push(p.x, p.y, p.z);
            strip.uv.push(u[end]!, p.v);
          }
        }
      }
  return Object.values(strips);
}

/**
 * Texture from a loaded Phaser image. Bank bands keep full sheet resolution and lie on the slanted
 * ground, so they are mipmapped (and anisotropically filtered) to stay clean instead of
 * shimmering. The terrain kit atlas is shared with the cliff walls (`orkhonKitTexture`).
 */
function paintedTexture(scene: Phaser.Scene, key: string, mipmaps: boolean): THREE.Texture {
  const texture = new THREE.Texture(scene.textures.get(key).getSourceImage() as HTMLImageElement);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = mipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = mipmaps;
  texture.needsUpdate = true;
  return texture;
}

/**
 * The painted overlay sprites, one unlit draw per atlas, depth tested against terrain and actors,
 * and the riverbank bands, lit like the ground they lie on.
 */
export class OrkhonOverlay {
  readonly group = new THREE.Group();
  private readonly textures: THREE.Texture[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];

  constructor(scene: Phaser.Scene, terrain: ComposedTerrain) {
    this.group.name = 'orkhon-overlay';
    const pieces = orkhonOverlay(terrain);
    for (const atlasKey of [ORKHON_ATLAS, ORKHON_KIT_ATLAS]) {
      const own = pieces.filter((piece) => orkhonAtlasOf(piece.sprite) === atlasKey);
      if (own.length) this.addSprites(scene, atlasKey, own);
    }
    for (const strip of orkhonBanks(terrain))
      if (strip.positions.length) this.addBank(scene, strip);
  }

  private addSprites(scene: Phaser.Scene, atlasKey: string, pieces: OverlayPiece[]): void {
    const atlas = scene.textures.get(atlasKey);
    const kit = atlasKey === ORKHON_KIT_ATLAS;
    const texture = kit ? orkhonKitTexture(scene) : paintedTexture(scene, atlasKey, false);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      alphaTest: 0.5,
      // Kit cutouts are mipmapped: alpha to coverage antialiases their keyed outline.
      alphaToCoverage: kit,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
    });
    // Pack pieces were cropped from their source sheet with paint up to the frame; break that
    // straight crop into an irregular cutout. Kit cutouts already have keyed edges.
    const jagged = atlasKey === ORKHON_ATLAS;
    // Draped paintings extend past their sprite; discard texels outside the source frame.
    material.onBeforeCompile = (shader) => {
      shader.vertexShader =
        `attribute vec2 spriteUv; varying vec2 vSpriteUv;\n${shader.vertexShader}`.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvSpriteUv = spriteUv;',
        );
      shader.fragmentShader = `varying vec2 vSpriteUv;\n${shader.fragmentShader}`.replace(
        '#include <map_fragment>',
        `${
          kit
            ? `// Mip levels average a cutout's alpha down, so thin parts would fall below the
        // alpha test and vanish at distance: scale alpha up a quarter per level (computed before
        // any discard, while derivatives are defined).
        vec2 texel = vMapUv * vec2(textureSize(map, 0));
        float mipScale = 1.0 + 0.25 * max(0.0, 0.5 * log2(max(dot(dFdx(texel), dFdx(texel)),
          dot(dFdy(texel), dFdy(texel)))));`
            : ''
        }
        if (any(lessThan(vSpriteUv, vec2(0.0))) || any(greaterThan(vSpriteUv, vec2(1.0)))) discard;
        ${
          jagged
            ? `vec2 g = vSpriteUv * 9.0, i = floor(g), f = fract(g);
        f = f * f * (3.0 - 2.0 * f);
        #define JAG(c) fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453)
        float jag = mix(mix(JAG(i), JAG(i + vec2(1.0, 0.0)), f.x),
          mix(JAG(i + vec2(0.0, 1.0)), JAG(i + vec2(1.0)), f.x), f.y);
        vec2 edge = min(vSpriteUv, 1.0 - vSpriteUv);
        if (min(edge.x, edge.y) < 0.015 + 0.11 * jag) discard;`
            : ''
        }
        #include <map_fragment>
        ${kit ? 'diffuseColor.a = min(1.0, diffuseColor.a * mipScale);' : ''}`,
      );
    };
    material.customProgramCacheKey = () => `orkhon-overlay-v5-${jagged}`;
    const positions: number[] = [],
      uvs: number[] = [],
      local: number[] = [];
    for (const piece of pieces) {
      const frame = atlas.get(piece.sprite);
      const { width, height } = metricsOf(piece.sprite);
      for (const vertex of piece.vertices) {
        const px = piece.flip ? width - vertex.pixel[0] : vertex.pixel[0];
        const u = px / width,
          v = vertex.pixel[1] / height;
        positions.push(...vertex.position);
        local.push(u, v);
        uvs.push(frame.u0 + u * (frame.u1 - frame.u0), 1 - (frame.v0 + v * (frame.v1 - frame.v0)));
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('spriteUv', new THREE.Float32BufferAttribute(local, 2));
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `orkhon-painted-${atlasKey}`;
    this.group.add(mesh);
    this.textures.push(texture);
    this.materials.push(material);
    this.geometries.push(geometry);
  }

  private addBank(scene: Phaser.Scene, strip: BankStrip): void {
    const texture = paintedTexture(scene, orkhonTileKey(strip.bank), true);
    texture.anisotropy = WORLD_3D.anisotropy;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    const material = new THREE.MeshLambertMaterial({
      map: texture,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    });
    // The band's long edges meet the ground and the river along the painting's own strokes:
    // lighter or darker texels hold on longer, as the terrain's height blending does.
    material.onBeforeCompile = (shader) => {
      shader.vertexShader =
        `attribute float bankV; varying float vBankV;\n${shader.vertexShader}`.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvBankV = bankV;',
        );
      shader.fragmentShader = `varying float vBankV;\n${shader.fragmentShader}`.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        float bankEdge = smoothstep(0.0, 0.26, vBankV) * smoothstep(1.0, 0.84, vBankV);
        float bankInk = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        if (bankEdge + (abs(bankInk - 0.3) - 0.15) * 0.8 < 0.5) discard;`,
      );
    };
    material.customProgramCacheKey = () => 'orkhon-bank-v1';
    const uv: number[] = [],
      across: number[] = [];
    for (let i = 0; i < strip.uv.length; i += 2) {
      uv.push(strip.uv[i]!, 1 - strip.uv[i + 1]!);
      across.push(strip.uv[i + 1]!);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(strip.positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setAttribute('bankV', new THREE.Float32BufferAttribute(across, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `orkhon-${strip.bank}`;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    this.textures.push(texture);
    this.materials.push(material);
    this.geometries.push(geometry);
  }

  destroy(): void {
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    for (const texture of this.textures) texture.dispose();
    this.group.removeFromParent();
  }
}
