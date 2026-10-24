import Phaser from 'phaser';
import * as THREE from 'three';
import type { MountainHeightfield } from './MountainHeightfield';
import { projectGround, WORLD_3D } from './worldProjection';

type Painted = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.Text;

interface Batch {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  capacity: number;
  count: number;
}

/** One dynamic draw per atlas, rather than one Three object per pooled actor. */
export class SpriteBridge {
  private readonly batches = new Map<TexImageSource, Batch>();
  private readonly textures = new Map<TexImageSource, THREE.Texture>();
  private readonly color = new THREE.Color();
  private readonly matrix = new Phaser.GameObjects.Components.TransformMatrix();
  private readonly parent = new Phaser.GameObjects.Components.TransformMatrix();
  private readonly textValues = new WeakMap<Phaser.GameObjects.Text, string>();
  readonly positions = new Map<
    Phaser.GameObjects.GameObject,
    { x: number; y: number; z: number }
  >();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly root: THREE.Group,
    private readonly terrain: MountainHeightfield,
  ) {}

  update(
    camera: THREE.OrthographicCamera,
    view: { x: number; y: number; width: number; height: number },
  ): void {
    for (const batch of this.batches.values()) batch.count = 0;
    this.positions.clear();
    const visit = (objects: Phaser.GameObjects.GameObject[], alpha: number): void => {
      for (const object of objects) {
        if (!('visible' in object) || !object.visible) continue;
        if (object instanceof Phaser.GameObjects.Container) {
          visit(object.list, alpha * object.alpha);
        } else if (
          object instanceof Phaser.GameObjects.Image ||
          object instanceof Phaser.GameObjects.Sprite ||
          object instanceof Phaser.GameObjects.Text
        ) {
          // Scenery and terrain have their own 3D representation.
          if (object.depth < 0 || object.scrollFactorX === 0) continue;
          object.getWorldTransformMatrix(this.matrix, this.parent);
          const x = this.matrix.tx;
          const z = this.matrix.ty;
          if (
            x < view.x - 200 ||
            z < view.y - 300 ||
            x > view.x + view.width + 200 ||
            z > view.y + view.height + 300
          )
            continue;
          this.add(object, x, z, alpha * object.alpha, camera);
        }
      }
    };
    visit(this.scene.children.list, 1);
    for (const { mesh, count } of this.batches.values()) {
      mesh.visible = count > 0;
      mesh.geometry.setDrawRange(0, count * 6);
      for (const name of ['position', 'uv', 'color'])
        mesh.geometry.getAttribute(name).needsUpdate = true;
    }
  }

  private batch(source: TexImageSource): Batch {
    let batch = this.batches.get(source);
    if (!batch) {
      const texture = new THREE.Texture(source);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
      this.textures.set(source, texture);
      const mesh = new THREE.Mesh(
        new THREE.BufferGeometry(),
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          alphaTest: 0.06,
          vertexColors: true,
          depthWrite: true,
          side: THREE.DoubleSide,
        }),
      );
      mesh.frustumCulled = false; // CPU culling before batching, bounds change every frame.
      mesh.name = 'painted-sprite-batch';
      mesh.castShadow = false;
      mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
        map: texture,
        alphaTest: 0.1,
        depthPacking: THREE.RGBADepthPacking,
      });
      this.root.add(mesh);
      batch = { mesh, capacity: 0, count: 0 };
      this.batches.set(source, batch);
    }
    if (batch.count >= batch.capacity) {
      batch.capacity = Math.max(64, batch.capacity * 2);
      const geometry = batch.mesh.geometry;
      for (const [name, size] of [
        ['position', 3],
        ['uv', 2],
        ['color', 4],
      ] as const) {
        const expanded = new Float32Array(batch.capacity * 4 * size);
        const previous = geometry.getAttribute(name);
        if (previous) expanded.set(previous.array);
        geometry.setAttribute(
          name,
          new THREE.BufferAttribute(expanded, size).setUsage(THREE.DynamicDrawUsage),
        );
      }
      const indices: number[] = [];
      for (let i = 0; i < batch.capacity; i++)
        indices.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
      geometry.setIndex(indices);
    }
    return batch;
  }

  private add(
    object: Painted,
    x: number,
    z: number,
    alpha: number,
    camera: THREE.OrthographicCamera,
  ): void {
    const frame = object.frame;
    const text = object instanceof Phaser.GameObjects.Text;
    const source = (text ? object.canvas : frame.source.image) as TexImageSource;
    const batch = this.batch(source);
    if (['steppe-props', 'steppe-scenery', 'tapestry-scenery'].includes(object.texture.key))
      batch.mesh.castShadow = true;
    const i = batch.count++ * 4;
    const geometry = batch.mesh.geometry;
    const positions = geometry.getAttribute('position');
    const uvs = geometry.getAttribute('uv');
    const colors = geometry.getAttribute('color');
    const shadow = object.texture.key === 'shadow';
    const lift =
      object instanceof Phaser.GameObjects.Text
        ? object.displayHeight * 0.6
        : object.depth === 9200
          ? 30
          : object.texture.key === 'gem'
            ? 12
            : 0;
    const height = this.terrain.actorHeight(x, z) * this.terrain.region.biome.heightScale + lift;
    this.positions.set(object, { x, y: height, z });
    // Phaser's trim offsets refer to the shared logical canvas, not the crop.
    const left = (text ? 0 : frame.x) - object.displayOriginX;
    const top = (text ? 0 : frame.y) - object.displayOriginY;
    const width = text ? object.width : frame.cutWidth;
    const heightPixels = text ? object.height : frame.cutHeight;
    const points = [
      [left, top],
      [left + width, top],
      [left + width, top + heightPixels],
      [left, top + heightPixels],
    ];
    const tint = object instanceof Phaser.GameObjects.Text ? 0xffffff : object.tintTopLeft;
    this.color.setHex(tint);
    const basis = camera.matrixWorld.elements;
    for (let j = 0; j < 4; j++) {
      let [px, py] = points[j]! as [number, number];
      if (!(object instanceof Phaser.GameObjects.Text)) {
        if (object.flipX) px = -(px + (object.displayOriginX * 2 - frame.realWidth));
        if (object.flipY) py = -(py + (object.displayOriginY * 2 - frame.realHeight));
      }
      // Matrix supplies parent scale and the existing attack/projectile rotations.
      let dx = this.matrix.a * px + this.matrix.c * py;
      let dy = this.matrix.b * px + this.matrix.d * py;
      if (object.texture.key === 'bolt' && 'body' in object && object.body) {
        const body = object.body as Phaser.Physics.Arcade.Body;
        if (body.velocity.lengthSq() > 0) {
          const direction = projectGround(
            body.velocity.x,
            body.velocity.y,
            0,
            (Math.acos(basis[5]!) * 180) / Math.PI,
            WORLD_3D.yaw,
          );
          const delta = Math.atan2(direction.y, direction.x) + Math.PI / 4 - object.rotation;
          const old = dx;
          dx = dx * Math.cos(delta) - dy * Math.sin(delta);
          dy = old * Math.sin(delta) + dy * Math.cos(delta);
        }
      }
      if (shadow) {
        const yaw = (WORLD_3D.yaw * Math.PI) / 180;
        const sx = x + dx * Math.cos(yaw) + dy * Math.sin(yaw);
        const sz = z - dx * Math.sin(yaw) + dy * Math.cos(yaw);
        positions.setXYZ(
          i + j,
          sx,
          this.terrain.actorHeight(sx, sz) * this.terrain.region.biome.heightScale + 1,
          sz,
        );
      } else
        positions.setXYZ(
          i + j,
          x + dx * basis[0]! - dy * basis[4]!,
          height + dx * basis[1]! - dy * basis[5]! + 2,
          z + dx * basis[2]! - dy * basis[6]!,
        );
      uvs.setXY(
        i + j,
        j === 0 || j === 3 ? (text ? 0 : frame.u0) : text ? 1 : frame.u1,
        j < 2 ? (text ? 1 : 1 - frame.v0) : text ? 0 : 1 - frame.v1,
      );
      colors.setXYZW(i + j, this.color.r, this.color.g, this.color.b, alpha);
    }
    if (object instanceof Phaser.GameObjects.Text && this.textValues.get(object) !== object.text) {
      this.textures.get(source)!.needsUpdate = true;
      this.textValues.set(object, object.text);
    }
  }

  destroy(): void {
    for (const { mesh } of this.batches.values()) {
      mesh.geometry.dispose();
      mesh.material.dispose();
      (mesh.customDepthMaterial as THREE.Material).dispose();
      this.root.remove(mesh);
    }
    for (const texture of this.textures.values()) texture.dispose();
    this.batches.clear();
    this.textures.clear();
    this.positions.clear();
  }
}
