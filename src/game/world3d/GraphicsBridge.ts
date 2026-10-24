import Phaser from 'phaser';
import * as THREE from 'three';
import type { MountainHeightfield } from './MountainHeightfield';

interface GraphicsCopy {
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  signature: string;
}

/** Replays existing Phaser effects and hurdle drawings; this authors no new artwork. */
export class GraphicsBridge {
  private readonly copies = new Map<Phaser.GameObjects.Graphics, GraphicsCopy>();
  private readonly camera = new Phaser.Cameras.Scene2D.Camera(0, 0, 1, 1);
  private readonly atlas = document.createElement('canvas');
  private readonly atlasTexture: THREE.CanvasTexture;
  private readonly hurdles: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private atlasDirty = true;
  hurdleCount = 0;
  private readonly aura = new THREE.Mesh(
    new THREE.RingGeometry(23, 24, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  );
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly root: THREE.Group,
    private readonly terrain: MountainHeightfield,
  ) {
    this.atlas.width = 1024;
    this.atlas.height = 768;
    this.atlasTexture = new THREE.CanvasTexture(this.atlas);
    this.atlasTexture.colorSpace = THREE.SRGBColorSpace;
    this.atlasTexture.minFilter = THREE.LinearFilter;
    this.atlasTexture.generateMipmaps = false;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(48 * 4 * 3), 3).setUsage(THREE.DynamicDrawUsage),
    );
    geometry.setAttribute(
      'uv',
      new THREE.BufferAttribute(new Float32Array(48 * 4 * 2), 2).setUsage(THREE.DynamicDrawUsage),
    );
    const indices: number[] = [];
    for (let i = 0; i < 48; i++)
      indices.push(i * 4, i * 4 + 2, i * 4 + 1, i * 4 + 2, i * 4 + 3, i * 4 + 1);
    geometry.setIndex(indices);
    this.hurdles = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        map: this.atlasTexture,
        transparent: true,
        alphaTest: 0.06,
        depthWrite: true,
        side: THREE.DoubleSide,
      }),
    );
    this.hurdles.name = 'camp-hurdle-batch';
    this.hurdles.frustumCulled = false;
    root.add(this.hurdles);
    root.add(this.aura);
    this.aura.frustumCulled = false;
  }

  update(view: { x: number; y: number; width: number; height: number }, angle: number): void {
    const circle = this.scene.children.list.find(
      (object) => object instanceof Phaser.GameObjects.Arc,
    ) as Phaser.GameObjects.Arc | undefined;
    this.aura.visible = !!circle?.visible;
    if (circle?.visible) {
      this.aura.material.color.setHex(circle.strokeColor);
      this.aura.material.opacity = circle.strokeAlpha * circle.alpha;
      this.aura.position.set(
        circle.x,
        this.terrain.height(circle.x, circle.y) * this.terrain.region.biome.heightScale + 3,
        circle.y,
      );
      this.aura.scale.set(circle.scaleX, 1, circle.scaleY);
    }
    const live = new Set<Phaser.GameObjects.Graphics>();
    for (const object of this.scene.children.list) {
      if (
        !(object instanceof Phaser.GameObjects.Graphics) ||
        object.depth < 0 ||
        (object.depth >= 8000 && object.depth < 9500) ||
        object.scrollFactorX === 0
      )
        continue;
      live.add(object);
      const old = this.copies.get(object);
      if (!object.visible || object.alpha <= 0 || object.commandBuffer.length === 0) {
        if (old) old.mesh.visible = false;
        continue;
      }
      const hurdle = object.name.startsWith('camp-barrier-');
      // Hurdles are small local drawings. Warnings and patron circles use global coordinates.
      const bounds = hurdle
        ? { x: -64, y: -96, width: 128, height: 128 }
        : {
            x: Math.floor(view.x / 128) * 128 - object.x,
            y: Math.floor(view.y / 128) * 128 - object.y,
            width: Math.min(2048, Math.ceil((view.width + 256) / 128) * 128),
            height: Math.min(2048, Math.ceil((view.height + 256) / 128) * 128),
          };
      const signature = [
        object.alpha,
        hurdle ? angle : object.x,
        hurdle ? 0 : object.y,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        ...object.commandBuffer,
      ].join(',');
      let copy = old;
      if (!copy) {
        const canvas = document.createElement('canvas');
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        const mesh = new THREE.Mesh(
          new THREE.BufferGeometry(),
          new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            alphaTest: 0.01,
          }),
        );
        mesh.name = hurdle ? 'camp-hurdle' : 'ground-effect';
        if (!hurdle) this.root.add(mesh);
        copy = { canvas, texture, mesh, signature: '' };
        this.copies.set(object, copy);
      }
      copy.mesh.visible = true;
      if (hurdle)
        copy.mesh.position.set(
          object.x,
          this.terrain.height(object.x, object.y) * this.terrain.region.biome.heightScale,
          object.y,
        );
      if (copy.signature === signature) continue;
      copy.signature = signature;
      if (hurdle) this.atlasDirty = true;
      copy.canvas.width = bounds.width;
      copy.canvas.height = bounds.height;
      const context = copy.canvas.getContext('2d')!;
      this.camera
        .setViewport(0, 0, bounds.width, bounds.height)
        .setScroll(object.x + bounds.x, object.y + bounds.y);
      this.camera.preRender();
      // Phaser's Canvas renderer is also the supported backend for generateTexture.
      (
        object as unknown as {
          renderCanvas: (
            renderer: unknown,
            source: unknown,
            camera: unknown,
            parent: unknown,
            context: CanvasRenderingContext2D,
          ) => void;
        }
      ).renderCanvas(this.scene.game.renderer, object, this.camera, null, context);
      copy.texture.needsUpdate = true;
      const geometry = new THREE.PlaneGeometry(
        bounds.width,
        bounds.height,
        hurdle ? 1 : Math.ceil(bounds.width / 64),
        hurdle ? 1 : Math.ceil(bounds.height / 64),
      );
      const positions = geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        const px = positions.getX(i) + bounds.x + bounds.width / 2;
        const py = -positions.getY(i) + bounds.y + bounds.height / 2;
        const x = object.x + px;
        const z = object.y + py;
        if (hurdle) {
          const radians = (angle * Math.PI) / 180;
          positions.setXYZ(i, px, -py * Math.cos(radians) + 2, py * Math.sin(radians));
        } else
          positions.setXYZ(
            i,
            x,
            this.terrain.height(x, z) * this.terrain.region.biome.heightScale + 4,
            z,
          );
      }
      copy.mesh.geometry.dispose();
      copy.mesh.geometry = geometry;
      copy.mesh.frustumCulled = false;
    }
    for (const [object, copy] of this.copies)
      if (!live.has(object)) {
        this.release(copy);
        this.copies.delete(object);
      }
    const context = this.atlas.getContext('2d')!;
    if (this.atlasDirty) context.clearRect(0, 0, 1024, 768);
    const positions = this.hurdles.geometry.getAttribute('position');
    const uvs = this.hurdles.geometry.getAttribute('uv');
    this.hurdleCount = 0;
    for (const [object, copy] of this.copies) {
      if (!object.name.startsWith('camp-barrier-') || !copy.mesh.visible) continue;
      const index = this.hurdleCount++;
      const col = index % 8;
      const row = Math.floor(index / 8);
      if (this.atlasDirty) context.drawImage(copy.canvas, col * 128, row * 128);
      const points = copy.mesh.geometry.getAttribute('position');
      const sourceUV = copy.mesh.geometry.getAttribute('uv');
      for (let i = 0; i < 4; i++) {
        positions.setXYZ(
          index * 4 + i,
          points.getX(i) + copy.mesh.position.x,
          points.getY(i) + copy.mesh.position.y,
          points.getZ(i) + copy.mesh.position.z,
        );
        uvs.setXY(
          index * 4 + i,
          (col + sourceUV.getX(i)) / 8,
          1 - (row + 1 - sourceUV.getY(i)) / 6,
        );
      }
    }
    this.hurdles.visible = this.hurdleCount > 0;
    this.hurdles.geometry.setDrawRange(0, this.hurdleCount * 6);
    positions.needsUpdate = uvs.needsUpdate = true;
    if (this.atlasDirty) {
      this.atlasTexture.needsUpdate = true;
      this.atlasDirty = false;
    }
  }

  private release(copy: GraphicsCopy): void {
    copy.mesh.geometry.dispose();
    copy.mesh.material.dispose();
    copy.texture.dispose();
    this.root.remove(copy.mesh);
  }
  destroy(): void {
    for (const copy of this.copies.values()) this.release(copy);
    this.copies.clear();
    this.camera.destroy();
    this.hurdles.geometry.dispose();
    this.hurdles.material.dispose();
    this.atlasTexture.dispose();
    this.root.remove(this.hurdles);
    this.aura.geometry.dispose();
    this.aura.material.dispose();
    this.root.remove(this.aura);
  }
}
