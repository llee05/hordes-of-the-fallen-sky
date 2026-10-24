import Phaser from 'phaser';
import * as THREE from 'three';
import { GAME } from '../config';
import { MOUNTAIN_TERRAIN_ART } from '../assets/painterlyArt';
import { terrainDressing } from '../terrain/terrainDressing';
import { WORLD_3D, groundView, projectGround, screenMovement } from './worldProjection';
import { SpriteBridge } from './SpriteBridge';
import { MountainHeightfield } from './MountainHeightfield';
import type { TerrainNavigation } from '../terrain/TerrainNavigation';
import type { TerrainBounds } from '../terrain/types';
import { GraphicsBridge } from './GraphicsBridge';
import { visibleWorldChunks, worldChunkBounds } from './worldChunks';
import { mountainGeometry } from './mountainGeometry';
import { MountainMaterials, WORLD_DEBUG_MODES, type WorldDebugMode } from './MountainMaterials';

interface RenderChunk {
  group: THREE.Group;
  props: Phaser.GameObjects.Image[];
  outline: THREE.Box3Helper;
  collision: THREE.LineSegments;
}

/** Rendering adapter only. ArenaScene and Arcade retain authoritative horizontal positions. */
export class World3DRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly world = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-480, 480, 270, -270, 1, 14000);
  readonly sprites: SpriteBridge;
  readonly chunks = new Map<string, RenderChunk>();
  readonly materials: MountainMaterials;
  readonly effects: GraphicsBridge;
  viewBounds?: TerrainBounds;
  angle: number = WORLD_3D.angle;
  readonly yaw: number = WORLD_3D.yaw;
  debugMode: WorldDebugMode = 'off';
  terrainOnly = false;
  renderScale = 1;
  pendingChunks = 0;
  private readonly actors = new THREE.Group();
  private readonly sun = new THREE.DirectionalLight(0xffefd3, 1.7);
  private readonly renderFrame = (): void => this.render();
  private readonly label: HTMLDivElement;
  private width = 0;
  private height = 0;
  private shadowX = -Infinity;
  private shadowZ = -Infinity;
  private focusHeight?: number;
  private shadowTime = 0;
  private qualityTime = performance.now();
  private readonly collisionMaterial = new THREE.LineBasicMaterial({
    color: 0xff6655,
    depthTest: false,
  });
  private readonly merged: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>[] = [];
  readonly timings = { sprites: 0, effects: 0, draw: 0 };

  constructor(
    private readonly scene: Phaser.Scene,
    readonly terrain: MountainHeightfield,
    readonly navigation: TerrainNavigation,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, WORLD_3D.pixelRatio));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.domElement.dataset.worldRenderer = '3d';
    Object.assign(this.renderer.domElement.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
    });
    scene.game.canvas.parentElement!.append(this.renderer.domElement);
    this.world.background = new THREE.Color(0xb1b6ab);
    this.world.fog = new THREE.Fog(0xc5cdc6, 6100, 10000);
    this.world.add(new THREE.HemisphereLight(0xe5e9df, 0x737b62, 1.5));
    this.sun.castShadow = true;
    Object.assign(this.sun.shadow.camera, {
      left: -2000,
      right: 2000,
      top: 2000,
      bottom: -2000,
      near: 1,
      far: 6500,
    });
    this.sun.shadow.mapSize.set(WORLD_3D.shadowSize, WORLD_3D.shadowSize);
    this.sun.shadow.bias = -0.00015;
    this.sun.shadow.normalBias = 2;
    this.world.add(this.sun, this.sun.target, this.actors);
    this.materials = new MountainMaterials(scene);
    for (const material of [this.materials.surface, this.materials.wall]) {
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.merged.push(mesh);
      this.world.add(mesh);
    }
    this.sprites = new SpriteBridge(scene, this.actors, terrain);
    this.effects = new GraphicsBridge(scene, this.actors, terrain);
    this.label = document.createElement('div');
    this.label.dataset.worldDebug = '';
    Object.assign(this.label.style, {
      position: 'absolute',
      top: '155px',
      left: '50%',
      transform: 'translateX(-50%)',
      color: '#f5edcf',
      background: '#182c32ee',
      padding: '8px',
      font: '12px monospace',
      pointerEvents: 'none',
      display: 'none',
      whiteSpace: 'pre',
      zIndex: '1',
    });
    scene.game.canvas.parentElement!.append(this.label);
    scene.events.on(Phaser.Scenes.Events.PRE_RENDER, this.renderFrame);
  }

  setAngle(angle: number): void {
    if (Number.isFinite(angle))
      this.angle = Math.max(WORLD_3D.minAngle, Math.min(WORLD_3D.maxAngle, angle));
  }
  movement(x: number, y: number): { x: number; y: number } {
    return screenMovement(x, y, this.yaw);
  }
  screenX(x: number, y: number): number {
    return projectGround(x, y, 0, this.angle, this.yaw).x;
  }
  cycleDebug(): void {
    this.setDebug(
      WORLD_DEBUG_MODES[
        (WORLD_DEBUG_MODES.indexOf(this.debugMode) + 1) % WORLD_DEBUG_MODES.length
      ]!,
    );
  }
  setDebug(mode: WorldDebugMode): void {
    this.debugMode = mode;
    this.materials.setDebug(mode);
  }
  setTerrainOnly(value: boolean): void {
    this.terrainOnly = value;
    this.actors.visible = !value;
    document.querySelector('#app')?.classList.toggle('terrain-only', value);
    this.renderer.shadowMap.needsUpdate = true;
  }

  /** Inspection query for depth validation; never used for combat targeting. */
  occludes(point: { x: number; y: number; z: number }): boolean {
    const target = new THREE.Vector3(point.x, point.y, point.z);
    const screen = target.clone().project(this.camera);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(screen.x, screen.y), this.camera);
    const hit = ray
      .intersectObjects(
        [...this.chunks.values()].map((chunk) => chunk.group),
        true,
      )
      .find((hit) => hit.object instanceof THREE.Mesh);
    return !!hit && hit.distance < ray.ray.origin.distanceTo(target) - 3;
  }

  private render(): void {
    const source = this.scene.cameras.main;
    // Phaser skips this when alpha=0. Keep its existing follow, bounds and input calculations.
    source.preRender();
    const { width, height, zoom } = source;
    if (this.width !== width || this.height !== height) {
      this.width = width;
      this.height = height;
      this.renderer.setSize(width, height);
    }
    const x = source.midPoint.x;
    const z = source.midPoint.y;
    const elevation = this.terrain.height(x, z) * this.terrain.region.biome.heightScale;
    this.focusHeight =
      this.focusHeight === undefined
        ? elevation
        : Phaser.Math.Linear(this.focusHeight, elevation, 0.09);
    const radians = (this.angle * Math.PI) / 180;
    const yaw = (this.yaw * Math.PI) / 180;
    Object.assign(this.camera, {
      left: -width / 2 / zoom,
      right: width / 2 / zoom,
      top: height / 2 / zoom,
      bottom: -height / 2 / zoom,
    });
    this.camera.position.set(
      x + Math.sin(yaw) * Math.cos(radians) * 6000,
      this.focusHeight + Math.sin(radians) * 6000,
      z + Math.cos(yaw) * Math.cos(radians) * 6000,
    );
    this.camera.lookAt(x, this.focusHeight, z);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    const view = groundView(
      x,
      z,
      width,
      height,
      zoom,
      this.terrain.region.biome.heightScale,
      this.angle,
      this.yaw,
    );
    this.viewBounds = view;
    const wanted = visibleWorldChunks(view, this.terrain.worldSize, this.terrain.chunkSize);
    const keys = new Set(wanted.map(({ column, row }) => `${column},${row}`));
    let changed = false;
    for (const [key, chunk] of this.chunks)
      if (!keys.has(key)) {
        this.destroyChunk(chunk);
        this.chunks.delete(key);
        changed = true;
      }
    const missing = wanted.filter(({ column, row }) => !this.chunks.has(`${column},${row}`));
    missing.sort(
      (a, b) =>
        Math.hypot((a.column + 0.5) * 512 - x, (a.row + 0.5) * 512 - z) -
        Math.hypot((b.column + 0.5) * 512 - x, (b.row + 0.5) * 512 - z),
    );
    for (const { column, row } of missing.slice(0, WORLD_3D.chunkBudget)) {
      this.addChunk(column, row);
      changed = true;
    }
    if (changed) this.mergeTerrain();
    this.pendingChunks = Math.max(0, missing.length - WORLD_3D.chunkBudget);
    if (
      missing.length ||
      Math.hypot(x - this.shadowX, z - this.shadowZ) > 256 ||
      performance.now() - this.shadowTime > 333
    ) {
      this.shadowTime = performance.now();
      this.shadowX = x;
      this.shadowZ = z;
      this.sun.position.set(x - 1700, 2800, z - 1800);
      this.sun.target.position.set(x, 350, z);
      this.renderer.shadowMap.needsUpdate = true;
    }
    for (const chunk of this.chunks.values()) {
      chunk.outline.visible = this.debugMode === 'chunks';
      chunk.collision.visible = this.debugMode === 'collision';
    }
    let mark = performance.now();
    this.sprites.update(this.camera, view);
    this.timings.sprites = performance.now() - mark;
    mark = performance.now();
    this.effects.update(view, this.camera);
    this.timings.effects = performance.now() - mark;
    mark = performance.now();
    this.renderer.render(this.world, this.camera);
    this.timings.draw = performance.now() - mark;
    // Bound fragment load on integrated/software GPUs without resizing the HUD or world units.
    const now = performance.now();
    if (this.pendingChunks === 0 && this.debugMode === 'off' && now - this.qualityTime > 2000) {
      const fps = this.scene.game.loop.actualFps;
      const scale =
        fps > 0 && fps < 28
          ? Math.max(WORLD_3D.minRenderScale, this.renderScale - 0.15)
          : fps > 57 && now - this.qualityTime > 10000
            ? Math.min(1, this.renderScale + 0.1)
            : this.renderScale;
      if (scale !== this.renderScale) {
        this.renderScale = scale;
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, WORLD_3D.pixelRatio) * scale);
        this.renderer.setSize(width, height);
        this.qualityTime = now;
      }
    }
    this.label.style.display = this.debugMode === 'off' && !this.terrainOnly ? 'none' : 'block';
    this.label.textContent = `3D · ${this.debugMode.toUpperCase()} · ${this.angle}° · F9 debug\n${this.chunks.size} chunks · ${this.pendingChunks} pending · ${this.renderer.info.render.calls} draws · ${Math.round(this.renderScale * 100)}% pixels`;
  }

  private addChunk(column: number, row: number): void {
    const bounds = worldChunkBounds(column, row, this.terrain.worldSize, this.terrain.chunkSize);
    const { x, y: z } = bounds;
    const backdrop = x < 0 || z < 0 || x >= this.terrain.worldSize || z >= this.terrain.worldSize;
    const data = mountainGeometry(this.terrain, bounds);
    const group = new THREE.Group();
    group.name = `world-terrain-${column}-${row}`;
    for (const part of ['surface', 'walls'] as const) {
      const mesh = new THREE.Mesh(
        this.materials.geometry(data[part], this.navigation),
        part === 'surface' ? this.materials.surface : this.materials.wall,
      );
      mesh.name = part;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.visible = false; // Retain chunk data; submit resident terrain in two draws below.
      group.add(mesh);
    }
    const outline = new THREE.Box3Helper(
      new THREE.Box3(
        new THREE.Vector3(x, 150, z),
        new THREE.Vector3(x + bounds.width, 1100, z + bounds.height),
      ),
      0xeac27b,
    );
    outline.visible = false;
    group.add(outline);
    this.world.add(group);
    const lines: number[] = [];
    const cellSize = this.terrain.cellSize;
    for (let j = z; !backdrop && j < z + bounds.height; j += cellSize)
      for (let i = x; i < x + bounds.width; i += cellSize) {
        const index = Math.floor(j / cellSize) * this.navigation.columns + Math.floor(i / cellSize);
        if (!this.navigation.blocked[index]) continue;
        const corners = [
          [i, j],
          [Math.min(i + cellSize, GAME.worldSize), j],
          [Math.min(i + cellSize, GAME.worldSize), Math.min(j + cellSize, GAME.worldSize)],
          [i, Math.min(j + cellSize, GAME.worldSize)],
        ];
        for (let k = 0; k < 4; k++)
          for (const point of [corners[k]!, corners[(k + 1) % 4]!])
            lines.push(
              point[0]!,
              this.terrain.height(point[0]!, point[1]!) * this.terrain.region.biome.heightScale + 6,
              point[1]!,
            );
      }
    const collision = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute(
        'position',
        new THREE.Float32BufferAttribute(lines, 3),
      ),
      this.collisionMaterial,
    );
    collision.visible = false;
    collision.name = 'arcade-collision-cells';
    group.add(collision);
    const props: Phaser.GameObjects.Image[] = [];
    for (const prop of backdrop
      ? []
      : terrainDressing(this.terrain, this.terrain.getChunk(column, row))) {
      const art = MOUNTAIN_TERRAIN_ART.dressing![prop.kind];
      const width = art.width * prop.scale;
      const image = this.scene.add
        .image(prop.x, prop.y, art.texture, art.frame)
        .setOrigin(0.5, 0.9)
        .setTint(art.tint)
        .setDepth(100 + prop.y)
        .setName(`terrain-dressing-${prop.kind}`);
      image.setScale(width / image.width);
      props.push(
        this.scene.add
          .image(prop.x + 5, prop.y + 3, 'shadow')
          .setDisplaySize(width * 0.7, width * 0.2)
          .setAlpha(0.35)
          .setDepth(99 + prop.y),
        image,
      );
    }
    this.chunks.set(`${column},${row}`, { group, props, outline, collision });
  }

  /** Rebuild only when the resident set changes. GPU batches retain deterministic chunk data. */
  private mergeTerrain(): void {
    for (let part = 0; part < 2; part++) {
      const geometries = [...this.chunks.values()].map(
        (chunk) => (chunk.group.children[part] as THREE.Mesh).geometry,
      );
      const merged = new THREE.BufferGeometry();
      for (const name of ['position', 'normal', 'weightsA', 'weightsB', 'contact', 'blocked']) {
        const size = geometries[0]?.getAttribute(name).itemSize ?? 1;
        const length = geometries.reduce(
          (sum, geometry) => sum + geometry.getAttribute(name).array.length,
          0,
        );
        const array = new Float32Array(length);
        let offset = 0;
        for (const geometry of geometries) {
          const values = geometry.getAttribute(name).array;
          array.set(values, offset);
          offset += values.length;
        }
        merged.setAttribute(name, new THREE.BufferAttribute(array, size));
      }
      merged.computeBoundingSphere();
      this.merged[part]!.geometry.dispose();
      this.merged[part]!.geometry = merged;
    }
  }

  private destroyChunk(chunk: RenderChunk): void {
    chunk.group.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    chunk.outline.geometry.dispose();
    chunk.collision.geometry.dispose();
    (chunk.outline.material as THREE.Material).dispose();
    this.world.remove(chunk.group);
    for (const prop of chunk.props) prop.destroy();
    this.renderer.shadowMap.needsUpdate = true;
  }

  destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.PRE_RENDER, this.renderFrame);
    this.setTerrainOnly(false);
    for (const chunk of this.chunks.values()) this.destroyChunk(chunk);
    this.chunks.clear();
    this.sprites.destroy();
    this.effects.destroy();
    for (const mesh of this.merged) mesh.geometry.dispose();
    this.collisionMaterial.dispose();
    this.materials.destroy();
    this.sun.shadow.dispose();
    this.label.remove();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
