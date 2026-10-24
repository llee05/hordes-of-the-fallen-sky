import * as THREE from 'three';

/** A depth-tested silhouette preserves the Khan's location behind raised terrain. */
export class KhanOcclusion {
  readonly mesh = new THREE.Mesh(
    new THREE.BufferGeometry()
      .setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3))
      .setAttribute('uv', new THREE.BufferAttribute(new Float32Array(8), 2))
      .setIndex([0, 1, 2, 0, 2, 3]),
    new THREE.MeshBasicMaterial({
      color: 0x8edacb,
      opacity: 0.65,
      transparent: true,
      alphaTest: 0.15,
      depthFunc: THREE.GreaterDepth,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  constructor(root: THREE.Group) {
    this.mesh.name = 'occluded-khan-silhouette';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 100;
    root.add(this.mesh);
  }
  update(source: THREE.BufferGeometry, index: number, texture: THREE.Texture): void {
    if (this.mesh.material.map !== texture) {
      this.mesh.material.map = texture;
      this.mesh.material.needsUpdate = true;
    }
    for (const name of ['position', 'uv']) {
      const src = source.getAttribute(name);
      const dst = this.mesh.geometry.getAttribute(name) as THREE.BufferAttribute;
      for (let j = 0; j < 4; j++)
        for (let k = 0; k < src.itemSize; k++)
          dst.array[j * src.itemSize + k] = src.array[(index + j) * src.itemSize + k]!;
      dst.needsUpdate = true;
    }
    this.mesh.visible = true;
  }
  destroy(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.removeFromParent();
  }
}
