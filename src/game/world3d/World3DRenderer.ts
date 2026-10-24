import Phaser from 'phaser';
import * as THREE from 'three';
import { GAME } from '../config';
import type { MountainTerrain } from '../terrain/MountainTerrain';
import { WORLD_3D, groundView } from './worldProjection';
import { SpriteBridge } from './SpriteBridge';

/** Rendering adapter only. ArenaScene and Arcade retain all authoritative world positions. */
export class World3DRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly world = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-480, 480, 270, -270, 1, 14000);
  readonly sprites: SpriteBridge;
  readonly chunks = new Map<string, THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>>();
  angle: number = WORLD_3D.angle;
  pendingChunks = 0;
  private readonly actors = new THREE.Group();
  private readonly material = new THREE.MeshLambertMaterial({ color: 0x9da17f });
  private readonly renderFrame = (): void => this.render();
  private width = 0;
  private height = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly terrain: MountainTerrain,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, WORLD_3D.pixelRatio));
    this.renderer.setClearColor(0xb1b6ab);
    this.renderer.domElement.dataset.worldRenderer = '3d';
    Object.assign(this.renderer.domElement.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
    });
    scene.game.canvas.parentElement!.append(this.renderer.domElement);
    this.world.background = new THREE.Color(0xb1b6ab);
    this.world.add(new THREE.HemisphereLight(0xe5e9df, 0x767d66, 2));
    const sun = new THREE.DirectionalLight(0xffefd3, 2);
    sun.position.set(-1600, 2600, -1900);
    this.world.add(sun, this.actors);
    this.sprites = new SpriteBridge(scene, this.actors, terrain);
    scene.events.on(Phaser.Scenes.Events.PRE_RENDER, this.renderFrame);
  }

  setAngle(angle: number): void {
    this.angle = Math.max(WORLD_3D.minAngle, Math.min(WORLD_3D.maxAngle, angle));
  }

  private render(): void {
    const source = this.scene.cameras.main;
    // Suppress the duplicate Phaser draw while keeping its follow/zoom/input camera alive.
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
    const radians = (this.angle * Math.PI) / 180;
    this.camera.left = -width / 2 / zoom;
    this.camera.right = width / 2 / zoom;
    this.camera.top = height / 2 / zoom;
    this.camera.bottom = -height / 2 / zoom;
    this.camera.position.set(x, elevation + Math.sin(radians) * 6000, z + Math.cos(radians) * 6000);
    this.camera.lookAt(x, elevation, z);
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
    for (const [key, mesh] of this.chunks)
      if (!keys.has(key)) {
        mesh.geometry.dispose();
        this.world.remove(mesh);
        this.chunks.delete(key);
      }
    const missing = wanted.filter(({ column, row }) => !this.chunks.has(`${column},${row}`));
    missing.sort(
      (a, b) =>
        Math.hypot(a.column * 512 - x, a.row * 512 - z) -
        Math.hypot(b.column * 512 - x, b.row * 512 - z),
    );
    for (const { column, row } of missing.slice(0, WORLD_3D.chunkBudget))
      this.addChunk(column, row);
    this.pendingChunks = Math.max(0, missing.length - WORLD_3D.chunkBudget);
    this.sprites.update(this.camera, view);
    this.renderer.render(this.world, this.camera);
  }

  private addChunk(column: number, row: number): void {
    const size = this.terrain.chunkSize;
    const x = column * size;
    const z = row * size;
    const width = Math.min(size, GAME.worldSize - x);
    const depth = Math.min(size, GAME.worldSize - z);
    const columns = Math.ceil(width / WORLD_3D.meshStep);
    const rows = Math.ceil(depth / WORLD_3D.meshStep);
    const geometry = new THREE.PlaneGeometry(width, depth, columns, rows)
      .rotateX(-Math.PI / 2)
      .translate(x + width / 2, 0, z + depth / 2);
    const positions = geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++)
      positions.setY(
        i,
        this.terrain.height(positions.getX(i), positions.getZ(i)) *
          this.terrain.region.biome.heightScale,
      );
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.name = `world-terrain-${column}-${row}`;
    this.world.add(mesh);
    this.chunks.set(`${column},${row}`, mesh);
  }

  destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.PRE_RENDER, this.renderFrame);
    for (const mesh of this.chunks.values()) mesh.geometry.dispose();
    this.chunks.clear();
    this.sprites.destroy();
    this.material.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
