import type Phaser from 'phaser';
import * as THREE from 'three';
import {
  ORKHON_ATLAS,
  ORKHON_SPRITES,
  type OrkhonSprite,
  type OrkhonSpriteMetrics,
} from '../assets/orkhonValleyArt';
import { ORKHON_VALLEY } from '../data/orkhonValley';
import type { TerrainPoint } from '../terrain/types';
import type { ComposedTerrain } from './ComposedTerrain';
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

/** Source columns of `waterfall_top` holding water; rock is painted either side of them. */
const FALLS_WATER = [13, 55] as const;
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
 * Screen units per sprite pixel for a painted cliff: its face rows exactly span the wall's
 * projected height at the default camera angle.
 */
export function cliffSpriteScale(sprite: OrkhonSprite, rise: number): number {
  const metrics = metricsOf(sprite);
  return (rise * Math.cos(PITCH)) / (metrics.height - (metrics.lip ?? 0));
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
 * terrain shader (see `orkhonCliffs.ts`) and ramps by the ground materials.
 */
export function orkhonOverlay(terrain: ComposedTerrain): OverlayPiece[] {
  const pieces: OverlayPiece[] = [];
  const center = terrain.worldSize / 2;
  const scale = terrain.region.biome.heightScale;
  const rise = ORKHON_VALLEY.rise;
  const camera = CAMERA_DIRECTION;
  const sin = Math.sin(PITCH);
  const height = (x: number, y: number) => terrain.actorHeight(center + x, center + y) * scale;
  const falls = ORKHON_VALLEY.waterfall;

  // The falls: three painted drops across the plateau edge, cropped to their water columns so
  // the basalt walls either side frame them; each overlaps the next and stands slightly nearer
  // the camera. Foam pools overlap the same way on the river head.
  const edge = { x: 0.98, y: -0.2 };
  const out = { x: -edge.y, y: edge.x };
  for (const [side, flip, lift] of [
    [-0.85, false, 3],
    [0, true, 6],
    [0.85, false, 9],
  ] as const) {
    const metrics = metricsOf('waterfall_top');
    const s = cliffSpriteScale('waterfall_top', rise);
    const width = (FALLS_WATER[1] - FALLS_WATER[0]) * s;
    const c = {
      x: falls.x + edge.x * side * width,
      y: falls.y + edge.y * side * width,
    };
    const top = height(c.x - out.x * 40, c.y - out.y * 40);
    const foot = terrain.region.scene.floor - 1;
    const corner = (dir: number): TerrainPoint => ({
      x: center + c.x + edge.x * dir * (width / 2) + out.x * lift,
      y: center + c.y + edge.y * dir * (width / 2) + out.y * lift,
    });
    const left = corner(-1),
      right = corner(1);
    pieces.push(
      quad(
        'waterfall_top',
        'falls',
        flip,
        [
          [left.x, top, left.y],
          [right.x, top, right.y],
          [right.x, foot, right.y],
          [left.x, foot, left.y],
        ],
        [metrics.lip ?? 0, metrics.height],
        flip ? [metrics.width - FALLS_WATER[1], metrics.width - FALLS_WATER[0]] : FALLS_WATER,
      ),
    );
    const pool = metricsOf('waterfall_base');
    const depth = (pool.height * s * 0.7) / sin;
    const surface = terrain.region.scene.floor + 0.5 + lift * 0.04;
    const near = (p: TerrainPoint): Vec3 => [
      p.x + camera.x * depth,
      surface,
      p.y + camera.y * depth,
    ];
    pieces.push(
      quad(
        'waterfall_base',
        'pool',
        flip,
        [[left.x, surface, left.y], [right.x, surface, right.y], near(right), near(left)],
        [0, pool.height],
      ),
    );
  }

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

/** One unlit draw of the supplied painted overlay sprites, depth tested against terrain and actors. */
export class OrkhonOverlay {
  readonly group = new THREE.Group();
  private readonly texture: THREE.Texture;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly geometry = new THREE.BufferGeometry();

  constructor(scene: Phaser.Scene, terrain: ComposedTerrain) {
    const atlas = scene.textures.get(ORKHON_ATLAS);
    this.texture = new THREE.Texture(atlas.getSourceImage() as HTMLImageElement);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;
    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
    });
    // Draped paintings extend past their sprite; discard texels outside the source frame.
    this.material.onBeforeCompile = (shader) => {
      shader.vertexShader =
        `attribute vec2 spriteUv; varying vec2 vSpriteUv;\n${shader.vertexShader}`.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvSpriteUv = spriteUv;',
        );
      shader.fragmentShader = `varying vec2 vSpriteUv;\n${shader.fragmentShader}`.replace(
        '#include <map_fragment>',
        `if (any(lessThan(vSpriteUv, vec2(0.0))) || any(greaterThan(vSpriteUv, vec2(1.0)))) discard;
        // Some pieces were cropped from the source sheet with paint up to the frame. Break that
        // straight crop into an irregular cutout; colours are untouched.
        vec2 g = vSpriteUv * 9.0, i = floor(g), f = fract(g);
        f = f * f * (3.0 - 2.0 * f);
        #define JAG(c) fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453)
        float jag = mix(mix(JAG(i), JAG(i + vec2(1.0, 0.0)), f.x),
          mix(JAG(i + vec2(0.0, 1.0)), JAG(i + vec2(1.0)), f.x), f.y);
        vec2 edge = min(vSpriteUv, 1.0 - vSpriteUv);
        if (min(edge.x, edge.y) < 0.015 + 0.11 * jag) discard;
        #include <map_fragment>`,
      );
    };
    this.material.customProgramCacheKey = () => 'orkhon-overlay-v3';
    const positions: number[] = [],
      uvs: number[] = [],
      local: number[] = [];
    for (const piece of orkhonOverlay(terrain)) {
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
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    this.geometry.setAttribute('spriteUv', new THREE.Float32BufferAttribute(local, 2));
    this.geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.name = 'orkhon-painted-terrain';
    this.group.name = 'orkhon-overlay';
    this.group.add(mesh);
  }

  destroy(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
    this.group.removeFromParent();
  }
}
