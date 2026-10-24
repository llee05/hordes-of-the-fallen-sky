import Phaser from 'phaser';
import * as THREE from 'three';
import { GAME } from '../config';
import { MOUNTAIN_TERRAIN_ART } from '../assets/painterlyArt';
import { terrainDressing } from '../terrain/terrainDressing';
import { WORLD_3D, groundView } from './worldProjection';
import { SpriteBridge } from './SpriteBridge';
import { MountainHeightfield } from './MountainHeightfield';
import { mountainGeometry } from './mountainGeometry';
import { MountainMaterials, WORLD_DEBUG_MODES, type WorldDebugMode } from './MountainMaterials';

interface RenderChunk {
  group: THREE.Group;
  props: Phaser.GameObjects.Image[];
  outline: THREE.Box3Helper;
}

/** Rendering adapter only. ArenaScene and Arcade retain authoritative horizontal positions. */
export class World3DRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly world = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-480, 480, 270, -270, 1, 14000);
  readonly sprites: SpriteBridge;
  readonly chunks = new Map<string, RenderChunk>();
  readonly materials: MountainMaterials;
  angle: number = WORLD_3D.angle;
  debugMode: WorldDebugMode = 'off';
  terrainOnly = false;
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

  constructor(
    private readonly scene: Phaser.Scene,
    readonly terrain: MountainHeightfield,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, WORLD_3D.pixelRatio));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
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
    this.sprites = new SpriteBridge(scene, this.actors, terrain);
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
    Object.assign(this.camera, {
      left: -width / 2 / zoom,
      right: width / 2 / zoom,
      top: height / 2 / zoom,
      bottom: -height / 2 / zoom,
    });
    this.camera.position.set(
      x,
      this.focusHeight + Math.sin(radians) * 6000,
      z + Math.cos(radians) * 6000,
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
    );
    const wanted = this.terrain.visibleChunks(view);
    const keys = new Set(wanted.map(({ column, row }) => `${column},${row}`));
    for (const [key, chunk] of this.chunks)
      if (!keys.has(key)) {
        this.destroyChunk(chunk);
        this.chunks.delete(key);
      }
    const missing = wanted.filter(({ column, row }) => !this.chunks.has(`${column},${row}`));
    missing.sort(
      (a, b) =>
        Math.hypot((a.column + 0.5) * 512 - x, (a.row + 0.5) * 512 - z) -
        Math.hypot((b.column + 0.5) * 512 - x, (b.row + 0.5) * 512 - z),
    );
    for (const { column, row } of missing.slice(0, WORLD_3D.chunkBudget))
      this.addChunk(column, row);
    this.pendingChunks = Math.max(0, missing.length - WORLD_3D.chunkBudget);
    if (missing.length || Math.hypot(x - this.shadowX, z - this.shadowZ) > 256) {
      this.shadowX = x;
      this.shadowZ = z;
      this.sun.position.set(x - 1700, 2800, z - 1800);
      this.sun.target.position.set(x, 350, z);
      this.renderer.shadowMap.needsUpdate = true;
    }
    for (const chunk of this.chunks.values()) chunk.outline.visible = this.debugMode === 'chunks';
    this.sprites.update(this.camera, view);
    this.renderer.render(this.world, this.camera);
    this.label.style.display = this.debugMode === 'off' && !this.terrainOnly ? 'none' : 'block';
    this.label.textContent = `3D · ${this.debugMode.toUpperCase()} · ${this.angle}° · F9 debug\n${this.chunks.size} chunks · ${this.pendingChunks} pending · ${this.renderer.info.render.calls} draws`;
  }

  private addChunk(column: number, row: number): void {
    const size = this.terrain.chunkSize;
    const x = column * size;
    const z = row * size;
    const bounds = {
      x,
      y: z,
      width: Math.min(size, GAME.worldSize - x),
      height: Math.min(size, GAME.worldSize - z),
    };
    const data = mountainGeometry(this.terrain, bounds);
    const group = new THREE.Group();
    group.name = `world-terrain-${column}-${row}`;
    for (const part of ['surface', 'walls'] as const) {
      const mesh = new THREE.Mesh(
        this.materials.geometry(data[part]),
        part === 'surface' ? this.materials.surface : this.materials.wall,
      );
      mesh.name = part;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
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
    const props: Phaser.GameObjects.Image[] = [];
    for (const prop of terrainDressing(this.terrain, this.terrain.getChunk(column, row))) {
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
    this.chunks.set(`${column},${row}`, { group, props, outline });
  }

  private destroyChunk(chunk: RenderChunk): void {
    chunk.group.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    chunk.outline.geometry.dispose();
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
    this.materials.destroy();
    this.sun.shadow.dispose();
    this.label.remove();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
