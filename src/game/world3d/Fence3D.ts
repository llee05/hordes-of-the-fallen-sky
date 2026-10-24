import * as THREE from 'three';
import type Phaser from 'phaser';
import type { MountainHeightfield } from './MountainHeightfield';

export interface FenceSegment {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  height: number;
  wood: number;
  cloth?: number;
}

/** Existing portable hurdles expressed as lit timber geometry at their actual ground endpoints. */
export class Fence3D {
  readonly mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
    48 * 7,
  );
  count = 0;
  private signature = '';
  private readonly matrix = new THREE.Matrix4();
  private readonly quaternion = new THREE.Quaternion();
  private readonly a = new THREE.Vector3();
  private readonly b = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly center = new THREE.Vector3();
  private readonly size = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly color = new THREE.Color();
  constructor(
    root: THREE.Group,
    private readonly terrain: MountainHeightfield,
  ) {
    this.mesh.name = 'camp-timber-hurdles';
    this.mesh.castShadow = this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    root.add(this.mesh);
  }
  update(objects: Phaser.GameObjects.GameObject[]): void {
    const segments = objects
      .filter((object) => 'visible' in object && object.visible)
      .map((object) => object.getData('world-fence') as FenceSegment | undefined)
      .filter((s): s is FenceSegment => !!s)
      .slice(0, 48);
    const signature = JSON.stringify(segments);
    this.count = segments.length;
    if (signature === this.signature) return;
    this.signature = signature;
    let index = 0;
    const beam = (a: THREE.Vector3, b: THREE.Vector3, thickness: number, color: number) => {
      this.direction.subVectors(b, a);
      const length = this.direction.length();
      this.quaternion.setFromUnitVectors(this.up, this.direction.normalize());
      this.matrix.compose(
        this.center.addVectors(a, b).multiplyScalar(0.5),
        this.quaternion,
        this.size.set(thickness, length, thickness),
      );
      this.mesh.setMatrixAt(index, this.matrix);
      this.mesh.setColorAt(index++, this.color.setHex(color));
    };
    for (const s of segments) {
      const ah = this.terrain.actorHeight(s.ax, s.az) * this.terrain.region.biome.heightScale;
      const bh = this.terrain.actorHeight(s.bx, s.bz) * this.terrain.region.biome.heightScale;
      const point = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
      beam(this.a.set(s.ax, ah, s.az), this.b.set(s.ax, ah + s.height, s.az), 4, s.wood);
      beam(this.a.set(s.bx, bh, s.bz), this.b.set(s.bx, bh + s.height, s.bz), 4, s.wood);
      beam(
        point(s.ax, ah + s.height * 0.65, s.az),
        point(s.bx, bh + s.height * 0.65, s.bz),
        3,
        s.wood,
      );
      beam(point(s.ax, ah + 4, s.az), point(s.bx, bh + s.height - 4, s.bz), 2.5, s.wood);
      beam(point(s.ax, ah + s.height - 4, s.az), point(s.bx, bh + 4, s.bz), 2.5, s.wood);
      if (s.cloth !== undefined) {
        const cx = (s.ax + s.bx) / 2,
          cz = (s.az + s.bz) / 2,
          cy = (ah + bh) / 2 + s.height - 5;
        beam(point(cx, cy - 7, cz), point(cx, cy + 2, cz), 7, s.cloth);
      }
    }
    this.mesh.count = index;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  destroy(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
    this.mesh.removeFromParent();
  }
}
