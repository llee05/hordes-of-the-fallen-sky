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
import { terrainSeed } from '../terrain/noise';
import { outlineField, type ComposedTerrain } from './ComposedTerrain';
import { WORLD_3D } from './worldProjection';

type Vec3 = readonly [number, number, number];
export interface OverlayVertex {
  position: Vec3;
  /** Source pixel of the unflipped sprite; values outside the sprite are discarded. */
  pixel: readonly [number, number];
}
export interface OverlayPiece {
  sprite: OrkhonSprite;
  part: 'face' | 'rim' | 'ramp' | 'deck' | 'falls' | 'pool';
  flip: boolean;
  /** Triangle list. */
  vertices: readonly OverlayVertex[];
}

const CLIFF_RUN: readonly OrkhonSprite[] = [
  'cliff_face_tall',
  'cliff_face_tall',
  'cliff_straight',
  'cliff_face_tall',
  'cliff_end_cap',
  'cliff_straight',
  'cliff_face_tall',
  'cliff_cave_nook',
];
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

function segmentDistance(point: TerrainPoint, a: TerrainPoint, b: TerrainPoint): number {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
  );
  return Math.hypot(point.x - a.x - dx * t, point.y - a.y - dy * t);
}

/** Corners run top-left, top-right, bottom-right, bottom-left over source rows `rows`. */
function quad(
  sprite: OrkhonSprite,
  part: OverlayPiece['part'],
  flip: boolean,
  corners: readonly [Vec3, Vec3, Vec3, Vec3],
  rows: readonly [number, number],
): OverlayPiece {
  const width = metricsOf(sprite).width;
  const pixels: [number, number][] = [
    [0, rows[0]],
    [width, rows[0]],
    [width, rows[1]],
    [0, rows[1]],
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
 * Painted cliffs, ramps, falls and bridge decks for the authored Orkhon Valley. Each cliff
 * sprite is folded at its painted lip: the face stands on the real wall and the rim lies on the
 * plateau, so at the default camera it reads as the painting while units keep correct depth.
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
  const limit = center - 20;

  for (const plateau of ORKHON_VALLEY.plateaus) {
    const outline = plateau.outline;
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i]!,
        b = outline[(i + 1) % outline.length]!;
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      const e = { x: (b.x - a.x) / length, y: (b.y - a.y) / length };
      let n = { x: e.y, y: -e.x };
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (outlineField(outline, mid.x + n.x * 6, mid.y + n.y * 6) > 0) n = { x: -n.x, y: -n.y };
      // Walls facing away from the camera are hidden behind their own plateau.
      if (n.x * camera.x + n.y * camera.y < 0.05) continue;
      // Size pieces by their painted screen width so oblique walls shear rather than squash.
      const across = Math.max(0.3, Math.abs(e.x * SCREEN_RIGHT.x + e.y * SCREEN_RIGHT.y));
      const typical =
        (metricsOf('cliff_face_tall').width * cliffSpriteScale('cliff_face_tall', rise)) / across;
      const count = Math.max(1, Math.round(length / (typical * 0.8)));
      const seed = terrainSeed(`${plateau.id}:${i}`);
      for (let k = 0; k < count; k++) {
        const sprite = CLIFF_RUN[(seed + k * 7) % CLIFF_RUN.length]!;
        const metrics = metricsOf(sprite);
        const s = cliffSpriteScale(sprite, rise);
        const width = (metrics.width * s) / across;
        const t = ((k + 0.5) / count) * length;
        const c = { x: a.x + e.x * t, y: a.y + e.y * t };
        if (Math.abs(c.x) > limit || Math.abs(c.y) > limit) continue;
        if (Math.hypot(c.x - falls.x, c.y - falls.y) < 150) continue;
        if (
          plateau.ramps.some(
            (ramp) => segmentDistance(c, ramp.foot, ramp.top) < ramp.shoulder + width * 0.3,
          )
        )
          continue;
        const top = height(c.x - n.x * 12, c.y - n.y * 12);
        const foot = height(c.x + n.x * 12, c.y + n.y * 12);
        if (top - foot < rise * 0.75) continue;
        const flip = ((seed >> (k % 16)) & 1) === 1;
        const corner = (side: number): TerrainPoint => ({
          x: center + c.x + e.x * side * (width / 2) + n.x * 1.5,
          y: center + c.y + e.y * side * (width / 2) + n.y * 1.5,
        });
        const left = corner(-1),
          right = corner(1);
        const lip = metrics.lip ?? 0;
        pieces.push(
          quad(
            sprite,
            'face',
            flip,
            [
              [left.x, top, left.y],
              [right.x, top, right.y],
              [right.x, foot, right.y],
              [left.x, foot, left.y],
            ],
            [lip, metrics.height],
          ),
        );
        if (lip > 0) {
          const depth = (lip * s) / sin;
          const back = (p: TerrainPoint): Vec3 => [
            p.x - camera.x * depth,
            top + 0.8,
            p.y - camera.y * depth,
          ];
          pieces.push(
            quad(
              sprite,
              'rim',
              flip,
              [back(left), back(right), [right.x, top + 0.8, right.y], [left.x, top + 0.8, left.y]],
              [0, lip],
            ),
          );
        }
      }
    }
    // Convex corners facing the camera get the painted outer corner, standing across the view.
    for (let i = 0; i < outline.length; i++) {
      const v = outline[i]!;
      if (Math.abs(v.x) > limit || Math.abs(v.y) > limit) continue;
      const normals = [
        outline[(i + outline.length - 1) % outline.length]!,
        outline[(i + 1) % outline.length]!,
      ].map((other, side) => {
        const dx = side ? other.x - v.x : v.x - other.x,
          dy = side ? other.y - v.y : v.y - other.y;
        const length = Math.hypot(dx, dy);
        let n = { x: dy / length, y: -dx / length };
        if (
          outlineField(
            outline,
            v.x + n.x * 6 - (dx / length) * 30,
            v.y + n.y * 6 - (dy / length) * 30,
          ) > 0
        )
          n = { x: -n.x, y: -n.y };
        return n;
      });
      if (normals.some((n) => n.x * camera.x + n.y * camera.y < 0.05)) continue;
      const out = { x: normals[0]!.x + normals[1]!.x, y: normals[0]!.y + normals[1]!.y };
      const length = Math.hypot(out.x, out.y);
      if (length < 0.2) continue;
      out.x /= length;
      out.y /= length;
      if (outlineField(outline, v.x + out.x * 10, v.y + out.y * 10) > 0) continue;
      if (
        plateau.ramps.some((ramp) => segmentDistance(v, ramp.foot, ramp.top) < ramp.shoulder + 60)
      )
        continue;
      const metrics = metricsOf('cliff_corner_outer');
      const s = cliffSpriteScale('cliff_corner_outer', rise);
      const half = (metrics.width * s) / 2;
      const top = height(v.x - out.x * 14, v.y - out.y * 14);
      const foot = height(v.x + out.x * 14, v.y + out.y * 14);
      if (top - foot < rise * 0.75) continue;
      const at = (side: number): TerrainPoint => ({
        x: center + v.x + out.x * 2 + SCREEN_RIGHT.x * side * half,
        y: center + v.y + out.y * 2 + SCREEN_RIGHT.y * side * half,
      });
      const left = at(-1),
        right = at(1);
      const lip = metrics.lip ?? 0;
      const depth = (lip * s) / sin;
      const back = (p: TerrainPoint): Vec3 => [
        p.x - camera.x * depth,
        top + 1,
        p.y - camera.y * depth,
      ];
      pieces.push(
        quad(
          'cliff_corner_outer',
          'face',
          false,
          [
            [left.x, top, left.y],
            [right.x, top, right.y],
            [right.x, foot, right.y],
            [left.x, foot, left.y],
          ],
          [lip, metrics.height],
        ),
        quad(
          'cliff_corner_outer',
          'rim',
          false,
          [back(left), back(right), [right.x, top + 1, right.y], [left.x, top + 1, left.y]],
          [0, lip],
        ),
      );
    }
    // Ramp paintings are fitted so their painted foot and crest meet the graded ramp.
    for (const ramp of plateau.ramps) {
      const metrics = metricsOf(ramp.sprite);
      const [footPixel, topPixel] = metrics.climb!;
      const screen = screenOffset(
        ramp.top.x - ramp.foot.x,
        ramp.top.y - ramp.foot.y,
        height(ramp.top.x, ramp.top.y) - height(ramp.foot.x, ramp.foot.y),
      );
      const s =
        Math.hypot(screen.x, screen.y) /
        Math.hypot(topPixel[0] - footPixel[0], topPixel[1] - footPixel[1]);
      pieces.push(drape(terrain, ramp.sprite, 'ramp', ramp.foot, footPixel, s));
    }
  }

  // The falls: three painted drops side by side on the plateau edge, foam pools on the river.
  const edge = { x: 0.98, y: -0.2 };
  const out = { x: -edge.y, y: edge.x };
  for (const [side, flip] of [
    [-1, false],
    [0, true],
    [1, false],
  ] as const) {
    const metrics = metricsOf('waterfall_top');
    const s = cliffSpriteScale('waterfall_top', rise);
    const width = metrics.width * s;
    const c = {
      x: falls.x + edge.x * side * width * 0.8,
      y: falls.y + edge.y * side * width * 0.8,
    };
    const top = height(c.x - out.x * 40, c.y - out.y * 40);
    const foot = terrain.region.scene.floor - 1;
    const corner = (dir: number): TerrainPoint => ({
      x: center + c.x + edge.x * dir * (width / 2) + out.x * 3,
      y: center + c.y + edge.y * dir * (width / 2) + out.y * 3,
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
      ),
    );
    const pool = metricsOf('waterfall_base');
    const depth = (pool.height * s) / sin;
    const surface = terrain.region.scene.floor + 0.5;
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
